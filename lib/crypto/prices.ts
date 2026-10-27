export const CRYPTO_ASSETS = [
  "USDC",
  "USDT",
  "BTC",
  "ETH",
  "SOL",
  "TRN",
  "XLM",
] as const;

export type CryptoAssetCode = (typeof CRYPTO_ASSETS)[number];

const COINGECKO_IDS: Partial<Record<CryptoAssetCode, string>> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  TRN: "tron",
  XLM: "stellar",
};

export type CryptoUsdPrices = Partial<Record<CryptoAssetCode, number>>;

/**
 * Returns available USD reference prices.
 * Missing prices are intentionally omitted, never treated as zero.
 */
export async function getCryptoUsdPrices(): Promise<CryptoUsdPrices> {
  const prices: CryptoUsdPrices = { USDC: 1, USDT: 1 };
  const ids = Object.values(COINGECKO_IDS);

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
      CryptoAssetCode,
      string,
    ][]) {
      const price = data[coinId]?.usd;
      if (typeof price === "number" && Number.isFinite(price) && price > 0) {
        prices[asset] = price;
      }
    }
  } catch (error) {
    console.error("Crypto USD price lookup failed:", error);
  }

  return prices;
}
