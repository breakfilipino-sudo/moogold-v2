import { NextResponse } from "next/server";

const CRYPTO_IDS = {
BTC: "bitcoin",
ETH: "ethereum",
SOL: "solana",
USDT: "tether",
USDC: "usd-coin",
TRN: "tron",
XLM: "stellar",
} as const;

type CryptoAsset = keyof typeof CRYPTO_IDS;

export async function GET(
request: Request,
) {
const { searchParams } =
new URL(request.url);

const asset =
String(
searchParams.get("asset") ?? "",
)
.trim()
.toUpperCase() as CryptoAsset;

if (!asset || !(asset in CRYPTO_IDS)) {
return NextResponse.json(
{
error: "Unsupported crypto asset.",
},
{
status: 400,
},
);
}

const coinId = CRYPTO_IDS[asset];

try {
if (
asset === "USDT" ||
asset === "USDC"
) {
return NextResponse.json({
asset,
usdPrice: 1,
});
}

const response = await fetch(
  `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
  {
    headers: {
      Accept: "application/json",
    },
    next: {
      revalidate: 30,
    },
  },
);

if (!response.ok) {
  throw new Error(
    `CoinGecko returned ${response.status}.`,
  );
}

const data = (await response.json()) as Record<
  string,
  {
    usd?: number;
  }
>;

const usdPrice = data[coinId]?.usd;

if (
  typeof usdPrice !== "number" ||
  !Number.isFinite(usdPrice) ||
  usdPrice <= 0
) {
  throw new Error(
    "A valid crypto price was not returned.",
  );
}

return NextResponse.json({
  asset,
  usdPrice,
});

} catch (error) {
console.error(
"Failed to retrieve crypto quote:",
error,
);

return NextResponse.json(
  {
    error:
      "Crypto price is temporarily unavailable. Please try again.",
  },
  {
    status: 503,
  },
);

}
}
