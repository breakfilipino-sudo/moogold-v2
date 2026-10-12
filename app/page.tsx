import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import MooGoldLanding from "@/components/home/moogold-landing";
import type { LanguageCode } from "@/lib/i18n/languages";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const supportedLanguages: LanguageCode[] = ["en", "fil", "ms", "zh"];

export default async function HomePage() {
  const cookieStore = await cookies();
  const savedLanguage = cookieStore.get("moogold-language")?.value;
  const hasAccount = cookieStore.get("moogold-has-account")?.value === "1";

  const initialLanguage: LanguageCode =
    supportedLanguages.find((language) => language === savedLanguage) ?? "en";

  // Only a real, verified Supabase session plus an existing MooGold profile
  // can route a visitor directly into the dashboard.
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
    // Next.js redirect() throws internally; allow that redirect to continue.
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

  // This cookie remembers a previous account visit; it never grants access.
  if (hasAccount) {
    redirect("/login");
  }

  return <MooGoldLanding initialLanguage={initialLanguage} />;
}
