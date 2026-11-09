import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ensurePushDeliveryConfigured,
  sendPhonePush,
} from "@/lib/push/web-push";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

const BATCH_SIZE = 3;
const MAX_ATTEMPTS = 5;
const PROCESSING_TIMEOUT_MS = 10 * 60 * 1000;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!secret || !authorization?.startsWith("Bearer ")) {
    return false;
  }

  const supplied = authorization.slice(7);

  if (!supplied || supplied.length > 512 || secret.length > 512) {
    return false;
  }

  const expectedHash = createHash("sha256").update(secret).digest();
  const suppliedHash = createHash("sha256").update(supplied).digest();

  return timingSafeEqual(expectedHash, suppliedHash);
}

function getHttpStatus(error: unknown): number | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {
    return error.statusCode;
  }

  return null;
}

function retryDelay(attempt: number) {
  return Math.min(60 * 60 * 1000, 60 * 1000 * 2 ** (attempt - 1));
}

async function updateCampaignStatuses(campaignIds: Set<string>) {
  for (const campaignId of campaignIds) {
    const remaining = await prisma.pushDelivery.count({
      where: {
        campaignId,
        status: { in: ["PENDING", "PROCESSING"] },
      },
    });

    if (remaining > 0) {
      continue;
    }

    const sent = await prisma.pushDelivery.count({
      where: {
        campaignId,
        status: "SENT",
      },
    });

    const failed = await prisma.pushDelivery.count({
      where: {
        campaignId,
        status: "FAILED",
      },
    });

    const finalStatus =
      sent > 0 && failed > 0
        ? "PARTIALLY_SENT"
        : sent > 0
          ? "SENT"
          : "FAILED";

    await prisma.pushCampaign.updateMany({
      where: {
        id: campaignId,
        status: "QUEUED",
      },
      data: {
        status: finalStatus,
        sentAt: sent > 0 ? new Date() : null,
      },
    });
  }
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized." },
      { status: 401 }
    );
  }

  try {
    ensurePushDeliveryConfigured();
  } catch {
    return NextResponse.json(
      { success: false, error: "Push delivery is not configured." },
      { status: 503 }
    );
  }

  const staleBefore = new Date(Date.now() - PROCESSING_TIMEOUT_MS);

  try {
    // Recover deliveries abandoned by a previous interrupted worker.
    await prisma.pushDelivery.updateMany({
      where: {
        status: "PROCESSING",
        campaignId: { not: null },
        updatedAt: { lt: staleBefore },
      },
      data: {
        status: "PENDING",
        nextAttemptAt: new Date(),
      },
    });

    const campaignIds = new Set<string>();

    const revokedCampaignDeliveries = await prisma.pushDelivery.findMany({
      where: {
        status: "PENDING",
        subscription: { revokedAt: { not: null } },
        campaignId: { not: null },
      },
      select: { campaignId: true },
    });

    for (const delivery of revokedCampaignDeliveries) {
      if (delivery.campaignId) {
        campaignIds.add(delivery.campaignId);
      }
    }

    await prisma.pushDelivery.updateMany({
      where: {
        status: "PENDING",
        campaignId: { not: null },
        subscription: { revokedAt: { not: null } },
      },
      data: {
        status: "FAILED",
        lastError: "Push subscription was revoked before delivery.",
      },
    });
    const deliveries = await prisma.pushDelivery.findMany({
      where: {
        status: "PENDING",
        campaignId: { not: null },
        nextAttemptAt: { lte: new Date() },
        subscription: { revokedAt: null },
      },
      orderBy: [
        { nextAttemptAt: "asc" },
        { createdAt: "asc" },
      ],
      take: BATCH_SIZE,
      include: {
        subscription: {
          select: {
            id: true,
            endpoint: true,
            p256dh: true,
            auth: true,
            revokedAt: true,
          },
        },
      },
    });


    let sent = 0;
    let retried = 0;
    let failed = 0;
    let skipped = 0;

    for (const delivery of deliveries) {
      // Never send a phone push without an admin-created campaign.
      if (!delivery.campaignId) {
        skipped++;
        continue;
      }

      campaignIds.add(delivery.campaignId);

      if (delivery.subscription.revokedAt) {
        skipped++;
        continue;
      }

      // Claim this delivery atomically before contacting the push provider.
      const claim = await prisma.pushDelivery.updateMany({
        where: {
          id: delivery.id,
          status: "PENDING",
          campaignId: { not: null },
          subscription: { revokedAt: null },
        },
        data: {
          status: "PROCESSING",
          attempts: { increment: 1 },
        },
      });

      if (claim.count !== 1) {
        skipped++;
        continue;
      }

      const attempt = delivery.attempts + 1;
      const kind = "PROMOTIONAL" as const;

      try {
        await sendPhonePush(
          {
            endpoint: delivery.subscription.endpoint,
            p256dh: delivery.subscription.p256dh,
            auth: delivery.subscription.auth,
          },
          {
            title: delivery.title,
            message: delivery.message,
            href: delivery.href,
            kind,
            tag: `moogold-${delivery.id}`,
          }
        );

        await prisma.$transaction([
          prisma.pushDelivery.updateMany({
            where: {
              id: delivery.id,
              status: "PROCESSING",
            },
            data: {
              status: "SENT",
              sentAt: new Date(),
              lastError: null,
            },
          }),
          prisma.pushSubscription.updateMany({
            where: {
              id: delivery.subscription.id,
              revokedAt: null,
            },
            data: {
              lastUsedAt: new Date(),
            },
          }),
        ]);

        sent++;
      } catch (error) {
        const statusCode = getHttpStatus(error);
        const expired = statusCode === 404 || statusCode === 410;

        if (expired) {
          await prisma.$transaction([
            prisma.pushSubscription.updateMany({
              where: {
                id: delivery.subscription.id,
                revokedAt: null,
              },
              data: { revokedAt: new Date() },
            }),
            prisma.pushDelivery.updateMany({
              where: {
                id: delivery.id,
                status: "PROCESSING",
              },
              data: {
                status: "FAILED",
                lastError: `Push subscription expired (HTTP ${statusCode}).`,
              },
            }),
          ]);

          failed++;
          continue;
        }

        const exhausted = attempt >= MAX_ATTEMPTS;

        await prisma.pushDelivery.updateMany({
          where: {
            id: delivery.id,
            status: "PROCESSING",
          },
          data: {
            status: exhausted ? "FAILED" : "PENDING",
            nextAttemptAt: exhausted
              ? new Date()
              : new Date(Date.now() + retryDelay(attempt)),
            lastError: statusCode
              ? `Push provider returned HTTP ${statusCode}.`
              : "Push delivery failed.",
          },
        });

        if (exhausted) {
          failed++;
        } else {
          retried++;
        }
      }
    }

    await updateCampaignStatuses(campaignIds);

    return NextResponse.json({
      success: true,
      processed: deliveries.length,
      sent,
      retried,
      failed,
      skipped,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Push delivery processing failed." },
      { status: 500 }
    );
  }
}