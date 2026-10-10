"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  getAccountNumberError,
  getRoutingNumberError,
  getWithdrawalCountryConfig,
  isSupportedWithdrawalBank,
  isSupportedWithdrawalCountry,
} from "@/lib/withdrawal";

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
  });

  if (!user) {
    redirect("/login");
  }

  return user;
}

function getRequiredValue(
  formData: FormData,
  name: string,
): string {
  const value = String(formData.get(name) ?? "").trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function generateReferralWithdrawalReference() {
  const timestamp = Date.now();

  const random = Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase();

  return `MG-RWD-${timestamp}-${random}`;
}

export async function requestReferralWithdrawal(
  formData: FormData,
): Promise<void> {
  const user = await requireUser();

  const countryCode = user.countryCode;

  if (!isSupportedWithdrawalCountry(countryCode)) {
    throw new Error(
      "Your country is not currently supported for withdrawals.",
    );
  }

  const withdrawalConfig =
    getWithdrawalCountryConfig(countryCode);

  if (!withdrawalConfig) {
    throw new Error(
      "Your withdrawal configuration could not be found.",
    );
  }

  const amountText = getRequiredValue(
    formData,
    "amount",
  );

  if (!/^\d+(\.\d{1,2})?$/.test(amountText)) {
    throw new Error(
      "Withdrawal amounts can have a maximum of 2 decimal places.",
    );
  }

  const amount = Number(amountText);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(
      "Please enter a valid withdrawal amount.",
    );
  }

  const bankName = getRequiredValue(
    formData,
    "bankName",
  );

  if (!isSupportedWithdrawalBank(countryCode, bankName)) {
    throw new Error(
      withdrawalConfig.bankFieldMode === "select"
        ? "Please select a supported bank for your country."
        : "Please enter a valid bank name.",
    );
  }

  let bankAccountNumber = getRequiredValue(
    formData,
    "bankAccountNumber",
  );

  bankAccountNumber = bankAccountNumber.replace(
    /[\s-]/g,
    "",
  );

  const accountNumberError =
  getAccountNumberError(
    countryCode,
    bankName,
    bankAccountNumber,
  );

  if (accountNumberError) {
    throw new Error(accountNumberError);
  }

  let routingNumber: string | null = null;

  if (withdrawalConfig.routingNumberRequired) {
    routingNumber = getRequiredValue(
      formData,
      "routingNumber",
    ).replace(/[\s-]/g, "");

    const routingNumberError =
      getRoutingNumberError(
        countryCode,
        routingNumber,
      );

    if (routingNumberError) {
      throw new Error(routingNumberError);
    }
  }

  const accountName =
    user.fullName?.trim() ||
    user.email?.split("@")[0] ||
    "MooGold User";

  const withdrawalReference =
    generateReferralWithdrawalReference();

  try {
    await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: {
          userId: user.id,
        },
      });

      if (!wallet) {
        throw new Error(
          "Your wallet could not be found.",
        );
      }

      /*
       * Referral withdrawals are only available once
       * the referral balance reaches the $100 threshold.
       */
      if (wallet.referralBalance.lessThan(100)) {
        throw new Error(
          "Referral withdrawals are available once your referral balance reaches $100.00.",
        );
      }

      const availableBalance =
        wallet.referralBalance;

      if (availableBalance.lessThan(amount)) {
        throw new Error(
          "Insufficient referral balance.",
        );
      }

      const balanceBefore = availableBalance;
      const balanceAfter =
        balanceBefore.minus(amount);

      const transaction =
        await tx.transaction.create({
          data: {
            userId: user.id,
            type: "WITHDRAWAL",
            status: "PENDING",
            balanceType: "REFERRAL",
            amount,
            currency: "USD",
            usdAmount: amount,
            description: `Referral withdrawal request via ${bankName}.`,
            reference: withdrawalReference,
          },
        });

      await tx.withdrawalDetails.create({
        data: {
          id: transaction.id,
          transactionId: transaction.id,
          method: "BANK_TRANSFER",
          bankName,
          bankAccountName: accountName,
          bankAccountNumber,
          routingNumber,
          externalReference: null,
          notes: null,
        },
      });

      await tx.wallet.update({
        where: {
          id: wallet.id,
        },
        data: {
          referralBalance: {
            decrement: amount,
          },
        },
      });

      await tx.walletLedgerEntry.create({
        data: {
          walletId: wallet.id,
          transactionId: transaction.id,
          balanceType: "REFERRAL",
          direction: "DEBIT",
          amount,
          currency: "USD",
          balanceBefore,
          balanceAfter,
          description: `Referral withdrawal requested: ${withdrawalReference}`,
        },
      });
    });
  } catch (error) {
    console.error(
      "Failed to create referral withdrawal:",
      error,
    );

    throw new Error(
      error instanceof Error
        ? error.message
        : "Unable to submit your referral withdrawal.",
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/wallet");
  revalidatePath("/dashboard/referrals");
  revalidatePath("/dashboard/referrals/withdraw");
  revalidatePath("/dashboard/transactions");
  revalidatePath("/admin/transactions");
  revalidatePath("/admin/withdrawals");

  redirect(
    `/dashboard/referrals/withdraw?success=${encodeURIComponent(
      withdrawalReference,
    )}`,
  );
}