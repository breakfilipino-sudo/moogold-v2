import { cookies } from "next/headers";

import MooGoldLanding from "@/components/home/moogold-landing";
import type { LanguageCode } from "@/lib/i18n/languages";

const supportedLanguages: LanguageCode[] = ["en", "fil", "ms", "zh"];

export default async function HomePage() {
const cookieStore = await cookies();
const savedLanguage = cookieStore.get("moogold-language")?.value;

const initialLanguage: LanguageCode =
supportedLanguages.find((language) => language === savedLanguage) ??
"en";

return <MooGoldLanding initialLanguage={initialLanguage} />;
}
