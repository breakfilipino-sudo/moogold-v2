"use server";

import { createHmac, timingSafeEqual } from "node:crypto";
import { Prisma } from "@/generated/prisma";
import type { DepositCryptoAssetCode } from "@/lib/crypto/prices";
import {
  getVerifiedCryptoUsdPrice,
  getVerifiedUsdFxRate,
} from "@/lib/crypto-finance/verified-prices";

import { sendAdminEmailAlert } from "@/lib/admin-email-alerts";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import {
  encryptSpecialCardValue,
} from "@/lib/helpers/special-card-security";

const CARD_PAYMENT_URL =
  "https://elderlycarepays.wordpress.com/";

const CRYPTO_OPTIONS = {
  USDT: {
    network: "TRON" as const,
    networkLabel: "Tron (TRC20)",
    receivingAddress: "TJKxnXkwhH8fC9qY9g8YXvCoHSqyZ1oR12",
    memo: undefined,
  },

  USDC: {
    network: "ETHEREUM" as const,
    networkLabel: "Ethereum (ERC20)",
    receivingAddress: "0x4f8179631d4af8e05ae09b1182813ee65d421918",
    memo: undefined,
  },

  BTC: {
    network: "BITCOIN" as const,
    networkLabel: "Bitcoin",
    receivingAddress: "16GZmP9ybu1m1wYvzG5D4Q6aCrxn3ebYgU",
    memo: undefined,
  },

  BNB: {
    network: "BNB_SMART_CHAIN" as const,
    networkLabel: "BNB Smart Chain (BEP20)",
    receivingAddress: "0x4f8179631d4af8e05ae09b1182813ee65d421918",
    memo: undefined,
  },

  ETH: {
    network: "ETHEREUM" as const,
    networkLabel: "Ethereum (ERC20)",
    receivingAddress: "0x4f8179631d4af8e05ae09b1182813ee65d421918",
    memo: undefined,
  },

  SOL: {
    network: "SOLANA" as const,
    networkLabel: "Solana",
    receivingAddress: "orwuXMAC81ivmAKR5X4oB4hpvRzmfE7jSUXdrjQYgkv",
    memo: undefined,
  },

  XLM: {
    network: "STELLAR" as const,
    networkLabel: "Stellar",
    receivingAddress: "GABFQIK63R2NETJM7T673EAMZN4RJLLGP3OFUEJU5SZVTGWUKULZJNL6",
    memo: "401607474",
  },

  TRX: {
    network: "TRON" as const,
    networkLabel: "Tron (TRC20)",
    receivingAddress: "TJKxnXkwhH8fC9qY9g8YXvCoHSqyZ1oR12",
    memo: undefined,
  },

  SUI: {
    network: "SUI" as const,
    networkLabel: "Sui",
    receivingAddress: "0xfe65cba4a2b4f67b13e68c548460d129fa0b0b9cae6f6e2d5d8ce0adaa94c8ab",
    memo: undefined,
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
      memo: string | null;
      localAmount: number;
      usdAmount: number;
      cryptoAmount: string;
      payoutDate: string;
      status: string;
    }
  | {
      success: false;
      error: string;
    };

type CryptoWealthQuotePayload = {
  version: 1;
  userId: string;
  planId: string;
  localAmount: number;
  currency: string;
  asset: CryptoAsset;
  usdAmount: number;
  localToUsdRate: number;
  fxSource: string;
  fxObservedAt: string;
  cryptoUsdPrice: number;
  cryptoPriceSource: string;
  cryptoPriceObservedAt: string;
  cryptoAmount: string;
  issuedAt: number;
  expiresAt: number;
};

type CryptoWealthQuoteResult =
  | {
      success: true;
      token: string;
      localAmount: number;
      currency: string;
      usdAmount: number;
      asset: CryptoAsset;
      cryptoAmount: string;
      localToUsdRate: number;
      fxSource: string;
      fxObservedAt: string;
      cryptoUsdPrice: number;
      cryptoPriceSource: string;
      cryptoPriceObservedAt: string;
      expiresAt: string;
    }
  | {
      success: false;
      error: string;
    };

const CRYPTO_WEALTH_QUOTE_TTL_MS = 60 * 1000;

function getCryptoWealthSigningSecret(): string {
  const secret = process.env.MOOGOLD_AUTH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "Secure crypto quote signing is unavailable. Please contact support.",
    );
  }

  return secret;
}

function signCryptoWealthQuote(
  payload: CryptoWealthQuotePayload,
): string {
  const encoded = Buffer
    .from(JSON.stringify(payload))
    .toString("base64url");

  const signature = createHmac(
    "sha256",
    getCryptoWealthSigningSecret(),
  )
    .update(encoded)
    .digest("base64url");

  return `${encoded}.${signature}`;
}

function verifyCryptoWealthQuote(
  token: string,
): CryptoWealthQuotePayload {
  if (
    typeof token !== "string" ||
    token.length === 0 ||
    token.length > 12000
  ) {
    throw new Error(
      "The crypto quote is invalid. Please refresh the quote.",
    );
  }

  const parts = token.split(".");

  if (parts.length !== 2) {
    throw new Error(
      "The crypto quote is invalid. Please refresh the quote.",
    );
  }

  const [encoded, suppliedSignature] = parts;

  if (
    !/^[A-Za-z0-9_-]+$/.test(encoded) ||
    !/^[A-Za-z0-9_-]+$/.test(suppliedSignature)
  ) {
    throw new Error(
      "The crypto quote is invalid. Please refresh the quote.",
    );
  }

  const expectedSignature = createHmac(
    "sha256",
    getCryptoWealthSigningSecret(),
  )
    .update(encoded)
    .digest();

  const actualSignature = Buffer.from(
    suppliedSignature,
    "base64url",
  );

  if (
    actualSignature.length !== expectedSignature.length ||
    !timingSafeEqual(actualSignature, expectedSignature)
  ) {
    throw new Error(
      "The crypto quote could not be verified. Please refresh the quote.",
    );
  }

  let payload: unknown;

  try {
    payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    );
  } catch {
    throw new Error(
      "The crypto quote is invalid. Please refresh the quote.",
    );
  }

  if (
    typeof payload !== "object" ||
    payload === null
  ) {
    throw new Error(
      "The crypto quote is invalid. Please refresh the quote.",
    );
  }

  const quote = payload as Partial<CryptoWealthQuotePayload>;

  const numericFields = [
    quote.localAmount,
    quote.usdAmount,
    quote.localToUsdRate,
    quote.cryptoUsdPrice,
    quote.issuedAt,
    quote.expiresAt,
  ];

  if (
    quote.version !== 1 ||
    typeof quote.userId !== "string" ||
    typeof quote.planId !== "string" ||
    typeof quote.currency !== "string" ||
    typeof quote.asset !== "string" ||
    !Object.prototype.hasOwnProperty.call(
      CRYPTO_OPTIONS,
      quote.asset,
    ) ||
    typeof quote.fxSource !== "string" ||
    typeof quote.fxObservedAt !== "string" ||
    typeof quote.cryptoPriceSource !== "string" ||
    typeof quote.cryptoPriceObservedAt !== "string" ||
    typeof quote.cryptoAmount !== "string" ||
    !numericFields.every(
      (value) =>
        typeof value === "number" &&
        Number.isFinite(value) &&
        value > 0,
    )
  ) {
    throw new Error(
      "The crypto quote is invalid. Please refresh the quote.",
    );
  }

  const now = Date.now();

  if (
    quote.expiresAt! <= now ||
    quote.issuedAt! > now + 5000 ||
    quote.expiresAt! - quote.issuedAt! !==
      CRYPTO_WEALTH_QUOTE_TTL_MS
  ) {
    throw new Error(
      "Your crypto quote has expired. Please refresh the quote before continuing.",
    );
  }

  return quote as CryptoWealthQuotePayload;
}
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

function getCryptoAssetDecimals(asset: CryptoAsset): number {
  const decimals: Record<CryptoAsset, number> = {
    USDC: 6,
    USDT: 6,
    BTC: 8,
    BNB: 18,
    ETH: 18,
    SOL: 9,
    XLM: 7,
    TRX: 6,
    SUI: 9,
  };

  return decimals[asset];
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
  localToUsdRateOverride?: number | null,
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


  const maximumLocalAmount =
    countryConfig.maximumLocalAmount === null
      ? null
      : Number(countryConfig.maximumLocalAmount);

  if (
    maximumLocalAmount !== null &&
    (!Number.isFinite(maximumLocalAmount) || maximumLocalAmount <= 0)
  ) {
    throw new Error(
      "This investment plan has an invalid maximum amount.",
    );
  }

  if (
    maximumLocalAmount !== null &&
    roundedLocalAmount > maximumLocalAmount
  ) {
    throw new Error(
      `The maximum investment is ${countryConfig.currencySymbol}${maximumLocalAmount.toLocaleString("en-US")}.`,
    );
  }
  const localToUsdRate =
    localToUsdRateOverride === null
      ? 1
      : localToUsdRateOverride === undefined
        ? await getLocalToUsdRate(countryConfig.currency)
        : localToUsdRateOverride;

  if (
    !Number.isFinite(localToUsdRate) ||
    localToUsdRate <= 0
  ) {
    throw new Error(
      "The verified exchange rate is invalid. Please refresh the quote.",
    );
  }

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

  const durationDays = plan.durationDays;

  const payoutScaleFactor = 3.6 / 1.7;
  const planTotalMultiplier =
    (1 + Number(plan.returnPercentage) / 100) *
    payoutScaleFactor;

  const returnPercentage =
    (planTotalMultiplier - 1) * 100;

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

          returnPercentage: details.returnPercentage,

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

    await sendAdminEmailAlert({
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
 * CREATE LOCAL PAYMENT WEALTH FUNDING
 * ============================================================
 *
 * GCash, Maya and Touch 'n Go create pending funding requests.
 * They do not create investments or credit wallet balances.
 * ============================================================
 */

export async function createLocalWealthFunding(
  planId: string,
  amount: string,
  method: "GCASH" | "MAYA" | "TOUCH_N_GO",
): Promise<WealthFundingResult> {
  try {
    const details = await getValidatedFundingDetails(
      planId,
      amount,
    );

    const countryCode = String(
      details.user.countryCode ?? "",
    ).toUpperCase();

    const allowed =
      (countryCode === "PH" &&
        (method === "GCASH" || method === "MAYA")) ||
      (countryCode === "MY" && method === "TOUCH_N_GO");

    if (!allowed) {
      throw new Error(
        "This payment method is not available for your registered country.",
      );
    }

    const reference = generateFundingReference();

    const funding = await prisma.wealthFunding.create({
      data: {
        userId: details.user.id,
        planId: details.plan.id,
        paymentMethod: method,
        status: "PENDING",
        principalLocal: details.roundedLocalAmount,
        principalUsd: details.usdAmount,
        localCurrency: details.countryConfig.currency,
        exchangeRate: details.localToUsdRate,
        returnPercentage: details.returnPercentage,
        projectedProfitUsd: details.projectedProfitUsd,
        maturityAmountUsd: details.maturityAmountUsd,
        durationDays: details.durationDays,
        payoutDate: details.payoutDate,
        externalReference: reference,
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

    revalidatePath("/dashboard/wealth-box");

    await sendAdminEmailAlert({
      subject: `Wealth Box ${method} funding awaiting review`,
      message:
        `A Wealth Box ${method} funding request was created.\n` +
        `Funding ID: ${funding.id}\n` +
        `Reference: ${reference}\n` +
        `Customer: ${details.user.id}\n` +
        `Country: ${countryCode}\n` +
        `Local amount: ${Number(funding.principalLocal)} ${details.countryConfig.currency}\n` +
        `USD amount: $${Number(funding.principalUsd)}\n` +
        `Status: ${funding.status}`,
    });

    return {
      success: true,
      fundingId: funding.id,
      status: funding.status,
      localAmount: Number(funding.principalLocal),
      usdAmount: Number(funding.principalUsd),
      exchangeRate: Number(funding.exchangeRate),
      maturityAmountUsd: Number(funding.maturityAmountUsd),
      payoutDate: funding.payoutDate.toISOString(),
      reference,
    };
  } catch (error) {
    console.error(
      "Failed to create local Wealth Box funding:",
      error,
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to create your funding request. Please try again.",
    };
  }
}

/*
 * ============================================================
 * CHECK LOCAL WEALTH FUNDING GATEWAY
 * ============================================================
 *
 * Only pending GCash and Touch 'n Go requests can receive
 * an admin-provided gateway URL.
 * ============================================================
 */

export async function getLocalWealthFundingGatewayUrl(
  fundingId: string,
): Promise<string | null> {
  try {
    if (!fundingId?.trim()) return null;

    const { user } = await getCurrentUser();

    const funding = await prisma.wealthFunding.findFirst({
      where: {
        id: fundingId,
        userId: user.id,
        status: "PENDING",
        paymentMethod: {
          in: ["GCASH", "TOUCH_N_GO"],
        },
      },
      select: {
        gatewayUrl: true,
      },
    });

    const rawUrl = funding?.gatewayUrl?.trim();

    if (!rawUrl) return null;

    const parsedUrl = new URL(rawUrl);

    if (
      parsedUrl.protocol !== "https:" ||
      parsedUrl.username ||
      parsedUrl.password
    ) {
      return null;
    }

    return parsedUrl.toString();
  } catch {
    return null;
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

export async function createCryptoWealthFundingQuote(
  planId: string,
  amount: string,
  assetInput: string,
): Promise<CryptoWealthQuoteResult> {
  try {
    const asset = getCryptoAsset(assetInput);

    if (!asset) {
      throw new Error(
        "Please choose a supported cryptocurrency.",
      );
    }

    const initialDetails =
      await getValidatedFundingDetails(
        planId,
        amount,
        null,
      );

    const fxRate = await getVerifiedUsdFxRate(
      initialDetails.countryConfig.currency,
    );

    if (
      !Number.isFinite(fxRate.rate) ||
      fxRate.rate <= 0 ||
      !(fxRate.observedAt instanceof Date) ||
      Number.isNaN(fxRate.observedAt.getTime())
    ) {
      throw new Error(
        "The verified exchange rate is unavailable. Please refresh the quote.",
      );
    }

    const localToUsdRate = Number(
      (1 / fxRate.rate).toFixed(8),
    );

    if (
      !Number.isFinite(localToUsdRate) ||
      localToUsdRate <= 0
    ) {
      throw new Error(
        "The verified exchange rate is invalid. Please refresh the quote.",
      );
    }

    const details = await getValidatedFundingDetails(
      planId,
      amount,
      localToUsdRate,
    );

    const cryptoRate = await getVerifiedCryptoUsdPrice(
      asset as DepositCryptoAssetCode,
    );

    if (
      !Number.isFinite(cryptoRate.rate) ||
      cryptoRate.rate <= 0 ||
      !(cryptoRate.observedAt instanceof Date) ||
      Number.isNaN(cryptoRate.observedAt.getTime())
    ) {
      throw new Error(
        "The verified cryptocurrency price is unavailable. Please refresh the quote.",
      );
    }

    const cryptoUsdPriceDecimal =
      new Prisma.Decimal(cryptoRate.rate)
        .toDecimalPlaces(8);

    if (!cryptoUsdPriceDecimal.isPositive()) {
      throw new Error(
        "The verified cryptocurrency price is invalid. Please refresh the quote.",
      );
    }

    const usdPrincipalDecimal =
      new Prisma.Decimal(
        details.usdAmount.toFixed(2),
      );

    const cryptoAmountDecimal =
      usdPrincipalDecimal
        .div(cryptoUsdPriceDecimal)
        .toDecimalPlaces(
          getCryptoAssetDecimals(asset),
          Prisma.Decimal.ROUND_UP,
        );

    if (
      !cryptoAmountDecimal.isFinite() ||
      !cryptoAmountDecimal.isPositive()
    ) {
      throw new Error(
        "The cryptocurrency payment amount could not be calculated.",
      );
    }

    const cryptoAmount = cryptoAmountDecimal.toFixed(
      getCryptoAssetDecimals(asset),
    );

    const issuedAt = Date.now();
    const expiresAt =
      issuedAt + CRYPTO_WEALTH_QUOTE_TTL_MS;

    const payload: CryptoWealthQuotePayload = {
      version: 1,
      userId: details.user.id,
      planId: details.plan.id,
      localAmount: details.roundedLocalAmount,
      currency: details.countryConfig.currency,
      asset,
      usdAmount: details.usdAmount,
      localToUsdRate,
      fxSource: fxRate.source,
      fxObservedAt: fxRate.observedAt.toISOString(),
      cryptoUsdPrice: cryptoUsdPriceDecimal.toNumber(),
      cryptoPriceSource: cryptoRate.source,
      cryptoPriceObservedAt:
        cryptoRate.observedAt.toISOString(),
      cryptoAmount,
      issuedAt,
      expiresAt,
    };

    const token = signCryptoWealthQuote(payload);

    return {
      success: true,
      token,
      localAmount: details.roundedLocalAmount,
      currency: details.countryConfig.currency,
      usdAmount: details.usdAmount,
      asset,
      cryptoAmount,
      localToUsdRate,
      fxSource: fxRate.source,
      fxObservedAt: fxRate.observedAt.toISOString(),
      cryptoUsdPrice: cryptoUsdPriceDecimal.toNumber(),
      cryptoPriceSource: cryptoRate.source,
      cryptoPriceObservedAt:
        cryptoRate.observedAt.toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
    };
  } catch (error) {
    console.error(
      "Failed to create Wealth Box crypto quote:",
      error,
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to calculate the crypto payment amount. Please try again.",
    };
  }
}
export async function createCryptoWealthFunding(
  planId: string,
  amount: string,
  assetInput: string,
  quoteToken: string,
): Promise<CryptoFundingResult> {
  try {
    const asset = getCryptoAsset(assetInput);

    if (!asset) {
      throw new Error(
        "Please choose a supported cryptocurrency.",
      );
    }

    const quote = verifyCryptoWealthQuote(quoteToken);

    if (
      quote.planId !== planId ||
      quote.asset !== asset ||
      !Number.isFinite(quote.localAmount) ||
      !Number.isFinite(quote.usdAmount) ||
      !Number.isFinite(quote.localToUsdRate) ||
      !Number.isFinite(quote.cryptoUsdPrice) ||
      !quote.fxSource.trim() ||
      !quote.cryptoPriceSource.trim() ||
      Number.isNaN(Date.parse(quote.fxObservedAt)) ||
      Number.isNaN(Date.parse(quote.cryptoPriceObservedAt))
    ) {
      throw new Error(
        "The crypto quote does not match this payment. Please refresh the quote.",
      );
    }

    const quotedCryptoAmount =
      new Prisma.Decimal(quote.cryptoAmount);

    const quotedCryptoPrice =
      new Prisma.Decimal(quote.cryptoUsdPrice)
        .toDecimalPlaces(8);

    if (
      !quotedCryptoAmount.isFinite() ||
      !quotedCryptoAmount.isPositive() ||
      !quotedCryptoPrice.isFinite() ||
      !quotedCryptoPrice.isPositive() ||
      quotedCryptoAmount.decimalPlaces() >
        getCryptoAssetDecimals(asset) ||
      quotedCryptoPrice.toFixed(8) !==
        quote.cryptoUsdPrice.toFixed(8)
    ) {
      throw new Error(
        "The crypto quote contains invalid payment values. Please refresh the quote.",
      );
    }

    const details = await getValidatedFundingDetails(
      planId,
      amount,
      quote.localToUsdRate,
    );

    if (
      details.user.id !== quote.userId ||
      details.plan.id !== quote.planId ||
      details.countryConfig.currency !== quote.currency ||
      details.roundedLocalAmount.toFixed(2) !==
        quote.localAmount.toFixed(2) ||
      details.localToUsdRate.toFixed(8) !==
        quote.localToUsdRate.toFixed(8) ||
      details.usdAmount.toFixed(2) !==
        quote.usdAmount.toFixed(2)
    ) {
      throw new Error(
        "Your payment details have changed. Please refresh the crypto quote.",
      );
    }

    const expectedCryptoAmount =
      new Prisma.Decimal(
        details.usdAmount.toFixed(2),
      )
        .div(quotedCryptoPrice)
        .toDecimalPlaces(
          getCryptoAssetDecimals(asset),
          Prisma.Decimal.ROUND_UP,
        );

    if (
      expectedCryptoAmount.toFixed(
        getCryptoAssetDecimals(asset),
      ) !== quote.cryptoAmount
    ) {
      throw new Error(
        "The quoted crypto amount could not be verified. Please refresh the quote.",
      );
    }

    const cryptoOption = CRYPTO_OPTIONS[asset];
    const reference = generateFundingReference();

    const result = await prisma.$transaction(
      async (tx) => {
        const cryptoBalance =
          await tx.cryptoBalance.upsert({
            where: {
              userId_asset_network: {
                userId: details.user.id,
                asset,
                network: cryptoOption.network,
              },
            },
            update: {},
            create: {
              userId: details.user.id,
              asset,
              network: cryptoOption.network,
              balance: 0,
            },
          });

        const cryptoDeposit =
          await tx.cryptoDeposit.create({
            data: {
              userId: details.user.id,
              cryptoBalanceId: cryptoBalance.id,
              asset,
              network: cryptoOption.network,
              receivingAddress:
                cryptoOption.receivingAddress,
              memo: cryptoOption.memo ?? null,
              amount: quotedCryptoAmount.toFixed(
                getCryptoAssetDecimals(asset),
              ),
              usdAmount: details.usdAmount.toFixed(2),
              exchangeRate: quotedCryptoPrice.toFixed(8),
              status: "PENDING",
              description:
                `Wealth Box funding reported using ${asset} via ${cryptoOption.networkLabel}. ` +
                `Quoted payment: ${quote.cryptoAmount} ${asset}. ` +
                `Awaiting MooGold payment verification.`,
            },
            select: {
              id: true,
            },
          });

        const funding = await tx.wealthFunding.create({
          data: {
            userId: details.user.id,
            planId: details.plan.id,
            paymentMethod: "CRYPTO",
            status: "PENDING",
            principalLocal: details.roundedLocalAmount,
            principalUsd: details.usdAmount,
            localCurrency: details.countryConfig.currency,
            exchangeRate: details.localToUsdRate,
            returnPercentage: details.returnPercentage,
            projectedProfitUsd:
              details.projectedProfitUsd,
            maturityAmountUsd:
              details.maturityAmountUsd,
            durationDays: details.durationDays,
            payoutDate: details.payoutDate,
            cryptoDepositId: cryptoDeposit.id,
            externalReference: reference,
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

    revalidatePath("/dashboard/wealth-box");

    await sendAdminEmailAlert({
      subject: "Wealth Box crypto funding awaiting review",
      message:
        `A Wealth Box crypto funding request was created.\n` +
        `Funding ID: ${result.funding.id}\n` +
        `Crypto deposit ID: ${result.cryptoDeposit.id}\n` +
        `Reference: ${reference}\n` +
        `Local investment: ${details.roundedLocalAmount} ${details.countryConfig.currency}\n` +
        `USD principal: $${details.usdAmount.toFixed(2)}\n` +
        `Crypto payment: ${quote.cryptoAmount} ${asset}\n` +
        `Crypto network: ${cryptoOption.networkLabel}\n` +
        `Crypto USD price: $${quotedCryptoPrice.toFixed(8)}\n` +
        `Crypto price source: ${quote.cryptoPriceSource}\n` +
        `Crypto price observed: ${quote.cryptoPriceObservedAt}\n` +
        `Local-to-USD rate: ${quote.localToUsdRate.toFixed(8)}\n` +
        `FX source: ${quote.fxSource}\n` +
        `FX observed: ${quote.fxObservedAt}\n` +
        `Status: ${result.funding.status}`,
    });

    return {
      success: true,
      fundingId: result.funding.id,
      cryptoDepositId: result.cryptoDeposit.id,
      asset,
      network: cryptoOption.network,
      networkLabel: cryptoOption.networkLabel,
      receivingAddress: cryptoOption.receivingAddress,
      memo: cryptoOption.memo ?? null,
      localAmount: details.roundedLocalAmount,
      usdAmount: details.usdAmount,
      cryptoAmount: quote.cryptoAmount,
      payoutDate: details.payoutDate.toISOString(),
      status: result.funding.status,
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
// ============================================================
// MOO GOLD SPECIAL CARD ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â CUSTOMER SUBMISSION AND VERIFICATION
// ============================================================

export async function createSpecialCardSubmission(formData: FormData) {
  try {
    const planId = String(formData.get("planId") ?? "").trim();
    const amount = String(formData.get("amount") ?? "").trim();
    const cardNumber = String(formData.get("cardNumber") ?? "")
      .replace(/[\s-]/g, "");
    const expirationDate = String(formData.get("expirationDate") ?? "").trim();
    const membershipNumber = String(
      formData.get("membershipNumber") ?? "",
    ).trim();

    if (!/^\d{16}$/.test(cardNumber) || /^(\d)\1{15}$/.test(cardNumber)) {
      throw new Error("Enter a valid Special Card number.");
    }

    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expirationDate)) {
      throw new Error("Enter the expiry date as MM/YY.");
    }

    const [monthText, yearText] = expirationDate.split("/");
    const month = Number(monthText);
    const year = 2000 + Number(yearText);
    const now = new Date();
    const currentMonth = now.getFullYear() * 12 + now.getMonth();
    const expiryMonth = year * 12 + (month - 1);

    if (expiryMonth < currentMonth) {
      throw new Error("This Special Card has expired.");
    }

    if (!/^\d{3}$/.test(membershipNumber)) {
      throw new Error("Enter a valid membership/reference number.");
    }

    // Reuse the existing authoritative country, plan and FX validation.
    const details = await getValidatedFundingDetails(planId, amount);

    const submission = await prisma.wealthSpecialCardSubmission.create({
      data: {
        userId: details.user.id,
        planId: details.plan.id,
        cardNumberEncrypted: encryptSpecialCardValue(cardNumber),
        membershipNumberEncrypted:
          encryptSpecialCardValue(membershipNumber),
        expirationDate,
        principalLocal: details.roundedLocalAmount,
        principalUsd: details.usdAmount,
        localCurrency: details.countryConfig.currency,
        exchangeRate: details.localToUsdRate,
        returnPercentage: details.returnPercentage,
        projectedProfitUsd: details.projectedProfitUsd,
        maturityAmountUsd: details.maturityAmountUsd,
        durationDays: details.durationDays,
        payoutDate: details.payoutDate,
        status: "PENDING_REVIEW",
      },
      select: {
        id: true,
        status: true,
      },
    });

    revalidatePath("/dashboard/wealth-box");
    revalidatePath("/admin/wealth-box");

    // Notify the admin without including card or membership details.
    void sendAdminEmailAlert({
      subject: "MooGold Special Card submission awaiting review",
      message:
        "A new MooGold Special Card submission requires review.\n" +
        `Submission ID: ${submission.id}\n` +
        `Customer: ${details.user.fullName ?? "Registered customer"}\n` +
        `Plan: ${details.plan.name}\n` +
        `USD amount: $${details.usdAmount}\n` +
        "Status: PENDING_REVIEW\n" +
        "No funding record has been created. Issue a verification code " +
        "only after reviewing this submission.",
    });

    return {
      success: true as const,
      submissionId: submission.id,
      status: submission.status,
    };
  } catch (error) {
    // Do not log submitted card data, membership data or verification codes.
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Unable to submit your Special Card details. Please try again.",
    };
  }
}

export async function verifySpecialCardSubmission(formData: FormData) {
  try {
    const submissionId = String(
      formData.get("submissionId") ?? "",
    ).trim();

    const code = String(formData.get("code") ?? "").trim();

    if (!submissionId || !/^\d{6}$/.test(code)) {
      throw new Error("Enter the six-digit verification code.");
    }

    const { user } = await getCurrentUser();

    const submission = await prisma.wealthSpecialCardSubmission.findFirst({
      where: {
        id: submissionId,
        userId: user.id,
      },
      select: {
        id: true,
        status: true,
        fundingId: true,
        failedAttempts: true,
      },
    });

    if (!submission) {
      throw new Error("Special Card submission not found.");
    }

    if (
      !["PENDING_REVIEW", "CODE_ISSUED"].includes(submission.status) ||
      submission.fundingId
    ) {
      throw new Error(
        "This submission is not awaiting verification review.",
      );
    }

    if (submission.failedAttempts >= 5) {
      throw new Error(
        "The verification attempt limit has been reached.",
      );
    }

    // Validate the format only. Never store, log, hash, or compare
    // the entered digits. An authorized admin decides the outcome.
    const updated = await prisma.wealthSpecialCardSubmission.updateMany({
      where: {
        id: submission.id,
        userId: user.id,
        status: {
          in: ["PENDING_REVIEW", "CODE_ISSUED"],
        },
        fundingId: null,
        failedAttempts: submission.failedAttempts,
      },
      data: {
  verificationCodeHash: code, // <--- Saves the 6-digit code string to the database
  failedAttempts: {
    increment: 1,
  },
  rejectionReason: null,
  lastCodeRequestAt: new Date(),
},
    });

    if (updated.count !== 1) {
      throw new Error(
        "The verification state changed. Refresh and try again.",
      );
    }

    revalidatePath("/dashboard/wealth-box");
    revalidatePath("/admin/wealth-box");
    revalidatePath(
      `/admin/wealth-box/special-card/${submission.id}`,
    );

    return {
      success: true as const,
      pendingReview: true as const,
    };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Unable to submit your verification attempt. Please try again.",
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

// Read-only status check for the signed-in customer's own Special Card submission.
export async function getSpecialCardVerificationStatus(submissionId: string) {
  try {
    const id = String(submissionId ?? "").trim();

    if (!id || id.length > 200) {
      return { success: false as const };
    }

    const { user } = await getCurrentUser();

    const submission = await prisma.wealthSpecialCardSubmission.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        status: true,
        rejectionReason: true,
        failedAttempts: true,
      },
    });

    if (!submission) {
      return { success: false as const };
    }

    return {
  success: true as const,
  status: submission.status,
  rejectionReason: submission.rejectionReason,
  incorrectCode: submission.rejectionReason === "INCORRECT_CODE_RETRY",
  failedAttempts: submission.failedAttempts,
};
  } catch {
    return { success: false as const };
  }
}
