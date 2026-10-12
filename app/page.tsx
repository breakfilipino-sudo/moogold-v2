import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import MooGoldLanding from "@/components/home/moogold-landing";
import InstalledWelcomeScreen from "@/components/home/installed-welcome-screen";
import type { LanguageCode } from "@/lib/i18n/languages";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const supportedLanguages: LanguageCode[] = ["en", "fil", "ms", "zh"];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const [cookieStore, query] = await Promise.all([
    cookies(),
    searchParams,
  ]);

  const savedLanguage = cookieStore.get("moogold-language")?.value;
  const hasAccount = cookieStore.get("moogold-has-account")?.value === "1";
  const isPwaLaunch = query.source === "pwa";

  const initialLanguage: LanguageCode =
    supportedLanguages.find((language) => language === savedLanguage) ?? "en";

  // A verified session and an existing MooGold profile always take priority.
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser();

    if (!error && authUser) {
      const profile = await prisma.user.findUnique({
        where: { authUserId: authUser.id },
        select: { id: true },
      });

      if (profile) {
        redirect("/dashboard");
      }
    }
  } catch (error) {
    // Next.js redirects throw internally; allow them to continue.
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }

    console.error("Home session check failed:", error);
  }

  // Installed-app launches get the welcome screen, even on returning devices.
  if (isPwaLaunch) {
    return <InstalledWelcomeScreen initialLanguage={initialLanguage} />;
  }

  // Preserve existing browser behavior for returning account holders.
  if (hasAccount) {
    redirect("/login");
  }

  return <MooGoldLanding initialLanguage={initialLanguage} />;
}