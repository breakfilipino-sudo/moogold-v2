"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getCountryFinancialConfig } from "@/lib/countries";
import {
  getVerifiedCryptoUsdPrice,
  getVerifiedUsdFxRate,
} from "@/lib/crypto-finance/verified-prices";
import type { DepositCryptoAssetCode } from "@/lib/crypto/prices";

async function getAdminUser() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const admin = await prisma.user.findUnique({
    where: { authUserId: authUser.id },
    select: { id: true, role: true },
  });

  return admin?.role === "ADMIN" ? admin : null;
}

function refreshWalletCryptoPaths(depositId: string) {
  revalidatePath("/admin/wallet-crypto-deposits");
  revalidatePath(`/admin/wallet-crypto-deposits/${depositId}`);
  revalidatePath("/dashboard/deposit/crypto");
  revalidatePath("/dashboard/wallet");
  revalidatePath("/dashboard");
}

export async function approveWalletCryptoDeposit(
  depositId: string,
  transactionHash: string,
  actualAmount: string,
  blockchainReceivedAtValue: string,
) {
  const admin = await getAdminUser();

  if (!admin) {
    return {
      success: false as const,
      error: "You are not authorized to perform this action.",
    };
  }

  const normalizedHash = transactionHash.trim();
  const normalizedAmount = actualAmount.trim();
  const blockchainReceivedAt = new Date(blockchainReceivedAtValue);

  if (normalizedHash.length < 8 || normalizedHash.length > 2000) {
    return {
      success: false as const,
      error: "Enter a valid blockchain transaction hash.",
    };
  }

  if (
    !/^\d{1,12}(?:\.\d{1,18})?$/.test(normalizedAmount) ||
    /^0+(?:\.0+)?$/.test(normalizedAmount)
  ) {
    return {
      success: false as const,
      error: "Enter the actual received amount, greater than zero, with no more than 18 decimal places.",
    };
  }

  if (!Number.isFinite(blockchainReceivedAt.getTime())) {
    return {
      success: false as const,
      error: "Enter a valid blockchain receipt date and time.",
    };
  }

  try {
    const initialDeposit = await prisma.walletCryptoDeposit.findUnique({
      where: { id: depositId },
      select: {
        id: true,
        userId: true,
        asset: true,
        status: true,
        countryCode: true,
        currency: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    if (!initialDeposit) {
      return {
        success: false as const,
        error: "Wallet crypto deposit could not be found.",
      };
    }

    if (initialDeposit.status !== "PENDING") {
      return {
        success: false as const,
        error: "This wallet crypto deposit has already been reviewed.",
      };
    }

    if (
      blockchainReceivedAt.getTime() < initialDeposit.createdAt.getTime() ||
      blockchainReceivedAt.getTime() > initialDeposit.expiresAt.getTime()
    ) {
      return {
        success: false as const,
        error: "The blockchain receipt time must be within the customer's five-minute deposit window. This request was not credited.",
      };
    }

    const customer = await prisma.user.findUnique({
      where: { id: initialDeposit.userId },
      select: { countryCode: true },
    });

    const countryConfig = getCountryFinancialConfig(customer?.countryCode);

    if (
      !countryConfig ||
      countryConfig.code !== initialDeposit.countryCode ||
      countryConfig.currency !== initialDeposit.currency
    ) {
      return {
        success: false as const,
        error: "The customer's registered country or currency has changed. This request cannot be approved using the old country details.",
      };
    }

    const receivedAmount = new Prisma.Decimal(normalizedAmount);

    const [cryptoPrice, fxRate] = await Promise.all([
      getVerifiedCryptoUsdPrice(
        initialDeposit.asset as DepositCryptoAssetCode,
      ),
      getVerifiedUsdFxRate(countryConfig.currency),
    ]);

    const cryptoUsdRate = new Prisma.Decimal(String(cryptoPrice.rate));
    const usdFxRate = new Prisma.Decimal(String(fxRate.rate));

    const usdAmount = receivedAmount
      .mul(cryptoUsdRate)
      .toDecimalPlaces(2);

    const localAmount = usdAmount
      .mul(usdFxRate)
      .toDecimalPlaces(2);

    if (usdAmount.lte(0) || localAmount.lte(0)) {
      return {
        success: false as const,
        error: "The verified amount is too small to credit safely after currency rounding.",
      };
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const deposit = await tx.walletCryptoDeposit.findUnique({
          where: { id: depositId },
        });

        if (!deposit || deposit.status !== "PENDING") {
          throw new Error("DEPOSIT_ALREADY_REVIEWED");
        }

        if (
          blockchainReceivedAt.getTime() < deposit.createdAt.getTime() ||
          blockchainReceivedAt.getTime() > deposit.expiresAt.getTime()
        ) {
          throw new Error("RECEIPT_OUTSIDE_DEPOSIT_WINDOW");
        }

        if (
          deposit.countryCode !== countryConfig.code ||
          deposit.currency !== countryConfig.currency
        ) {
          throw new Error("COUNTRY_CONFIGURATION_CHANGED");
        }

        const duplicateHash = await tx.walletCryptoDeposit.findFirst({
          where: {
            transactionHash: normalizedHash,
            id: { not: deposit.id },
          },
          select: { id: true },
        });

        if (duplicateHash) {
          throw new Error("TRANSACTION_HASH_ALREADY_USED");
        }

        const wallet = await tx.wallet.findUnique({
          where: { userId: deposit.userId },
          select: {
            id: true,
            cashBalance: true,
          },
        });

        if (!wallet) {
          throw new Error("CUSTOMER_WALLET_NOT_FOUND");
        }

        const claimed = await tx.walletCryptoDeposit.updateMany({
          where: {
            id: deposit.id,
            status: "PENDING",
            transactionId: null,
          },
          data: {
            transactionHash: normalizedHash,
            blockchainReceivedAt,
            status: "COMPLETED",
            verifiedAmount: receivedAmount,
            usdAmount,
            localAmount,
            cryptoUsdRate: cryptoUsdRate.toDecimalPlaces(8),
            cryptoPriceSource: cryptoPrice.source,
            cryptoPriceObservedAt: cryptoPrice.observedAt,
            usdFxRate: usdFxRate.toDecimalPlaces(8),
            fxSource: fxRate.source,
            fxObservedAt: fxRate.observedAt,
            reviewedById: admin.id,
            reviewedAt: new Date(),
          },
        });

        if (claimed.count !== 1) {
          throw new Error("DEPOSIT_ALREADY_REVIEWED");
        }

        const balanceBefore = wallet.cashBalance;
        const balanceAfter = balanceBefore.add(usdAmount);

        const transaction = await tx.transaction.create({
          data: {
            userId: deposit.userId,
            type: "DEPOSIT",
            status: "COMPLETED",
            balanceType: "CASH",
            amount: localAmount,
            currency: countryConfig.currency,
            usdAmount,
            exchangeRate: usdFxRate.toDecimalPlaces(8),
            description: `Wallet crypto deposit approved: ${receivedAmount.toString()} ${deposit.asset}. Credited to main cash wallet.`,
            reference: `${deposit.reference}-CASH`,
            approvedById: admin.id,
            approvedAt: new Date(),
          },
        });

        await tx.wallet.update({
          where: { id: wallet.id },
          data: { cashBalance: balanceAfter },
        });

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
            description: `Verified ${deposit.asset} wallet deposit. Main cash wallet credit only.`,
          },
        });

        await tx.walletCryptoDeposit.update({
          where: { id: deposit.id },
          data: { transactionId: transaction.id },
        });

        return {
          asset: deposit.asset,
          amount: receivedAmount.toString(),
          usdAmount: usdAmount.toFixed(2),
          localAmount: localAmount.toFixed(2),
          currency: countryConfig.currency,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    refreshWalletCryptoPaths(depositId);

    return {
      success: true as const,
      message: `${result.amount} ${result.asset} verified. ${result.usdAmount} USD was credited to the customer's main cash wallet (${result.localAmount} ${result.currency} equivalent).`,
    };
  } catch (error) {
    console.error("Wallet crypto deposit approval failed:", error);

    if (error instanceof Error) {
      if (error.message === "DEPOSIT_ALREADY_REVIEWED") {
        return {
          success: false as const,
          error: "This wallet crypto deposit has already been reviewed.",
        };
      }

      if (error.message === "RECEIPT_OUTSIDE_DEPOSIT_WINDOW") {
        return {
          success: false as const,
          error: "The blockchain receipt time is outside the five-minute deposit window. No wallet credit was made.",
        };
      }

      if (error.message === "TRANSACTION_HASH_ALREADY_USED") {
        return {
          success: false as const,
          error: "This blockchain transaction hash has already been recorded.",
        };
      }

      if (error.message === "COUNTRY_CONFIGURATION_CHANGED") {
        return {
          success: false as const,
          error: "The customer's registered country or currency changed. The request was not credited.",
        };
      }

      if (error.message === "CUSTOMER_WALLET_NOT_FOUND") {
        return {
          success: false as const,
          error: "The customer's main wallet could not be found. No funds were credited.",
        };
      }
    }

    return {
      success: false as const,
      error: "Approval failed. Check the verified rates and try again. No partial wallet credit was made.",
    };
  }
}

export async function rejectWalletCryptoDeposit(
  depositId: string,
  rejectionReason: string,
) {
  const admin = await getAdminUser();

  if (!admin) {
    return {
      success: false as const,
      error: "You are not authorized to perform this action.",
    };
  }

  const reason = rejectionReason.trim();

  if (!reason) {
    return {
      success: false as const,
      error: "Please provide a rejection reason.",
    };
  }

  if (reason.length > 1000) {
    return {
      success: false as const,
      error: "The rejection reason must be 1000 characters or less.",
    };
  }

  try {
    const result = await prisma.walletCryptoDeposit.updateMany({
      where: {
        id: depositId,
        status: "PENDING",
        transactionId: null,
      },
      data: {
        status: "REJECTED",
        rejectionReason: reason,
        reviewedById: admin.id,
        reviewedAt: new Date(),
      },
    });

    if (result.count !== 1) {
      const exists = await prisma.walletCryptoDeposit.findUnique({
        where: { id: depositId },
        select: { id: true },
      });

      return {
        success: false as const,
        error: exists
          ? "This wallet crypto deposit has already been reviewed."
          : "Wallet crypto deposit could not be found.",
      };
    }

    refreshWalletCryptoPaths(depositId);

    return {
      success: true as const,
      message: "Wallet crypto deposit rejected.",
    };
  } catch (error) {
    console.error("Wallet crypto deposit rejection failed:", error);

    return {
      success: false as const,
      error: "We could not reject this wallet crypto deposit. Please try again.",
    };
  }
}