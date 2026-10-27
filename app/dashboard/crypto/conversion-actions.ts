"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  Prisma,
  type CryptoAsset,
  type CryptoNetwork,
} from "@/generated/prisma/client";
import type { CryptoAssetCode } from "@/lib/crypto/prices";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  getVerifiedCryptoUsdPrice,
  getVerifiedUsdFxRate,
} from "@/lib/crypto-finance/verified-prices";
import {
  createConversionQuote,
  isConversionQuoteExpired,
} from "@/lib/crypto-finance/conversion-quote";
import {
  encryptBankAccountNumber,
  getBankAccountLast4,
  normalizeBankAccountNumber,
} from "@/lib/crypto-finance/bank-account-security";
import { getCountryFinancialConfig } from "@/lib/countries";
import { getWithdrawalCountryConfig } from "@/lib/withdrawal";

const SUPPORTED_PAIRS: Record<string, CryptoNetwork> = {
  "USDC:ETHEREUM": "ETHEREUM",
  "USDT:TRON": "TRON",
  "BTC:BITCOIN": "BITCOIN",
  "ETH:ETHEREUM": "ETHEREUM",
  "SOL:SOLANA": "SOLANA",
  "TRN:TRON": "TRON",
  "XLM:STELLAR": "STELLAR",
};

type ConversionResult =
  | {
      success: true;
      message: string;
      reference: string;
      payoutAmount: string;
      payoutCurrency: string;
      cryptoAmount: string;
      quoteExpiresAt: string;
    }
  | { success: false; error: string };

function requiredText(
  value: FormDataEntryValue | null,
  label: string,
  maxLength: number,
): string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.trim().length > maxLength
  ) {
    throw new Error(`Enter a valid ${label}.`);
  }

  return value.trim();
}

function parseCryptoAmount(value: FormDataEntryValue | null): string {
  if (
    typeof value !== "string" ||
    value.trim().length > 80 ||
    !/^\d+(?:\.\d{1,18})?$/.test(value.trim())
  ) {
    throw new Error("Enter a valid crypto amount with up to 18 decimal places.");
  }

  const amount = new Prisma.Decimal(value.trim());

  if (!amount.isFinite() || amount.lte(0)) {
    throw new Error("The crypto amount must be greater than zero.");
  }

  return amount.toFixed();
}

function getAssetPair(
  assetValue: FormDataEntryValue | null,
  networkValue: FormDataEntryValue | null,
): { asset: CryptoAsset; network: CryptoNetwork } {
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
  const {
    data: { user: authUser },
    error,
  } = await supabase.auth.getUser();

  if (error || !authUser) return null;

  return prisma.user.findUnique({
    where: { authUserId: authUser.id },
    select: {
      id: true,
      fullName: true,
      countryCode: true,
    },
  });
}

/**
 * Creates a short-lived server-priced estimate and reserves the crypto.
 * This action does not pay the bank account or credit the cash wallet.
 */
export async function estimateCryptoCashConversion(
  assetInput: string,
  networkInput: string,
  amountInput: string,
): Promise<
  | { success: true; payoutAmount: string; payoutCurrency: string }
  | { success: false; error: string }
> {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return { success: false, error: "Please log in to continue." };
    }

    const country = getCountryFinancialConfig(user.countryCode);

    if (!country) {
      return {
        success: false,
        error: "Your registered country's payout currency is not configured.",
      };
    }

    const amountForm = new FormData();
    amountForm.set("cryptoAmount", amountInput.replace(/,/g, ""));
    const cryptoAmount = parseCryptoAmount(amountForm.get("cryptoAmount"));
    const { asset } = getAssetPair(assetInput, networkInput);

    const [cryptoRate, fxRate] = await Promise.all([
      getVerifiedCryptoUsdPrice(asset as CryptoAssetCode),
      getVerifiedUsdFxRate(country.currency),
    ]);

    const quote = createConversionQuote({
      asset: asset as CryptoAssetCode,
      cryptoAmount,
      cryptoUsdPrice: cryptoRate,
      usdToLocalRate: fxRate,
      payoutCurrency: country.currency,
      feeUsd: "0",
    });

    if (quote.settlementReady || isConversionQuoteExpired(quote)) {
      return {
        success: false,
        error: "A current estimate is unavailable. Please try again.",
      };
    }

    return {
      success: true,
      payoutAmount: quote.payoutAmount,
      payoutCurrency: quote.payoutCurrency,
    };
  } catch {
    return {
      success: false,
      error: "A current payout estimate is unavailable.",
    };
  }
}
export async function submitCryptoCashConversion(
  formData: FormData,
): Promise<ConversionResult> {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return { success: false, error: "Please log in to continue." };
    }

    const country = getCountryFinancialConfig(user.countryCode);

    if (!country) {
      return {
        success: false,
        error: "Your registered country is not configured for cash conversion.",
      };
    }

    const { asset, network } = getAssetPair(
      formData.get("asset"),
      formData.get("network"),
    );

    const cryptoAmount = parseCryptoAmount(formData.get("cryptoAmount"));
    const bankConfig = getWithdrawalCountryConfig(user.countryCode);

    if (!bankConfig) {
      throw new Error("Bank payouts are not configured for your registered country.");
    }

    const bankName = requiredText(formData.get("bankName"), "bank name", 100);

    if (!bankConfig.banks.includes(bankName)) {
      throw new Error("Choose a supported bank for your registered country.");
    }

    const accountName = user.fullName?.trim();

    if (!accountName) {
      throw new Error("Add your full name to your profile before requesting a bank conversion.");
    }

    const rawAccountNumber = requiredText(
      formData.get("accountNumber"),
      "bank account number",
      80,
    );

    const normalizedAccountNumber =
      normalizeBankAccountNumber(rawAccountNumber);

    if (!normalizedAccountNumber) {
      throw new Error("Enter a valid bank account number.");
    }

    // Never accept price, FX rate, payout currency, or payout amount
    // from the browser. The registered country selects the currency.
    const [cryptoRate, fxRate] = await Promise.all([
      getVerifiedCryptoUsdPrice(asset as CryptoAssetCode),
      getVerifiedUsdFxRate(country.currency),
    ]);

    const quote = createConversionQuote({
      asset: asset as CryptoAssetCode,
      cryptoAmount,
      cryptoUsdPrice: cryptoRate,
      usdToLocalRate: fxRate,
      payoutCurrency: country.currency,
      feeUsd: "0",
    });

    if (quote.settlementReady || isConversionQuoteExpired(quote)) {
      return {
        success: false,
        error: "The conversion quote is not ready. Please request a new quote.",
      };
    }

    const reference =
      `MCC-${randomUUID().replaceAll("-", "").toUpperCase()}`;

    const encryptedAccountNumber =
      encryptBankAccountNumber(normalizedAccountNumber);

    const accountNumberLast4 =
      getBankAccountLast4(normalizedAccountNumber);

    const cryptoAmountDecimal = new Prisma.Decimal(quote.cryptoAmount);
    const now = new Date();

    await prisma.$transaction(
      async (tx) => {
        const balance = await tx.cryptoBalance.findUnique({
          where: {
            userId_asset_network: {
              userId: user.id,
              asset,
              network,
            },
          },
        });

        if (!balance) {
          throw new Error("INSUFFICIENT_AVAILABLE_CRYPTO");
        }

        const available = balance.balance.sub(balance.reservedBalance);

        if (available.lt(cryptoAmountDecimal)) {
          throw new Error("INSUFFICIENT_AVAILABLE_CRYPTO");
        }

        // Compare-and-set reservation: prevents this request from
        // reserving crypto already reserved by another operation.
        const reservation = await tx.cryptoBalance.updateMany({
          where: {
            id: balance.id,
            balance: balance.balance,
            reservedBalance: balance.reservedBalance,
          },
          data: {
            reservedBalance: { increment: cryptoAmountDecimal },
          },
        });

        if (reservation.count !== 1) {
          throw new Error("BALANCE_CHANGED");
        }

        await tx.cryptoCashConversion.create({
          data: {
            userId: user.id,
            cryptoBalanceId: balance.id,
            reference,
            asset,
            network,
            cryptoAmount: cryptoAmountDecimal,
            cryptoUsdPrice: new Prisma.Decimal(quote.cryptoUsdPrice),
            cryptoPriceSource: quote.cryptoPriceSource,
            cryptoPriceObservedAt: new Date(quote.cryptoPriceObservedAt),
            usdToLocalRate: new Prisma.Decimal(quote.usdToLocalRate),
            fxRateSource: quote.fxRateSource,
            fxRateObservedAt: new Date(quote.fxRateObservedAt),
            usdValue: new Prisma.Decimal(quote.usdValue),
            feeUsd: new Prisma.Decimal(quote.feeUsd),
            payoutAmount: new Prisma.Decimal(quote.payoutAmount),
            payoutCurrency: country.currency,
            countryCode: country.code,
            bankName,
            accountName,
            accountNumberEncrypted: encryptedAccountNumber,
            accountNumberLast4,
            routingNumberEncrypted: null,
            quoteExpiresAt: new Date(quote.expiresAt),
            reservedAt: now,
            status: "PENDING",
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    revalidatePath("/dashboard/crypto");
    revalidatePath("/admin/crypto");

    return {
      success: true,
      message:
        "Conversion submitted for administrator review. Your crypto is reserved; bank payout has not yet been completed.",
      reference,
      payoutAmount: quote.payoutAmount,
      payoutCurrency: quote.payoutCurrency,
      cryptoAmount: quote.cryptoAmount,
      quoteExpiresAt: quote.expiresAt,
    };
  } catch (error) {
    const code = error instanceof Error ? error.message : "";

    if (code === "INSUFFICIENT_AVAILABLE_CRYPTO") {
      return {
        success: false,
        error: "Your available balance in the selected crypto asset is insufficient.",
      };
    }

    if (code === "BALANCE_CHANGED") {
      return {
        success: false,
        error: "Your balance changed during this request. Refresh and try again.",
      };
    }

    if (
      code.includes("account number") ||
      code.includes("bank name") ||
      code.includes("account name") ||
      code.includes("crypto amount")
    ) {
      return { success: false, error: code };
    }

    console.error("Crypto cash conversion submission failed", error);

    return {
      success: false,
      error:
        "We could not submit the conversion. Check the details and current market rates, then try again.",
    };
  }
}