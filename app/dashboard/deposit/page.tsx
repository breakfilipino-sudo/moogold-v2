
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

export default async function DepositPage() {
  const { user } = await getCurrentUser();
  const cookieStore = await cookies();

  const country = getCountryFinancialConfig(user.countryCode);

  if (!country) {
    redirect("/dashboard/profile");
  }

  const cookieLanguage = cookieStore.get("moogold-language")?.value;
  const availableLanguages = getAvailableLanguages(user.countryCode);

  const language: LanguageCode = availableLanguages.some(
    (option) => option.code === cookieLanguage,
  )
    ? (cookieLanguage as LanguageCode)
    : getSupportedLanguage(user.preferredLanguage, user.countryCode);

  const accountName =
    user.fullName ||
    user.email?.split("@")[0] ||
    "MooGold User";

  return (
    <div className="mx-auto w-full max-w-xl">


      <DepositForm
        accountName={accountName}
        countryCode={country.code}
        currency={country.currency}
        currencySymbol={country.currencySymbol}
        language={language}
      />
    </div>
  );
}