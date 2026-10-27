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
    flag: "\u{1F1FA}\u{1F1F8}",
  },
  {
    code: "PH",
    name: "Philippines",
    dialCode: "+63",
    flag: "\u{1F1F5}\u{1F1ED}",
  },
  {
    code: "SG",
    name: "Singapore",
    dialCode: "+65",
    flag: "\u{1F1F8}\u{1F1EC}",
  },
  {
    code: "MY",
    name: "Malaysia",
    dialCode: "+60",
    flag: "\u{1F1F2}\u{1F1FE}",
  },
  {
    code: "KE",
    name: "Kenya",
    dialCode: "+254",
    flag: "\u{1F1F0}\u{1F1EA}",
  },
  {
    code: "GH",
    name: "Ghana",
    dialCode: "+233",
    flag: "\u{1F1EC}\u{1F1ED}",
  },
  {
    code: "NG",
    name: "Nigeria",
    dialCode: "+234",
    flag: "\u{1F1F3}\u{1F1EC}",
  },
  {
    code: "ZA",
    name: "South Africa",
    dialCode: "+27",
    flag: "\u{1F1FF}\u{1F1E6}",
  },
  {
    code: "GB",
    name: "United Kingdom",
    dialCode: "+44",
    flag: "\u{1F1EC}\u{1F1E7}",
  },
  {
    code: "CA",
    name: "Canada",
    dialCode: "+1",
    flag: "\u{1F1E8}\u{1F1E6}",
  },
  {
    code: "IN",
    name: "India",
    dialCode: "+91",
    flag: "\u{1F1EE}\u{1F1F3}",
  },
  {
    code: "CN",
    name: "China",
    dialCode: "+86",
    flag: "\u{1F1E8}\u{1F1F3}",
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    dialCode: "+971",
    flag: "\u{1F1E6}\u{1F1EA}",
  },
  {
    code: "BR",
    name: "Brazil",
    dialCode: "+55",
    flag: "\u{1F1E7}\u{1F1F7}",
  },
  {
    code: "VN",
    name: "Vietnam",
    dialCode: "+84",
    flag: "\u{1F1FB}\u{1F1F3}",
  },
  {
    code: "TR",
    name: "Turkey",
    dialCode: "+90",
    flag: "\u{1F1F9}\u{1F1F7}",
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

export function isPlausibleMobilePhone(
  phone: string,
  countryCode: SupportedCountry,
): boolean {
  const dialCode = getCountryDialCode(countryCode);
  if (!dialCode || !phone.startsWith(dialCode)) {
    return false;
  }

  const national = phone.slice(dialCode.length);
  if (!/^\d+$/.test(national)) {
    return false;
  }

  // These checks reject obvious non-mobile or malformed numbers.
  // They cannot establish whether a number is assigned or active.
  switch (countryCode) {
    case "US":
    case "CA":
      return /^[2-9]\d{2}[2-9]\d{6}$/.test(national);
    case "PH":
      return /^9\d{9}$/.test(national);
    case "SG":
      return /^[89]\d{7}$/.test(national);
    case "MY":
      return /^1\d{8,9}$/.test(national);
    case "KE":
      return /^[17]\d{8}$/.test(national);
    case "GH":
      return /^[2-5]\d{8}$/.test(national);
    case "NG":
      return /^[789]\d{9}$/.test(national);
    case "ZA":
      return /^[678]\d{8}$/.test(national);
    case "GB":
      return /^7\d{9}$/.test(national);
    case "IN":
      return /^[6-9]\d{9}$/.test(national);
    case "CN":
      return /^1[3-9]\d{9}$/.test(national);
    case "AE":
      return /^5\d{8}$/.test(national);
    case "BR":
      return /^\d{2}9\d{8}$/.test(national);
    case "VN":
      return /^[35789]\d{8}$/.test(national);
    case "TR":
      return /^5\d{9}$/.test(national);
    default:
      return false;
  }
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