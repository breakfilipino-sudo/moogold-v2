"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { authUserId: authUser.id },
        ...(authUser.email ? [{ email: authUser.email }] : []),
      ],
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!user || user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return user;
}

function getString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function createTransactionReference() {
  return `MG-GC-${Date.now()}-${crypto
    .randomUUID()
    .slice(0, 8)
    .toUpperCase()}`;
}

function createAdjustmentReference() {
  return `MG-GC-ADJ-${Date.now()}-${crypto
    .randomUUID()
    .slice(0, 8)
    .toUpperCase()}`;
}

async function getUsdExchangeRate(currency: string) {
  if (currency === "USD") {
    return 1;
  }

  const response = await fetch(
    `https://api.frankfurter.app/latest?from=${encodeURIComponent(
      currency,
    )}&to=USD`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      "Unable to retrieve the current exchange rate. Please try again.",
    );
  }

  const data = (await response.json()) as {
    rates?: Record<string, number>;
  };

  const rate = Number(data?.rates?.USD);

  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(
      "The current exchange rate could not be determined. Please try again.",
    );
  }

  return rate;
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

/*
 * ============================================================
 * START REVIEW
 * ============================================================
 */

export async function startGiftCardReview(formData: FormData) {
  await requireAdmin();

  const submissionId = getString(formData, "submissionId");

  if (!submissionId) {
    throw new Error("Gift-card submission is required.");
  }

  const result = await prisma.giftCardSubmission.updateMany({
    where: {
      id: submissionId,
      status: "PENDING",
    },
    data: {
      status: "PROCESSING",
    },
  });

  if (result.count === 0) {
    throw new Error(
      "This gift-card submission is no longer pending.",
    );
  }

  revalidatePath("/admin/gift-cards");
  revalidatePath(`/admin/gift-cards/${submissionId}`);

  redirect(`/admin/gift-cards/${submissionId}`);
}

/*
 * ============================================================
 * APPROVE GIFT CARD
 * ============================================================
 *
 * Wallet credit is performed atomically.
 *
 * Gift-card amount:
 *   native currency
 *
 * Wallet credit:
 *   USD
 *
 * Example:
 *   CAD 100 face value
 *   × 98% redemption rate
 *   = CAD 98 credit value
 *
 *   CAD 98
 *   × current CAD→USD rate
 *   = USD wallet credit
 *
 * No wallet movement occurs until the submission is approved.
 * ============================================================
 */

export async function approveGiftCard(formData: FormData) {
  const admin = await requireAdmin();

  const submissionId = getString(formData, "submissionId");

  if (!submissionId) {
    throw new Error("Gift-card submission is required.");
  }

  try {
    const submission =
      await prisma.giftCardSubmission.findUnique({
        where: {
          id: submissionId,
        },
        include: {
          product: {
            include: {
              brand: true,
            },
          },
          cards: {
            orderBy: {
              sequence: "asc",
            },
          },
        },
      });

    if (!submission) {
      throw new Error(
        "Gift-card submission was not found.",
      );
    }

    if (
      submission.status !== "PENDING" &&
      submission.status !== "PROCESSING"
    ) {
      throw new Error(
        "This gift-card submission has already been reviewed.",
      );
    }

    if (submission.quantity !== submission.cards.length) {
      throw new Error(
        "The gift-card submission is incomplete and cannot be approved.",
      );
    }

    const totalCreditAmount = Number(
      submission.totalCreditAmount,
    );

    if (
      !Number.isFinite(totalCreditAmount) ||
      totalCreditAmount <= 0
    ) {
      throw new Error(
        "The gift-card submission contains an invalid credit amount.",
      );
    }

    /*
     * Retrieve the current exchange rate before entering the
     * database transaction so the transaction remains short.
     */
    const exchangeRate = await getUsdExchangeRate(
      submission.currency,
    );

    const usdAmount =
      totalCreditAmount * exchangeRate;

    if (
      !Number.isFinite(usdAmount) ||
      usdAmount <= 0
    ) {
      throw new Error(
        "Unable to calculate the USD wallet credit.",
      );
    }

    const transactionReference =
      createTransactionReference();

    const adjustmentReference =
      createAdjustmentReference();

    await prisma.$transaction(
      async (tx) => {
        /*
         * Claim the submission.
         *
         * This conditional update is important for concurrency:
         * two admins cannot successfully approve the same submission.
         */
        const claim =
          await tx.giftCardSubmission.updateMany({
            where: {
              id: submission.id,
              status: {
                in: ["PENDING", "PROCESSING"],
              },
            },
            data: {
              status: "PROCESSING",
              reviewedById: admin.id,
              reviewedAt: new Date(),
            },
          });

        if (claim.count !== 1) {
          throw new Error(
            "This gift-card submission has already been reviewed.",
          );
        }

        const wallet = await tx.wallet.findUnique({
          where: {
            userId: submission.userId,
          },
        });

        if (!wallet) {
          throw new Error(
            "The customer wallet could not be found.",
          );
        }

        const balanceBefore = Number(
          wallet.cashBalance,
        );

        if (!Number.isFinite(balanceBefore)) {
          throw new Error(
            "The customer wallet balance is invalid.",
          );
        }

        const balanceAfter =
          balanceBefore + usdAmount;

        if (
          !Number.isFinite(balanceAfter) ||
          balanceAfter < balanceBefore
        ) {
          throw new Error(
            "Unable to calculate the updated wallet balance.",
          );
        }

        const transaction =
          await tx.transaction.create({
            data: {
              userId: submission.userId,
              type: "GIFT_CARD_REDEMPTION",
              status: "COMPLETED",
              balanceType: "CASH",

              /*
               * Preserve the original gift-card credit amount
               * and currency for audit purposes.
               */
              amount: totalCreditAmount,
              currency: submission.currency,

              /*
               * Record the actual USD value credited to the wallet.
               */
              usdAmount,
              exchangeRate,

              description: `${submission.product.brand.name} gift card redemption`,
              reference: transactionReference,
              approvedById: admin.id,
              approvedAt: new Date(),
            },
            select: {
              id: true,
            },
          });

        /*
         * Audit record for the wallet credit.
         */
        await tx.balanceAdjustment.create({
          data: {
            userId: submission.userId,
            adminId: admin.id,
            transactionId: transaction.id,
            balanceType: "CASH",
            direction: "CREDIT",
            amount: usdAmount,
            currency: "USD",
            reason: `${submission.product.brand.name} gift card redemption`,
            reference: adjustmentReference,
          },
        });

        /*
         * Wallet ledger entry records the exact before/after
         * USD cash balance.
         */
        await tx.walletLedgerEntry.create({
          data: {
            walletId: wallet.id,
            transactionId: transaction.id,
            balanceType: "CASH",
            direction: "CREDIT",
            amount: usdAmount,
            currency: "USD",
            balanceBefore,
            balanceAfter,
            description: `${submission.product.brand.name} gift card redemption`,
          },
        });

        /*
         * Actual wallet credit.
         */
        await tx.wallet.update({
          where: {
            id: wallet.id,
          },
          data: {
            cashBalance: balanceAfter,
          },
        });

        /*
         * Finalize the submission only after all accounting
         * operations have succeeded.
         */
        await tx.giftCardSubmission.update({
          where: {
            id: submission.id,
          },
          data: {
            status: "APPROVED",
            reviewedById: admin.id,
            reviewedAt: new Date(),
            transactionId: transaction.id,
          },
        });

        /*
         * Customer notification.
         *
         * This is intentionally inside the same transaction as
         * the wallet credit. If the wallet credit rolls back,
         * the notification rolls back too.
         */
        await tx.notification.create({
          data: {
            userId: submission.userId,
            type: "GIFT_CARD",
            title: "Gift card redemption approved",
            message:
              `Your ${submission.product.brand.name} gift card redemption has been approved and $${usdAmount.toFixed(
                2,
              )} has been added to your MooGold wallet.`,
            href: "/dashboard/gift-cards",
          },
        });
      },
      {
        maxWait: 10000,
        timeout: 15000,
      },
    );

    revalidatePath("/admin/gift-cards");
    revalidatePath(`/admin/gift-cards/${submissionId}`);
    revalidatePath("/admin/transactions");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/wallet");
    revalidatePath("/dashboard/transactions");
    revalidatePath("/dashboard/gift-cards");
    revalidatePath("/dashboard/notifications");

    redirect(
      `/admin/gift-cards/${submissionId}?approved=1`,
    );
  } catch (error) {
    console.error("approveGiftCard error:", error);

    if (isUniqueConstraintError(error)) {
      throw new Error(
        "This gift-card submission has already been processed.",
      );
    }

    throw new Error(
      error instanceof Error
        ? error.message
        : "We could not approve this gift card.",
    );
  }
}

/*
 * ============================================================
 * REJECT GIFT CARD
 * ============================================================
 */

export async function rejectGiftCard(formData: FormData) {
  const admin = await requireAdmin();

  const submissionId = getString(formData, "submissionId");
  const rejectionReason =
    getString(formData, "rejectionReason");

  if (!submissionId) {
    throw new Error("Gift-card submission is required.");
  }

  if (!rejectionReason) {
    throw new Error("A rejection reason is required.");
  }

  if (rejectionReason.length > 500) {
    throw new Error(
      "The rejection reason must be 500 characters or fewer.",
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      const submission =
        await tx.giftCardSubmission.findUnique({
          where: {
            id: submissionId,
          },
          select: {
            id: true,
            status: true,
            userId: true,
            product: {
              select: {
                brand: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        });

      if (!submission) {
        throw new Error(
          "Gift-card submission was not found.",
        );
      }

      if (
        submission.status !== "PENDING" &&
        submission.status !== "PROCESSING"
      ) {
        throw new Error(
          "This gift-card submission has already been reviewed.",
        );
      }

      const updated =
        await tx.giftCardSubmission.updateMany({
          where: {
            id: submissionId,
            status: {
              in: ["PENDING", "PROCESSING"],
            },
          },
          data: {
            status: "REJECTED",
            rejectionReason,
            reviewedById: admin.id,
            reviewedAt: new Date(),
          },
        });

      if (updated.count !== 1) {
        throw new Error(
          "This gift-card submission has already been reviewed.",
        );
      }

      /*
       * Customer notification for a rejected redemption.
       *
       * This is inside the same transaction as the rejection,
       * ensuring the customer is notified only when the rejection
       * is actually committed.
       */
      await tx.notification.create({
        data: {
          userId: submission.userId,
          type: "GIFT_CARD",
          title: "Gift card redemption rejected",
          message:
            `Your ${submission.product.brand.name} gift card redemption was rejected. Reason: ${rejectionReason}`,
          href: "/dashboard/gift-cards",
        },
      });
    });

    revalidatePath("/admin/gift-cards");
    revalidatePath(`/admin/gift-cards/${submissionId}`);
    revalidatePath("/dashboard/gift-cards");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/notifications");

    redirect(
      `/admin/gift-cards/${submissionId}?rejected=1`,
    );
  } catch (error) {
    console.error("rejectGiftCard error:", error);

    throw new Error(
      error instanceof Error
        ? error.message
        : "We could not reject this gift card.",
    );
  }
}