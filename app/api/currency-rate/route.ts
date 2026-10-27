import { NextResponse } from "next/server";

import { COUNTRY_FINANCIAL_CONFIGS } from "@/lib/countries";

const SUPPORTED_CURRENCIES = new Set(
  Object.values(COUNTRY_FINANCIAL_CONFIGS).map(
    (country) => country.currency.toUpperCase(),
  ),
);

const RATE_CACHE_SECONDS = 6 * 60 * 60;

type ExchangeRateResponse = {
  result?: string;
  base_code?: string;
  time_last_update_unix?: number;
  rates?: Record<string, number>;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const from = searchParams.get("from")?.trim().toUpperCase();
  const to = searchParams.get("to")?.trim().toUpperCase();

  if (!from || !to || !/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) {
    return NextResponse.json(
      { error: "Valid currency codes are required." },
      { status: 400 },
    );
  }

  if (!SUPPORTED_CURRENCIES.has(to)) {
    return NextResponse.json(
      { error: "Unsupported destination currency." },
      { status: 400 },
    );
  }

  if (from === to) {
    return NextResponse.json(
      { from, to, rate: 1 },
      {
        headers: {
          "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
        },
      },
    );
  }

  try {
    const response = await fetch(
      `https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`,
      {
        next: { revalidate: RATE_CACHE_SECONDS },
        headers: { Accept: "application/json" },
      },
    );

    if (!response.ok) {
      throw new Error(`Exchange-rate provider returned HTTP ${response.status}.`);
    }

    const data = (await response.json()) as ExchangeRateResponse;

    if (data.result !== "success" || data.base_code !== from || !data.rates) {
      throw new Error("Exchange-rate provider returned an invalid response.");
    }

    const rate = Number(data.rates[to]);

    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error(`No valid ${from} to ${to} exchange rate was returned.`);
    }

    return NextResponse.json(
      {
        from,
        to,
        rate,
        provider: "ExchangeRate-API",
        lastUpdated: data.time_last_update_unix ?? null,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (error) {
    console.error("Currency rate error:", error);

    return NextResponse.json(
      { error: "Unable to retrieve exchange rate." },
      { status: 502 },
    );
  }
}