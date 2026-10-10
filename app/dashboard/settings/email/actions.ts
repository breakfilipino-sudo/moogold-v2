"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

async function requireAuthenticatedUser() {
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
      email: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  return {
    supabase,
    authUser,
    user,
  };
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(email: string) {
 return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Request an email-address change.
 *
 * Supabase owns the actual email verification process.
 * Prisma is NOT updated here.
 */
export async function requestEmailChange(
  formData: FormData,
): Promise<{
  success?: string;
  error?: string;
  email?: string;
}> {
  const { supabase, authUser, user } =
    await requireAuthenticatedUser();

  const newEmail = normalizeEmail(
    String(formData.get("email") ?? ""),
  );

  if (!newEmail) {
    return {
      error: "Please enter your new email address.",
    };
  }

  if (!isValidEmail(newEmail)) {
    return {
      error: "Please enter a valid email address.",
    };
  }

  if (newEmail.length > 254) {
    return {
      error: "That email address is too long.",
    };
  }

  const currentEmail = normalizeEmail(
    user.email ?? authUser.email ?? "",
  );

  if (newEmail === currentEmail) {
    return {
      error:
        "Your new email address must be different from your current email.",
    };
  }

  /*
   * Check MooGold's database first so we do not knowingly
   * request an address already belonging to another account.
   */
  const existingUser = await prisma.user.findFirst({
    where: {
      email: newEmail,
      NOT: {
        id: user.id,
      },
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    return {
      error:
        "This email address is already associated with another MooGold account.",
    };
  }

  if (authUser.id !== user.authUserId) {
    return {
      error:
        "Your authentication session could not be verified. Please sign in again.",
    };
  }

  /*
   * Supabase sends the real email-change confirmation email.
   *
   * We deliberately do NOT update Prisma here.
   */
  const { error } = await supabase.auth.updateUser({
    email: newEmail,
  });

  if (error) {
    console.error(
      "Failed to request email change:",
      error,
    );

    return {
      error:
        error.message ||
        "Unable to send the email verification. Please try again.",
    };
  }

  return {
    success:
      "A confirmation email has been sent. Please check your new email address and confirm the change.",
    email: newEmail,
  };
}

/**
 * Synchronize Prisma after Supabase has actually completed
 * the email change.
 *
 * This can be called by the authenticated callback route after
 * the Supabase confirmation link has been consumed.
 */
export async function syncConfirmedEmail(): Promise<{
  success?: string;
  error?: string;
}> {
  const { authUser, user } =
    await requireAuthenticatedUser();
  const confirmedEmail = normalizeEmail(
    authUser.email ?? "",
  );

  if (!confirmedEmail) {
    return {
      error: "No confirmed email address was found.",
    };
  }

  const currentEmail = normalizeEmail(
    user.email ?? "",
  );

  if (confirmedEmail === currentEmail) {
    return {
      success: "Your email address is already up to date.",
    };
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      email: confirmedEmail,
      NOT: {
        id: user.id,
      },
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    return {
      error:
        "This email address is already associated with another MooGold account.",
    };
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      email: confirmedEmail,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/settings/email");

  return {
    success: "Your email address has been updated.",
  };
}