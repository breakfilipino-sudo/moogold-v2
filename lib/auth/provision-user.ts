import { randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";
import type { LanguageCode } from "@/lib/i18n/languages";

type ProvisionUserInput = {
  authUserId: string;
  email?: string | null;
  phone?: string | null;
  countryCode?: string | null;
  fullName?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  maritalStatus?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  postalCode?: string | null;
  preferredLanguage?: LanguageCode | null;
  referralCode?: string | null;
};

async function generateUniqueReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = randomBytes(6).toString("hex").toUpperCase();

    const existing = await prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });

    if (!existing) {
      return code;
    }
  }

  throw new Error("Could not generate a unique referral code.");
}

export async function provisionUser({
  authUserId,
  email,
  phone,
  countryCode,
  fullName,
  dateOfBirth,
  gender,
  maritalStatus,
  addressLine1,
  addressLine2,
  city,
  stateProvince,
  postalCode,
  preferredLanguage,
  referralCode,
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

  const normalizedGender = gender?.trim() || null;
  const normalizedMaritalStatus = maritalStatus?.trim() || null;
  const normalizedAddressLine1 = addressLine1?.trim() || null;
  const normalizedAddressLine2 = addressLine2?.trim() || null;
  const normalizedCity = city?.trim() || null;
  const normalizedStateProvince = stateProvince?.trim() || null;
  const normalizedPostalCode = postalCode?.trim() || null;

  const normalizedReferralCode =
    referralCode && /^[A-Z0-9]{1,64}$/i.test(referralCode.trim())
      ? referralCode.trim().toUpperCase()
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


  return prisma.$transaction(async (tx) => {
    const existingUser = await tx.user.findUnique({
      where: { authUserId },
      select: {
        id: true,
        referralCode: true,
      },
    });

    const assignedReferralCode =
      existingUser?.referralCode ?? (await generateUniqueReferralCode());

    const user = await tx.user.upsert({
      where: { authUserId },

      update: {
        email: normalizedEmail,
        phone: normalizedPhone,
        countryCode: normalizedCountryCode,
        fullName: normalizedFullName,
        ...(!existingUser?.referralCode
          ? { referralCode: assignedReferralCode }
          : {}),
        ...(preferredLanguage ? { preferredLanguage } : {}),

        verification: {
          upsert: {
            create: {
              tier: "TIER_1",
              status: "NOT_STARTED",
              dateOfBirth: validDateOfBirth,
              countryCode: normalizedCountryCode,
              gender: normalizedGender,
              maritalStatus: normalizedMaritalStatus,
              addressLine1: normalizedAddressLine1,
              addressLine2: normalizedAddressLine2,
              city: normalizedCity,
              stateProvince: normalizedStateProvince,
              postalCode: normalizedPostalCode,
            },
            update: {
              dateOfBirth: validDateOfBirth,
              countryCode: normalizedCountryCode,
              gender: normalizedGender,
              maritalStatus: normalizedMaritalStatus,
              addressLine1: normalizedAddressLine1,
              addressLine2: normalizedAddressLine2,
              city: normalizedCity,
              stateProvince: normalizedStateProvince,
              postalCode: normalizedPostalCode,
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
        referralCode: assignedReferralCode,
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
            gender: normalizedGender,
            maritalStatus: normalizedMaritalStatus,
            addressLine1: normalizedAddressLine1,
            addressLine2: normalizedAddressLine2,
            city: normalizedCity,
            stateProvince: normalizedStateProvince,
            postalCode: normalizedPostalCode,
          },
        },
      },

      include: {
        wallet: true,
        goldHolding: true,
        verification: true,
      },
    });

    // Only a genuinely new account can receive referral attribution.
    // Existing users are never reassigned by a repeated provisioning call.
    if (!existingUser && normalizedReferralCode) {
      const referrer = await tx.user.findUnique({
        where: { referralCode: normalizedReferralCode },
        select: { id: true },
      });

      if (referrer && referrer.id !== user.id) {
        await tx.referral.create({
          data: {
            referrerId: referrer.id,
            referredUserId: user.id,
          },
        });
      }
    }

    return user;
  });
}
