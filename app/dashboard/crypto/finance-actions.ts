"use server";

import { Prisma, type CryptoAsset, type CryptoNetwork } from "@/generated/prisma";
import type { DepositCryptoAssetCode } from "@/lib/crypto/prices";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedCryptoUsdPrice } from "@/lib/crypto-finance/verified-prices";

const MINIMUM_LOAN_USD = new Prisma.Decimal("1000");
const COLLATERAL_RATIO = new Prisma.Decimal("0.40");
const TERMS_VERSION = "crypto-loan-v1";

const SUPPORTED_PAIRS: Record<string, CryptoNetwork> = {
  "USDC:ETHEREUM": "ETHEREUM",
  "USDT:TRON": "TRON",
  "BTC:BITCOIN": "BITCOIN",
  "ETH:ETHEREUM": "ETHEREUM",
  "SOL:SOLANA": "SOLANA",
  "XLM:STELLAR": "STELLAR",
  "BNB:BNB_SMART_CHAIN": "BNB_SMART_CHAIN",
  "TRX:TRON": "TRON",
  "SUI:SUI": "SUI",
};

const LOAN_TERMS =
  "By applying for a MooGold Crypto Loan, you acknowledge that you are responsible for repaying the borrowed cryptocurrency in accordance with the applicable loan terms. Failure to meet your repayment obligations may result in recovery action, including legal action where permitted by applicable law. Your pledged crypto collateral may also be affected under the loan agreement.";

type ActionResult =
  | { success: true; message: string; reference?: string }
  | { success: false; error: string };

function parsePositiveDecimal(value: FormDataEntryValue | null): Prisma.Decimal {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > 80) {
    throw new Error("Enter a valid positive amount.");
  }

  // Accept ordinary decimal notation only; reject exponent notation.
  if (!/^\d+(?:\.\d{1,18})?$/.test(value.trim())) {
    throw new Error("Enter a valid amount with no more than 18 decimal places.");
  }

  const amount = new Prisma.Decimal(value.trim());

  if (!amount.isFinite() || amount.lte(0)) {
    throw new Error("The amount must be greater than zero.");
  }

  return amount;
}

function parseAsset(value: FormDataEntryValue | null): CryptoAsset {
  if (typeof value !== "string" || !Object.prototype.hasOwnProperty.call(
    SUPPORTED_PAIRS,
    `${value}:unused`,
  )) {
    // Asset/network are validated together by getPair below.
    if (typeof value !== "string" || !["USDC", "USDT", "BTC", "ETH", "SOL", "XLM", "BNB", "TRX", "SUI"].includes(value)) {
      throw new Error("Choose a supported crypto asset.");
    }
  }

  return value as CryptoAsset;
}

function getPair(assetValue: FormDataEntryValue | null, networkValue: FormDataEntryValue | null) {
  if (typeof assetValue !== "string" || typeof networkValue !== "string") {
    throw new Error("Choose a supported crypto asset and network.");
  }

  const network = SUPPORTED_PAIRS[`${assetValue}:${networkValue}`];

  if (!network) {
    throw new Error("That crypto asset and network combination is not supported.");
  }

  return {
    asset: assetValue as CryptoAsset,
    network,
  };
}

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user: authUser }, error } = await supabase.auth.getUser();

  if (error || !authUser) return null;

  return prisma.user.findUnique({
    where: { authUserId: authUser.id },
    select: { id: true, countryCode: true },
  });
}

function newReference(prefix: string) {
  return `${prefix}-${crypto.randomUUID().replaceAll("-", "").toUpperCase()}`;
}

/**
 * Originate a zero-interest crypto loan.
 * The form supplies a USD principal target, the borrowed asset/network,
 * and the collateral asset/network. Prices are fetched server-side.
 */
export async function originateCryptoLoan(formData: FormData): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return { success: false, error: "Please log in to continue." };
    }

    if (formData.get("acceptTerms") !== "on") {
      return { success: false, error: "Please review and accept the loan terms." };
    }

    const requestedUsd = parsePositiveDecimal(formData.get("principalUsd"));
    if (requestedUsd.lt(MINIMUM_LOAN_USD)) {
      return { success: false, error: "The minimum crypto loan is $1,000 USD equivalent." };
    }

    const borrowed = getPair(formData.get("borrowedAsset"), formData.get("borrowedNetwork"));
    const collateral = getPair(formData.get("collateralAsset"), formData.get("collateralNetwork"));

    const [principalRate, collateralRate] = await Promise.all([
      getVerifiedCryptoUsdPrice(borrowed.asset as DepositCryptoAssetCode),
      getVerifiedCryptoUsdPrice(collateral.asset as DepositCryptoAssetCode),
    ]);

    const principalPrice = new Prisma.Decimal(String(principalRate.rate));
    const collateralPrice = new Prisma.Decimal(String(collateralRate.rate));

    // Round asset quantities up to 18 decimals so rounding cannot underfund
    // the requested principal or the required collateral value.
    const principalAmount = requestedUsd.div(principalPrice).toDecimalPlaces(18, Prisma.Decimal.ROUND_UP);
    const principalUsdValue = principalAmount.mul(principalPrice);
    const requiredCollateralUsd = principalUsdValue.mul(COLLATERAL_RATIO);
    const collateralAmount = requiredCollateralUsd.div(collateralPrice).toDecimalPlaces(18, Prisma.Decimal.ROUND_UP);
    const collateralUsdValue = collateralAmount.mul(collateralPrice);

    if (
      !principalAmount.isFinite() ||
      !collateralAmount.isFinite() ||
      principalAmount.lte(0) ||
      collateralAmount.lte(0) ||
      principalUsdValue.lt(MINIMUM_LOAN_USD) ||
      collateralUsdValue.lt(requiredCollateralUsd)
    ) {
      return { success: false, error: "The loan quote could not be calculated safely. Please try again." };
    }

    const reference = newReference("MLN");
    const now = new Date();

    const loan = await prisma.$transaction(async (tx) => {
      // Ensure both balance rows exist before the reservation and credit.
      const collateralBalance = await tx.cryptoBalance.upsert({
        where: {
          userId_asset_network: {
            userId: user.id,
            asset: collateral.asset,
            network: collateral.network,
          },
        },
        create: {
          userId: user.id,
          asset: collateral.asset,
          network: collateral.network,
          balance: new Prisma.Decimal(0),
          reservedBalance: new Prisma.Decimal(0),
        },
        update: {},
      });

      const borrowedBalance = await tx.cryptoBalance.upsert({
        where: {
          userId_asset_network: {
            userId: user.id,
            asset: borrowed.asset,
            network: borrowed.network,
          },
        },
        create: {
          userId: user.id,
          asset: borrowed.asset,
          network: borrowed.network,
          balance: new Prisma.Decimal(0),
          reservedBalance: new Prisma.Decimal(0),
        },
        update: {},
      });

      const availableCollateral = collateralBalance.balance.sub(collateralBalance.reservedBalance);

      if (availableCollateral.lt(collateralAmount)) {
        throw new Error("INSUFFICIENT_COLLATERAL");
      }

      // Compare-and-set prevents concurrent withdrawals/loans from reserving
      // the same collateral twice.
      const reservation = await tx.cryptoBalance.updateMany({
        where: {
          id: collateralBalance.id,
          balance: collateralBalance.balance,
          reservedBalance: collateralBalance.reservedBalance,
        },
        data: {
          reservedBalance: { increment: collateralAmount },
        },
      });

      if (reservation.count !== 1) {
        throw new Error("BALANCE_CHANGED");
      }

      const createdLoan = await tx.cryptoLoan.create({
        data: {
          userId: user.id,
          cryptoBalanceId: collateralBalance.id,
          borrowedCryptoBalanceId: borrowedBalance.id,
          reference,
          principalAmount,
          collateralAmount,
          principalUsdValue,
          collateralUsdValue,
          principalUsdPriceAtOrigination: principalPrice,
          principalPriceSource: principalRate.source,
          principalPriceObservedAt: principalRate.observedAt,
          collateralUsdPriceAtOrigination: collateralPrice,
          collateralPriceSource: collateralRate.source,
          collateralPriceObservedAt: collateralRate.observedAt,
          termsVersion: TERMS_VERSION,
          termsAcceptedAt: now,
          termsAcceptedText: LOAN_TERMS,
          repaidAmount: new Prisma.Decimal(0),
          interestRate: new Prisma.Decimal(0),
          status: "ACTIVE",
        },
      });

      const latestBorrowedBalance = await tx.cryptoBalance.findUniqueOrThrow({
        where: { id: borrowedBalance.id },
      });

      const credited = await tx.cryptoBalance.updateMany({
        where: {
          id: latestBorrowedBalance.id,
          balance: latestBorrowedBalance.balance,
          reservedBalance: latestBorrowedBalance.reservedBalance,
        },
        data: {
          balance: { increment: principalAmount },
        },
      });

      if (credited.count !== 1) {
        throw new Error("BALANCE_CHANGED");
      }

      await tx.cryptoLedgerEntry.create({
        data: {
          cryptoBalanceId: borrowedBalance.id,
          asset: borrowed.asset,
          network: borrowed.network,
          direction: "CREDIT",
          amount: principalAmount,
          balanceBefore: latestBorrowedBalance.balance,
          balanceAfter: latestBorrowedBalance.balance.add(principalAmount),
          reservedBalanceBefore: latestBorrowedBalance.reservedBalance,
          reservedBalanceAfter: latestBorrowedBalance.reservedBalance,
          loanId: createdLoan.id,
          operationKey: `${reference}:ORIGINATION`,
          description: `Crypto loan principal credited (${reference})`,
        },
      });

      return createdLoan;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    return {
      success: true,
      message: "Your crypto loan was created and the borrowed crypto was credited. Your collateral is reserved until full repayment.",
      reference: loan.reference,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_COLLATERAL") {
      return { success: false, error: "Your available crypto balance is insufficient for the required 40% collateral." };
    }

    if (error instanceof Error && error.message === "BALANCE_CHANGED") {
      return { success: false, error: "Your balance changed during this request. Please refresh and try again." };
    }

    console.error("Crypto loan origination failed", error);
    return {
      success: false,
      error: "We could not create the loan. Verify the selected assets and current market prices, then try again.",
    };
  }
}

/**
 * Repay an active loan in the same crypto asset/network that was borrowed.
 * Repayments reduce principal only. Collateral is released atomically on full
 * repayment, never on a partial payment.
 */
export async function repayCryptoLoan(formData: FormData): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return { success: false, error: "Please log in to continue." };
    }

    const loanId = formData.get("loanId");
    if (typeof loanId !== "string" || loanId.length < 1 || loanId.length > 128) {
      return { success: false, error: "Choose a valid loan." };
    }

    const amount = parsePositiveDecimal(formData.get("amount"));
    const reference = newReference("MRP");

    await prisma.$transaction(async (tx) => {
      const loan = await tx.cryptoLoan.findFirst({
        where: {
          id: loanId,
          userId: user.id,
          status: "ACTIVE",
        },
        include: {
          borrowedCryptoBalance: true,
          cryptoBalance: true,
        },
      });

      if (!loan) throw new Error("LOAN_NOT_ACTIVE");

      const outstanding = loan.principalAmount.sub(loan.repaidAmount);
      if (amount.gt(outstanding)) throw new Error("OVERPAYMENT");

      const borrowedBalance = loan.borrowedCryptoBalance;
      const available = borrowedBalance.balance.sub(borrowedBalance.reservedBalance);

      if (available.lt(amount)) throw new Error("INSUFFICIENT_REPAYMENT_BALANCE");

      const debit = await tx.cryptoBalance.updateMany({
        where: {
          id: borrowedBalance.id,
          balance: borrowedBalance.balance,
          reservedBalance: borrowedBalance.reservedBalance,
        },
        data: {
          balance: { decrement: amount },
        },
      });

      if (debit.count !== 1) throw new Error("BALANCE_CHANGED");

      const balanceAfter = borrowedBalance.balance.sub(amount);
      const remaining = outstanding.sub(amount);
      const isFullyRepaid = remaining.isZero();

      const ledger = await tx.cryptoLedgerEntry.create({
        data: {
          cryptoBalanceId: borrowedBalance.id,
          asset: borrowedBalance.asset,
          network: borrowedBalance.network,
          direction: "DEBIT",
          amount,
          balanceBefore: borrowedBalance.balance,
          balanceAfter,
          reservedBalanceBefore: borrowedBalance.reservedBalance,
          reservedBalanceAfter: borrowedBalance.reservedBalance,
          loanId: loan.id,
          operationKey: `${reference}:REPAYMENT`,
          description: `Crypto loan principal repayment (${loan.reference})`,
        },
      });

      await tx.cryptoLoanRepayment.create({
        data: {
          loanId: loan.id,
          ledgerEntryId: ledger.id,
          amount,
          reference,
        },
      });

      const updatedLoan = await tx.cryptoLoan.updateMany({
        where: {
          id: loan.id,
          userId: user.id,
          status: "ACTIVE",
          repaidAmount: loan.repaidAmount,
        },
        data: {
          repaidAmount: { increment: amount },
          ...(isFullyRepaid ? { status: "REPAID", repaidAt: new Date() } : {}),
        },
      });

      if (updatedLoan.count !== 1) throw new Error("LOAN_CHANGED");

      if (isFullyRepaid) {
        const collateralBalance = await tx.cryptoBalance.findUniqueOrThrow({
          where: { id: loan.cryptoBalance.id },
        });

        if (collateralBalance.reservedBalance.lt(loan.collateralAmount)) {
          throw new Error("COLLATERAL_RESERVATION_INVALID");
        }

        const release = await tx.cryptoBalance.updateMany({
          where: {
            id: collateralBalance.id,
            balance: collateralBalance.balance,
            reservedBalance: collateralBalance.reservedBalance,
          },
          data: {
            reservedBalance: { decrement: loan.collateralAmount },
          },
        });

        if (release.count !== 1) throw new Error("BALANCE_CHANGED");

        await tx.cryptoLoan.update({
          where: { id: loan.id },
          data: { collateralReleasedAt: new Date() },
        });
      }
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    return {
      success: true,
      message: "Your principal repayment was processed. Collateral is released only when the loan is fully repaid.",
      reference,
    };
  } catch (error) {
    const code = error instanceof Error ? error.message : "";

    if (code === "LOAN_NOT_ACTIVE") {
      return { success: false, error: "This loan is not active or does not belong to your account." };
    }
    if (code === "OVERPAYMENT") {
      return { success: false, error: "The repayment cannot exceed the outstanding principal." };
    }
    if (code === "INSUFFICIENT_REPAYMENT_BALANCE") {
      return { success: false, error: "Your available balance in the borrowed asset is insufficient for this repayment." };
    }
    if (code === "BALANCE_CHANGED" || code === "LOAN_CHANGED") {
      return { success: false, error: "Your balance or loan changed during this request. Refresh and try again." };
    }
    if (code === "COLLATERAL_RESERVATION_INVALID") {
      return { success: false, error: "The collateral reservation needs administrator review. No repayment changes were committed." };
    }

    console.error("Crypto loan repayment failed", error);
    return { success: false, error: "We could not process the repayment. Please try again." };
  }
}