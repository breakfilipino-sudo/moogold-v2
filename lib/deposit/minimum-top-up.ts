const MINIMUM_TOP_UP_BY_COUNTRY: Readonly<Record<string, number>> = {
  US: 10,
  PH: 100,
  SG: 10,
  MY: 10,
  KE: 1000,
  GH: 100,
  NG: 1000,
  ZA: 100,
  GB: 10,
  CA: 10,
  IN: 500,
  CN: 50,
  AE: 35,
  BR: 50,
  VN: 100000,
  TR: 250,
};

export function getMinimumTopUpAmount(
  countryCode: string | null | undefined,
): number | null {
  if (!countryCode) {
    return null;
  }

  return MINIMUM_TOP_UP_BY_COUNTRY[
    countryCode.toUpperCase()
  ] ?? null;
}