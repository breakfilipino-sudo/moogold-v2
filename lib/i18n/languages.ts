export type LanguageCode = "en" | "fil" | "ms" | "zh";

export type LanguageOption = {
  code: LanguageCode;
  label: string;
  locale: string;
};

const ENGLISH: LanguageOption = {
  code: "en",
  label: "English",
  locale: "en",
};

const COUNTRY_LANGUAGES: Record<string, LanguageOption[]> = {
  PH: [
    ENGLISH,
    {
      code: "fil",
      label: "Filipino (Tagalog)",
      locale: "fil",
    },
  ],
  MY: [
    ENGLISH,
    {
      code: "ms",
      label: "Bahasa Melayu",
      locale: "ms",
    },
    {
      code: "zh",
      label: "\u7b80\u4f53\u4e2d\u6587",
      locale: "zh-CN",
    },
  ],
  SG: [
    ENGLISH,
    {
      code: "zh",
      label: "\u7b80\u4f53\u4e2d\u6587",
      locale: "zh-CN",
    },
  ],
};

export function getAvailableLanguages(
  countryCode: string | null | undefined,
): LanguageOption[] {
  const code = countryCode?.trim().toUpperCase();

  return code ? COUNTRY_LANGUAGES[code] ?? [ENGLISH] : [ENGLISH];
}

export function getSupportedLanguage(
  language: string | null | undefined,
  countryCode: string | null | undefined,
): LanguageCode {
  const available = getAvailableLanguages(countryCode);

  return available.find((option) => option.code === language)?.code ?? "en";
}

export function getLanguageLocale(language: LanguageCode): string {
  switch (language) {
    case "fil":
      return "fil";
    case "ms":
      return "ms";
    case "zh":
      return "zh-CN";
    default:
      return "en";
  }
}