import {
  getCountry,
  type SupportedCountry,
} from "@/lib/phone";

export type CountryFinancialConfig = {
  code: SupportedCountry;
  name: string;
  currency: string;
  currencySymbol: string;
};

const COUNTRY_FINANCIAL_CONFIG: Record<
  SupportedCountry,
  Omit<CountryFinancialConfig, "code" | "name">
> = {
  US: {
    currency: "USD",
    currencySymbol: "$",
  },

  PH: {
    currency: "PHP",
    currencySymbol: "\u20B1",
  },

  SG: {
    currency: "SGD",
    currencySymbol: "S$",
  },

  MY: {
    currency: "MYR",
    currencySymbol: "RM",
  },

  KE: {
    currency: "KES",
    currencySymbol: "KSh",
  },

  GH: {
    currency: "GHS",
    currencySymbol: "\u20B5",
  },

  NG: {
    currency: "NGN",
    currencySymbol: "\u20A6",
  },

  ZA: {
    currency: "ZAR",
    currencySymbol: "R",
  },

  GB: {
    currency: "GBP",
    currencySymbol: "\u00A3",
  },

  CA: {
    currency: "CAD",
    currencySymbol: "C$",
  },

  IN: {
    currency: "INR",
    currencySymbol: "\u20B9",
  },

  CN: {
    currency: "CNY",
    currencySymbol: "\u00A5",
  },

  AE: {
    currency: "AED",
    currencySymbol: "\u062F.\u0625",
  },

  BR: {
    currency: "BRL",
    currencySymbol: "R$",
  },

  VN: {
    currency: "VND",
    currencySymbol: "\u20AB",
  },

  TR: {
    currency: "TRY",
    currencySymbol: "\u20BA",
  },
};

export const COUNTRY_FINANCIAL_CONFIGS: Readonly<
  Record<SupportedCountry, CountryFinancialConfig>
> = Object.fromEntries(
  Object.entries(COUNTRY_FINANCIAL_CONFIG).map(
    ([code, config]) => {
      const countryCode =
        code as SupportedCountry;

      const country = getCountry(countryCode);

      return [
        countryCode,
        {
          code: countryCode,
          name:
            country?.name ??
            countryCode,
          ...config,
        },
      ];
    },
  ),
) as Record<
  SupportedCountry,
  CountryFinancialConfig
>;

export function getCountryFinancialConfig(
  countryCode: string | null | undefined,
): CountryFinancialConfig | null {
  if (!countryCode) {
    return null;
  }

  const normalized =
    countryCode.toUpperCase() as SupportedCountry;

  return (
    COUNTRY_FINANCIAL_CONFIGS[normalized] ??
    null
  );
}

export function isSupportedFinancialCountry(
  countryCode: string | null | undefined,
): countryCode is SupportedCountry {
  return Boolean(
    getCountryFinancialConfig(countryCode),
  );
}