"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

type ActionResult =
  | { success: true; message: string }
  | { success: false; error: string };

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

function requiredId(value: string): string {
  const id = value.trim();

  if (!id || id.length > 128) {
    throw new Error("INVALID_ID");
  }

  return id;
}

/**
 * Mark a conversion paid only after an administrator has independently
 * confirmed the bank payout. This action never sends money to a bank.
 *
 * The crypto debit, reservation release, ledger entry, and status transition
 * commit together or not at all.
 */
export async function markCryptoCashConversionPaid(
  conversionId: string,
): Promise<ActionResult> {
  try {
    const admin = await getAdminUser();

    if (!admin) {
      return { success: false, error: "Administrator access is required." };
    }

    const id = requiredId(conversionId);

    await prisma.$transaction(
      async (tx) => {
        const conversion = await tx.cryptoCashConversion.findUnique({
          where: { id },
          include: { cryptoBalance: true },
        });

        if (!conversion) throw new Error("CONVERSION_NOT_FOUND");

        if (
          conversion.status !== "PENDING" &&
          conversion.status !== "PROCESSING"
        ) {
          throw new Error("CONVERSION_NOT_REVIEWABLE");
        }

        // Fail closed if a previous/partial operation already wrote a ledger
        // entry. The unique operationKey is a second idempotency safeguard.
        const operationKey = `${conversion.reference}:SETTLEMENT`;

        const existingLedger = await tx.cryptoLedgerEntry.findFirst({
          where: {
            OR: [
              { conversionId: conversion.id },
              { operationKey },
            ],
          },
          select: { id: true },
        });

        if (existingLedger) {
          throw new Error("CONVERSION_ALREADY_SETTLED");
        }

        const balance = await tx.cryptoBalance.findUniqueOrThrow({
          where: { id: conversion.cryptoBalanceId },
        });

        if (
          balance.balance.lt(conversion.cryptoAmount) ||
          balance.reservedBalance.lt(conversion.cryptoAmount)
        ) {
          throw new Error("RESERVATION_INVALID");
        }

        const balanceAfter = balance.balance.sub(conversion.cryptoAmount);
        const reservedAfter = balance.reservedBalance.sub(
          conversion.cryptoAmount,
        );

        const debit = await tx.cryptoBalance.updateMany({
          where: {
            id: balance.id,
            balance: balance.balance,
            reservedBalance: balance.reservedBalance,
          },
          data: {
            balance: { decrement: conversion.cryptoAmount },
            reservedBalance: { decrement: conversion.cryptoAmount },
          },
        });

        if (debit.count !== 1) throw new Error("BALANCE_CHANGED");

        const transition = await tx.cryptoCashConversion.updateMany({
          where: {
            id: conversion.id,
            status: conversion.status,
          },
          data: {
            status: "COMPLETED",
            reviewedById: admin.id,
            reviewedAt: new Date(),
            rejectionReason: null,
          },
        });

        if (transition.count !== 1) {
          throw new Error("CONVERSION_STATUS_CHANGED");
        }

        await tx.cryptoLedgerEntry.create({
          data: {
            cryptoBalanceId: balance.id,
            asset: conversion.asset,
            network: conversion.network,
            direction: "DEBIT",
            amount: conversion.cryptoAmount,
            balanceBefore: balance.balance,
            balanceAfter,
            reservedBalanceBefore: balance.reservedBalance,
            reservedBalanceAfter: reservedAfter,
            conversionId: conversion.id,
            operationKey,
            description: `Crypto cash conversion settled (${conversion.reference})`,
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    revalidatePath("/admin/crypto");
    revalidatePath("/dashboard/crypto");

    return {
      success: true,
      message:
        "Conversion marked paid and completed. The reserved crypto was debited and recorded in the ledger.",
    };
  } catch (error) {
    const code = error instanceof Error ? error.message : "";

    if (code === "INVALID_ID") {
      return { success: false, error: "Choose a valid conversion." };
    }
    if (code === "CONVERSION_NOT_FOUND") {
      return { success: false, error: "Conversion not found." };
    }
    if (code === "CONVERSION_NOT_REVIEWABLE") {
      return {
        success: false,
        error: "This conversion is no longer awaiting review.",
      };
    }
    if (code === "CONVERSION_ALREADY_SETTLED") {
      return {
        success: false,
        error: "A settlement ledger entry already exists. Review the audit trail.",
      };
    }
    if (code === "RESERVATION_INVALID") {
      return {
        success: false,
        error: "The crypto reservation is inconsistent. No changes were committed; investigate the ledger.",
      };
    }
    if (code === "BALANCE_CHANGED" || code === "CONVERSION_STATUS_CHANGED") {
      return {
        success: false,
        error: "The conversion or balance changed concurrently. Refresh and review again.",
      };
    }

    console.error("Crypto conversion settlement failed", error);
    return {
      success: false,
      error: "Could not complete the conversion. Review the server logs and try again.",
    };
  }
}

/**
 * Reject an uncompleted conversion and release its crypto reservation.
 * The underlying crypto balance is not debited.
 */
export async function rejectCryptoCashConversion(
  conversionId: string,
  rejectionReason: string,
): Promise<ActionResult> {
  try {
    const admin = await getAdminUser();

    if (!admin) {
      return { success: false, error: "Administrator access is required." };
    }

    const id = requiredId(conversionId);
    const reason = rejectionReason.trim();

    if (!reason || reason.length > 500) {
      return {
        success: false,
        error: "Enter a rejection reason of 1â€“500 characters.",
      };
    }

    await prisma.$transaction(
      async (tx) => {
        const conversion = await tx.cryptoCashConversion.findUnique({
          where: { id },
        });

        if (!conversion) throw new Error("CONVERSION_NOT_FOUND");

        if (
          conversion.status !== "PENDING" &&
          conversion.status !== "PROCESSING"
        ) {
          throw new Error("CONVERSION_NOT_REVIEWABLE");
        }

        const balance = await tx.cryptoBalance.findUniqueOrThrow({
          where: { id: conversion.cryptoBalanceId },
        });

        if (balance.reservedBalance.lt(conversion.cryptoAmount)) {
          throw new Error("RESERVATION_INVALID");
        }

        const reservedAfter = balance.reservedBalance.sub(
          conversion.cryptoAmount,
        );

        const release = await tx.cryptoBalance.updateMany({
          where: {
            id: balance.id,
            balance: balance.balance,
            reservedBalance: balance.reservedBalance,
          },
          data: {
            reservedBalance: { decrement: conversion.cryptoAmount },
          },
        });

        if (release.count !== 1) throw new Error("BALANCE_CHANGED");

        const transition = await tx.cryptoCashConversion.updateMany({
          where: {
            id: conversion.id,
            status: conversion.status,
          },
          data: {
            status: "REJECTED",
            reviewedById: admin.id,
            reviewedAt: new Date(),
            rejectionReason: reason,
          },
        });

        if (transition.count !== 1) {
          throw new Error("CONVERSION_STATUS_CHANGED");
        }

        // No debit ledger entry is created for rejection: the crypto remains
        // in the user's balance and only its reservation is released.
        void reservedAfter;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    revalidatePath("/admin/crypto");
    revalidatePath("/dashboard/crypto");

    return {
      success: true,
      message: "Conversion rejected. The reserved crypto remains in the user's balance and is available again.",
    };
  } catch (error) {
    const code = error instanceof Error ? error.message : "";

    if (code === "INVALID_ID") {
      return { success: false, error: "Choose a valid conversion." };
    }
    if (code === "CONVERSION_NOT_FOUND") {
      return { success: false, error: "Conversion not found." };
    }
    if (code === "CONVERSION_NOT_REVIEWABLE") {
      return {
        success: false,
        error: "This conversion is no longer awaiting review.",
      };
    }
    if (code === "RESERVATION_INVALID") {
      return {
        success: false,
        error: "The reservation is inconsistent. No changes were committed; investigate the ledger.",
      };
    }
    if (code === "BALANCE_CHANGED" || code === "CONVERSION_STATUS_CHANGED") {
      return {
        success: false,
        error: "The conversion or balance changed concurrently. Refresh and review again.",
      };
    }

    console.error("Crypto conversion rejection failed", error);
    return {
      success: false,
      error: "Could not reject the conversion. Review the server logs and try again.",
    };
  }
}