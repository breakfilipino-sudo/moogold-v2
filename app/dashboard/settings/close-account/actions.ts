"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { verifyPin } from "@/lib/auth/pin";

const ACTIVE_TRANSACTION_STATUSES = ["PENDING", "PROCESSING"] as const;
const ACTIVE_CRYPTO_STATUSES = ["PENDING", "PROCESSING"] as const;
const ACTIVE_GIFT_CARD_STATUSES = ["PENDING", "PROCESSING"] as const;

export async function requestAccountClosure(
  formData: FormData,
): Promise<{
  error?: string;
}> {
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
      accountStatus: true,
      pinHash: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  if (user.accountStatus === "CLOSED") {
    return {
      error: "This account has already been closed.",
    };
  }

  if (user.accountStatus === "CLOSURE_REQUESTED") {
    return {
      error: "Your account closure request is already being processed.",
    };
  }

  const pin = String(formData.get("pin") ?? "").trim();

  if (!/^\d{4}$/.test(pin)) {
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

  const pinValid = await verifyPin(pin, user.pinHash);

  if (!pinValid) {
    return {
      error: "Your PIN is incorrect.",
    };
  }

  const [
    pendingTransaction,
    pendingCryptoDeposit,
    pendingCryptoWithdrawal,
    pendingGiftCard,
  ] = await Promise.all([
    prisma.transaction.findFirst({
      where: {
        userId: user.id,
        status: {
          in: [...ACTIVE_TRANSACTION_STATUSES],
        },
      },
      select: {
        id: true,
      },
    }),

    prisma.cryptoDeposit.findFirst({
      where: {
        userId: user.id,
        status: {
          in: [...ACTIVE_CRYPTO_STATUSES],
        },
      },
      select: {
        id: true,
      },
    }),

    prisma.cryptoWithdrawal.findFirst({
      where: {
        userId: user.id,
        status: {
          in: [...ACTIVE_CRYPTO_STATUSES],
        },
      },
      select: {
        id: true,
      },
    }),

    prisma.giftCardSubmission.findFirst({
      where: {
        userId: user.id,
        status: {
          in: [...ACTIVE_GIFT_CARD_STATUSES],
        },
      },
      select: {
        id: true,
      },
    }),
  ]);

  if (
    pendingTransaction ||
    pendingCryptoDeposit ||
    pendingCryptoWithdrawal ||
    pendingGiftCard
  ) {
    return {
      error:
        "Your account cannot be closed while financial activity is still being processed. Please wait until all pending activity is completed.",
    };
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      accountStatus: "CLOSURE_REQUESTED",
      closureRequestedAt: new Date(),
    },
  });

  await supabase.auth.signOut();

  redirect("/login?closed=1");
}