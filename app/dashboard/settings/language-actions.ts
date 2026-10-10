"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import {
  getSupportedLanguage,
  type LanguageCode,
} from "@/lib/i18n/languages";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

type SaveLanguageResult =
  | {
      success: true;
      language: LanguageCode;
    }
  | {
      success: false;
      message: string;
    };

const LANGUAGE_COOKIE = "moogold-language";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

async function setLanguageCookie(language: LanguageCode) {
  const cookieStore = await cookies();

  cookieStore.set(LANGUAGE_COOKIE, language, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

/**
 * Public landing-page preference.
 *
 * Guests may select any language supported by MooGold.
 * The preference is validated against the registered
 * country after the customer registers or logs in.
 */
export async function savePublicLanguage(
  requestedLanguage: string,
): Promise<SaveLanguageResult> {
  const allowedLanguages: LanguageCode[] = [
    "en",
    "fil",
    "ms",
    "zh",
  ];

  if (
    !allowedLanguages.includes(
      requestedLanguage as LanguageCode,
    )
  ) {
    return {
      success: false,
      message: "Please select a supported language.",
    };
  }

  const language = requestedLanguage as LanguageCode;

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (authUser) {
    const user = await prisma.user.findUnique({
      where: {
        authUserId: authUser.id,
      },
      select: {
        id: true,
        countryCode: true,
      },
    });

    if (!user) {
      return {
        success: false,
        message: "Your account could not be found.",
      };
    }

    const supportedLanguage = getSupportedLanguage(
      language,
      user.countryCode,
    );

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        preferredLanguage: supportedLanguage,
      },
    });

    await setLanguageCookie(supportedLanguage);

    revalidatePath("/", "page");
    revalidatePath("/dashboard", "layout");

    return {
      success: true,
      language: supportedLanguage,
    };
  }

  await setLanguageCookie(language);

  revalidatePath("/", "page");

  return {
    success: true,
    language,
  };
}

/**
 * Authenticated language-settings action.
 *
 * The database preference and cookie are both restricted
 * to the languages available for the registered country.
 */
export async function savePreferredLanguage(
  requestedLanguage: string,
): Promise<SaveLanguageResult> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return {
      success: false,
      message: "Your session has expired. Please log in again.",
    };
  }

  const user = await prisma.user.findUnique({
    where: {
      authUserId: authUser.id,
    },
    select: {
      id: true,
      countryCode: true,
    },
  });

  if (!user) {
    return {
      success: false,
      message: "Your account could not be found.",
    };
  }

  const language = getSupportedLanguage(
    requestedLanguage,
    user.countryCode,
  );

  if (language !== requestedLanguage) {
    return {
      success: false,
      message:
        "That language is not available for your registered country.",
    };
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      preferredLanguage: language,
    },
  });

  await setLanguageCookie(language);

  revalidatePath("/", "page");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/settings");

  return {
    success: true,
    language,
  };
}