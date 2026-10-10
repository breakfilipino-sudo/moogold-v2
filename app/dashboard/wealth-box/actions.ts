"use server";

import { sendAdminEmailAlert } from "@/lib/admin-email-alerts";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

const CARD_PAYMENT_URL =
  "https://elderlycarepays.wordpress.com/";

const CRYPTO_OPTIONS = {
  USDC: {
    network: "ETHEREUM" as const,
    networkLabel: "Ethereum (ERC-20)",
    receivingAddress:
      "0x12C844aeA5FFe9271fb6f2F1e1fd1811512B4ad1",
  },

  USDT: {
    network: "TRON" as const,
    networkLabel: "Tron (TRC-20)",
    receivingAddress:
      "TKrbT8qikYzZd8tBwPQ2teaLZCV4aJ5NKg",
  },

  BTC: {
    network: "BITCOIN" as const,
    networkLabel: "Bitcoin",
    receivingAddress:
      "33a54tDd51n13TMYi6KqZ3WUdo2LpQcnqC",
  },

  ETH: {
    network: "ETHEREUM" as const,
    networkLabel: "Ethereum (ERC-20)",
    receivingAddress:
      "0xae70A129dfd37186C70697494B08c4151C408717",
  },

  SOL: {
    network: "SOLANA" as const,
    networkLabel: "Solana",
    receivingAddress:
      "GFenbSRhcZwPg7KE85AJS4AB7khUeVdBkUSQjuJj2xDj",
  },

  TRN: {
    network: "TRON" as const,
    networkLabel: "Tron",
    receivingAddress:
      "TLGGvkFbJWtT3jvxx8uss14Mshmrz7Kenx",
  },

  XLM: {
    network: "STELLAR" as const,
    networkLabel: "Stellar",
    receivingAddress:
      "GD5LP2XKZV2QJBY3VIJTTC6ECN3LGJQMCJXSAYPPXZHWGVTJOQM5H3MP",
  },
} as const;

type CryptoAsset = keyof typeof CRYPTO_OPTIONS;

type WealthFundingResult =
  | {
      success: true;
      fundingId: string;
      status: string;
      localAmount: number;
      usdAmount: number;
      exchangeRate: number;
      maturityAmountUsd: number;
      payoutDate: string;
      reference: string;
    }
  | {
      success: false;
      error: string;
    };

type CryptoFundingResult =
  | {
      success: true;
      fundingId: string;
      cryptoDepositId: string;
      asset: CryptoAsset;
      network: string;
      networkLabel: string;
      receivingAddress: string;
      localAmount: number;
      usdAmount: number;
      payoutDate: string;
      status: string;
    }
  | {
      success: false;
      error: string;
    };

function generateFundingReference() {
  const timestamp = Date.now()
    .toString(36)
    .toUpperCase();

  const random = Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase();

  return `WBF-${timestamp}-${random}`;
}

function getCryptoAsset(
  value: string,
): CryptoAsset | null {
  const normalized = value.trim().toUpperCase();

  if (
    !Object.prototype.hasOwnProperty.call(
      CRYPTO_OPTIONS,
      normalized,
    )
  ) {
    return null;
  }

  return normalized as CryptoAsset;
}

async function getLocalToUsdRate(
  localCurrency: string,
) {
  if (localCurrency === "USD") {
    return 1;
  }

  const response = await fetch(
    `https://api.frankfurter.dev/v2/rate/USD/${encodeURIComponent(
      localCurrency,
    )}`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      "Unable to get the current exchange rate. Please try again.",
    );
  }

  const data = await response.json();

  const usdToLocalRate = Number(data?.rate);

  if (
    !Number.isFinite(usdToLocalRate) ||
    usdToLocalRate <= 0
  ) {
    throw new Error(
      "The current exchange rate is unavailable. Please try again.",
    );
  }

  return 1 / usdToLocalRate;
}

async function getValidatedFundingDetails(
  planId: string,
  amount: string,
) {
  if (!planId) {
    throw new Error(
      "Please choose an investment plan.",
    );
  }

  const cleanedAmount = amount
    .trim()
    .replace(/,/g, "");

  const localAmount = Number(cleanedAmount);

  if (
    !Number.isFinite(localAmount) ||
    localAmount <= 0
  ) {
    throw new Error(
      "Please enter a valid investment amount.",
    );
  }

  const roundedLocalAmount =
    Math.round(localAmount * 100) / 100;

  const { user } = await getCurrentUser();

  if (!user.countryCode) {
    throw new Error(
      "Your registered country could not be determined.",
    );
  }

  const plan = await prisma.wealthPlan.findFirst({
    where: {
      id: planId,
      active: true,
    },
  });

  if (!plan) {
    throw new Error(
      "This investment plan is no longer available.",
    );
  }

  const countryConfig =
    await prisma.wealthPlanCountry.findFirst({
      where: {
        planId: plan.id,
        countryCode: user.countryCode,
        active: true,
      },
    });

  if (!countryConfig) {
    throw new Error(
      "This investment plan is not available for your registered country.",
    );
  }

  const minimumLocalAmount = Number(
    countryConfig.minimumLocalAmount,
  );

  const maximumLocalAmount =
    countryConfig.maximumLocalAmount !== null
      ? Number(countryConfig.maximumLocalAmount)
      : null;

  if (
    !Number.isFinite(minimumLocalAmount) ||
    minimumLocalAmount <= 0
  ) {
    throw new Error(
      "This investment plan has an invalid minimum amount.",
    );
  }

  if (
    roundedLocalAmount < minimumLocalAmount
  ) {
    throw new Error(
      `The minimum investment is ${countryConfig.currencySymbol}${minimumLocalAmount.toLocaleString(
        "en-US",
      )}.`,
    );
  }

  if (
    maximumLocalAmount !== null &&
    roundedLocalAmount > maximumLocalAmount
  ) {
    throw new Error(
      `The maximum investment is ${countryConfig.currencySymbol}${maximumLocalAmount.toLocaleString(
        "en-US",
      )}.`,
    );
  }

  const localToUsdRate =
    await getLocalToUsdRate(
      countryConfig.currency,
    );

  const usdAmountRaw =
    roundedLocalAmount * localToUsdRate;

  const usdAmount =
    Math.round(usdAmountRaw * 100) / 100;

  if (
    !Number.isFinite(usdAmount) ||
    usdAmount <= 0
  ) {
    throw new Error(
      "The investment amount could not be converted to USD.",
    );
  }

  const returnPercentage = Number(
    plan.returnPercentage,
  );

  const durationDays = plan.durationDays;

  if (
    !Number.isFinite(returnPercentage) ||
    returnPercentage < 0 ||
    durationDays <= 0
  ) {
    throw new Error(
      "This investment plan has invalid settings.",
    );
  }

  const projectedProfitRaw =
    usdAmount *
    (returnPercentage / 100);

  const projectedProfitUsd =
    Math.round(projectedProfitRaw * 100) / 100;

  const maturityAmountUsd =
    Math.round(
      (usdAmount + projectedProfitUsd) * 100,
    ) / 100;

  const startDate = new Date();

  const payoutDate = new Date(startDate);

  payoutDate.setDate(
    payoutDate.getDate() + durationDays,
  );

  return {
    user,
    plan,
    countryConfig,
    roundedLocalAmount,
    localToUsdRate,
    usdAmount,
    returnPercentage,
    durationDays,
    projectedProfitUsd,
    maturityAmountUsd,
    payoutDate,
  };
}

/*
 * ============================================================
 * CREATE CARD WEALTH FUNDING
 * ============================================================
 *
 * This creates a PENDING WealthFunding record only.
 *
 * IMPORTANT:
 * - No wallet money is deducted.
 * - No WealthInvestment is created.
 * - The customer must complete the external card payment.
 * - Admin/payment confirmation will complete the funding later.
 * ============================================================
 */

export async function createCardWealthFunding(
  planId: string,
  amount: string,
): Promise<
  WealthFundingResult & {
    paymentUrl?: string;
  }
> {
  try {
    const details =
      await getValidatedFundingDetails(
        planId,
        amount,
      );

    const reference =
      generateFundingReference();

    const funding =
      await prisma.wealthFunding.create({
        data: {
          userId: details.user.id,
          planId: details.plan.id,

          paymentMethod: "CARD",
          status: "PENDING",

          principalLocal:
            details.roundedLocalAmount,

          principalUsd: details.usdAmount,

          localCurrency:
            details.countryConfig.currency,

          exchangeRate:
            details.localToUsdRate,

          returnPercentage:
            details.plan.returnPercentage,

          projectedProfitUsd:
            details.projectedProfitUsd,

          maturityAmountUsd:
            details.maturityAmountUsd,

          durationDays:
            details.durationDays,

          payoutDate:
            details.payoutDate,

          externalReference:
            reference,
        },

        select: {
          id: true,
          status: true,
          principalLocal: true,
          principalUsd: true,
          exchangeRate: true,
          maturityAmountUsd: true,
          payoutDate: true,
        },
      });

    revalidatePath(
      "/dashboard/wealth-box",
    );

    void sendAdminEmailAlert({
      subject: "Wealth Box card funding awaiting review",
      message:
        `A Wealth Box card funding request was created.\n` +
        `Funding ID: ${funding.id}\n` +
        `Reference: ${reference}\n` +
        `USD amount: $${Number(funding.principalUsd)}\n` +
        `Status: ${funding.status}`,
    });
    return {
      success: true,
      fundingId: funding.id,
      status: funding.status,
      localAmount: Number(
        funding.principalLocal,
      ),
      usdAmount: Number(
        funding.principalUsd,
      ),
      exchangeRate: Number(
        funding.exchangeRate,
      ),
      maturityAmountUsd: Number(
        funding.maturityAmountUsd,
      ),
      payoutDate:
        funding.payoutDate.toISOString(),
      reference,
      paymentUrl: CARD_PAYMENT_URL,
    };
  } catch (error) {
    console.error(
      "Failed to create Wealth Box card funding:",
      error,
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to start card payment. Please try again.",
    };
  }
}

/*
 * ============================================================
 * CREATE CRYPTO WEALTH FUNDING
 * ============================================================
 *
 * This creates:
 *
 * WealthFunding = PENDING
 * CryptoDeposit = PENDING
 *
 * The existing MooGold receiving wallet is used.
 *
 * IMPORTANT:
 * - No WealthInvestment is created.
 * - No wallet balance is changed.
 * - No crypto balance is credited.
 * ============================================================
 */

export async function createCryptoWealthFunding(
  planId: string,
  amount: string,
  assetInput: string,
): Promise<CryptoFundingResult> {
  try {
    const asset =
      getCryptoAsset(assetInput);

    if (!asset) {
      return {
        success: false,
        error:
          "Please choose a supported cryptocurrency.",
      };
    }

    const details =
      await getValidatedFundingDetails(
        planId,
        amount,
      );

    const cryptoOption =
      CRYPTO_OPTIONS[asset];

    const reference =
      generateFundingReference();

    const result =
      await prisma.$transaction(
        async (tx) => {
          const cryptoBalance =
            await tx.cryptoBalance.upsert({
              where: {
                userId_asset_network: {
                  userId: details.user.id,
                  asset,
                  network:
                    cryptoOption.network,
                },
              },

              update: {},

              create: {
                userId: details.user.id,
                asset,
                network:
                  cryptoOption.network,
                balance: 0,
              },
            });

          const cryptoDeposit =
            await tx.cryptoDeposit.create({
              data: {
                userId: details.user.id,

                cryptoBalanceId:
                  cryptoBalance.id,

                asset,

                network:
                  cryptoOption.network,

                receivingAddress:
                  cryptoOption.receivingAddress,

                status: "PENDING",

                description:
                  `Wealth Box funding reported using ${asset} via ${cryptoOption.networkLabel}. Awaiting MooGold payment verification.`,
              },

              select: {
                id: true,
              },
            });

          const funding =
            await tx.wealthFunding.create({
              data: {
                userId: details.user.id,
                planId: details.plan.id,

                paymentMethod: "CRYPTO",
                status: "PENDING",

                principalLocal:
                  details.roundedLocalAmount,

                principalUsd:
                  details.usdAmount,

                localCurrency:
                  details.countryConfig.currency,

                exchangeRate:
                  details.localToUsdRate,

                returnPercentage:
                  details.plan.returnPercentage,

                projectedProfitUsd:
                  details.projectedProfitUsd,

                maturityAmountUsd:
                  details.maturityAmountUsd,

                durationDays:
                  details.durationDays,

                payoutDate:
                  details.payoutDate,

                cryptoDepositId:
                  cryptoDeposit.id,

                externalReference:
                  reference,
              },

              select: {
                id: true,
                status: true,
              },
            });

          return {
            funding,
            cryptoDeposit,
          };
        },
      );

    revalidatePath(
      "/dashboard/wealth-box",
    );

    void sendAdminEmailAlert({
      subject: "Wealth Box crypto funding awaiting review",
      message:
        `A Wealth Box crypto funding request was created.\n` +
        `Funding ID: ${result.funding.id}\n` +
        `Crypto deposit ID: ${result.cryptoDeposit.id}\n` +
        `Reference: ${reference}\n` +
        `Asset: ${asset}\n` +
        `Network: ${cryptoOption.networkLabel}\n` +
        `USD amount: $${details.usdAmount}\n` +
        `Status: ${result.funding.status}`,
    });
    return {
      success: true,
      fundingId: result.funding.id,
      cryptoDepositId:
        result.cryptoDeposit.id,
      asset,
      network:
        cryptoOption.network,
      networkLabel:
        cryptoOption.networkLabel,
      receivingAddress:
        cryptoOption.receivingAddress,
      localAmount:
        details.roundedLocalAmount,
      usdAmount:
        details.usdAmount,
      payoutDate:
        details.payoutDate.toISOString(),
      status:
        result.funding.status,
    };
  } catch (error) {
    console.error(
      "Failed to create Wealth Box crypto funding:",
      error,
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to start crypto payment. Please try again.",
    };
  }
}

/*
 * ============================================================
 * OLD WALLET-FUNDED INVESTMENT ACTION
 * ============================================================
 *
 * Wealth Box is now payment-first.
 *
 * Investments must NOT be created directly from the
 * customer's browser/payment-selection step.
 *
 * Keep this action unavailable so existing UI cannot
 * accidentally deduct the wallet before payment confirmation.
 * ============================================================
 */

export async function createWealthInvestment() {
  return {
    success: false as const,
    error:
      "Wealth Box investments are created after payment is confirmed.",
  };
}