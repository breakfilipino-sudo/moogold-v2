import {
  SUPPORTED_COUNTRIES,
  type SupportedCountry,
} from "@/lib/phone";

export type BankFieldMode = "select" | "text";

export type WithdrawalBankRule = {
  accountNumberMinLength: number;
  accountNumberMaxLength: number;
  allowedLengths?: readonly number[];
  numericOnly?: boolean;
};

export type WithdrawalCountryConfig = {
  code: SupportedCountry;
  bankFieldMode: BankFieldMode;
  banks: readonly string[];

  /*
   * These remain as country fallbacks for banks where a verified
   * bank-specific rule has not yet been defined.
   */
  accountNumberMinLength: number;
  accountNumberMaxLength: number;

  routingNumberRequired: boolean;
  routingNumberLength?: number;
  routingNumberLabel?: string;

  bankRules: Readonly<
    Record<string, WithdrawalBankRule>
  >;
};

const CURATED_BANKS: Record<
  SupportedCountry,
  readonly string[]
> = {
  US: [
    "JPMorgan Chase Bank",
    "Bank of America",
    "Wells Fargo Bank",
    "Citibank",
    "U.S. Bank",
    "PNC Bank",
    "Truist Bank",
    "Capital One",
    "TD Bank",
    "BMO Bank",
    "Cash App",
    "Venmo",
    "PayPal",
    "Zelle",
  ],

  PH: [
    "BDO Unibank",
    "Bank of the Philippine Islands (BPI)",
    "Metrobank",
    "Philippine National Bank (PNB)",
    "LandBank of the Philippines",
    "Security Bank",
    "UnionBank",
    "China Bank",
    "RCBC",
    "EastWest Bank",
    "GCash",
    "Maya",
    "GrabPay",
    "Coins.ph",
    "PalawanPay",
  ],

  SG: [
    "DBS Bank",
    "POSB",
    "OCBC Bank",
    "United Overseas Bank (UOB)",
    "Standard Chartered Singapore",
    "Citibank Singapore",
    "Maybank Singapore",
    "HSBC Singapore",
    "CIMB Bank Singapore",
    "Bank of China Singapore",
    "DBS PayLah!",
    "GrabPay",
    "PayNow",
  ],

  MY: [
    "Maybank",
    "CIMB Bank",
    "Public Bank",
    "RHB Bank",
    "Hong Leong Bank",
    "AmBank",
    "Bank Islam",
    "Bank Muamalat",
    "Affin Bank",
    "Alliance Bank",
    "Touch 'n Go eWallet",
    "GrabPay",
    "Boost",
    "ShopeePay",
  ],

  KE: [
    "KCB Bank Kenya",
    "Equity Bank Kenya",
    "Co-operative Bank of Kenya",
    "Absa Bank Kenya",
    "NCBA Bank Kenya",
    "Stanbic Bank Kenya",
    "I&M Bank",
    "DTB Bank Kenya",
    "Family Bank",
    "Standard Chartered Bank Kenya",
    "M-Pesa",
    "Airtel Money",
    "Equitel Money",
  ],

  GH: [
    "GCB Bank",
    "Absa Bank Ghana",
    "Access Bank Ghana",
    "Agricultural Development Bank",
    "Bank of Africa Ghana",
    "Ecobank Ghana",
    "Fidelity Bank Ghana",
    "Republic Bank Ghana",
    "Stanbic Bank Ghana",
    "Standard Chartered Bank Ghana",
    "United Bank for Africa Ghana",
    "Zenith Bank Ghana",
    "MTN MoMo",
    "Telecel Cash",
    "AirtelTigo Money",
  ],

  NG: [
    "Access Bank",
    "ALAT by Wema",
    "Ecobank",
    "Fidelity Bank",
    "First Bank",
    "First City Monument Bank (FCMB)",
    "Globus Bank",
    "GTCO",
    "Keystone Bank",
    "Moniepoint",
    "Opay",
    "PalmPay",
    "Polaris Bank",
    "Stanbic IBTC",
    "Sterling Bank",
    "Union Bank",
    "United Bank for Africa (UBA)",
    "Unity Bank",
    "Wema Bank",
    "Zenith Bank",
    "Kuda",
    "SmartCash",
  ],

  ZA: [
    "Absa Bank",
    "African Bank",
    "Capitec Bank",
    "Discovery Bank",
    "First National Bank (FNB)",
    "Investec Bank",
    "Nedbank",
    "Standard Bank",
    "TymeBank",
    "Bidvest Bank",
    "MTN MoMo",
    "Vodapay",
  ],

  GB: [
    "Barclays",
    "HSBC UK",
    "Lloyds Bank",
    "NatWest",
    "Royal Bank of Scotland (RBS)",
    "Santander UK",
    "Halifax",
    "Nationwide Building Society",
    "TSB",
    "Metro Bank",
    "PayPal",
    "Revolut",
    "Wise",
  ],

  CA: [
    "Royal Bank of Canada (RBC)",
    "Toronto-Dominion Bank (TD Canada Trust)",
    "Bank of Montreal (BMO)",
    "Bank of Nova Scotia (Scotiabank)",
    "Canadian Imperial Bank of Commerce (CIBC)",
    "National Bank of Canada",
    "Desjardins",
    "Simplii Financial",
    "Tangerine Bank",
    "EQ Bank",
    "PayPal",
    "Wise",
    "Wealthsimple",
  ],

  IN: [
    "State Bank of India (SBI)",
    "HDFC Bank",
    "ICICI Bank",
    "Axis Bank",
    "Kotak Mahindra Bank",
    "IndusInd Bank",
    "Bank of Baroda",
    "Punjab National Bank (PNB)",
    "Canara Bank",
    "Union Bank of India",
    "PhonePe",
    "Google Pay",
    "Paytm",
    "Amazon Pay",
  ],

  CN: [
    "Industrial and Commercial Bank of China (ICBC)",
    "China Construction Bank",
    "Agricultural Bank of China",
    "Bank of China",
    "Bank of Communications",
    "China Merchants Bank",
    "Industrial Bank",
    "China CITIC Bank",
    "Shanghai Pudong Development Bank",
    "China Minsheng Bank",
    "Alipay",
    "WeChat Pay",
  ],

  AE: [
    "Emirates NBD",
    "First Abu Dhabi Bank (FAB)",
    "Abu Dhabi Commercial Bank (ADCB)",
    "Dubai Islamic Bank",
    "Mashreq Bank",
    "Commercial Bank of Dubai",
    "RAKBANK",
    "Ajman Bank",
    "Sharjah Islamic Bank",
    "Emirates Islamic",
    "e& money",
    "du Pay",
  ],

  BR: [
    "Banco do Brasil",
    "Caixa Econômica Federal",
    "Itaú Unibanco",
    "Bradesco",
    "Santander Brasil",
    "BTG Pactual",
    "Banco Safra",
    "Sicredi",
    "Sicoob",
    "Nubank",
    "Mercado Pago",
    "PicPay",
  ],

  VN: [
    "Vietcombank",
    "VietinBank",
    "BIDV",
    "Agribank",
    "ACB",
    "Techcombank",
    "MB Bank",
    "VPBank",
    "Sacombank",
    "TPBank",
    "MoMo",
    "ZaloPay",
    "VNPT Money",
  ],

  TR: [
    "Ziraat Bankası",
    "Türkiye İş Bankası",
    "Garanti BBVA",
    "Akbank",
    "Yapı Kredi",
    "Halkbank",
    "VakıfBank",
    "QNB Finansbank",
    "DenizBank",
    "Kuveyt Türk",
    "Papara",
    "Paycell",
  ],
};

/*
 * ------------------------------------------------------------------
 * COUNTRY FALLBACK RULES
 * ------------------------------------------------------------------
 *
 * These are intentionally conservative fallback ranges.
 * Bank-specific rules override them.
 */
const COUNTRY_ACCOUNT_RULES: Record<
  SupportedCountry,
  Pick<
    WithdrawalCountryConfig,
    | "accountNumberMinLength"
    | "accountNumberMaxLength"
    | "routingNumberRequired"
    | "routingNumberLength"
    | "routingNumberLabel"
  >
> = {
  US: {
    accountNumberMinLength: 1,
    accountNumberMaxLength: 17,
    routingNumberRequired: true,
    routingNumberLength: 9,
    routingNumberLabel: "Routing number",
  },

  PH: {
    accountNumberMinLength: 10,
    accountNumberMaxLength: 13,
    routingNumberRequired: false,
  },

  SG: {
    accountNumberMinLength: 8,
    accountNumberMaxLength: 14,
    routingNumberRequired: false,
  },

  MY: {
    accountNumberMinLength: 6,
    accountNumberMaxLength: 30,
    routingNumberRequired: false,
  },

  KE: {
    accountNumberMinLength: 6,
    accountNumberMaxLength: 30,
    routingNumberRequired: false,
  },

  GH: {
    accountNumberMinLength: 6,
    accountNumberMaxLength: 30,
    routingNumberRequired: false,
  },

  NG: {
    accountNumberMinLength: 10,
    accountNumberMaxLength: 10,
    routingNumberRequired: false,
  },

  ZA: {
    accountNumberMinLength: 6,
    accountNumberMaxLength: 30,
    routingNumberRequired: false,
  },

  GB: {
    accountNumberMinLength: 6,
    accountNumberMaxLength: 10,
    routingNumberRequired: true,
    routingNumberLength: 6,
    routingNumberLabel: "Sort code",
  },

  CA: {
    accountNumberMinLength: 5,
    accountNumberMaxLength: 17,
    routingNumberRequired: false,
  },

  IN: {
    accountNumberMinLength: 6,
    accountNumberMaxLength: 18,
    routingNumberRequired: true,
    routingNumberLength: 11,
    routingNumberLabel: "IFSC code",
  },

  CN: {
    accountNumberMinLength: 8,
    accountNumberMaxLength: 30,
    routingNumberRequired: false,
  },

  AE: {
    accountNumberMinLength: 16,
    accountNumberMaxLength: 16,
    routingNumberRequired: false,
  },

  BR: {
    accountNumberMinLength: 5,
    accountNumberMaxLength: 20,
    routingNumberRequired: false,
  },

  VN: {
    accountNumberMinLength: 6,
    accountNumberMaxLength: 20,
    routingNumberRequired: false,
  },

  TR: {
    accountNumberMinLength: 8,
    accountNumberMaxLength: 34,
    routingNumberRequired: false,
  },
};

/*
 * ------------------------------------------------------------------
 * VERIFIED BANK-SPECIFIC RULES
 * ------------------------------------------------------------------
 *
 * These rules are for the actual bank account/funds-transfer
 * identifier, not credit-card or loan-payment numbers.
 *
 * More banks can be added without changing the withdrawal UI,
 * action, database schema, or country architecture.
 */
const BANK_RULES: Partial<
  Record<
    SupportedCountry,
    Readonly<Record<string, WithdrawalBankRule>>
  >
> = {
  NG: Object.fromEntries(
    CURATED_BANKS.NG.map((bank) => [
      bank,
      {
        accountNumberMinLength: 10,
        accountNumberMaxLength: 10,
        allowedLengths: [10],
        numericOnly: true,
      },
    ]),
  ),

  MY: {
    Maybank: {
      accountNumberMinLength: 12,
      accountNumberMaxLength: 12,
      allowedLengths: [12],
      numericOnly: true,
    },

    "CIMB Bank": {
      accountNumberMinLength: 10,
      accountNumberMaxLength: 14,
      allowedLengths: [10, 14],
      numericOnly: true,
    },

    "Public Bank": {
      accountNumberMinLength: 10,
      accountNumberMaxLength: 10,
      allowedLengths: [10],
      numericOnly: true,
    },

    "RHB Bank": {
      accountNumberMinLength: 14,
      accountNumberMaxLength: 14,
      allowedLengths: [14],
      numericOnly: true,
    },

    "Hong Leong Bank": {
      accountNumberMinLength: 11,
      accountNumberMaxLength: 13,
      allowedLengths: [11, 13],
      numericOnly: true,
    },

    AmBank: {
      accountNumberMinLength: 13,
      accountNumberMaxLength: 13,
      allowedLengths: [13],
      numericOnly: true,
    },

    "Bank Islam": {
      accountNumberMinLength: 14,
      accountNumberMaxLength: 14,
      allowedLengths: [14],
      numericOnly: true,
    },

    "Bank Muamalat": {
      accountNumberMinLength: 14,
      accountNumberMaxLength: 14,
      allowedLengths: [14],
      numericOnly: true,
    },

    "Affin Bank": {
      accountNumberMinLength: 12,
      accountNumberMaxLength: 12,
      allowedLengths: [12],
      numericOnly: true,
    },

    "Alliance Bank": {
      accountNumberMinLength: 15,
      accountNumberMaxLength: 15,
      allowedLengths: [15],
      numericOnly: true,
    },

    "Touch 'n Go eWallet": {
      accountNumberMinLength: 12,
      accountNumberMaxLength: 12,
      allowedLengths: [12],
      numericOnly: true,
    },

    GrabPay: {
      accountNumberMinLength: 12,
      accountNumberMaxLength: 12,
      allowedLengths: [12],
      numericOnly: true,
    },

    Boost: {
      accountNumberMinLength: 12,
      accountNumberMaxLength: 12,
      allowedLengths: [12],
      numericOnly: true,
    },

    ShopeePay: {
      accountNumberMinLength: 12,
      accountNumberMaxLength: 12,
      allowedLengths: [12],
      numericOnly: true,
    },
  },

  SG: {
    "DBS Bank": {
      accountNumberMinLength: 10,
      accountNumberMaxLength: 10,
      allowedLengths: [10],
      numericOnly: true,
    },

    POSB: {
      accountNumberMinLength: 9,
      accountNumberMaxLength: 9,
      allowedLengths: [9],
      numericOnly: true,
    },

    "Standard Chartered Singapore": {
      accountNumberMinLength: 10,
      accountNumberMaxLength: 10,
      allowedLengths: [10],
      numericOnly: true,
    },
  },
};

/*
 * ------------------------------------------------------------------
 * CONFIG CREATION
 * ------------------------------------------------------------------
 */

function createCountryConfig(
  countryCode: SupportedCountry,
): WithdrawalCountryConfig {
  const rules =
    COUNTRY_ACCOUNT_RULES[countryCode];

  return {
    code: countryCode,
    bankFieldMode: "select",
    banks: CURATED_BANKS[countryCode],
    accountNumberMinLength:
      rules.accountNumberMinLength,
    accountNumberMaxLength:
      rules.accountNumberMaxLength,
    routingNumberRequired:
      rules.routingNumberRequired,
    routingNumberLength:
      rules.routingNumberLength,
    routingNumberLabel:
      rules.routingNumberLabel,
    bankRules:
      BANK_RULES[countryCode] ?? {},
  };
}

export const WITHDRAWAL_COUNTRIES: Readonly<
  Record<SupportedCountry, WithdrawalCountryConfig>
> = Object.fromEntries(
  SUPPORTED_COUNTRIES.map((countryCode) => [
    countryCode,
    createCountryConfig(countryCode),
  ]),
) as Record<
  SupportedCountry,
  WithdrawalCountryConfig
>;

/*
 * ------------------------------------------------------------------
 * COUNTRY CONFIG
 * ------------------------------------------------------------------
 */

export function getWithdrawalCountryConfig(
  countryCode: string | null | undefined,
): WithdrawalCountryConfig | null {
  if (!countryCode) {
    return null;
  }

  const normalized =
    countryCode.toUpperCase() as SupportedCountry;

  return (
    WITHDRAWAL_COUNTRIES[normalized] ?? null
  );
}

export function isSupportedWithdrawalCountry(
  countryCode: string | null | undefined,
): countryCode is SupportedCountry {
  return Boolean(
    getWithdrawalCountryConfig(countryCode),
  );
}

/*
 * ------------------------------------------------------------------
 * BANK VALIDATION
 * ------------------------------------------------------------------
 */

export function isSupportedWithdrawalBank(
  countryCode: SupportedCountry,
  bankName: string,
): boolean {
  const config =
    WITHDRAWAL_COUNTRIES[countryCode];

  if (!config) {
    return false;
  }

  return config.banks.includes(bankName);
}

export function getBankAccountRule(
  countryCode: SupportedCountry,
  bankName: string,
): WithdrawalBankRule {
  const config =
    WITHDRAWAL_COUNTRIES[countryCode];

  if (!config) {
    return {
      accountNumberMinLength: 6,
      accountNumberMaxLength: 30,
      numericOnly: true,
    };
  }

  return (
    config.bankRules[bankName] ?? {
      accountNumberMinLength:
        config.accountNumberMinLength,
      accountNumberMaxLength:
        config.accountNumberMaxLength,
      numericOnly: true,
    }
  );
}

export function getAccountNumberError(
  countryCode: SupportedCountry,
  bankName: string,
  accountNumber: string,
): string | null {
  const rule = getBankAccountRule(
    countryCode,
    bankName,
  );

  const normalized =
    accountNumber.replace(/[\s-]/g, "");

  if (!normalized) {
    return "Please enter your bank account number.";
  }

  if (
    rule.numericOnly !== false &&
    !/^\d+$/.test(normalized)
  ) {
    return "Please enter a valid bank account number.";
  }

  if (rule.allowedLengths?.length) {
    if (
      !rule.allowedLengths.includes(
        normalized.length,
      )
    ) {
      const lengths =
        rule.allowedLengths.join(" or ");

      return `Please enter a valid bank account number (${lengths} digits).`;
    }

    return null;
  }

  if (
    normalized.length <
      rule.accountNumberMinLength ||
    normalized.length >
      rule.accountNumberMaxLength
  ) {
    return "Please enter a valid bank account number.";
  }

  return null;
}

/*
 * ------------------------------------------------------------------
 * ROUTING / SORT / IDENTIFIER VALIDATION
 * ------------------------------------------------------------------
 */

export function getRoutingNumberError(
  countryCode: SupportedCountry,
  routingNumber: string,
): string | null {
  const config =
    WITHDRAWAL_COUNTRIES[countryCode];

  if (!config) {
    return "Please enter a valid routing number.";
  }

  if (!config.routingNumberRequired) {
    return null;
  }

  const normalized =
    routingNumber.replace(/[\s-]/g, "");

  if (
    !config.routingNumberLength ||
    !new RegExp(
      `^\\d{${config.routingNumberLength}}$`,
    ).test(normalized)
  ) {
    return config.routingNumberLabel
      ? `Please enter a valid ${config.routingNumberLabel.toLowerCase()}.`
      : "Please enter a valid routing number.";
  }

  return null;
}