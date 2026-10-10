"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

/**
 * ============================================================
 * ADMIN AUTH
 * ============================================================
 */

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const admin = await prisma.user.findUnique({
    where: {
      authUserId: authUser.id,
    },
  });

  if (!admin || admin.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return admin;
}

/**
 * ============================================================
 * HELPERS
 * ============================================================
 */

function getRequiredValue(
  formData: FormData,
  name: string,
): string {
  const value = String(
    formData.get(name) ?? "",
  ).trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function generateAdjustmentReference(): string {
  const timestamp = Date.now();

  const random = Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase();

  return `MG-ADJ-${timestamp}-${random}`;
}

/**
 * ============================================================
 * APPROVE WITHDRAWAL
 * ============================================================
 */

export async function approveWithdrawal(
  formData: FormData,
): Promise<void> {
  const admin = await requireAdmin();

  const reference = getRequiredValue(
    formData,
    "reference",
  );

  try {
    await prisma.$transaction(async (tx) => {
      const transaction =
        await tx.transaction.findUnique({
          where: {
            reference,
          },
          include: {
            withdrawalDetails: true,
            user: {
              select: {
                id: true,
              },
            },
          },
        });

      if (!transaction) {
        throw new Error(
          "Withdrawal transaction could not be found.",
        );
      }

      if (transaction.type !== "WITHDRAWAL") {
        throw new Error(
          "This transaction is not a withdrawal.",
        );
      }

      if (transaction.status !== "PENDING") {
        throw new Error(
          "This withdrawal has already been processed.",
        );
      }

      if (
        transaction.balanceType !== "CASH" &&
        transaction.balanceType !== "REFERRAL"
      ) {
        throw new Error(
          "This withdrawal is linked to an unsupported balance.",
        );
      }

      if (!transaction.withdrawalDetails) {
        throw new Error(
          "Withdrawal details could not be found.",
        );
      }

      await tx.transaction.update({
        where: {
          id: transaction.id,
        },
        data: {
          status: "COMPLETED",
          approvedById: admin.id,
          approvedAt: new Date(),
          description:
            transaction.description ??
            `Withdrawal completed via ${
              transaction.withdrawalDetails
                .bankName ?? "bank transfer"
            }.`,
        },
      });

      await tx.notification.create({
        data: {
          userId: transaction.userId,
          type: "WITHDRAWAL",
          title: "Withdrawal approved",
          message:
  `Your withdrawal of $${(
    transaction.usdAmount ??
    transaction.amount
  ).toFixed(2)} has been approved.`,
          href: "/dashboard/withdraw",
        },
      });
    });
  } catch (error) {
    console.error(
      "Failed to approve withdrawal:",
      error,
    );

    throw new Error(
      error instanceof Error
        ? error.message
        : "Unable to approve this withdrawal.",
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/wallet");
  revalidatePath("/dashboard/withdraw");
  revalidatePath("/dashboard/referrals");
  revalidatePath("/dashboard/referrals/withdraw");
  revalidatePath("/dashboard/transactions");

  revalidatePath("/admin");
  revalidatePath("/admin/withdrawals");
  revalidatePath(
    `/admin/withdrawals/${reference}`,
  );
  revalidatePath("/admin/transactions");
  revalidatePath(
    `/admin/transactions/${reference}`,
  );

  redirect(
    `/admin/withdrawals/${reference}?success=approved`,
  );
}

/**
 * ============================================================
 * REJECT WITHDRAWAL
 * ============================================================
 */

export async function rejectWithdrawal(
  formData: FormData,
): Promise<void> {
  const admin = await requireAdmin();

  const reference = getRequiredValue(
    formData,
    "reference",
  );

  const rejectionReason = getRequiredValue(
    formData,
    "rejectionReason",
  );

  if (rejectionReason.length > 500) {
    throw new Error(
      "Rejection reason cannot exceed 500 characters.",
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      const transaction =
        await tx.transaction.findUnique({
          where: {
            reference,
          },
          include: {
            withdrawalDetails: true,
            user: {
              select: {
                id: true,
              },
            },
          },
        });

      if (!transaction) {
        throw new Error(
          "Withdrawal transaction could not be found.",
        );
      }

      if (transaction.type !== "WITHDRAWAL") {
        throw new Error(
          "This transaction is not a withdrawal.",
        );
      }

      if (transaction.status !== "PENDING") {
        throw new Error(
          "This withdrawal has already been processed.",
        );
      }

      if (
        transaction.balanceType !== "CASH" &&
        transaction.balanceType !== "REFERRAL"
      ) {
        throw new Error(
          "This withdrawal is linked to an unsupported balance.",
        );
      }

      if (!transaction.withdrawalDetails) {
        throw new Error(
          "Withdrawal details could not be found.",
        );
      }

      const wallet =
        await tx.wallet.findUnique({
          where: {
            userId: transaction.userId,
          },
        });

      if (!wallet) {
        throw new Error(
          "The customer's wallet could not be found.",
        );
      }

      const refundAmount =
        transaction.amount;

      if (
        refundAmount.lessThanOrEqualTo(0)
      ) {
        throw new Error(
          "The withdrawal amount is invalid.",
        );
      }

      const balanceType =
        transaction.balanceType;

      const balanceBefore =
        balanceType === "CASH"
          ? wallet.cashBalance
          : wallet.referralBalance;

      const balanceAfter =
        balanceBefore.plus(refundAmount);

      await tx.transaction.update({
        where: {
          id: transaction.id,
        },
        data: {
          status: "REJECTED",
          rejectionReason,
          approvedById: admin.id,
          approvedAt: new Date(),
          description:
            transaction.description ??
            `Withdrawal rejected via ${
              transaction.withdrawalDetails
                .bankName ?? "bank transfer"
            }.`,
        },
      });

      if (balanceType === "CASH") {
        await tx.wallet.update({
          where: {
            id: wallet.id,
          },
          data: {
            cashBalance: {
              increment: refundAmount,
            },
          },
        });
      } else {
        await tx.wallet.update({
          where: {
            id: wallet.id,
          },
          data: {
            referralBalance: {
              increment: refundAmount,
            },
          },
        });
      }

      const refundReference =
        generateAdjustmentReference();

      const refundTransaction =
        await tx.transaction.create({
          data: {
            userId: transaction.userId,
            type: "BALANCE_ADJUSTMENT",
            status: "COMPLETED",
            balanceType,
            amount: refundAmount,
            currency: transaction.currency,
            usdAmount:
              transaction.usdAmount,
            exchangeRate:
              transaction.exchangeRate,
            description:
              `Withdrawal refund for ${transaction.reference}.`,
            reference: refundReference,
            approvedById: admin.id,
            approvedAt: new Date(),
          },
        });

      await tx.balanceAdjustment.create({
        data: {
          userId: transaction.userId,
          adminId: admin.id,
          transactionId:
            refundTransaction.id,
          balanceType,
          direction: "CREDIT",
          amount: refundAmount,
          currency:
            transaction.currency,
          reason:
            `Refund for rejected withdrawal ${transaction.reference}: ${rejectionReason}`,
          reference:
            refundReference,
        },
      });

      await tx.walletLedgerEntry.create({
        data: {
          walletId: wallet.id,
          transactionId:
            refundTransaction.id,
          balanceType,
          direction: "CREDIT",
          amount: refundAmount,
          currency:
            transaction.currency,
          balanceBefore,
          balanceAfter,
          description:
            `Withdrawal refund: ${transaction.reference}`,
        },
      });

      await tx.notification.create({
        data: {
          userId: transaction.userId,
          type: "WITHDRAWAL",
          title: "Withdrawal rejected",
          message:
  `Your withdrawal of $${(
    transaction.usdAmount ??
    transaction.amount
  ).toFixed(2)} was rejected and the funds were returned to your ${
    balanceType === "CASH"
      ? "cash"
      : "referral"
  } balance. Reason: ${rejectionReason}`,
          href: "/dashboard/withdraw",
        },
      });
    });
  } catch (error) {
    console.error(
      "Failed to reject withdrawal:",
      error,
    );

    throw new Error(
      error instanceof Error
        ? error.message
        : "Unable to reject this withdrawal.",
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/wallet");
  revalidatePath("/dashboard/withdraw");
  revalidatePath("/dashboard/referrals");
  revalidatePath("/dashboard/referrals/withdraw");
  revalidatePath("/dashboard/transactions");

  revalidatePath("/admin");
  revalidatePath("/admin/withdrawals");
  revalidatePath(
    `/admin/withdrawals/${reference}`,
  );
  revalidatePath("/admin/transactions");

  redirect(
    `/admin/withdrawals/${reference}?success=rejected`,
  );
}