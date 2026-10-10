"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  hashPin,
  isValidPin,
  verifyPin,
} from "@/lib/auth/pin";

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
      pinHash: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function changePin(
  formData: FormData,
): Promise<{
  success?: string;
  error?: string;
}> {
  const user = await requireUser();

  const currentPin = String(
    formData.get("currentPin") ?? "",
  ).trim();

  const newPin = String(
    formData.get("newPin") ?? "",
  ).trim();

  const confirmPin = String(
    formData.get("confirmPin") ?? "",
  ).trim();

  if (!/^\d{4}$/.test(currentPin)) {
    return {
      error: "Please enter your current 4-digit PIN.",
    };
  }

  if (!user.pinHash) {
    return {
      error:
        "Your PIN is not configured. Please contact MooGold support.",
    };
  }

  const currentPinValid = await verifyPin(
    currentPin,
    user.pinHash,
  );

  if (!currentPinValid) {
    return {
      error: "Your current PIN is incorrect.",
    };
  }

  if (!/^\d{4}$/.test(newPin)) {
    return {
      error: "Your new PIN must contain exactly 4 digits.",
    };
  }

  if (!isValidPin(newPin)) {
    return {
      error:
        "Choose a different 4-digit PIN. Avoid repeated numbers and simple sequences such as 0000 or 1234.",
    };
  }

  if (newPin === currentPin) {
    return {
      error:
        "Your new PIN must be different from your current PIN.",
    };
  }

  if (newPin !== confirmPin) {
    return {
      error: "The new PINs do not match.",
    };
  }

  const pinHash = await hashPin(newPin);

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      pinHash,
      pinCreatedAt: new Date(),
    },
  });

  return {
    success: "Your 4-digit PIN has been changed successfully.",
  };
}