"use server";

import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

async function getAdminUser() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return null;
  }

  const admin = await prisma.user.findUnique({
    where: {
      authUserId: authUser.id,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!admin || admin.role !== "ADMIN") {
    return null;
  }

  return admin;
}

function createLedgerDescription(
  amount: string,
  fee: string,
  totalAmount: string,
  asset: string,
  network: string,
  destinationAddress: string,
) {
  return (
    `Crypto withdrawal approved: -${totalAmount} ${asset} ` +
    `(withdrawal ${amount} ${asset} + fee ${fee} ${asset}) ` +
    `via ${network} to ${destinationAddress}.`
  );
}

/**
 * Approve a crypto withdrawal.
 *
 * Approval:
 * - verifies the withdrawal is reviewable
 * - prevents duplicate ledger entries
 * - verifies sufficient crypto balance
 * - marks withdrawal COMPLETED
 * - deducts totalAmount from crypto balance
 * - creates an immutable DEBIT ledger entry
 *
 * totalAmount = amount + fee
 */
export async function approveCryptoWithdrawal(
  withdrawalId: string,
) {
  const admin = await getAdminUser();

  if (!admin) {
    return {
      success: false,
      error:
        "You are not authorized to perform this action.",
    };
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const withdrawal =
          await tx.cryptoWithdrawal.findUnique({
            where: {
              id: withdrawalId,
            },
          });

        if (!withdrawal) {
          throw new Error(
            "WITHDRAWAL_NOT_FOUND",
          );
        }

        if (
          withdrawal.status !== "PENDING" &&
          withdrawal.status !== "PROCESSING"
        ) {
          throw new Error(
            "WITHDRAWAL_ALREADY_REVIEWED",
          );
        }

        const existingLedger =
          await tx.cryptoLedgerEntry.findUnique({
            where: {
              withdrawalId:
                withdrawal.id,
            },
          });

        if (existingLedger) {
          throw new Error(
            "WITHDRAWAL_ALREADY_DEBITED",
          );
        }

        const cryptoBalance =
          await tx.cryptoBalance.findUnique({
            where: {
              id: withdrawal.cryptoBalanceId,
            },
          });

        if (!cryptoBalance) {
          throw new Error(
            "CRYPTO_BALANCE_NOT_FOUND",
          );
        }

        if (
          cryptoBalance.userId !==
            withdrawal.userId ||
          cryptoBalance.asset !==
            withdrawal.asset ||
          cryptoBalance.network !==
            withdrawal.network
        ) {
          throw new Error(
            "CRYPTO_BALANCE_MISMATCH",
          );
        }

        const balanceBefore =
          cryptoBalance.balance;

        const totalAmount =
          withdrawal.totalAmount;

        if (
          balanceBefore.lt(
            totalAmount,
          )
        ) {
          throw new Error(
            "INSUFFICIENT_CRYPTO_BALANCE",
          );
        }

        const balanceAfter =
          balanceBefore.sub(
            totalAmount,
          );

        const updatedWithdrawal =
          await tx.cryptoWithdrawal.update({
            where: {
              id: withdrawal.id,
            },
            data: {
              status: "COMPLETED",
              reviewedById: admin.id,
              reviewedAt: new Date(),
            },
          });

        await tx.cryptoBalance.update({
          where: {
            id: cryptoBalance.id,
          },
          data: {
            balance: balanceAfter,
          },
        });

        await tx.cryptoLedgerEntry.create({
          data: {
            cryptoBalanceId:
              cryptoBalance.id,
            withdrawalId:
              updatedWithdrawal.id,
            asset:
              withdrawal.asset,
            network:
              withdrawal.network,
            direction:
              "DEBIT",
            amount:
              totalAmount,
            balanceBefore,
            balanceAfter,
            description:
              createLedgerDescription(
                withdrawal.amount.toString(),
                withdrawal.fee.toString(),
                totalAmount.toString(),
                withdrawal.asset,
                withdrawal.network,
                withdrawal.destinationAddress,
              ),
          },
        });

        await tx.notification.create({
          data: {
            userId: withdrawal.userId,
            type: "CRYPTO_WITHDRAWAL",
            title: "Crypto withdrawal approved",
            message:
              `Your ${withdrawal.amount} ${withdrawal.asset} withdrawal has been approved. ${totalAmount} ${withdrawal.asset} has been deducted from your crypto balance.`,
            href: "/dashboard/crypto",
          },
        });

        return {
          amount:
            withdrawal.amount.toString(),
          fee:
            withdrawal.fee.toString(),
          totalAmount:
            totalAmount.toString(),
          asset:
            withdrawal.asset,
          network:
            withdrawal.network,
          balanceAfter:
            balanceAfter.toString(),
          destinationAddress:
            withdrawal.destinationAddress,
        };
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    revalidatePath(
      "/admin/crypto/withdrawals",
    );

    revalidatePath(
      `/admin/crypto/withdrawals/${withdrawalId}`,
    );

    revalidatePath("/admin/crypto");
    revalidatePath("/dashboard/crypto");

    return {
      success: true,

      message:
        `${result.amount} ${result.asset} withdrawal ` +
        `approved. ${result.totalAmount} ${result.asset} ` +
        `has been deducted from the user's balance.`,

      balanceAfter:
        result.balanceAfter,
    };
  } catch (error) {
    console.error(
      "Failed to approve crypto withdrawal:",
      error,
    );

    if (
      error instanceof Error &&
      error.message ===
        "WITHDRAWAL_NOT_FOUND"
    ) {
      return {
        success: false,
        error:
          "Crypto withdrawal could not be found.",
      };
    }

    if (
      error instanceof Error &&
      error.message ===
        "WITHDRAWAL_ALREADY_REVIEWED"
    ) {
      return {
        success: false,
        error:
          "This crypto withdrawal has already been reviewed.",
      };
    }

    if (
      error instanceof Error &&
      error.message ===
        "WITHDRAWAL_ALREADY_DEBITED"
    ) {
      return {
        success: false,
        error:
          "This crypto withdrawal has already been debited.",
      };
    }

    if (
      error instanceof Error &&
      error.message ===
        "CRYPTO_BALANCE_NOT_FOUND"
    ) {
      return {
        success: false,
        error:
          "The user's crypto balance could not be found.",
      };
    }

    if (
      error instanceof Error &&
      error.message ===
        "CRYPTO_BALANCE_MISMATCH"
    ) {
      return {
        success: false,
        error:
          "The withdrawal does not match the selected crypto balance.",
      };
    }

    if (
      error instanceof Error &&
      error.message ===
        "INSUFFICIENT_CRYPTO_BALANCE"
    ) {
      return {
        success: false,
        error:
          "The user does not have enough crypto balance to approve this withdrawal.",
      };
    }

    return {
      success: false,
      error:
        "We could not approve this crypto withdrawal. Please try again.",
    };
  }
}

/**
 * Reject a crypto withdrawal.
 *
 * Rejection never changes the crypto balance.
 */
export async function rejectCryptoWithdrawal(
  withdrawalId: string,
  rejectionReason: string,
) {
  const admin = await getAdminUser();

  if (!admin) {
    return {
      success: false,
      error:
        "You are not authorized to perform this action.",
    };
  }

  const reason = rejectionReason.trim();

  if (!reason) {
    return {
      success: false,
      error:
        "Please provide a rejection reason.",
    };
  }

  if (reason.length > 1000) {
    return {
      success: false,
      error:
        "The rejection reason must be 1000 characters or less.",
    };
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        const withdrawal =
          await tx.cryptoWithdrawal.findUnique({
            where: {
              id: withdrawalId,
            },
          });

        if (!withdrawal) {
          throw new Error(
            "WITHDRAWAL_NOT_FOUND",
          );
        }

        if (
          withdrawal.status !== "PENDING" &&
          withdrawal.status !== "PROCESSING"
        ) {
          throw new Error(
            "WITHDRAWAL_ALREADY_REVIEWED",
          );
        }

        const existingLedger =
          await tx.cryptoLedgerEntry.findUnique({
            where: {
              withdrawalId:
                withdrawal.id,
            },
          });

        if (existingLedger) {
          throw new Error(
            "WITHDRAWAL_ALREADY_DEBITED",
          );
        }

        await tx.cryptoWithdrawal.update({
          where: {
            id: withdrawal.id,
          },
          data: {
            status: "REJECTED",
            rejectionReason:
              reason,
            reviewedById: admin.id,
            reviewedAt: new Date(),
          },
        });

        await tx.notification.create({
          data: {
            userId: withdrawal.userId,
            type: "CRYPTO_WITHDRAWAL",
            title: "Crypto withdrawal rejected",
            message:
              `Your ${withdrawal.amount} ${withdrawal.asset} withdrawal was rejected. Reason: ${reason}`,
            href: "/dashboard/crypto",
          },
        });
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    revalidatePath(
      "/admin/crypto/withdrawals",
    );

    revalidatePath(
      `/admin/crypto/withdrawals/${withdrawalId}`,
    );

    revalidatePath("/admin/crypto");
    revalidatePath("/dashboard/crypto");

    return {
      success: true,
      message:
        "Crypto withdrawal rejected successfully.",
    };
  } catch (error) {
    console.error(
      "Failed to reject crypto withdrawal:",
      error,
    );

    if (
      error instanceof Error &&
      error.message ===
        "WITHDRAWAL_NOT_FOUND"
    ) {
      return {
        success: false,
        error:
          "Crypto withdrawal could not be found.",
      };
    }

    if (
      error instanceof Error &&
      error.message ===
        "WITHDRAWAL_ALREADY_REVIEWED"
    ) {
      return {
        success: false,
        error:
          "This crypto withdrawal has already been reviewed.",
      };
    }

    if (
      error instanceof Error &&
      error.message ===
        "WITHDRAWAL_ALREADY_DEBITED"
    ) {
      return {
        success: false,
        error:
          "This withdrawal has already been debited and cannot be rejected.",
      };
    }

    return {
      success: false,
      error:
        "We could not reject this crypto withdrawal. Please try again.",
    };
  }
}