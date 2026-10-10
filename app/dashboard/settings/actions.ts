"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
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
      id: true,
      authUserId: true,
      fullName: true,
      email: true,
      phone: true,
      countryCode: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  return user;
}

/*
 * ============================================================
 * UPDATE PROFILE SETTINGS
 * ============================================================
 *
 * Country is stored as an ISO 3166-1 alpha-2 code.
 *
 * We intentionally do not restrict this to MY / PH.
 * MooGold is designed to support additional countries without
 * changing this action.
 */
export async function updateSettings(
  formData: FormData,
): Promise<{
  success?: string;
  error?: string;
}> {
  const user = await requireUser();

  const fullName = String(
    formData.get("fullName") ?? "",
  ).trim();

  const countryCode = String(
    formData.get("countryCode") ?? "",
  )
    .trim()
    .toUpperCase();

  if (!fullName) {
    return {
      error: "Please enter your full name.",
    };
  }

  if (fullName.length < 2) {
    return {
      error:
        "Your full name must contain at least 2 characters.",
    };
  }

  if (fullName.length > 100) {
    return {
      error: "Your full name is too long.",
    };
  }

  /*
   * Country codes are stored using the standard
   * ISO 3166-1 alpha-2 format.
   *
   * We deliberately do not hard-code individual countries here.
   */
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    return {
      error: "Your registered country is invalid.",
    };
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      fullName,
      countryCode,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/withdraw");

  return {
    success: "Your account settings have been updated.",
  };
}