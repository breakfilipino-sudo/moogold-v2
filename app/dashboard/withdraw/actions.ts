"use server";

import { sendAdminEmailAlert } from "@/lib/admin-email-alerts";
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
  const value = String(
    formData.get(name) ?? "",
  ).trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function generateWithdrawalReference() {
  const timestamp = Date.now();

  const random = Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase();

  return `MG-WD-${timestamp}-${random}`;
}

export async function requestWithdrawal(
  formData: FormData,
): Promise<void> {
  const user = await requireUser();

  const countryCode = user.countryCode;

  if (
    !isSupportedWithdrawalCountry(
      countryCode,
    )
  ) {
    throw new Error(
      "Your country is not currently supported for withdrawals.",
    );
  }

  const withdrawalConfig =
    getWithdrawalCountryConfig(
      countryCode,
    );

  if (!withdrawalConfig) {
    throw new Error(
      "Your withdrawal configuration could not be found.",
    );
  }

  /*
   * ---------------------------------------------------------
   * AMOUNT
   * ---------------------------------------------------------
   */

  const amountText =
    getRequiredValue(
      formData,
      "amount",
    );

  if (
    !/^\d+(\.\d{1,2})?$/.test(
      amountText,
    )
  ) {
    throw new Error(
      "Withdrawal amounts can have a maximum of 2 decimal places.",
    );
  }

  const amount =
    Number(amountText);

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw new Error(
      "Please enter a valid withdrawal amount.",
    );
  }

  if (amount < 10) {
    throw new Error(
      "The minimum withdrawal amount is $10.00.",
    );
  }

  /*
   * ---------------------------------------------------------
   * BANK
   * ---------------------------------------------------------
   */

  const bankName =
    getRequiredValue(
      formData,
      "bankName",
    );

  if (
    !isSupportedWithdrawalBank(
      countryCode,
      bankName,
    )
  ) {
    throw new Error(
      withdrawalConfig.bankFieldMode ===
      "select"
        ? "Please select a supported bank for your country."
        : "Please enter a valid bank name.",
    );
  }

  /*
   * ---------------------------------------------------------
   * BANK ACCOUNT NUMBER
   * ---------------------------------------------------------
   *
   * IMPORTANT:
   *
   * Validation is bank-specific.
   *
   * The exact same getAccountNumberError()
   * function is used by the client-side configuration
   * and this server action.
   * ---------------------------------------------------------
   */

  let bankAccountNumber =
    getRequiredValue(
      formData,
      "bankAccountNumber",
    );

  bankAccountNumber =
    bankAccountNumber.replace(
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
    throw new Error(
      accountNumberError,
    );
  }

  /*
   * ---------------------------------------------------------
   * ROUTING / SORT / IDENTIFIER
   * ---------------------------------------------------------
   */

  let routingNumber:
    | string
    | null = null;

  if (
    withdrawalConfig.routingNumberRequired
  ) {
    routingNumber =
      getRequiredValue(
        formData,
        "routingNumber",
      ).replace(
        /[\s-]/g,
        "",
      );

    const routingNumberError =
      getRoutingNumberError(
        countryCode,
        routingNumber,
      );

    if (routingNumberError) {
      throw new Error(
        routingNumberError,
      );
    }
  }

  /*
   * ---------------------------------------------------------
   * REGISTERED ACCOUNT NAME
   * ---------------------------------------------------------
   *
   * Never trust an account name supplied by the browser.
   * MooGold uses the registered user name.
   * ---------------------------------------------------------
   */

  const accountName =
    user.fullName?.trim() ||
    user.email?.split("@")[0] ||
    "MooGold User";

  const withdrawalReference =
    generateWithdrawalReference();

  /*
   * ---------------------------------------------------------
   * TRANSACTION
   * ---------------------------------------------------------
   */

  try {
    await prisma.$transaction(
      async (tx) => {
        const wallet =
          await tx.wallet.findUnique({
            where: {
              userId: user.id,
            },
          });

        if (!wallet) {
          throw new Error(
            "Your wallet could not be found.",
          );
        }

        const availableBalance =
          wallet.cashBalance;

        if (
          availableBalance.lessThan(
            amount,
          )
        ) {
          throw new Error(
            "Insufficient cash balance.",
          );
        }

        const balanceBefore =
          availableBalance;

        const balanceAfter =
          balanceBefore.minus(amount);

        const transaction =
          await tx.transaction.create({
            data: {
              userId: user.id,
              type: "WITHDRAWAL",
              status: "PENDING",
              balanceType: "CASH",
              amount,
              currency: "USD",
              usdAmount: amount,
              description:
                `Withdrawal request via ${bankName}.`,
              reference:
                withdrawalReference,
            },
          });

        await tx.withdrawalDetails.create({
          data: {
            id: transaction.id,
            transactionId:
              transaction.id,
            method: "BANK_TRANSFER",
            bankName,
            bankAccountName:
              accountName,
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
            cashBalance: {
              decrement: amount,
            },
          },
        });

        await tx.walletLedgerEntry.create({
          data: {
            walletId: wallet.id,
            transactionId:
              transaction.id,
            balanceType: "CASH",
            direction: "DEBIT",
            amount,
            currency: "USD",
            balanceBefore,
            balanceAfter,
            description:
              `Withdrawal requested: ${withdrawalReference}`,
          },
        });
      },
    );
  } catch (error) {
    console.error(
      "Failed to create withdrawal:",
      error,
    );

    throw new Error(
      error instanceof Error
        ? error.message
        : "Unable to submit your withdrawal.",
    );
  }

  void sendAdminEmailAlert({
    subject: "Withdrawal request awaiting review",
    message:
      `A new withdrawal request is awaiting admin review.\n` +
      `Reference: ${withdrawalReference}\n` +
      `Amount: $${amount.toString()} USD\n` +
      `Status: PENDING\n` +
      `Review bank and account details in the admin portal.`,
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/wallet");
  revalidatePath("/dashboard/withdraw");
  revalidatePath("/dashboard/transactions");
  revalidatePath("/admin/transactions");
  revalidatePath("/admin/withdrawals");

  redirect(
    `/dashboard/withdraw?success=${encodeURIComponent(
      withdrawalReference,
    )}`,
  );
}