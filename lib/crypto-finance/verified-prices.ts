import type { CryptoAssetCode } from "@/lib/crypto/prices";

const CRYPTO_PRICE_MAX_AGE_MS = 10 * 60 * 1000;
const FX_RATE_MAX_AGE_MS = 4 * 24 * 60 * 60 * 1000;
const FUTURE_TIMESTAMP_TOLERANCE_MS = 60 * 1000;

const COINGECKO_IDS: Record<CryptoAssetCode, string> = {
  USDC: "usd-coin",
  USDT: "tether",
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  TRN: "tron",
  XLM: "stellar",
};

const SUPPORTED_FX_CURRENCIES = new Set([
  "USD", "PHP", "SGD", "MYR", "KES", "GHS", "NGN", "ZAR",
  "GBP", "CAD", "INR", "CNY", "AED", "BRL", "VND", "TRY",
]);

export type VerifiedRate = {
  rate: number;
  source: string;
  observedAt: Date;
};

export class VerifiedRateError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "UNSUPPORTED_ASSET"
      | "UNSUPPORTED_CURRENCY"
      | "PROVIDER_UNAVAILABLE"
      | "INVALID_RATE"
      | "STALE_RATE",
  ) {
    super(message);
    this.name = "VerifiedRateError";
  }
}

function requireValidRate(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    throw new VerifiedRateError(
      "The provider returned an invalid rate.",
      "INVALID_RATE",
    );
  }

  return value;
}

function parseObservationTime(value: unknown, maxAgeMs: number): Date {
  if (typeof value !== "string" && typeof value !== "number") {
    throw new VerifiedRateError(
      "The provider did not supply an observation timestamp.",
      "INVALID_RATE",
    );
  }

  const timestamp =
    typeof value === "number"
      ? value * 1000
      : Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    throw new VerifiedRateError(
      "The provider supplied an invalid observation timestamp.",
      "INVALID_RATE",
    );
  }

  const now = Date.now();
  const age = now - timestamp;

  if (age < -FUTURE_TIMESTAMP_TOLERANCE_MS) {
    throw new VerifiedRateError(
      "The provider timestamp is in the future.",
      "INVALID_RATE",
    );
  }

  if (age > maxAgeMs) {
    throw new VerifiedRateError(
      "The provider rate is too old for a new financial quote.",
      "STALE_RATE",
    );
  }

  return new Date(timestamp);
}

/**
 * Returns a provider-backed crypto/USD reference price.
 * Stablecoins are queried from the provider; no $1 fallback is used.
 * This is a reference-price primitive, not an executable exchange quote.
 */
export async function getVerifiedCryptoUsdPrice(
  asset: CryptoAssetCode,
): Promise<VerifiedRate> {
  const coinId = COINGECKO_IDS[asset];

  if (!coinId) {
    throw new VerifiedRateError(
      "Unsupported crypto asset.",
      "UNSUPPORTED_ASSET",
    );
  }

  try {
    const url = new URL(
      "https://api.coingecko.com/api/v3/simple/price",
    );

    url.searchParams.set("ids", coinId);
    url.searchParams.set("vs_currencies", "usd");
    url.searchParams.set("include_last_updated_at", "true");

    const response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`Price provider HTTP ${response.status}`);
    }

    const data: unknown = await response.json();

    if (
      typeof data !== "object" ||
      data === null ||
      !(coinId in data)
    ) {
      throw new VerifiedRateError(
        "The provider omitted the requested asset.",
        "INVALID_RATE",
      );
    }

    const record = (data as Record<string, unknown>)[coinId];

    if (typeof record !== "object" || record === null) {
      throw new VerifiedRateError(
        "The provider returned an invalid asset record.",
        "INVALID_RATE",
      );
    }

    const values = record as Record<string, unknown>;
    const rate = requireValidRate(values.usd);
    const observedAt = parseObservationTime(
      values.last_updated_at,
      CRYPTO_PRICE_MAX_AGE_MS,
    );

    return {
      rate,
      source: "CoinGecko",
      observedAt,
    };
  } catch (error) {
    if (error instanceof VerifiedRateError) {
      throw error;
    }

    throw new VerifiedRateError(
      "A current crypto reference price is unavailable.",
      "PROVIDER_UNAVAILABLE",
    );
  }
}

/**
 * Returns a dated USD-to-local-currency reference rate.
 * Unsupported currencies or missing/stale dates fail closed.
 * This does not prove that a currency can be paid out to a bank.
 */
export async function getVerifiedUsdFxRate(
  currency: string,
): Promise<VerifiedRate> {
  const target = currency.trim().toUpperCase();

  if (!SUPPORTED_FX_CURRENCIES.has(target)) {
    throw new VerifiedRateError(
      "Unsupported payout currency.",
      "UNSUPPORTED_CURRENCY",
    );
  }

  if (target === "USD") {
    return {
      rate: 1,
      source: "USD identity rate",
      observedAt: new Date(),
    };
  }

  try {
    const url = new URL("https://api.frankfurter.dev/v2/rates");
    url.searchParams.set("base", "USD");
    url.searchParams.set("quotes", target);

    const response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`FX provider HTTP ${response.status}`);
    }

    const data: unknown = await response.json();

    if (!Array.isArray(data)) {
      throw new VerifiedRateError(
        "The FX provider returned an invalid response.",
        "INVALID_RATE",
      );
    }

    const matchingRecords = data.filter(
      (item: unknown) =>
        typeof item === "object" &&
        item !== null &&
        "base" in item &&
        item.base === "USD" &&
        "quote" in item &&
        item.quote === target,
    );

    if (matchingRecords.length !== 1) {
      throw new VerifiedRateError(
        "The FX provider did not return exactly one rate for the requested currency.",
        "INVALID_RATE",
      );
    }

    const record = matchingRecords[0] as Record<string, unknown>;
    const rate = requireValidRate(record.rate);

    if (typeof record.date !== "string") {
      throw new VerifiedRateError(
        "The FX provider omitted its published date.",
        "INVALID_RATE",
      );
    }

    const observedAt = parseObservationTime(
      `${record.date}T00:00:00.000Z`,
      FX_RATE_MAX_AGE_MS,
    );

    return {
      rate,
      source: "Frankfurter",
      observedAt,
    };
  } catch (error) {
    if (error instanceof VerifiedRateError) {
      throw error;
    }

    throw new VerifiedRateError(
      "A current FX reference rate is unavailable.",
      "PROVIDER_UNAVAILABLE",
    );
  }
}
