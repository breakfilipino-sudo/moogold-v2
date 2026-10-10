import { NextResponse } from "next/server";

import { COUNTRY_FINANCIAL_CONFIGS } from "@/lib/countries";

const SUPPORTED_CURRENCIES = new Set(
  Object.values(COUNTRY_FINANCIAL_CONFIGS).map(
    (country) => country.currency,
  ),
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const from = searchParams
      .get("from")
      ?.trim()
      .toUpperCase();

    const to = searchParams
      .get("to")
      ?.trim()
      .toUpperCase();

    if (!from || !to) {
      return NextResponse.json(
        {
          error: "Currency parameters are required.",
        },
        { status: 400 },
      );
    }

    if (
      !SUPPORTED_CURRENCIES.has(from) ||
      !SUPPORTED_CURRENCIES.has(to)
    ) {
      return NextResponse.json(
        {
          error: "Unsupported currency.",
        },
        { status: 400 },
      );
    }

    if (from === to) {
      return NextResponse.json({
        from,
        to,
        rate: 1,
      });
    }

    const response = await fetch(
      `https://api.frankfurter.app/latest?from=${encodeURIComponent(
        from,
      )}&to=${encodeURIComponent(to)}`,
      {
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(
        "Exchange rate request failed.",
      );
    }

    const data = await response.json();

    const rate = Number(data?.rates?.[to]);

    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error(
        "Invalid exchange rate returned.",
      );
    }

    return NextResponse.json({
      from,
      to,
      rate,
    });
  } catch (error) {
    console.error(
      "Currency rate error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to retrieve exchange rate.",
      },
      { status: 500 },
    );
  }
}