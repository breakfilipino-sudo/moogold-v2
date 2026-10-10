
import { prisma } from "@/lib/prisma";
import type { LanguageCode } from "@/lib/i18n/languages";

type ProvisionUserInput = {
  authUserId: string;
  email?: string | null;
  phone?: string | null;
  countryCode?: string | null;
  fullName?: string | null;
  dateOfBirth?: string | null;
  preferredLanguage?: LanguageCode | null;
};

export async function provisionUser({
  authUserId,
  email,
  phone,
  countryCode,
  fullName,
  dateOfBirth,
  preferredLanguage,
}: ProvisionUserInput) {
  const normalizedEmail =
    email && email.trim() !== ""
      ? email.trim().toLowerCase()
      : null;

  const normalizedPhone =
    phone && phone.trim() !== ""
      ? phone.trim()
      : null;

  const normalizedCountryCode =
    countryCode && countryCode.trim() !== ""
      ? countryCode.trim().toUpperCase()
      : null;

  const normalizedFullName =
    fullName && fullName.trim() !== ""
      ? fullName.trim()
      : null;

  const parsedDateOfBirth =
    dateOfBirth && dateOfBirth.trim() !== ""
      ? new Date(`${dateOfBirth}T00:00:00.000Z`)
      : null;

  const validDateOfBirth =
    parsedDateOfBirth &&
    !Number.isNaN(parsedDateOfBirth.getTime())
      ? parsedDateOfBirth
      : null;

  const user = await prisma.user.upsert({
    where: {
      authUserId,
    },

    update: {
      email: normalizedEmail,
      phone: normalizedPhone,
      countryCode: normalizedCountryCode,
      fullName: normalizedFullName,

      ...(preferredLanguage
        ? { preferredLanguage }
        : {}),

      verification: {
        upsert: {
          create: {
            tier: "TIER_1",
            status: "NOT_STARTED",
            dateOfBirth: validDateOfBirth,
            countryCode: normalizedCountryCode,
          },
          update: {
            dateOfBirth: validDateOfBirth,
            countryCode: normalizedCountryCode,
          },
        },
      },
    },

    create: {
      authUserId,
      email: normalizedEmail,
      phone: normalizedPhone,
      countryCode: normalizedCountryCode,
      fullName: normalizedFullName,
      preferredLanguage: preferredLanguage ?? "en",

      wallet: {
        create: {
          portfolioValue: 0,
          cashBalance: 0,
          referralBalance: 0,
        },
      },

      goldHolding: {
        create: {
          quantity: 0,
          value: 0,
        },
      },

      verification: {
        create: {
          tier: "TIER_1",
          status: "NOT_STARTED",
          dateOfBirth: validDateOfBirth,
          countryCode: normalizedCountryCode,
        },
      },
    },

    include: {
      wallet: true,
      goldHolding: true,
      verification: true,
    },
  });

  return user;
}