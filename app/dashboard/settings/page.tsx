import { Settings2 } from "lucide-react";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getSupportedLanguage } from "@/lib/i18n/languages";

import LanguageSelector from "./language-selector";
import SettingsForm from "./settings-form";

function getCountryName(countryCode: string | null) {
  if (!countryCode) {
    return "Not available";
  }

  try {
    const displayNames = new Intl.DisplayNames(["en"], {
      type: "region",
    });

    return (
      displayNames.of(countryCode.toUpperCase()) ??
      countryCode
    );
  } catch {
    return countryCode;
  }
}

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: {
      authUserId: authUser.id,
    },
    select: {
      fullName: true,
      email: true,
      phone: true,
      countryCode: true,
      preferredLanguage: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  const preferredLanguage = getSupportedLanguage(
    user.preferredLanguage,
    user.countryCode,
  );

  return (
    <div className="min-h-full">
      <div className="mx-auto w-full max-w-3xl px-1 py-1 sm:px-2 sm:py-2">
        <div className="mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <Settings2 className="h-4 w-4" />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                Account
              </p>

              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                Settings
              </h1>
            </div>
          </div>

          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Manage your security, appearance and account.
          </p>
        </div>

        <LanguageSelector
          countryCode={user.countryCode}
          initialLanguage={preferredLanguage}
        />

        <SettingsForm
          fullName={user.fullName ?? ""}
          email={user.email ?? ""}
          phone={user.phone ?? ""}
          countryName={getCountryName(user.countryCode)}
        />
      </div>
    </div>
  );
}