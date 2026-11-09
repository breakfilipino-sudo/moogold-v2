type ExchangeRateResponse = {
  result?: string;
  base_code?: string;
  rates?: Record<string, number>;
};

export async function getUsdToLocalRate(
  currency: string,
): Promise<number | null> {
  const target = currency.trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(target)) {
    return null;
  }

  if (target === "USD") {
    return 1;
  }

  try {
    const response = await fetch(
      "https://open.er-api.com/v6/latest/USD",
      {
        next: { revalidate: 6 * 60 * 60 },
        headers: { Accept: "application/json" },
      },
    );

    if (!response.ok) {
      return null;
    }

    const data =
      (await response.json()) as ExchangeRateResponse;

    const rate = Number(data.rates?.[target]);

    if (
      data.result !== "success" ||
      data.base_code !== "USD" ||
      !Number.isFinite(rate) ||
      rate <= 0
    ) {
      return null;
    }

    return rate;
  } catch {
    return null;
  }
}

export function formatCurrencyAmount(
  value: number,
  currency: string,
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
