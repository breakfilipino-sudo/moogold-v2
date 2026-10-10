"use server";

import { sendAdminEmailAlert } from "@/lib/admin-email-alerts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCountryFinancialConfig } from "@/lib/countries";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

const MINIMUM_DEPOSIT_USD = 10;
const MAXIMUM_DEPOSIT_USD = 100_000;

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
    throw new Error(
      `${name} is required.`,
    );
  }

  return value;
}

function getOptionalValue(
  formData: FormData,
  name: string,
): string | null {
  const value = String(
    formData.get(name) ?? "",
  ).trim();

  return value || null;
}

function generateDepositReference() {
  const timestamp = Date.now();

  const random = Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase();

  return `MG-DP-${timestamp}-${random}`;
}

/*
 * Returns:
 * 1 unit of local currency = X USD
 *
 * Example:
 * 1 MYR = 0.23 USD
 *
 * The server obtains the rate itself.
 * The browser never controls the final USD value.
 */
async function getUsdExchangeRate(
  currency: string,
): Promise<number> {
  if (currency === "USD") {
    return 1;
  }

  const response = await fetch(
    `https://api.frankfurter.dev/v2/rate/${encodeURIComponent(
      currency,
    )}/USD`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      "Unable to retrieve the current exchange rate. Please try again.",
    );
  }

  const data = (await response.json()) as {
    rate?: number;
  };

  const rate = Number(
    data?.rate,
  );

  if (
    !Number.isFinite(rate) ||
    rate <= 0
  ) {
    throw new Error(
      "The current exchange rate could not be determined. Please try again.",
    );
  }

  return rate;
}

export async function requestDeposit(
  formData: FormData,
): Promise<void> {
  const user = await requireUser();

  /*
   * Country and currency are always taken from
   * the authenticated user's database record.
   *
   * The hidden countryCode field submitted by the
   * browser is intentionally not trusted.
   */
  const countryCode =
    user.countryCode?.toUpperCase() ?? "";

  const country =
    getCountryFinancialConfig(
      countryCode,
    );

  if (!country) {
    throw new Error(
      "Your country could not be determined. Please update your account settings.",
    );
  }

  const currency =
    country.currency;

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
      "Add Fund amounts can have a maximum of 2 decimal places.",
    );
  }

  const amount =
    Number(amountText);

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw new Error(
      "Please enter a valid add-fund amount.",
    );
  }

  const bankName =
    getRequiredValue(
      formData,
      "bankName",
    );

  if (
    bankName !==
    "Credit / Debit Card"
  ) {
    throw new Error(
      "Please select a valid payment method.",
    );
  }

  const externalReference =
    getOptionalValue(
      formData,
      "externalReference",
    );

  if (
    externalReference &&
    externalReference.length > 100
  ) {
    throw new Error(
      "Payment reference is too long.",
    );
  }

  const notes =
    getOptionalValue(
      formData,
      "notes",
    );

  if (
    notes &&
    notes.length > 500
  ) {
    throw new Error(
      "Notes are too long.",
    );
  }

  let exchangeRate: number;

  try {
    exchangeRate =
      await getUsdExchangeRate(
        currency,
      );
  } catch (error) {
    console.error(
      "Failed to retrieve add-fund exchange rate:",
      error,
    );

    throw new Error(
      error instanceof Error
        ? error.message
        : "Unable to determine the current exchange rate.",
    );
  }

  const usdAmount =
    amount * exchangeRate;

  if (
    !Number.isFinite(usdAmount) ||
    usdAmount <= 0
  ) {
    throw new Error(
      "Unable to calculate the add-fund value.",
    );
  }

  if (
    usdAmount <
    MINIMUM_DEPOSIT_USD
  ) {
    throw new Error(
      `The minimum add-fund amount is $${MINIMUM_DEPOSIT_USD.toFixed(
        2,
      )} USD equivalent.`,
    );
  }

  if (
    usdAmount >
    MAXIMUM_DEPOSIT_USD
  ) {
    throw new Error(
      "Max exceeded. The maximum add-fund amount is $100,000 USD equivalent.",
    );
  }

  const accountName =
    user.fullName ||
    user.email?.split("@")[0] ||
    "MooGold User";

  const depositReference =
    generateDepositReference();

  try {
    await prisma.$transaction(
      async (tx) => {
        const wallet =
          await tx.wallet.findUnique({
            where: {
              userId: user.id,
            },
            select: {
              id: true,
            },
          });

        if (!wallet) {
          throw new Error(
            "Your wallet could not be found.",
          );
        }

        const transaction =
          await tx.transaction.create({
            data: {
              userId: user.id,
              type: "DEPOSIT",
              status: "PENDING",
              balanceType: "CASH",
              amount,
              currency,
              usdAmount,
              exchangeRate,
              description:
                `Deposit request via ${bankName}.`,
              reference:
                depositReference,
            },
          });

        await tx.depositDetails.create({
          data: {
            id: transaction.id,
            transactionId:
              transaction.id,
            method: "CARD",
            countryCode,
            bankName,
            senderName:
              accountName,
            senderAccount:
              null,
            externalReference,
            notes,
          },
        });
      },
    );
  } catch (error) {
    console.error(
      "Failed to create add-fund request:",
      error,
    );

    throw new Error(
      error instanceof Error
        ? error.message
        : "Unable to submit your add-fund request.",
    );
  }

  void sendAdminEmailAlert({
    subject: "Deposit request awaiting review",
    message:
      `A new deposit request is awaiting admin review.\n` +
      `Reference: ${depositReference}\n` +
      `Amount: ${amount} ${currency}\n` +
      `USD equivalent: $${usdAmount}\n` +
      `Status: PENDING`,
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/wallet");
  revalidatePath("/dashboard/deposit");
  revalidatePath("/dashboard/transactions");
  revalidatePath("/admin/deposits");
  revalidatePath("/admin/transactions");

  redirect(
    `/dashboard/deposit/${encodeURIComponent(
      depositReference,
    )}`,
  );
}