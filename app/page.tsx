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
  const isPwaLaunch = query.source === "pwa";

  const initialLanguage: LanguageCode =
    supportedLanguages.find((language) => language === savedLanguage) ?? "en";

  // Only installed-app launches use the app session and dashboard routing.
  if (isPwaLaunch) {
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

      console.error("PWA home session check failed:", error);
    }

    return <InstalledWelcomeScreen initialLanguage={initialLanguage} />;
  }

  // The ordinary browser homepage always remains the public landing page.
  return <MooGoldLanding initialLanguage={initialLanguage} />;
}