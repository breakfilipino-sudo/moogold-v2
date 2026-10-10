export type DepositCountry = {
  code: string;
  name: string;
  currency: string;
  currencySymbol: string;
};

/**
 * MooGold deposit country configuration.
 *
 * Add new countries here later without changing the
 * core deposit transaction architecture.
 */
export const DEPOSIT_COUNTRIES: Record<string, DepositCountry> = {
  MY: {
    code: "MY",
    name: "Malaysia",
    currency: "MYR",
    currencySymbol: "RM",
  },

  PH: {
    code: "PH",
    name: "Philippines",
    currency: "PHP",
    currencySymbol: "₱",
  },

  TH: {
    code: "TH",
    name: "Thailand",
    currency: "THB",
    currencySymbol: "฿",
  },

  SG: {
    code: "SG",
    name: "Singapore",
    currency: "SGD",
    currencySymbol: "S$",
  },

  US: {
    code: "US",
    name: "United States",
    currency: "USD",
    currencySymbol: "$",
  },
};

export function getDepositCountry(
  countryCode: string | null | undefined,
): DepositCountry | null {
  if (!countryCode) {
    return null;
  }

  return DEPOSIT_COUNTRIES[countryCode.toUpperCase()] ?? null;
}

export function getDepositCurrency(
  countryCode: string | null | undefined,
): string {
  return getDepositCountry(countryCode)?.currency ?? "USD";
}

export function getDepositCurrencySymbol(
  countryCode: string | null | undefined,
): string {
  return getDepositCountry(countryCode)?.currencySymbol ?? "$";
}