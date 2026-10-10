"use client";

import { useState, useTransition } from "react";
import { Globe2, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  getAvailableLanguages,
  type LanguageCode,
} from "@/lib/i18n/languages";

import { savePreferredLanguage } from "./language-actions";

type LanguageSelectorProps = {
  countryCode: string | null;
  initialLanguage: string;
};

export default function LanguageSelector({
  countryCode,
  initialLanguage,
}: LanguageSelectorProps) {
  const router = useRouter();

  const options = getAvailableLanguages(countryCode);

  const [language, setLanguage] = useState<LanguageCode>(
    (options.find(
      (option) => option.code === initialLanguage,
    )?.code ?? "en") as LanguageCode,
  );

  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleLanguageChange(value: string) {
    const previousLanguage = language;
    const nextLanguage = value as LanguageCode;

    setLanguage(nextLanguage);
    setMessage("");
    setError(false);

    startTransition(async () => {
      try {
        const result =
          await savePreferredLanguage(nextLanguage);

        if (!result.success) {
          setLanguage(previousLanguage);
          setError(true);
          setMessage(result.message);
          return;
        }

        setLanguage(result.language);
        setMessage("Language preference saved.");
        router.refresh();
      } catch {
        setLanguage(previousLanguage);
        setError(true);
        setMessage(
          "We couldn't save your language. Please try again.",
        );
      }
    });
  }

  return (
    <section className="mb-4 rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03] sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
          <Globe2 className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Language
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Choose the language you prefer to use in MooGold.
          </p>

          <label
            htmlFor="moogold-language"
            className="mt-4 block text-xs font-semibold text-slate-600 dark:text-slate-300"
          >
            Display language
          </label>

          <div className="relative mt-2">
            <select
              id="moogold-language"
              value={language}
              disabled={isPending}
              onChange={(event) =>
                handleLanguageChange(event.target.value)
              }
              className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 pr-10 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white disabled:cursor-wait disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-emerald-400 dark:focus:bg-white/[0.07]"
            >
              {options.map((option) => (
                <option
                  key={option.code}
                  value={option.code}
                  className="bg-white text-slate-900"
                >
                  {option.label}
                </option>
              ))}
            </select>

            {isPending ? (
              <LoaderCircle className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-emerald-600" />
            ) : (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                ▼
              </span>
            )}
          </div>

          {message ? (
            <p
              role="status"
              className={`mt-2 text-xs ${
                error
                  ? "text-red-600 dark:text-red-400"
                  : "text-emerald-700 dark:text-emerald-400"
              }`}
            >
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}