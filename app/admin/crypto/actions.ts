"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "../../../generated/prisma/client";

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
  amount: Prisma.Decimal,
  asset: string,
  network: string,
) {
  return `Crypto deposit approved: +${amount.toString()} ${asset} via ${network}.`;
}

/**
 * Approve a crypto deposit.
 *
 * The crypto amount must have been matched to an
 * actual incoming blockchain transaction before
 * the deposit can be approved.
 *
 * Approval:
 * - marks the deposit COMPLETED
 * - creates the user's crypto balance if necessary
 * - credits the verified deposited amount
 * - creates an immutable ledger entry
 * - prevents duplicate crediting
 */
export async function approveCryptoDeposit(depositId: string, actualAmount: string) {
  const admin = await getAdminUser();

  if (!admin) {
    return {
      success: false,
      error: "You are not authorized to perform this action.",
    };
  }


  const normalizedAmount = actualAmount.trim();

  // Accept ordinary decimal notation only, up to 18 decimal places.
  if (
    !/^\d+(?:\.\d{1,18})?$/.test(normalizedAmount) ||
    /^0+(?:\.0+)?$/.test(normalizedAmount)
  ) {
    return {
      success: false,
      error: "Enter a valid received amount greater than zero, with no more than 18 decimal places.",
    };
  }
try {
    const result = await prisma.$transaction(async (tx) => {
      const deposit = await tx.cryptoDeposit.findUnique({
        where: {
          id: depositId,
        },
      });

      if (!deposit) {
        throw new Error("DEPOSIT_NOT_FOUND");
      }

      if (
        deposit.status !== "PENDING" &&
        deposit.status !== "PROCESSING"
      ) {
        throw new Error("DEPOSIT_ALREADY_REVIEWED");
      }

      const existingLedger =
        await tx.cryptoLedgerEntry.findUnique({
          where: {
            depositId: deposit.id,
          },
        });

      if (existingLedger) {
        throw new Error("DEPOSIT_ALREADY_CREDITED");
      }

      const receivedAmount = new Prisma.Decimal(normalizedAmount);

      // Claim the deposit before crediting funds. Only one concurrent
      // approval can change a pending/processing deposit to COMPLETED.
      const claimedDeposit = await tx.cryptoDeposit.updateMany({
        where: {
          id: deposit.id,
          status: {
            in: ["PENDING", "PROCESSING"],
          },
        },
        data: {
          amount: receivedAmount,
          status: "COMPLETED",
          reviewedById: admin.id,
          reviewedAt: new Date(),
        },
      });

      if (claimedDeposit.count !== 1) {
        throw new Error("DEPOSIT_ALREADY_REVIEWED");
      }

      const cryptoBalance =
        await tx.cryptoBalance.upsert({
          where: {
            userId_asset_network: {
              userId: deposit.userId,
              asset: deposit.asset,
              network: deposit.network,
            },
          },

          update: {},

          create: {
            userId: deposit.userId,
            asset: deposit.asset,
            network: deposit.network,
            balance: 0,
          },
        });

      const balanceBefore =
        cryptoBalance.balance;

      const balanceAfter =
        balanceBefore.add(receivedAmount);


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
          cryptoBalanceId: cryptoBalance.id,
          depositId: deposit.id,

          asset: deposit.asset,
          network: deposit.network,

          direction: "CREDIT",

          amount: receivedAmount,

          balanceBefore,
          balanceAfter,

          description: createLedgerDescription(
            receivedAmount,
            deposit.asset,
            deposit.network,
          ),
        },
      });

      await tx.notification.create({
        data: {
          userId: deposit.userId,
          type: "CRYPTO_DEPOSIT",
          title: "Crypto deposit approved",
          message: `${receivedAmount.toString()} ${deposit.asset} has been credited to your ${deposit.network} crypto wallet.`,
          href: `/dashboard/crypto/deposit/${deposit.id}`,
        },
      });

      return {
        amount: receivedAmount.toString(),
        asset: deposit.asset,
        network: deposit.network,
        balanceAfter: balanceAfter.toString(),
      };
    });

    revalidatePath("/admin/crypto");
    revalidatePath(`/admin/crypto/${depositId}`);
    revalidatePath("/dashboard/crypto");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/notifications");
    revalidatePath(`/dashboard/crypto/deposit/${depositId}`);

    return {
      success: true,
      message:
        `${result.amount} ${result.asset} has been ` +
        `credited to the user's ${result.asset} ` +
        `/${result.network} balance.`,
      balanceAfter: result.balanceAfter,
    };
  } catch (error) {
    console.error(
      "Failed to approve crypto deposit:",
      error,
    );

    if (
      error instanceof Error &&
      error.message === "DEPOSIT_NOT_FOUND"
    ) {
      return {
        success: false,
        error: "Crypto deposit could not be found.",
      };
    }

    if (
      error instanceof Error &&
      error.message === "DEPOSIT_ALREADY_REVIEWED"
    ) {
      return {
        success: false,
        error:
          "This crypto deposit has already been reviewed.",
      };
    }

    if (
      error instanceof Error &&
      error.message === "DEPOSIT_ALREADY_CREDITED"
    ) {
      return {
        success: false,
        error:
          "This crypto deposit has already been credited.",
      };
    }
return {
      success: false,
      error:
        "We could not approve this crypto deposit. Please try again.",
    };
  }
}

/**
 * Reject a crypto deposit.
 */
export async function rejectCryptoDeposit(
  depositId: string,
  rejectionReason: string,
) {
  const admin = await getAdminUser();

  if (!admin) {
    return {
      success: false,
      error: "You are not authorized to perform this action.",
    };
  }

  const reason = rejectionReason.trim();

  if (!reason) {
    return {
      success: false,
      error: "Please provide a rejection reason.",
    };
  }

  if (reason.length > 1000) {
    return {
      success: false,
      error: "The rejection reason must be 1000 characters or less.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const deposit = await tx.cryptoDeposit.findUnique({
        where: {
          id: depositId,
        },
      });

      if (!deposit) {
        throw new Error("DEPOSIT_NOT_FOUND");
      }

      if (
        deposit.status !== "PENDING" &&
        deposit.status !== "PROCESSING"
      ) {
        throw new Error("DEPOSIT_ALREADY_REVIEWED");
      }

      const existingLedger = await tx.cryptoLedgerEntry.findUnique({
        where: {
          depositId: deposit.id,
        },
      });

      if (existingLedger) {
        throw new Error("DEPOSIT_ALREADY_CREDITED");
      }

      // Reject only if the deposit is still awaiting review.
      // This competes safely with the approval action's conditional claim.
      const claimedDeposit = await tx.cryptoDeposit.updateMany({
        where: {
          id: deposit.id,
          status: {
            in: ["PENDING", "PROCESSING"],
          },
        },
        data: {
          status: "REJECTED",
          rejectionReason: reason,
          reviewedById: admin.id,
          reviewedAt: new Date(),
        },
      });

      if (claimedDeposit.count !== 1) {
        throw new Error("DEPOSIT_ALREADY_REVIEWED");
      }

      await tx.notification.create({
        data: {
          userId: deposit.userId,
          type: "CRYPTO_DEPOSIT",
          title: "Crypto deposit rejected",
          message: `Your ${deposit.asset} deposit was rejected. Reason: ${reason}`,
          href: `/dashboard/crypto/deposit/${deposit.id}`,
        },
      });
    });

    revalidatePath("/admin/crypto");
    revalidatePath(`/admin/crypto/${depositId}`);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/crypto");
    revalidatePath("/dashboard/notifications");
    revalidatePath(`/dashboard/crypto/deposit/${depositId}`);

    return {
      success: true,
      message: "Crypto deposit rejected successfully.",
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "DEPOSIT_NOT_FOUND") {
        return {
          success: false,
          error: "Crypto deposit could not be found.",
        };
      }

      if (error.message === "DEPOSIT_ALREADY_REVIEWED") {
        return {
          success: false,
          error: "This crypto deposit has already been reviewed.",
        };
      }

      if (error.message === "DEPOSIT_ALREADY_CREDITED") {
        return {
          success: false,
          error: "This deposit has already been credited and cannot be rejected.",
        };
      }
    }

    console.error("Failed to reject crypto deposit:", error);

    return {
      success: false,
      error: "We could not reject this crypto deposit. Please try again.",
    };
  }
}
