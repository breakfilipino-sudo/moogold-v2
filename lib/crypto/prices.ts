export const CRYPTO_ASSETS = [
  "USDC",
  "USDT",
  "BTC",
  "ETH",
  "SOL",
  "TRN",
  "XLM",
] as const;

/** Assets supported by the existing trading and withdrawal flows. */
export type CryptoAssetCode = (typeof CRYPTO_ASSETS)[number];

/** Additional assets accepted for deposits only. */
export const DEPOSIT_CRYPTO_ASSETS = [
  ...CRYPTO_ASSETS,
  "BNB",
  "TRX",
  "SUI",
] as const;

export type DepositCryptoAssetCode =
  (typeof DEPOSIT_CRYPTO_ASSETS)[number];

const COINGECKO_IDS: Partial<
  Record<DepositCryptoAssetCode, string>
> = {
  USDC: "usd-coin",
  USDT: "tether",
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  TRN: "tron",
  XLM: "stellar",
  BNB: "binancecoin",
  TRX: "tron",
  SUI: "sui",
};

export type CryptoUsdPrices = Partial<
  Record<DepositCryptoAssetCode, number>
>;

/**
 * Returns available USD reference prices.
 * Missing prices are intentionally omitted, never treated as zero.
 */
export async function getCryptoUsdPrices(): Promise<CryptoUsdPrices> {
  const prices: CryptoUsdPrices = {};
  const ids = [...new Set(Object.values(COINGECKO_IDS))];

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd`,
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!response.ok) return prices;

    const data = (await response.json()) as Record<
      string,
      { usd?: number }
    >;

    for (const [asset, coinId] of Object.entries(COINGECKO_IDS) as [
      DepositCryptoAssetCode,
      string,
    ][]) {
      const price = data[coinId]?.usd;

      if (
        typeof price === "number" &&
        Number.isFinite(price) &&
        price > 0
      ) {
        prices[asset] = price;
      }
    }
  } catch (error) {
    console.error("Crypto USD price lookup failed:", error);
  }

  return prices;
}