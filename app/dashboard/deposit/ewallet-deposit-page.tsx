import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";
import { getCountryFinancialConfig } from "@/lib/countries";
import {
  getAvailableLanguages,
  getSupportedLanguage,
  type LanguageCode,
} from "@/lib/i18n/languages";

import DepositForm from "./deposit-form";

type EwalletDepositMethod = "GCASH" | "MAYA" | "TOUCH_N_GO";

export default async function EwalletDepositPage({
  method,
  expectedCountry,
  submitLabel,
}: {
  method: EwalletDepositMethod;
  expectedCountry: string;
  submitLabel?: string;
}) {
  const { user } = await getCurrentUser();
  const country = getCountryFinancialConfig(user.countryCode);

  if (!country) {
    redirect("/dashboard/profile");
  }

  if (country.code.toUpperCase() !== expectedCountry) {
    redirect("/dashboard/deposit-method");
  }

  const cookieStore = await cookies();
  const cookieLanguage = cookieStore.get("moogold-language")?.value;
  const availableLanguages = getAvailableLanguages(user.countryCode);

  const language: LanguageCode = availableLanguages.some(
    (option) => option.code === cookieLanguage,
  )
    ? (cookieLanguage as LanguageCode)
    : getSupportedLanguage(user.preferredLanguage, user.countryCode);

  return (
    <div className="mx-auto w-full max-w-xl">
      <DepositForm
        accountName={user.fullName || user.email?.split("@")[0] || "MooGold User"}
        countryCode={country.code}
        currency={country.currency}
        currencySymbol={country.currencySymbol}
        language={language}
        method={method}
        submitLabel={submitLabel}
      />
    </div>
  );
}