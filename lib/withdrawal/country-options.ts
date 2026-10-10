export type SupportedCountry = "MY" | "PH";

export const WITHDRAWAL_OPTIONS = {
  MY: {
    countryName: "Malaysia",

    banks: [
      "Maybank",
      "CIMB Bank",
      "Public Bank",
      "RHB Bank",
      "Hong Leong Bank",
      "AmBank",
      "Bank Islam",
      "Bank Muamalat",
      "Bank Simpanan Nasional (BSN)",
      "Alliance Bank",
    ],

    eWallets: [
      "Touch 'n Go eWallet",
      "GrabPay",
      "Boost",
      "BigPay",
      "ShopeePay",
    ],
  },

  PH: {
    countryName: "Philippines",

    banks: [
      "BDO Unibank",
      "Bank of the Philippine Islands (BPI)",
      "Metrobank",
      "Land Bank of the Philippines",
      "Security Bank",
      "RCBC",
      "UnionBank",
      "Philippine National Bank (PNB)",
      "China Bank",
      "EastWest Bank",
    ],

    eWallets: [
      "GCash",
      "Maya",
      "GrabPay",
      "ShopeePay",
    ],
  },
} as const;

export function isSupportedCountry(
  countryCode: string | null | undefined,
): countryCode is SupportedCountry {
  return countryCode === "MY" || countryCode === "PH";
}

export function isValidBank(
  countryCode: SupportedCountry,
  bank: string,
) {
  return WITHDRAWAL_OPTIONS[countryCode].banks.includes(
    bank as never,
  );
}

export function isValidEWallet(
  countryCode: SupportedCountry,
  provider: string,
) {
  return WITHDRAWAL_OPTIONS[countryCode].eWallets.includes(
    provider as never,
  );
}