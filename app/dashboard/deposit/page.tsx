
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
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
          {language === "fil"
            ? "Wallet"
            : language === "ms"
              ? "Dompet"
              : language === "zh"
                ? "钱包"
                : "Wallet"}
        </p>

        <h1 className="mt-1 text-[23px] font-bold tracking-tight text-slate-950 sm:text-3xl">
          {language === "fil"
            ? "Magdagdag ng Pondo"
            : language === "ms"
              ? "Tambah Dana"
              : language === "zh"
                ? "添加资金"
                : "Add Fund"}
        </h1>

        <p className="mt-1.5 text-sm font-medium leading-5 text-slate-500">
          {language === "fil"
            ? "Magdagdag ng pondo sa iyong MooGold wallet"
            : language === "ms"
              ? "Tambah dana ke dalam dompet MooGold anda"
              : language === "zh"
                ? "向您的 MooGold 钱包添加资金"
                : "Add funds to your MooGold wallet"}
        </p>
      </div>

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