"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

async function getAdminUser() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
    error,
  } = await supabase.auth.getUser();

  if (error || !authUser) return null;

  const user = await prisma.user.findUnique({
    where: { authUserId: authUser.id },
    select: { id: true, role: true },
  });

  if (!user || user.role !== "ADMIN") return null;

  return user;
}

export async function createPushCampaign(formData: FormData) {
  const admin = await getAdminUser();

  if (!admin) {
    return { success: false, message: "You are not authorized to create campaigns." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const hrefInput = String(formData.get("href") ?? "").trim();
  const audience = String(formData.get("audience") ?? "ALL");
  const targetUserIds = [
    ...new Set(
      formData
        .getAll("targetUserId")
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean)
    ),
  ];

  if (!title || title.length > 120) {
    return { success: false, message: "Enter a title of no more than 120 characters." };
  }

  if (!message || message.length > 500) {
    return { success: false, message: "Enter a message of no more than 500 characters." };
  }

  if (audience !== "ALL" && audience !== "SELECTED") {
    return { success: false, message: "Choose a valid audience." };
  }

  if (audience === "SELECTED" && targetUserIds.length === 0) {
    return { success: false, message: "Select at least one subscribed customer." };
  }

  if (targetUserIds.length > 5000) {
    return { success: false, message: "Too many recipients were selected." };
  }

  let href: string | null = null;

  if (hrefInput) {
    if (
      hrefInput.length > 500 ||
      !hrefInput.startsWith("/") ||
      hrefInput.startsWith("//") ||
      hrefInput.includes("\\") ||
      /[\r\n]/.test(hrefInput)
    ) {
      return { success: false, message: "Enter a valid internal destination beginning with /." };
    }

    try {
      const parsed = new URL(hrefInput, "https://moogold.org");

      if (parsed.origin !== "https://moogold.org") {
        return { success: false, message: "Only internal destinations are allowed." };
      }

      href = parsed.pathname + parsed.search + parsed.hash;
    } catch {
      return { success: false, message: "The destination URL is invalid." };
    }
  }

  try {
    const recipients = await prisma.user.findMany({
      where: {
        role: "USER",
        accountStatus: "ACTIVE",
        ...(audience === "SELECTED" ? { id: { in: targetUserIds } } : {}),
        pushSubscriptions: {
          some: { revokedAt: null },
        },
      },
      select: {
        id: true,
        pushSubscriptions: {
          where: { revokedAt: null },
          select: { id: true },
        },
      },
    });

    if (audience === "SELECTED") {
      const eligibleIds = new Set(recipients.map((recipient) => recipient.id));
      const missing = targetUserIds.filter((id) => !eligibleIds.has(id));

      if (missing.length > 0) {
        return {
          success: false,
          message: "Some selected customers no longer have an active subscribed device. Refresh and try again.",
        };
      }
    }

    const deliveryRows = recipients.flatMap((recipient) =>
      recipient.pushSubscriptions.map((subscription) => ({
        subscriptionId: subscription.id,
        title,
        message,
        href,
        status: "PENDING" as const,
      }))
    );

    await prisma.$transaction(async (tx) => {
      const campaign = await tx.pushCampaign.create({
        data: {
          createdById: admin.id,
          title,
          message,
          href,
          audience,
          targetUserIds: audience === "SELECTED" ? targetUserIds : [],
          status: deliveryRows.length > 0 ? "QUEUED" : "NO_DEVICES",
          sentAt: null,
        },
        select: { id: true },
      });

      if (deliveryRows.length > 0) {
        await tx.pushDelivery.createMany({
          data: deliveryRows.map((delivery) => ({
            ...delivery,
            campaignId: campaign.id,
          })),
        });
      }
    });

    revalidatePath("/admin/push-notifications");

    return {
      success: true,
      message:
        deliveryRows.length > 0
          ? `Campaign queued for ${recipients.length} customer(s) across ${deliveryRows.length} subscribed device(s).`
          : "Campaign saved, but no active subscribed devices were found.",
    };
  } catch (error) {
    console.error("Push campaign creation failed:", error);

    return {
      success: false,
      message: "The campaign could not be created. Please try again.",
    };
  }
}