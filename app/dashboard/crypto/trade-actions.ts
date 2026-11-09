
"use server";

import { Resend } from "resend";

import {
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { getCountryFinancialConfig } from "@/lib/countries";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { DepositCryptoAssetCode } from "@/lib/crypto/prices";
import {
  getVerifiedCryptoUsdPrice,
  getVerifiedUsdFxRate,
} from "@/lib/crypto-finance/verified-prices";

const QUOTE_TTL_MS = 60 * 1000;
const MINIMUM_BUY_USD = new Prisma.Decimal("10");
const TOKEN_VERSION = 1;

const CRYPTO_OPTIONS = {
  USDC: { network: "ETHEREUM" },
  USDT: { network: "TRON" },
  BTC: { network: "BITCOIN" },
  ETH: { network: "ETHEREUM" },
  SOL: { network: "SOLANA" },
  XLM: { network: "STELLAR" },
  BNB: { network: "BNB_SMART_CHAIN" },
  TRX: { network: "TRON" },
  SUI: { network: "SUI" },
} as const;

export type TradeAssetCode = Exclude<DepositCryptoAssetCode, "TRN">;
type TradeDirection = "BUY" | "SELL";
type CryptoNetwork =
  (typeof CRYPTO_OPTIONS)[TradeAssetCode]["network"];

type TradeQuotePayload = {
  version: number;
  userId: string;
  direction: TradeDirection;
  asset: TradeAssetCode;
  network: CryptoNetwork;

  // The wallet and ledger remain USD-denominated.
  currency: "USD";
  cashAmount: string;

  // Customer-facing amount in the registered country's currency.
  displayCurrency: string;
  displayCashAmount: string;

  cryptoAmount: string;
  referenceUnitPrice: string;
  effectiveUnitPrice: string;
  cryptoUsdRate: string;
  fxRate: string;
  priceSource: string;
  priceObservedAt: string;
  fxSource: string;
  fxObservedAt: string;
  premiumPercent: string;
  settingsUpdatedAt: string | null;
  walletBalanceSnapshot: string;
  cryptoBalanceSnapshot: string;
  reservedBalanceSnapshot: string;
  nonce: string;
  issuedAt: number;
  expiresAt: number;
};

export type TradeQuoteView = {
  token: string;
  direction: TradeDirection;
  asset: TradeAssetCode;
  network: CryptoNetwork;
  currency: "USD";
  displayCurrency: string;
  displayCashAmount: string;
  cashAmount: string;
  cryptoAmount: string;
  referenceUnitPrice: string;
  effectiveUnitPrice: string;
  premiumPercent: string;
  priceSource: string;
  priceObservedAt: string;
  fxSource: string;
  fxObservedAt: string;
  expiresAt: string;
};

export type TradeQuoteResult =
  | { success: true; quote: TradeQuoteView }
  | { success: false; error: string };

export type ExecuteTradeResult =
  | {
      success: true;
      direction: TradeDirection;
      asset: TradeAssetCode;
      cashAmount: string;
      cryptoAmount: string;
      currency: "USD";
      displayCurrency: string;
      displayCashAmount: string;
      reference: string;
      createdAt: string;
    }
  | { success: false; error: string };

function getSigningSecret(): string {
  const secret = process.env.MOOGOLD_AUTH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("TRADE_SIGNING_SECRET_UNAVAILABLE");
  }

  return secret;
}

function signPayload(payload: TradeQuotePayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );

  const signature = createHmac("sha256", getSigningSecret())
    .update(encoded)
    .digest("base64url");

  return `${encoded}.${signature}`;
}

function verifyToken(token: string): TradeQuotePayload | null {
  try {
    if (typeof token !== "string" || token.length > 12000) {
      return null;
    }

    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [encoded, suppliedSignature] = parts;

    if (
      !encoded ||
      !suppliedSignature ||
      !/^[A-Za-z0-9_-]+$/.test(encoded) ||
      !/^[A-Za-z0-9_-]+$/.test(suppliedSignature)
    ) {
      return null;
    }

    const expectedSignature = createHmac("sha256", getSigningSecret())
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
      return null;
    }

    const parsed: unknown = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    );

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return null;
    }

    const value = parsed as Record<string, unknown>;

    const isDecimal = (
      input: unknown,
      allowZero = false,
    ): input is string => {
      if (
        typeof input !== "string" ||
        input.length === 0 ||
        input.length > 80 ||
        input.trim() !== input ||
        !/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(input)
      ) {
        return false;
      }

      try {
        const decimal = new Prisma.Decimal(input);

        return (
          decimal.isFinite() &&
          (allowZero
            ? decimal.greaterThanOrEqualTo(0)
            : decimal.greaterThan(0))
        );
      } catch {
        return false;
      }
    };

    const isIsoDate = (input: unknown): input is string => {
      if (typeof input !== "string") return false;

      try {
        return new Date(input).toISOString() === input;
      } catch {
        return false;
      }
    };

    const isDirection =
      value.direction === "BUY" || value.direction === "SELL";

    const isAsset =
      typeof value.asset === "string" &&
      Object.prototype.hasOwnProperty.call(CRYPTO_OPTIONS, value.asset);

    if (
      value.version !== TOKEN_VERSION ||
      typeof value.userId !== "string" ||
      value.userId.length === 0 ||
      value.userId.length > 200 ||
      !isDirection ||
      !isAsset ||
      typeof value.network !== "string" ||
      value.currency !== "USD" ||
      typeof value.displayCurrency !== "string" ||
      !/^[A-Z]{3}$/.test(value.displayCurrency) ||
      !isDecimal(value.displayCashAmount) ||
      !isDecimal(value.cashAmount) ||
      !isDecimal(value.cryptoAmount) ||
      !isDecimal(value.referenceUnitPrice) ||
      !isDecimal(value.effectiveUnitPrice) ||
      !isDecimal(value.cryptoUsdRate) ||
      !isDecimal(value.fxRate) ||
      typeof value.priceSource !== "string" ||
      value.priceSource.trim().length === 0 ||
      value.priceSource.length > 200 ||
      !isIsoDate(value.priceObservedAt) ||
      typeof value.fxSource !== "string" ||
      value.fxSource.trim().length === 0 ||
      value.fxSource.length > 200 ||
      !isIsoDate(value.fxObservedAt) ||
      !isDecimal(value.premiumPercent, true) ||
      (typeof value.settingsUpdatedAt !== "string" &&
        value.settingsUpdatedAt !== null) ||
      (typeof value.settingsUpdatedAt === "string" &&
        !isIsoDate(value.settingsUpdatedAt)) ||
      !isDecimal(value.walletBalanceSnapshot, true) ||
      !isDecimal(value.cryptoBalanceSnapshot, true) ||
      !isDecimal(value.reservedBalanceSnapshot, true) ||
      typeof value.nonce !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value.nonce,
      ) ||
      typeof value.issuedAt !== "number" ||
      typeof value.expiresAt !== "number"
    ) {
      return null;
    }

    const payload = value as unknown as TradeQuotePayload;

    const cashAmount = new Prisma.Decimal(payload.cashAmount);
    const displayCashAmount = new Prisma.Decimal(
      payload.displayCashAmount,
    );
    const cryptoAmount = new Prisma.Decimal(payload.cryptoAmount);
    const premium = new Prisma.Decimal(payload.premiumPercent);
    const walletSnapshot = new Prisma.Decimal(
      payload.walletBalanceSnapshot,
    );
    const cryptoSnapshot = new Prisma.Decimal(
      payload.cryptoBalanceSnapshot,
    );
    const reservedSnapshot = new Prisma.Decimal(
      payload.reservedBalanceSnapshot,
    );

    if (
      payload.network !== CRYPTO_OPTIONS[payload.asset].network ||
      !Number.isSafeInteger(payload.issuedAt) ||
      !Number.isSafeInteger(payload.expiresAt) ||
      payload.issuedAt <= 0 ||
      payload.expiresAt <= payload.issuedAt ||
      payload.expiresAt - payload.issuedAt !== QUOTE_TTL_MS ||
      cashAmount.greaterThan("999999999999999999.99") ||
      displayCashAmount.greaterThan("999999999999999999.99") ||
      cryptoAmount.greaterThan("999999999999.999999999999999999") ||
      premium.greaterThan("999.9999") ||
      walletSnapshot.greaterThan("999999999999999999.99") ||
      cryptoSnapshot.greaterThan("999999999999.999999999999999999") ||
      reservedSnapshot.greaterThan(cryptoSnapshot) ||
      (payload.direction === "BUY" &&
        (!premium.isZero() || payload.settingsUpdatedAt !== null))
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
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
      countryCode: true,
      email: true,
      fullName: true,
    },
  });
}
export type TradeFormBalanceResult =
  | {
      success: true;
      displayCurrency: string;
      displayWalletBalance: string;
      minimumBuyAmount: string;
    }
  | {
      success: false;
      error: string;
    };

export async function getCryptoTradeFormBalance(): Promise<TradeFormBalanceResult> {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return {
        success: false,
        error: "Please sign in before trading crypto.",
      };
    }

    const financialConfig = getCountryFinancialConfig(user.countryCode);

    if (!financialConfig) {
      return {
        success: false,
        error: "Your registered-country currency is unavailable.",
      };
    }

    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
      select: {
        cashBalance: true,
        currency: true,
      },
    });

    if (!wallet || wallet.currency !== "USD") {
      return {
        success: false,
        error: "Your cash wallet is unavailable.",
      };
    }

    const fxRate = await getVerifiedUsdFxRate(financialConfig.currency);
    const fx = new Prisma.Decimal(fxRate.rate.toString());

    if (!fx.isFinite() || fx.lessThanOrEqualTo(0)) {
      return {
        success: false,
        error: "Your registered-country exchange rate is unavailable.",
      };
    }

    return {
      success: true,
      displayCurrency: financialConfig.currency,
      displayWalletBalance: wallet.cashBalance
        .mul(fx)
        .toDecimalPlaces(2, 4)
        .toString(),
      minimumBuyAmount: MINIMUM_BUY_USD
        .mul(fx)
        .toDecimalPlaces(2, 4)
        .toString(),
    };
  } catch (error) {
    console.error("Crypto trade form balance failed:", error);

    return {
      success: false,
      error: "Unable to load your wallet balance. Please try again.",
    };
  }
}

function parsePositiveAmount(
  value: string,
  direction: TradeDirection,
): Prisma.Decimal | null {
  if (
    typeof value !== "string" ||
    value.length > 40 ||
    value.trim() !== value
  ) {
    return null;
  }

  const pattern =
    direction === "BUY"
      ? /^\d{1,18}(?:\.\d{1,2})?$/
      : /^\d{1,12}(?:\.\d{1,18})?$/;

  if (!pattern.test(value)) return null;

  const amount = new Prisma.Decimal(value);

  if (!amount.isFinite() || amount.lessThanOrEqualTo(0)) {
    return null;
  }

  return amount;
}

function decimalSnapshot(
  value: Prisma.Decimal | null | undefined,
): string {
  return value?.toString() ?? "0";
}

function getSafeError(error: unknown): string {
  const errorCode =
    typeof error === "object" && error !== null && "code" in error
      ? (error as { code?: unknown }).code
      : undefined;

  if (errorCode === "P2034") {
    return "Your balance changed during this trade. Please request a new quote.";
  }

  if (errorCode === "P2002") {
    return "This trade has already been processed.";
  }

  if (error instanceof Error) {
    switch (error.message) {
      case "INSUFFICIENT_CASH":
        return "Your available cash balance is insufficient.";
      case "INSUFFICIENT_CRYPTO":
        return "Your available crypto balance is insufficient.";
      case "QUOTE_EXPIRED":
        return "This quote has expired. Please request a new quote.";
      case "QUOTE_STALE":
        return "Your balance, registered currency, or Sell premium has changed. Please request a new quote.";
      case "QUOTE_INVALID":
        return "This quote is invalid. Please request a new quote.";
      case "QUOTE_ALREADY_USED":
        return "This quote has already been processed.";
      case "CRYPTO_BALANCE_CONFLICT":
      case "WALLET_BALANCE_CONFLICT":
        return "Your balance changed during this trade. Please request a new quote.";
    }
  }

  return "The trade could not be completed. Please try again.";
}

/**
 * Creates a signed, user-specific Buy or Sell quote.
 *
 * BUY amount is entered in the registered country's local currency.
 * SELL amount is entered as a crypto quantity.
 * The underlying wallet transaction remains denominated in USD.
 */
export async function createCryptoTradeQuote(input: {
  direction: TradeDirection;
  asset: TradeAssetCode;
  amount: string;
}): Promise<TradeQuoteResult> {
  try {
    if (
      !input ||
      (input.direction !== "BUY" && input.direction !== "SELL") ||
      typeof input.asset !== "string" ||
      !Object.prototype.hasOwnProperty.call(CRYPTO_OPTIONS, input.asset)
    ) {
      return { success: false, error: "Invalid trade details." };
    }

    const amount = parsePositiveAmount(input.amount, input.direction);

    if (!amount) {
      return {
        success: false,
        error:
          input.direction === "BUY"
            ? "Enter a valid cash amount with up to 2 decimal places."
            : "Enter a valid crypto amount with up to 18 decimal places.",
      };
    }

    const user = await getAuthenticatedUser();

    if (!user) {
      return {
        success: false,
        error: "Please sign in before trading crypto.",
      };
    }

    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        cashBalance: true,
        currency: true,
      },
    });

    if (!wallet) {
      return {
        success: false,
        error: "Your cash wallet is unavailable.",
      };
    }

    if (wallet.currency !== "USD") {
      return {
        success: false,
        error: "Your USD cash wallet is unavailable for crypto trading.",
      };
    }

    const financialConfig = getCountryFinancialConfig(user.countryCode);

    if (!financialConfig) {
      return {
        success: false,
        error: "Your registered-country currency is unavailable.",
      };
    }

    const displayCurrency = financialConfig.currency;
    const asset = input.asset;
    const network = CRYPTO_OPTIONS[asset].network;

    const [cryptoRate, fxRate, cryptoBalance, settings] =
      await Promise.all([
        getVerifiedCryptoUsdPrice(asset),
        getVerifiedUsdFxRate(displayCurrency),
        prisma.cryptoBalance.findUnique({
          where: {
            userId_asset_network: {
              userId: user.id,
              asset,
              network,
            },
          },
          select: {
            balance: true,
            reservedBalance: true,
          },
        }),
        input.direction === "SELL"
          ? prisma.cryptoTradingSettings.findUnique({
              where: { id: "default" },
              select: {
                sellPremiumPercent: true,
                updatedAt: true,
              },
            })
          : Promise.resolve(null),
      ]);

    const zero = new Prisma.Decimal(0);
    const walletBalance = wallet.cashBalance;
    const cryptoBalanceValue = cryptoBalance?.balance ?? zero;
    const reservedBalanceValue = cryptoBalance?.reservedBalance ?? zero;
    const availableCrypto = cryptoBalanceValue.sub(reservedBalanceValue);

    const cryptoUsd = new Prisma.Decimal(cryptoRate.rate.toString());
    const fx = new Prisma.Decimal(fxRate.rate.toString());

    // Local-currency value of one unit of the selected cryptocurrency.
    const referenceUnitPrice = cryptoUsd.mul(fx);

    if (
      cryptoUsd.lessThanOrEqualTo(0) ||
      fx.lessThanOrEqualTo(0) ||
      referenceUnitPrice.lessThanOrEqualTo(0)
    ) {
      return {
        success: false,
        error: "A valid crypto price is currently unavailable.",
      };
    }

    let cashAmount: Prisma.Decimal;
    let displayCashAmount: Prisma.Decimal;
    let cryptoAmount: Prisma.Decimal;
    let premiumPercent = zero;

    if (input.direction === "BUY") {
      // The user enters local currency. Convert it to USD for the wallet.
      displayCashAmount = amount;

      cashAmount = displayCashAmount
        .div(fx)
        .toDecimalPlaces(2, 4);

      if (walletBalance.lessThan(cashAmount)) {
        return {
          success: false,
          error: "Your available cash balance is insufficient.",
        };
      }

      cryptoAmount = cashAmount
        .div(cryptoUsd)
        .toDecimalPlaces(18, 1);

      if (cashAmount.lessThan(MINIMUM_BUY_USD)) {
        return {
          success: false,
          error: "The minimum crypto purchase is equivalent to US$10.",
        };
      }

      // Normalize the displayed amount to the actual USD debit.
      displayCashAmount = cashAmount
        .mul(fx)
        .toDecimalPlaces(2, 4);
    } else {
      cryptoAmount = amount;

      if (availableCrypto.lessThan(cryptoAmount)) {
        return {
          success: false,
          error: "Your available crypto balance is insufficient.",
        };
      }

      premiumPercent =
        settings?.sellPremiumPercent ?? new Prisma.Decimal(50);

      const multiplier = new Prisma.Decimal(1).add(
        premiumPercent.div(100),
      );

      // Calculate the sale proceeds in USD for wallet accounting.
      cashAmount = cryptoAmount
        .mul(cryptoUsd)
        .mul(multiplier)
        .toDecimalPlaces(2, 4);

      // Convert the payout to the user's registered local currency.
      displayCashAmount = cashAmount
        .mul(fx)
        .toDecimalPlaces(2, 4);
    }

    if (
      cryptoAmount.lessThanOrEqualTo(0) ||
      cryptoAmount.greaterThan("999999999999.999999999999999999") ||
      cashAmount.lessThanOrEqualTo(0) ||
      cashAmount.greaterThan("999999999999999999.99") ||
      displayCashAmount.lessThanOrEqualTo(0) ||
      displayCashAmount.greaterThan("999999999999999999.99")
    ) {
      return {
        success: false,
        error: "The entered amount is too small to trade.",
      };
    }

    const effectiveUnitPrice =
      input.direction === "SELL"
        ? referenceUnitPrice.mul(
            new Prisma.Decimal(1).add(premiumPercent.div(100)),
          )
        : referenceUnitPrice;

    const now = Date.now();

    const payload: TradeQuotePayload = {
      version: TOKEN_VERSION,
      userId: user.id,
      direction: input.direction,
      asset,
      network,
      currency: "USD",
      cashAmount: cashAmount.toString(),
      displayCurrency,
      displayCashAmount: displayCashAmount.toString(),
      cryptoAmount: cryptoAmount.toString(),
      referenceUnitPrice: referenceUnitPrice.toString(),
      effectiveUnitPrice: effectiveUnitPrice.toString(),
      cryptoUsdRate: cryptoUsd.toString(),
      fxRate: fx.toString(),
      priceSource: cryptoRate.source,
      priceObservedAt: cryptoRate.observedAt.toISOString(),
      fxSource: fxRate.source,
      fxObservedAt: fxRate.observedAt.toISOString(),
      premiumPercent: premiumPercent.toString(),
      settingsUpdatedAt: settings?.updatedAt.toISOString() ?? null,
      walletBalanceSnapshot: decimalSnapshot(walletBalance),
      cryptoBalanceSnapshot: decimalSnapshot(cryptoBalanceValue),
      reservedBalanceSnapshot: decimalSnapshot(reservedBalanceValue),
      nonce: randomUUID(),
      issuedAt: now,
      expiresAt: now + QUOTE_TTL_MS,
    };

    const token = signPayload(payload);

    return {
      success: true,
      quote: {
        token,
        direction: payload.direction,
        asset: payload.asset,
        network: payload.network,
        currency: payload.currency,
        displayCurrency: payload.displayCurrency,
        displayCashAmount: payload.displayCashAmount,
        cashAmount: payload.cashAmount,
        cryptoAmount: payload.cryptoAmount,
        referenceUnitPrice: payload.referenceUnitPrice,
        effectiveUnitPrice: payload.effectiveUnitPrice,
        premiumPercent: payload.premiumPercent,
        priceSource: payload.priceSource,
        priceObservedAt: payload.priceObservedAt,
        fxSource: payload.fxSource,
        fxObservedAt: payload.fxObservedAt,
        expiresAt: new Date(payload.expiresAt).toISOString(),
      },
    };
  } catch (error) {
    console.error("Crypto trade quote failed:", error);

    return {
      success: false,
      error:
        error instanceof Error &&
        error.message === "TRADE_SIGNING_SECRET_UNAVAILABLE"
          ? "Crypto trading is temporarily unavailable."
          : "A current crypto or exchange rate is unavailable. Please try again.",
    };
  }
}

/**
 * Executes the exact signed quote.
 * Wallet, crypto balance, transaction, and both ledgers are committed
 * together or not at all.
 */
export async function executeCryptoTrade(
  token: string,
): Promise<ExecuteTradeResult> {
  try {
    const payload = verifyToken(token);

    if (!payload) {
      return {
        success: false,
        error: "This quote is invalid. Please request a new quote.",
      };
    }

    const now = Date.now();

    if (now > payload.expiresAt || now < payload.issuedAt - 5000) {
      return {
        success: false,
        error: "This quote has expired. Please request a new quote.",
      };
    }

    const user = await getAuthenticatedUser();

    if (!user || user.id !== payload.userId) {
      return {
        success: false,
        error: "Please sign in again before completing this trade.",
      };
    }

    // Re-check the registered country at execution time.
    const financialConfig = getCountryFinancialConfig(user.countryCode);

    if (
      !financialConfig ||
      financialConfig.currency !== payload.displayCurrency ||
      payload.currency !== "USD"
    ) {
      return {
        success: false,
        error: "Your registered currency has changed. Please request a new quote.",
      };
    }

    const cashAmount = new Prisma.Decimal(payload.cashAmount);
    const displayCashAmount = new Prisma.Decimal(
      payload.displayCashAmount,
    );
    const cryptoAmount = new Prisma.Decimal(payload.cryptoAmount);
    const walletSnapshot = new Prisma.Decimal(
      payload.walletBalanceSnapshot,
    );
    const cryptoSnapshot = new Prisma.Decimal(
      payload.cryptoBalanceSnapshot,
    );
    const reservedSnapshot = new Prisma.Decimal(
      payload.reservedBalanceSnapshot,
    );

    if (
      cashAmount.lessThanOrEqualTo(0) ||
      displayCashAmount.lessThanOrEqualTo(0) ||
      cryptoAmount.lessThanOrEqualTo(0) ||
      (payload.direction === "BUY" &&
        cashAmount.lessThan(MINIMUM_BUY_USD))
    ) {
      if (
        payload.direction === "BUY" &&
        cashAmount.lessThan(MINIMUM_BUY_USD)
      ) {
        return {
          success: false,
          error: "The minimum crypto purchase is equivalent to US$10.",
        };
      }
      return {
        success: false,
        error: "This quote is invalid. Please request a new quote.",
      };
    }

    const reference = `CRYPTO-${payload.direction}-${payload.nonce}`;
    const description =
      payload.direction === "BUY"
        ? `Bought ${payload.cryptoAmount} ${payload.asset}`
        : `Sold ${payload.cryptoAmount} ${payload.asset}`;

    const committedAt = await prisma.$transaction(
      async (tx) => {
        if (payload.direction === "SELL") {
          const settings = await tx.cryptoTradingSettings.findUnique({
            where: { id: "default" },
            select: {
              sellPremiumPercent: true,
              updatedAt: true,
            },
          });

          const currentPremium =
            settings?.sellPremiumPercent ?? new Prisma.Decimal(50);
          const currentUpdatedAt =
            settings?.updatedAt.toISOString() ?? null;

          if (
            currentPremium.toString() !== payload.premiumPercent ||
            currentUpdatedAt !== payload.settingsUpdatedAt
          ) {
            throw new Error("QUOTE_STALE");
          }
        }

        const wallet = await tx.wallet.findUnique({
          where: { userId: user.id },
          select: {
            id: true,
            cashBalance: true,
            currency: true,
          },
        });

        if (!wallet || wallet.currency !== "USD") {
          throw new Error("QUOTE_STALE");
        }

        if (!wallet.cashBalance.equals(walletSnapshot)) {
          throw new Error("QUOTE_STALE");
        }

        if (
          payload.direction === "BUY" &&
          wallet.cashBalance.lessThan(cashAmount)
        ) {
          throw new Error("INSUFFICIENT_CASH");
        }

        const cryptoBalance = await tx.cryptoBalance.findUnique({
          where: {
            userId_asset_network: {
              userId: user.id,
              asset: payload.asset,
              network: payload.network,
            },
          },
          select: {
            id: true,
            balance: true,
            reservedBalance: true,
          },
        });

        const currentCryptoBalance =
          cryptoBalance?.balance ?? new Prisma.Decimal(0);
        const currentReservedBalance =
          cryptoBalance?.reservedBalance ?? new Prisma.Decimal(0);

        if (
          !currentCryptoBalance.equals(cryptoSnapshot) ||
          !currentReservedBalance.equals(reservedSnapshot)
        ) {
          throw new Error("QUOTE_STALE");
        }

        if (
          payload.direction === "SELL" &&
          (!cryptoBalance ||
            currentCryptoBalance
              .sub(currentReservedBalance)
              .lessThan(cryptoAmount))
        ) {
          throw new Error("INSUFFICIENT_CRYPTO");
        }

        let balanceId = cryptoBalance?.id;

        if (!balanceId) {
          if (payload.direction !== "BUY") {
            throw new Error("INSUFFICIENT_CRYPTO");
          }

          const createdBalance = await tx.cryptoBalance.create({
            data: {
              userId: user.id,
              asset: payload.asset,
              network: payload.network,
              balance: 0,
              reservedBalance: 0,
            },
            select: { id: true },
          });

          balanceId = createdBalance.id;
        }

        const walletUpdate = await tx.wallet.updateMany({
          where: {
            id: wallet.id,
            cashBalance: wallet.cashBalance,
            currency: "USD",
          },
          data:
            payload.direction === "BUY"
              ? { cashBalance: { decrement: cashAmount } }
              : { cashBalance: { increment: cashAmount } },
        });

        if (walletUpdate.count !== 1) {
          throw new Error("WALLET_BALANCE_CONFLICT");
        }

        const cryptoUpdate = await tx.cryptoBalance.updateMany({
          where: {
            id: balanceId,
            balance: currentCryptoBalance,
            reservedBalance: currentReservedBalance,
          },
          data:
            payload.direction === "BUY"
              ? { balance: { increment: cryptoAmount } }
              : { balance: { decrement: cryptoAmount } },
        });

        if (cryptoUpdate.count !== 1) {
          throw new Error("CRYPTO_BALANCE_CONFLICT");
        }

        const walletBalanceAfter =
          payload.direction === "BUY"
            ? wallet.cashBalance.sub(cashAmount)
            : wallet.cashBalance.add(cashAmount);

        const cryptoBalanceAfter =
          payload.direction === "BUY"
            ? currentCryptoBalance.add(cryptoAmount)
            : currentCryptoBalance.sub(cryptoAmount);

        const transaction = await tx.transaction.create({
          data: {
            userId: user.id,
            type:
              payload.direction === "BUY"
                ? "CRYPTO_BUY"
                : "CRYPTO_SELL",
            status: "COMPLETED",
            balanceType: "CASH",
            amount: cashAmount,
            currency: "USD",
            usdAmount: cashAmount,
            exchangeRate: new Prisma.Decimal(1),
            description,
            reference,
          },
          select: { id: true, createdAt: true },
        });

        await tx.walletLedgerEntry.create({
          data: {
            walletId: wallet.id,
            transactionId: transaction.id,
            balanceType: "CASH",
            direction:
              payload.direction === "BUY" ? "DEBIT" : "CREDIT",
            amount: cashAmount,
            currency: "USD",
            balanceBefore: wallet.cashBalance,
            balanceAfter: walletBalanceAfter,
            description,
          },
        });

        await tx.cryptoLedgerEntry.create({
          data: {
            cryptoBalanceId: balanceId,
            asset: payload.asset,
            network: payload.network,
            direction:
              payload.direction === "BUY" ? "CREDIT" : "DEBIT",
            amount: cryptoAmount,
            balanceBefore: currentCryptoBalance,
            balanceAfter: cryptoBalanceAfter,
            description,
            operationKey: payload.nonce,
          },
        });

        return transaction.createdAt;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    const createdAt = committedAt.toISOString();
    const isBuy = payload.direction === "BUY";
    const notificationTitle = isBuy
      ? "Crypto purchase successful"
      : "Crypto sale successful";
    const notificationMessage = isBuy
      ? `${payload.cryptoAmount} ${payload.asset} was added to your crypto balance. Amount paid: ${payload.displayCurrency} ${payload.displayCashAmount}. Reference: ${reference}.`
      : `${payload.cryptoAmount} ${payload.asset} was sold. Cash received: ${payload.displayCurrency} ${payload.displayCashAmount}. Reference: ${reference}.`;

    try {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: "SYSTEM",
          title: notificationTitle,
          message: notificationMessage,
          href: "/dashboard/crypto",
        },
      });
    } catch (notificationError) {
      console.error(
        "Crypto trade committed, but in-app notification creation failed:",
        notificationError,
      );
    }

    try {
      const resendApiKey = process.env.RESEND_API_KEY;
      const emailFrom = process.env.ADMIN_NOTIFICATION_FROM;

      if (user.email && resendApiKey && emailFrom) {
        const resend = new Resend(resendApiKey);
        const emailResult = await resend.emails.send({
          from: emailFrom,
          to: user.email,
          subject: isBuy
            ? "Your MooGold crypto purchase receipt"
            : "Your MooGold crypto sale receipt",
          text: `Hello${user.fullName ? ` ${user.fullName}` : ""},

${isBuy ? "Your crypto purchase was successful." : "Your crypto sale was successful."}

Asset: ${payload.asset}
Crypto quantity: ${payload.cryptoAmount}
${isBuy ? "Amount paid" : "Cash received"}: ${payload.displayCurrency} ${payload.displayCashAmount}
Transaction reference: ${reference}
Transaction date: ${new Date(createdAt).toISOString()}

Thank you for using MooGold.`,
        });

        if (emailResult.error) {
          console.error(
            "Crypto trade committed, but receipt email sending failed:",
            emailResult.error,
          );
        }
      }
    } catch (emailError) {
      console.error(
        "Crypto trade committed, but receipt email sending failed:",
        emailError,
      );
    }

    return {
      success: true,
      direction: payload.direction,
      asset: payload.asset,
      cashAmount: payload.cashAmount,
      cryptoAmount: payload.cryptoAmount,
      currency: "USD",
      displayCurrency: payload.displayCurrency,
      displayCashAmount: payload.displayCashAmount,
      reference,
      createdAt,
    };
  } catch (error) {
    console.error("Crypto trade execution failed:", error);

    return {
      success: false,
      error: getSafeError(error),
    };
  }
}
