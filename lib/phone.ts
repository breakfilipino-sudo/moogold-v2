export const SUPPORTED_COUNTRIES = [
  "US",
  "PH",
  "SG",
  "MY",
  "KE",
  "GH",
  "NG",
  "ZA",
  "GB",
  "CA",
  "IN",
  "CN",
  "AE",
  "BR",
  "VN",
  "TR",
] as const;

export type SupportedCountry =
  (typeof SUPPORTED_COUNTRIES)[number];

export type CountryInfo = {
  code: SupportedCountry;
  name: string;
  dialCode: string;
  flag: string;
};

export const COUNTRIES: readonly CountryInfo[] = [
  {
    code: "US",
    name: "United States",
    dialCode: "+1",
    flag: "🇺🇸",
  },
  {
    code: "PH",
    name: "Philippines",
    dialCode: "+63",
    flag: "🇵🇭",
  },
  {
    code: "SG",
    name: "Singapore",
    dialCode: "+65",
    flag: "🇸🇬",
  },
  {
    code: "MY",
    name: "Malaysia",
    dialCode: "+60",
    flag: "🇲🇾",
  },
  {
    code: "KE",
    name: "Kenya",
    dialCode: "+254",
    flag: "🇰🇪",
  },
  {
    code: "GH",
    name: "Ghana",
    dialCode: "+233",
    flag: "🇬🇭",
  },
  {
    code: "NG",
    name: "Nigeria",
    dialCode: "+234",
    flag: "🇳🇬",
  },
  {
    code: "ZA",
    name: "South Africa",
    dialCode: "+27",
    flag: "🇿🇦",
  },
  {
    code: "GB",
    name: "United Kingdom",
    dialCode: "+44",
    flag: "🇬🇧",
  },
  {
    code: "CA",
    name: "Canada",
    dialCode: "+1",
    flag: "🇨🇦",
  },
  {
    code: "IN",
    name: "India",
    dialCode: "+91",
    flag: "🇮🇳",
  },
  {
    code: "CN",
    name: "China",
    dialCode: "+86",
    flag: "🇨🇳",
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    dialCode: "+971",
    flag: "🇦🇪",
  },
  {
    code: "BR",
    name: "Brazil",
    dialCode: "+55",
    flag: "🇧🇷",
  },
  {
    code: "VN",
    name: "Vietnam",
    dialCode: "+84",
    flag: "🇻🇳",
  },
  {
    code: "TR",
    name: "Turkey",
    dialCode: "+90",
    flag: "🇹🇷",
  },
];

const COUNTRY_LENGTHS: Partial<
  Record<SupportedCountry, number[]>
> = {
  US: [10],
  CA: [10],
  PH: [10],
  SG: [8],
  MY: [9, 10],
  KE: [9],
  GH: [9],
  NG: [10],
  ZA: [9],
  GB: [10],
  IN: [10],
  CN: [11],
  AE: [9],
  BR: [10, 11],
  VN: [9, 10],
  TR: [10],
};

export function getCountry(
  countryCode: string,
): CountryInfo | null {
  return (
    COUNTRIES.find(
      (country) =>
        country.code === countryCode.toUpperCase(),
    ) ?? null
  );
}

export function getCountryDialCode(
  countryCode: SupportedCountry,
): string {
  return getCountry(countryCode)?.dialCode ?? "";
}

function cleanNumber(input: string): string {
  return input
    .trim()
    .replace(/[^\d+]/g, "");
}

function isValidNationalNumber(
  digits: string,
  countryCode: SupportedCountry,
): boolean {
  const lengths = COUNTRY_LENGTHS[countryCode];

  if (!lengths) {
    return digits.length >= 7 && digits.length <= 15;
  }

  return lengths.includes(digits.length);
}

export function normalizePhone(
  input: string,
  countryHint?: SupportedCountry,
): {
  phone: string;
  countryCode: SupportedCountry;
} | null {
  const raw = cleanNumber(input);

  if (!raw) {
    return null;
  }

  /*
   * International number.
   *
   * Example:
   * +639171234567
   */
  if (raw.startsWith("+")) {
    const digits = raw.slice(1);

    if (!/^\d{7,15}$/.test(digits)) {
      return null;
    }

    /*
     * If the country is already known, use it first.
     * This is important because US and Canada both use +1.
     */
    if (countryHint) {
      const dialCode = getCountryDialCode(
        countryHint,
      ).replace("+", "");

      if (digits.startsWith(dialCode)) {
        const national = digits.slice(
          dialCode.length,
        );

        if (
          isValidNationalNumber(
            national,
            countryHint,
          )
        ) {
          return {
            phone: `+${digits}`,
            countryCode: countryHint,
          };
        }
      }
    }

    /*
     * Otherwise identify the country from the
     * international calling code.
     */
    const matches = COUNTRIES
      .filter((country) =>
        digits.startsWith(
          country.dialCode.slice(1),
        ),
      )
      .sort(
        (a, b) =>
          b.dialCode.length -
          a.dialCode.length,
      );

    for (const country of matches) {
      const national = digits.slice(
        country.dialCode.length - 1,
      );

      if (
        isValidNationalNumber(
          national,
          country.code,
        )
      ) {
        return {
          phone: `+${digits}`,
          countryCode: country.code,
        };
      }
    }

    return null;
  }

  /*
   * National/local number.
   *
   * The selected country is required because
   * the same local digits can represent different
   * countries.
   */
  if (!countryHint) {
    return null;
  }

  let digits = raw.replace(/\D/g, "");

  if (!digits) {
    return null;
  }

  /*
   * Remove the normal trunk prefix before validation.
   *
   * Example:
   * 09171234567 -> 9171234567
   * 08012345678 -> 8012345678
   *
   * This keeps common local-number entry working
   * for countries that use a leading zero.
   */
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (
    !isValidNationalNumber(
      digits,
      countryHint,
    )
  ) {
    return null;
  }

  if (!/^\d+$/.test(digits)) {
    return null;
  }

  const dialCode =
    getCountryDialCode(countryHint);

  return {
    phone: `${dialCode}${digits}`,
    countryCode: countryHint,
  };
}

export function getPhoneValidationMessage(
  countryCode?: SupportedCountry,
): string {
  const country = countryCode
    ? getCountry(countryCode)
    : null;

  if (country) {
    return `Please enter a valid ${country.name} mobile number.`;
  }

  return "Please enter a valid mobile number.";
}