"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import {
  getPhoneValidationMessage,
  normalizePhone,
} from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";
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
      phone: true,
      countryCode: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  if (authUser.id !== user.authUserId) {
    return null;
  }

  return {
    supabase,
    authUser,
    user,
  };
}

/**
 * Send a verification code to the CURRENT registered
 * mobile number.
 *
 * This verifies ownership of the existing number before
 * allowing the user to replace it.
 */
export async function requestPhoneChangeVerification(): Promise<{
  success?: boolean;
  error?: string;
  phone?: string;
}> {
  const result = await requireAuthenticatedUser();

  if (!result) {
    return {
      error:
        "We could not verify your account. Please sign in again.",
    };
  }

  const { supabase, user } = result;

  const currentPhone = user.phone?.trim();

  if (!currentPhone) {
    return {
      error:
        "Your account does not have a registered mobile number.",
    };
  }

  /*
   * Supabase sends the OTP to the CURRENT number.
   *
   * This does not change the user's phone number.
   */
  const { error } = await supabase.auth.signInWithOtp({
    phone: currentPhone,
  });

  if (error) {
    console.error(
      "Current phone verification OTP request error:",
      error,
    );

    return {
      error:
        "We could not send the verification code to your current mobile number. Please try again.",
    };
  }

  return {
    success: true,
    phone: currentPhone,
  };
}

/**
 * Verify ownership of the CURRENT registered number.
 *
 * Successful verification allows the client to proceed
 * to the new-number step.
 */
export async function verifyCurrentPhone(
  formData: FormData,
): Promise<{
  success?: boolean;
  error?: string;
}> {
  const result = await requireAuthenticatedUser();

  if (!result) {
    return {
      error:
        "We could not verify your account. Please sign in again.",
    };
  }

  const { supabase, authUser, user } = result;

  const token = String(
    formData.get("token") ?? "",
  ).trim();

  const currentPhone = user.phone?.trim();

  if (!currentPhone) {
    return {
      error:
        "Your account does not have a registered mobile number.",
    };
  }

  if (!/^\d{6}$/.test(token)) {
    return {
      error:
        "Please enter the 6-digit verification code.",
    };
  }

  /*
   * Verify the OTP against the CURRENT number.
   *
   * This confirms ownership of the number that is already
   * registered on the MooGold account.
   */
  const {
    data,
    error,
  } = await supabase.auth.verifyOtp({
    phone: currentPhone,
    token,
    type: "sms",
  });

  if (error || !data.user) {
    console.error(
      "Current phone verification error:",
      error,
    );

    return {
      error:
        "The verification code is invalid or has expired.",
    };
  }

  if (data.user.id !== authUser.id) {
    console.error(
      "Current phone verification user mismatch:",
      {
        expected: authUser.id,
        received: data.user.id,
      },
    );

    await supabase.auth.signOut();

    return {
      error:
        "We could not verify your account. Please sign in again.",
    };
  }

  return {
    success: true,
  };
}

/**
 * Replace the registered phone number after the CURRENT
 * number has already been verified.
 *
 * No OTP is sent to the new number.
 */
export async function updatePhoneNumber(
  formData: FormData,
): Promise<{
  success?: boolean;
  error?: string;
  phone?: string;
}> {
  const result = await requireAuthenticatedUser();

  if (!result) {
    return {
      error:
        "We could not verify your account. Please sign in again.",
    };
  }

  const { user } = result;

  const phoneInput = String(
    formData.get("phone") ?? "",
  ).trim();

  if (!phoneInput) {
    return {
      error: "Please enter your new mobile number.",
    };
  }

  const phoneResult = normalizePhone(phoneInput);

  if (!phoneResult) {
    return {
      error: getPhoneValidationMessage(),
    };
  }

  const {
    phone: newPhone,
    countryCode,
  } = phoneResult;

  if (newPhone === user.phone) {
    return {
      error:
        "Your new mobile number must be different from your current number.",
    };
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      phone: newPhone,
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
        "This mobile number is already associated with another MooGold account.",
    };
  }

  /*
   * Update Supabase directly through the admin client.
   *
   * The current phone has already been verified immediately
   * before reaching this action, so no second OTP is required.
   */
  const adminSupabase = createAdminClient();

  const {
    data: updatedAuthUser,
    error: updateAuthError,
  } = await adminSupabase.auth.admin.updateUserById(
    user.authUserId,
    {
      phone: newPhone,
      phone_confirm: true,
    },
  );

  if (
    updateAuthError ||
    !updatedAuthUser.user
  ) {
    console.error(
      "Failed to update Supabase phone:",
      updateAuthError,
    );

    return {
      error:
        "We could not update your mobile number. Please try again.",
    };
  }

  if (
    updatedAuthUser.user.id !== user.authUserId ||
    updatedAuthUser.user.phone !== newPhone
  ) {
    console.error(
      "Supabase phone update synchronization mismatch:",
      {
        expectedUserId: user.authUserId,
        receivedUserId: updatedAuthUser.user.id,
        expectedPhone: newPhone,
        receivedPhone:
          updatedAuthUser.user.phone,
      },
    );

    return {
      error:
        "Your mobile number could not be confirmed. Please contact MooGold support.",
    };
  }

  /*
   * Keep Prisma synchronized with Supabase.
   */
  try {
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        phone: newPhone,
        countryCode,
      },
    });
  } catch (databaseError) {
    console.error(
      "Failed to synchronize Prisma phone:",
      databaseError,
    );

    /*
     * Attempt to restore the previous Supabase phone
     * if the database synchronization fails.
     */
    try {
      const rollbackClient = createAdminClient();

      await rollbackClient.auth.admin.updateUserById(
        user.authUserId,
        {
          phone: user.phone ?? undefined,
          phone_confirm: true,
        },
      );
    } catch (rollbackError) {
      console.error(
        "Phone rollback failed:",
        rollbackError,
      );
    }

    return {
      error:
        "We could not complete the mobile-number update. Please try again.",
    };
  }

  return {
    success: true,
    phone: newPhone,
  };
}