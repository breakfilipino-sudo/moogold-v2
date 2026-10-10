
"use client";

import { useState, useTransition } from "react";
import { Globe2, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { savePublicLanguage } from "@/app/dashboard/settings/language-actions";
import type { LanguageCode } from "@/lib/i18n/languages";

const languages: { code: LanguageCode; label: string }[] = [
  { code: "en", label: "English" },
  { code: "fil", label: "Filipino (Tagalog)" },
  { code: "ms", label: "Bahasa Melayu" },
  { code: "zh", label: "简体中文" },
];

export default function PublicLanguageSelector({
  initialLanguage = "en",
}: {
  initialLanguage?: LanguageCode;
}) {
  const router = useRouter();

  const [language, setLanguage] = useState<LanguageCode>(
    languages.some((item) => item.code === initialLanguage)
      ? initialLanguage
      : "en",
  );

  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function handleChange(value: string) {
    const previousLanguage = language;

    if (!languages.some((item) => item.code === value)) {
      return;
    }

    const nextLanguage = value as LanguageCode;

    setLanguage(nextLanguage);
    setMessage("");

    startTransition(async () => {
      try {
        const result = await savePublicLanguage(nextLanguage);

        if (!result.success) {
          setLanguage(previousLanguage);
          setMessage(result.message);
          return;
        }

        setLanguage(result.language);
        router.refresh();
      } catch {
        setLanguage(previousLanguage);
        setMessage("Unable to save your language. Please try again.");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Globe2
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-[#64726b]"
      />

      <label
        className="sr-only"
        htmlFor="moogold-public-language"
      >
        Display language
      </label>

      <select
        id="moogold-public-language"
        value={language}
        disabled={isPending}
        onChange={(event) => handleChange(event.target.value)}
        aria-describedby={
          message ? "moogold-language-status" : undefined
        }
        className="h-9 max-w-[155px] rounded-lg border border-[#dce5e0] bg-white px-2 text-xs font-semibold text-[#263a31] outline-none focus:border-[#138a5d] disabled:opacity-60"
      >
        {languages.map((item) => (
          <option key={item.code} value={item.code}>
            {item.label}
          </option>
        ))}
      </select>

      {isPending ? (
        <LoaderCircle
          aria-hidden="true"
          className="h-4 w-4 animate-spin text-[#138a5d]"
        />
      ) : null}

      {message ? (
        <span
          id="moogold-language-status"
          role="status"
          className="sr-only"
        >
          {message}
        </span>
      ) : null}
    </div>
  );
}