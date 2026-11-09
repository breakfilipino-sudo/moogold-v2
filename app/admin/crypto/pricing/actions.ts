"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export type SavePremiumState =
  | { success: true; message: string }
  | { success: false; error: string };

async function getAdminUser() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
    error,
  } = await supabase.auth.getUser();

  if (error || !authUser) return null;

  const user = await prisma.user.findUnique({
    where: { authUserId: authUser.id },
    select: { id: true, role: true },
  });

  if (!user || user.role !== "ADMIN") return null;

  return user;
}

export async function saveCryptoSellPremium(
  _previousState: SavePremiumState,
  formData: FormData,
): Promise<SavePremiumState> {
  const admin = await getAdminUser();

  if (!admin) {
    return {
      success: false,
      error: "Administrator access is required.",
    };
  }

  const rawValue = String(formData.get("sellPremiumPercent") ?? "").trim();

  if (!/^\d{1,3}(?:\.\d{1,4})?$/.test(rawValue)) {
    return {
      success: false,
      error: "Enter a valid percentage with up to 4 decimal places.",
    };
  }

  const premium = new Prisma.Decimal(rawValue);

  if (premium.isNegative() || premium.greaterThan("999.9999")) {
    return {
      success: false,
      error: "The premium must be between 0% and 999.9999%.",
    };
  }

  try {
    await prisma.cryptoTradingSettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        sellPremiumPercent: premium,
        updatedById: admin.id,
      },
      update: {
        sellPremiumPercent: premium,
        updatedById: admin.id,
      },
    });

    revalidatePath("/admin/crypto");
    revalidatePath("/admin/crypto/pricing");
    revalidatePath("/dashboard/crypto");

    return {
      success: true,
      message: `Sell premium updated to ${premium.toString()}%.`,
    };
  } catch {
    return {
      success: false,
      error: "Could not save the Sell premium. Please try again.",
    };
  }
}
