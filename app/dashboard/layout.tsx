import type { ReactNode } from "react";
import { cookies } from "next/headers";

import Sidebar from "@/components/dashboard/sidebar";
import Header from "@/components/dashboard/header";
import MobileSidebar from "@/components/dashboard/mobile-sidebar";
import MobileBottomNav from "@/components/dashboard/mobile-bottom-nav";
import { DashboardProvider } from "@/components/dashboard/dashboard-provider";
import RememberAccountPresence from "@/components/auth/remember-account-presence";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  getAvailableLanguages,
  getSupportedLanguage,
  type LanguageCode,
} from "@/lib/i18n/languages";

const DEFAULT_STORAGE_BUCKET = "profile-photos";
const LANGUAGE_COOKIE = "moogold-language";

function getStorageBucket() {
  return (
    process.env.PROFILE_PHOTO_STORAGE_BUCKET?.trim() ||
    DEFAULT_STORAGE_BUCKET
  );
}

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [{ user }, cookieStore] = await Promise.all([
    getCurrentUser(),
    cookies(),
  ]);

  const name =
    user.fullName ||
    user.email?.split("@")[0] ||
    "Investor";

  const savedCookieLanguage = cookieStore.get(LANGUAGE_COOKIE)?.value;

  const availableLanguages = getAvailableLanguages(user.countryCode);

  const cookieLanguageIsSupported = availableLanguages.some(
    (option) => option.code === savedCookieLanguage,
  );

  const language: LanguageCode = cookieLanguageIsSupported
    ? (savedCookieLanguage as LanguageCode)
    : getSupportedLanguage(
        user.preferredLanguage,
        user.countryCode,
      );

  let profilePhotoUrl: string | null = null;

  if (user.profilePhotoPath) {
    try {
      const supabaseAdmin = createAdminClient();

      const { data } = await supabaseAdmin.storage
        .from(getStorageBucket())
        .createSignedUrl(user.profilePhotoPath, 60 * 60);

      profilePhotoUrl = data?.signedUrl ?? null;
    } catch (error) {
      console.error(
        "Dashboard profile photo signed URL error:",
        error,
      );
    }
  }

  return (
    <DashboardProvider>
      <RememberAccountPresence />
      <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
        <div className="flex min-h-screen">
          <Sidebar
            displayName={name}
            profilePhotoUrl={profilePhotoUrl}
            language={language}
          />

          <MobileSidebar
            displayName={name}
            profilePhotoUrl={profilePhotoUrl}
            language={language}
          />

          <div className="min-w-0 flex-1">
            <Header userName={name} />

            <main className="mx-auto w-full max-w-[1440px] px-4 pb-24 pt-4 transition-colors sm:px-6 sm:pb-24 sm:pt-5 lg:px-8 lg:pb-6 lg:pt-6">
              {children}
            </main>
          </div>
        </div>

        <MobileBottomNav language={language} />
      </div>
    </DashboardProvider>
  );
}
