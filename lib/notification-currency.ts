import { getCountryFinancialConfig } from "@/lib/countries";
import { getVerifiedUsdFxRate } from "@/lib/crypto-finance/verified-prices";

export async function formatUsdNotificationAmount(
  usdAmount: number,
  countryCode: string | null | undefined,
): Promise<string | null> {
  if (!Number.isFinite(usdAmount) || usdAmount <= 0) return null;

  const country = getCountryFinancialConfig(countryCode);
  if (!country) return null;

  try {
    const verifiedRate = await getVerifiedUsdFxRate(country.currency);

    if (!Number.isFinite(verifiedRate.rate) || verifiedRate.rate <= 0) {
      return null;
    }

    const localAmount = usdAmount * verifiedRate.rate;
    if (!Number.isFinite(localAmount) || localAmount <= 0) return null;

    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(localAmount);

    return `${country.currency} ${formatted}`;
  } catch {
    return null;
  }
}