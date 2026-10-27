import { randomUUID } from "node:crypto";

import type { CryptoAssetCode } from "@/lib/crypto/prices";
import type { VerifiedRate } from "./verified-prices";

const QUOTE_LIFETIME_MS = 60_000;
const CRYPTO_SCALE = 18;
const USD_SCALE = 8;
const USD_UNIT = BigInt(10) ** BigInt(USD_SCALE);
const CRYPTO_UNIT = BigInt(10) ** BigInt(CRYPTO_SCALE);

const CURRENCY_MINOR_UNITS: Readonly<Record<string, number>> = {
  USD: 2,
  PHP: 2,
  SGD: 2,
  MYR: 2,
  KES: 2,
  GHS: 2,
  NGN: 2,
  ZAR: 2,
  GBP: 2,
  CAD: 2,
  INR: 2,
  CNY: 2,
  AED: 2,
  BRL: 2,
  VND: 0,
  TRY: 2,
};

export type ConversionQuoteInput = {
  asset: CryptoAssetCode;
  cryptoAmount: string;
  cryptoUsdPrice: VerifiedRate;
  usdToLocalRate: VerifiedRate;
  payoutCurrency: string;
  feeUsd: string;
  now?: Date;
};

export type ConversionQuote = {
  quoteId: string;
  asset: CryptoAssetCode;
  cryptoAmount: string;
  cryptoUsdPrice: string;
  cryptoPriceSource: string;
  cryptoPriceObservedAt: string;
  usdToLocalRate: string;
  fxRateSource: string;
  fxRateObservedAt: string;
  usdValue: string;
  feeUsd: string;
  payoutCurrency: string;
  payoutAmount: string;
  createdAt: string;
  expiresAt: string;
  settlementReady: false;
};

function parseFixed(value: string, scale: number, field: string): bigint {
  const input = value.trim();
  const match = /^(\d+)(?:\.(\d+))?$/.exec(input);

  if (!match) {
    throw new Error(`${field} must be a positive decimal string.`);
  }

  const fraction = match[2] ?? "";

  if (fraction.length > scale) {
    throw new Error(`${field} supports at most ${scale} decimal places.`);
  }

  const unit = BigInt(10) ** BigInt(scale);
  const whole = BigInt(match[1]);
  const fractional = BigInt((fraction + "0".repeat(scale)).slice(0, scale) || "0");
  const result = whole * unit + fractional;

  if (result <= BigInt(0)) {
    throw new Error(`${field} must be greater than zero.`);
  }

  return result;
}

function parseNonNegativeFixed(
  value: string,
  scale: number,
  field: string,
): bigint {
  const input = value.trim();
  const match = /^(\d+)(?:\.(\d+))?$/.exec(input);

  if (!match) {
    throw new Error(`${field} must be a non-negative decimal string.`);
  }

  const fraction = match[2] ?? "";

  if (fraction.length > scale) {
    throw new Error(`${field} supports at most ${scale} decimal places.`);
  }

  const unit = BigInt(10) ** BigInt(scale);
  const fractional = BigInt((fraction + "0".repeat(scale)).slice(0, scale) || "0");

  return BigInt(match[1]) * unit + fractional;
}

function fixedToString(value: bigint, scale: number): string {
  const negative = value < BigInt(0);
  const absolute = negative ? -value : value;
  const unit = BigInt(10) ** BigInt(scale);
  const whole = absolute / unit;
  const fraction = (absolute % unit)
    .toString()
    .padStart(scale, "0")
    .replace(/0+$/, "");

  return `${negative ? "-" : ""}${whole.toString()}${fraction ? `.${fraction}` : ""}`;
}

function numberToFixed(value: number, scale: number, field: string): bigint {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} is not a valid positive rate.`);
  }

  // Rates are provider-supplied JS numbers; normalize to the precision
  // retained in the quote. These are estimates, not executable settlement rates.
  return parseFixed(value.toFixed(scale), scale, field);
}

function roundDivide(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= BigInt(0)) {
    throw new Error("Invalid arithmetic denominator.");
  }

  return (numerator + denominator / BigInt(2)) / denominator;
}

function assertRateSnapshot(
  rate: VerifiedRate,
  field: string,
  now: Date,
  maxAgeMs: number,
): void {
  if (
    !Number.isFinite(rate.rate) ||
    rate.rate <= 0 ||
    typeof rate.source !== "string" ||
    !rate.source.trim() ||
    !(rate.observedAt instanceof Date) ||
    !Number.isFinite(rate.observedAt.getTime())
  ) {
    throw new Error(`${field} is not a valid rate snapshot.`);
  }

  const ageMs = now.getTime() - rate.observedAt.getTime();

  if (ageMs < -60_000) {
    throw new Error(`${field} observation time is in the future.`);
  }

  if (ageMs > maxAgeMs) {
    throw new Error(`${field} observation is too old for a new quote.`);
  }
}

export function createConversionQuote(
  input: ConversionQuoteInput,
): ConversionQuote {
  const currency = input.payoutCurrency.trim().toUpperCase();
  const minorUnits = CURRENCY_MINOR_UNITS[currency];

  if (minorUnits === undefined) {
    throw new Error("Unsupported payout currency.");
  }

  const now = input.now ?? new Date();

  if (!Number.isFinite(now.getTime())) {
    throw new Error("Invalid quote creation time.");
  }

  assertRateSnapshot(
    input.cryptoUsdPrice,
    "Crypto price",
    now,
    10 * 60 * 1000,
  );

  assertRateSnapshot(
    input.usdToLocalRate,
    "FX rate",
    now,
    4 * 24 * 60 * 60 * 1000,
  );

  const cryptoAmount = parseFixed(
    input.cryptoAmount,
    CRYPTO_SCALE,
    "Crypto amount",
  );

  const cryptoPrice = numberToFixed(
    input.cryptoUsdPrice.rate,
    USD_SCALE,
    "Crypto USD price",
  );

  const fxRate = numberToFixed(
    input.usdToLocalRate.rate,
    USD_SCALE,
    "USD-to-local FX rate",
  );

  const feeUsd = parseNonNegativeFixed(input.feeUsd, USD_SCALE, "Fee");

  // Amount * USD price => USD value at 8 decimal places.
  const usdValue = roundDivide(
    cryptoAmount * cryptoPrice,
    CRYPTO_UNIT,
  );

  if (feeUsd >= usdValue) {
    throw new Error("The conversion fee must be less than the USD value.");
  }

  // Convert the net USD amount to local currency and round to the
  // currency's minor unit. This is an estimate, not payout authorization.
  const netUsd = usdValue - feeUsd;
  const localScale = BigInt(10) ** BigInt(minorUnits);
  const payoutAmount = roundDivide(
    netUsd * fxRate * localScale,
    USD_UNIT * USD_UNIT,
  );

  if (payoutAmount <= BigInt(0)) {
    throw new Error("The estimated payout is too small.");
  }

  const expiresAt = new Date(now.getTime() + QUOTE_LIFETIME_MS);

  return {
    quoteId: randomUUID(),
    asset: input.asset,
    cryptoAmount: fixedToString(cryptoAmount, CRYPTO_SCALE),
    cryptoUsdPrice: fixedToString(cryptoPrice, USD_SCALE),
    cryptoPriceSource: input.cryptoUsdPrice.source,
    cryptoPriceObservedAt: input.cryptoUsdPrice.observedAt.toISOString(),
    usdToLocalRate: fixedToString(fxRate, USD_SCALE),
    fxRateSource: input.usdToLocalRate.source,
    fxRateObservedAt: input.usdToLocalRate.observedAt.toISOString(),
    usdValue: fixedToString(usdValue, USD_SCALE),
    feeUsd: fixedToString(feeUsd, USD_SCALE),
    payoutCurrency: currency,
    payoutAmount: fixedToString(payoutAmount, minorUnits),
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    settlementReady: false,
  };
}

export function isConversionQuoteExpired(
  quote: Pick<ConversionQuote, "expiresAt">,
  now: Date = new Date(),
): boolean {
  const expiry = Date.parse(quote.expiresAt);

  return !Number.isFinite(expiry) || now.getTime() >= expiry;
}
