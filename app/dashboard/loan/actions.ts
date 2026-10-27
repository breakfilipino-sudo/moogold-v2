"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCountryFinancialConfig } from "@/lib/countries";
import { sendAdminEmailAlert } from "@/lib/admin-email-alerts";

export type LoanActionState = {
  success: boolean;
  message: string;
};

const STORAGE_BUCKET =
  process.env.VERIFICATION_STORAGE_BUCKET?.trim() ||
  "verification-documents";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const PERSONAL_ID_TYPES_BY_COUNTRY: Record<string, Set<string>> = {
  NG: new Set(["NATIONAL_ID", "PASSPORT", "DRIVERS_LICENSE", "RESIDENCE_PERMIT"]),
  PH: new Set(["NATIONAL_ID", "PASSPORT", "DRIVERS_LICENSE", "RESIDENCE_PERMIT"]),
  SG: new Set(["NATIONAL_ID", "PASSPORT", "DRIVERS_LICENSE", "RESIDENCE_PERMIT"]),
  MY: new Set(["NATIONAL_ID", "PASSPORT", "DRIVERS_LICENSE", "RESIDENCE_PERMIT"]),
  KE: new Set(["NATIONAL_ID", "PASSPORT", "DRIVERS_LICENSE", "RESIDENCE_PERMIT"]),
  GH: new Set(["NATIONAL_ID", "PASSPORT", "DRIVERS_LICENSE", "RESIDENCE_PERMIT"]),
  ZA: new Set(["NATIONAL_ID", "PASSPORT", "DRIVERS_LICENSE", "RESIDENCE_PERMIT"]),
  GB: new Set(["PASSPORT", "DRIVERS_LICENSE", "RESIDENCE_PERMIT"]),
  US: new Set(["STATE_ID", "PASSPORT", "DRIVERS_LICENSE", "PERMANENT_RESIDENT_CARD"]),
  CA: new Set(["PROVINCIAL_ID", "PASSPORT", "DRIVERS_LICENSE", "PERMANENT_RESIDENT_CARD"]),
  IN: new Set(["NATIONAL_ID", "PASSPORT", "DRIVERS_LICENSE", "RESIDENCE_PERMIT"]),
  CN: new Set(["NATIONAL_ID", "PASSPORT", "RESIDENCE_PERMIT"]),
  AE: new Set(["EMIRATES_ID", "PASSPORT", "DRIVERS_LICENSE", "RESIDENCE_PERMIT"]),
  BR: new Set(["NATIONAL_ID", "PASSPORT", "DRIVERS_LICENSE", "RESIDENCE_PERMIT"]),
  VN: new Set(["NATIONAL_ID", "PASSPORT", "DRIVERS_LICENSE", "RESIDENCE_PERMIT"]),
  TR: new Set(["NATIONAL_ID", "PASSPORT", "DRIVERS_LICENSE", "RESIDENCE_PERMIT"]),
};

function repayment(amount: number, rate: number) {
  return Math.round(amount * (1 + rate / 100) * 100) / 100;
}

function getText(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function submitRegularLoan(
  _previousState: LoanActionState,
  formData: FormData,
): Promise<LoanActionState> {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return { success: false, message: "Your session has expired. Please log in again." };
  }

  const user = await prisma.user.findUnique({
    where: { authUserId: authUser.id },
    select: { id: true, countryCode: true },
  });

  if (!user) {
    return { success: false, message: "Your account could not be found." };
  }

  const country = getCountryFinancialConfig(user.countryCode);
  if (!country) {
    return { success: false, message: "Your registered country does not have a supported loan currency." };
  }

  const loanType = getText(formData, "loanType");
  const submittedAmountText = getText(formData, "amount");
  const amountText = submittedAmountText.replace(/,/g, "");
  const termMonths = Number(getText(formData, "termMonths"));
  const amount = Number(amountText);

  if (loanType !== "PERSONAL" && loanType !== "BUSINESS") {
    return { success: false, message: "Choose a valid loan type." };
  }

  const minimum = loanType === "PERSONAL" ? 1000 : 50000;
  const maximum = loanType === "PERSONAL" ? 10000000 : 150000000;

  if (
    !amountText ||
    !Number.isFinite(amount) ||
    !/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(submittedAmountText) ||
    amount < minimum ||
    amount > maximum
  ) {
    return {
      success: false,
      message: `Enter an amount between ${minimum.toLocaleString()} and ${maximum.toLocaleString()} ${country.currency}.`,
    };
  }

  if (![3, 6, 12].includes(termMonths)) {
    return { success: false, message: "Choose a loan term of 3, 6, or 12 months." };
  }

  const rate = termMonths === 3 ? 1 : termMonths === 6 ? 4 : 5;
  const total = repayment(amount, rate);
  const submittedDocumentType = getText(formData, "documentType");
  const registeredCountryCode = user.countryCode?.toUpperCase();
  const allowedPersonalIds = registeredCountryCode
    ? PERSONAL_ID_TYPES_BY_COUNTRY[registeredCountryCode]
    : undefined;
  if (
    loanType === "PERSONAL" &&
    (!allowedPersonalIds || !allowedPersonalIds.has(submittedDocumentType))
  ) {
    return { success: false, message: "Choose a valid ID type for your registered country." };
  }
  const documentType = loanType === "PERSONAL" ? "PERSONAL_ID" : "BUSINESS_REGISTRATION";
  const fileEntry = formData.get("document");

  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    return {
      success: false,
      message: loanType === "PERSONAL"
        ? "Upload your personal ID to continue."
        : "Upload your business registration certificate to continue.",
    };
  }

  if (
    fileEntry.size > MAX_FILE_SIZE ||
    !ALLOWED_TYPES.has(fileEntry.type)
  ) {
    return {
      success: false,
      message: "Upload a PDF, JPEG, PNG, or WEBP document up to 10 MB.",
    };
  }

  const selfieEntry = formData.get("selfie");
  if (
    !(selfieEntry instanceof File) ||
    selfieEntry.size === 0 ||
    selfieEntry.size > 5 * 1024 * 1024 ||
    selfieEntry.type !== "image/jpeg"
  ) {
    return {
      success: false,
      message: "Take a selfie with your camera before submitting. The selfie must be a JPEG image no larger than 5 MB.",
    };
  }

  const activeApplication = await prisma.regularLoanApplication.findFirst({
    where: {
      userId: user.id,
      status: { in: ["PENDING_REVIEW", "APPROVED"] },
    },
    select: { id: true },
  });

  if (activeApplication) {
    return {
      success: false,
      message: "Your loan application is being processed. You can check its status below.",
    };
  }

  const lastDisbursement = await prisma.regularLoanApplication.findFirst({
    where: {
      userId: user.id,
      status: "DISBURSED",
      disbursedAt: { not: null },
    },
    orderBy: { disbursedAt: "desc" },
    select: { disbursedAt: true },
  });

  if (lastDisbursement?.disbursedAt) {
    const nextEligibleDate = new Date(
      lastDisbursement.disbursedAt.getTime() + 7 * 24 * 60 * 60 * 1000,
    );

    if (new Date() < nextEligibleDate) {
      const formattedDate = new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(nextEligibleDate);

      return {
        success: false,
        message: `You recently applied for a loan. Apply again by ${formattedDate}.`,
      };
    }
  }

  let applicationId: string | null = null;
  const uploadedPaths: string[] = [];

  try {
    const application = await prisma.regularLoanApplication.create({
      data: {
        userId: user.id,
        loanType,
        currency: country.currency,
        requestedAmount: amount,
        termMonths,
        requestedInterestRate: rate,
        requestedTotalRepayment: total,
      },
      select: { id: true },
    });
    applicationId = application.id;

    const safeName = fileEntry.name
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(-120) || "loan-document";

    const uploadedDocumentPath =
      `users/${user.id}/regular-loans/${application.id}/${crypto.randomUUID()}-${safeName}`;
    uploadedPaths.push(uploadedDocumentPath);

    const adminSupabase = createAdminClient();
    const bytes = Buffer.from(await fileEntry.arrayBuffer());
    const { error: uploadError } = await adminSupabase.storage
      .from(STORAGE_BUCKET)
      .upload(uploadedDocumentPath, bytes, {
        contentType: fileEntry.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error("We could not securely save your document. Please try again.");
    }

    await prisma.regularLoanDocument.create({
      data: {
        applicationId: application.id,
        type: documentType,
        storagePath: uploadedDocumentPath,
        originalName: safeName,
        mimeType: fileEntry.type,
        sizeBytes: fileEntry.size,
      },
    });

    const selfiePath =
      `users/${user.id}/regular-loans/${application.id}/${crypto.randomUUID()}-selfie.jpg`;
    uploadedPaths.push(selfiePath);

    const selfieBytes = Buffer.from(await selfieEntry.arrayBuffer());
    const { error: selfieUploadError } = await adminSupabase.storage
      .from(STORAGE_BUCKET)
      .upload(selfiePath, selfieBytes, {
        contentType: "image/jpeg",
        cacheControl: "3600",
        upsert: false,
      });

    if (selfieUploadError) {
      throw new Error("We could not securely save your selfie. Please try again.");
    }

    await prisma.regularLoanDocument.create({
      data: {
        applicationId: application.id,
        type: "OTHER",
        storagePath: selfiePath,
        originalName: "selfie.jpg",
        mimeType: "image/jpeg",
        sizeBytes: selfieEntry.size,
      },
    });

    void sendAdminEmailAlert({
      subject: "New regular loan application",
      message:
        `A new ${loanType.toLowerCase()} loan application requires review.\n` +
        `Application: ${application.id}\n` +
        `Amount: ${amount.toLocaleString()} ${country.currency}\n` +
        `Term: ${termMonths} months`,
    }).catch((error) => console.error("Loan admin notification failed:", error));

    revalidatePath("/dashboard/loan");
    revalidatePath("/admin/loans");

    return {
      success: true,
      message: "Your application has been submitted for review.",
    };
  } catch (error) {
    console.error("Regular loan submission failed:", error);

    if (uploadedPaths.length > 0) {
      try {
        const adminSupabase = createAdminClient();
        await adminSupabase.storage.from(STORAGE_BUCKET).remove(uploadedPaths);
      } catch (cleanupError) {
        console.error("Loan document cleanup failed:", cleanupError);
      }
    }

    if (applicationId) {
      try {
        await prisma.regularLoanApplication.delete({
          where: { id: applicationId },
        });
      } catch (cleanupError) {
        console.error("Loan application cleanup failed:", cleanupError);
      }
    }

    return {
      success: false,
      message: error instanceof Error &&
        error.message.includes("securely save")
        ? error.message
        : "We could not submit your application. Please try again.",
    };
  }
}

export async function acceptRegularLoanOffer(
  _previousState: LoanActionState,
  formData: FormData,
): Promise<LoanActionState> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return {
      success: false,
      message: "Your session has expired. Please log in again.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { authUserId: authUser.id },
    select: {
      id: true,
      email: true,
      fullName: true,
      countryCode: true,
    },
  });

  if (!user) {
    return { success: false, message: "Your account could not be found." };
  }

  const country = getCountryFinancialConfig(user.countryCode);
  if (!country) {
    return {
      success: false,
      message: "Your registered country has no supported loan currency.",
    };
  }

  const applicationId = getText(formData, "applicationId");
  if (!applicationId || applicationId.length > 128) {
    return { success: false, message: "Choose a valid loan offer." };
  }

  let creditedAmount = "";
  let repaymentAmount = "";
  let termMonths = 0;
  let currency = country.currency;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const application = await tx.regularLoanApplication.findFirst({
        where: { id: applicationId, userId: user.id },
        select: {
          id: true,
          status: true,
          currency: true,
          termMonths: true,
          offerAmount: true,
          offerTotalRepayment: true,
          offerAcceptedAt: true,
          disbursedAt: true,
        },
      });

      if (!application) throw new Error("LOAN_NOT_FOUND");
      if (application.status !== "APPROVED") {
        throw new Error("LOAN_NOT_APPROVED");
      }
      if (application.offerAcceptedAt || application.disbursedAt) {
        throw new Error("LOAN_ALREADY_ACCEPTED");
      }
      if (
        !application.offerAmount ||
        !application.offerTotalRepayment ||
        application.currency !== country.currency
      ) {
        throw new Error("LOAN_OFFER_INVALID");
      }

      const claimed = await tx.regularLoanApplication.updateMany({
        where: {
          id: application.id,
          userId: user.id,
          status: "APPROVED",
          offerAcceptedAt: null,
          disbursedAt: null,
        },
        data: {
          status: "DISBURSED",
          offerAcceptedAt: new Date(),
          disbursedAt: new Date(),
        },
      });

      if (claimed.count !== 1) {
        throw new Error("LOAN_ALREADY_ACCEPTED");
      }

      const balance = await tx.regularLoanBalance.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          currency: application.currency,
          balance: new Prisma.Decimal(0),
        },
        update: {},
        select: { id: true, balance: true, currency: true },
      });

      if (balance.currency !== application.currency) {
        throw new Error("LOAN_BALANCE_CURRENCY_MISMATCH");
      }

      const before = balance.balance;
      const after = before.plus(application.offerAmount);

      await tx.regularLoanBalance.update({
        where: { id: balance.id },
        data: { balance: after },
      });

      await tx.regularLoanLedgerEntry.create({
        data: {
          balanceId: balance.id,
          applicationId: application.id,
          direction: "CREDIT",
          amount: application.offerAmount,
          currency: application.currency,
          balanceBefore: before,
          balanceAfter: after,
          reference: `REGULAR_LOAN_DISBURSEMENT_${application.id}`,
          description: `Accepted ${application.termMonths}-month regular loan`,
        },
      });

      await tx.notification.create({
        data: {
          userId: user.id,
          type: "SYSTEM",
          title: "Your loan has been disbursed",
          message: `${application.currency} ${application.offerAmount.toFixed(2)} has been credited to your separate Loan Balance.`,
          href: "/dashboard/loan",
        },
      });

      return {
        amount: application.offerAmount.toFixed(2),
        repayment: application.offerTotalRepayment.toFixed(2),
        term: application.termMonths,
        currency: application.currency,
      };
    });

    creditedAmount = result.amount;
    repaymentAmount = result.repayment;
    termMonths = result.term;
    currency = result.currency;
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case "LOAN_NOT_FOUND":
          return {
            success: false,
            message: "That loan offer could not be found.",
          };
        case "LOAN_NOT_APPROVED":
          return {
            success: false,
            message: "This loan offer is no longer available.",
          };
        case "LOAN_ALREADY_ACCEPTED":
          return {
            success: false,
            message: "This offer has already been accepted or processed.",
          };
        case "LOAN_OFFER_INVALID":
          return {
            success: false,
            message: "The approved offer is incomplete or its currency does not match your registered country.",
          };
        case "LOAN_BALANCE_CURRENCY_MISMATCH":
          return {
            success: false,
            message: "Your Loan Balance needs support review before this offer can be credited.",
          };
      }
    }

    console.error("Regular loan acceptance failed:", error);
    return {
      success: false,
      message: "We could not accept this offer. Please try again or contact support.",
    };
  }

  if (
    user.email &&
    process.env.RESEND_API_KEY &&
    process.env.ADMIN_NOTIFICATION_FROM
  ) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const emailResult = await resend.emails.send({
        from: process.env.ADMIN_NOTIFICATION_FROM,
        to: user.email,
        subject: "Your MooGold loan offer has been accepted",
        text:
          `Hello${user.fullName ? ` ${user.fullName}` : ""},\n\n` +
          "Your approved regular loan offer has been accepted.\n\n" +
          `Amount credited to your separate Loan Balance: ${currency} ${Number(creditedAmount).toLocaleString()}\n` +
          `Total repayment: ${currency} ${Number(repaymentAmount).toLocaleString()}\n` +
          `Term: ${termMonths} months\n\n` +
          "This credit is separate from your main wallet.",
      });

      if (emailResult.error) {
        console.error(
          "Loan acceptance email rejected:",
          emailResult.error.message,
        );
      }
    } catch (error) {
      console.error("Loan acceptance email failed:", error);
    }
  }

  revalidatePath("/dashboard/loan");
  revalidatePath("/dashboard/wallet");

  return {
    success: true,
    message: `Offer accepted. ${currency} ${Number(creditedAmount).toLocaleString()} has been credited to your separate Loan Balance.`,
  };
}

/**
 * Reserve a cash-out from the separate Regular Loan Balance.
 * This is intentionally separate from normal wallet withdrawal.
 */
export async function requestRegularLoanCashout(
  _previousState: LoanActionState,
  formData: FormData,
): Promise<LoanActionState> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return {
      success: false,
      message: "Your session has expired. Please log in again.",
    };
  }

  const submittedAmountText = getText(formData, "amount");
  const amountText = submittedAmountText.replace(/,/g, "");
  const bankName = getText(formData, "bankName");
  const accountNumber = getText(formData, "accountNumber").replace(/[\s-]/g, "");
  const routingNumber = getText(formData, "routingNumber").replace(/[\s-]/g, "");

  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(submittedAmountText)) {
    return { success: false, message: "Enter a valid cash-out amount." };
  }

  let amount: Prisma.Decimal;
  try {
    amount = new Prisma.Decimal(amountText);
  } catch {
    return { success: false, message: "Enter a valid cash-out amount." };
  }

  if (!amount.isFinite() || amount.lessThanOrEqualTo(0)) {
    return { success: false, message: "Enter an amount greater than zero." };
  }

  const user = await prisma.user.findUnique({
    where: { authUserId: authUser.id },
    select: {
      id: true,
      fullName: true,
      email: true,
      countryCode: true,
    },
  });

  if (!user) {
    return { success: false, message: "Your account could not be found." };
  }

  const country = getCountryFinancialConfig(user.countryCode);
  if (!country) {
    return {
      success: false,
      message: "Your registered country does not have a supported loan currency.",
    };
  }

  const {
    getWithdrawalCountryConfig,
    isSupportedWithdrawalCountry,
    isSupportedWithdrawalBank,
    getAccountNumberError,
    getRoutingNumberError,
  } = await import("@/lib/withdrawal");

  if (!isSupportedWithdrawalCountry(user.countryCode)) {
    return {
      success: false,
      message: "Bank cash-out is not supported for your registered country.",
    };
  }

  const withdrawalConfig = getWithdrawalCountryConfig(user.countryCode);
  if (!withdrawalConfig) {
    return {
      success: false,
      message: "Bank cash-out is not supported for your registered country.",
    };
  }

  if (!bankName || !isSupportedWithdrawalBank(user.countryCode, bankName)) {
    return { success: false, message: "Choose a supported bank." };
  }

  const accountError = getAccountNumberError(
    user.countryCode,
    bankName,
    accountNumber,
  );
  if (accountError) {
    return { success: false, message: accountError };
  }

  if (withdrawalConfig.routingNumberRequired) {
    if (!routingNumber) {
      return {
        success: false,
        message: `Enter your ${withdrawalConfig.routingNumberLabel ?? "routing number"}.`,
      };
    }

    const routingError = getRoutingNumberError(
      user.countryCode,
      routingNumber,
    );
    if (routingError) {
      return { success: false, message: routingError };
    }
  }

  if (amount.decimalPlaces() > 2) {
    return { success: false, message: "Use no more than two decimal places." };
  }

  const rateResult = await (async () => {
    try {
      const { getVerifiedUsdFxRate } = await import("@/lib/crypto-finance/verified-prices");
      return await getVerifiedUsdFxRate(country.currency);
    } catch {
      return null;
    }
  })();

  if (!rateResult || !Number.isFinite(rateResult.rate) || rateResult.rate <= 0) {
    return {
      success: false,
      message: "We could not verify the current exchange rate. Please try again later.",
    };
  }

  const rate = new Prisma.Decimal(rateResult.rate);
  const collateralRequired = amount.mul("0.10");
  const reference = `MG-LC-${Date.now()}-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  const accountName =
    user.fullName?.trim() ||
    user.email?.split("@")[0] ||
    "MooGold User";

  try {
    await prisma.$transaction(
      async (tx) => {
        const balance = await tx.regularLoanBalance.findUnique({
          where: { userId: user.id },
        });

        if (!balance || balance.balance.lessThanOrEqualTo(0)) {
          throw new Error("NO_LOAN_BALANCE");
        }

        if (balance.currency !== country.currency) {
          throw new Error("LOAN_CURRENCY_MISMATCH");
        }

        if (balance.balance.lessThan(amount)) {
          throw new Error("INSUFFICIENT_LOAN_BALANCE");
        }

        const wallet = await tx.wallet.findUnique({
          where: { userId: user.id },
          select: { id: true, cashBalance: true },
        });

        if (!wallet) {
          throw new Error("WALLET_NOT_FOUND");
        }

        const walletLocalEquivalent = wallet.cashBalance.mul(rate);
        if (walletLocalEquivalent.lessThan(collateralRequired)) {
          throw new Error("INSUFFICIENT_COLLATERAL");
        }

        const balanceBefore = balance.balance;
        const balanceAfter = balanceBefore.minus(amount);

        const reservation = await tx.regularLoanBalance.updateMany({
          where: {
            id: balance.id,
            balance: { gte: amount },
            currency: country.currency,
          },
          data: { balance: { decrement: amount } },
        });

        if (reservation.count !== 1) {
          throw new Error("INSUFFICIENT_LOAN_BALANCE");
        }

        const transaction = await tx.transaction.create({
          data: {
            userId: user.id,
            type: "WITHDRAWAL",
            status: "PENDING",
            balanceType: "CASH",
            amount,
            currency: country.currency,
            usdAmount: amount.div(rate).toDecimalPlaces(2),
            exchangeRate: rate,
            description: "Loan Balance cash-out request",
            reference,
            withdrawalDetails: {
              create: {
                id: crypto.randomUUID(),
                method: "BANK_TRANSFER",
                bankName,
                bankAccountName: accountName,
                bankAccountNumber: accountNumber,
                routingNumber: withdrawalConfig.routingNumberRequired
                  ? routingNumber
                  : null,
                notes: "REGULAR_LOAN_CASHOUT",
              },
            },
          },
        });

        await tx.regularLoanLedgerEntry.create({
          data: {
            balanceId: balance.id,
            applicationId: null,
            direction: "DEBIT",
            amount,
            currency: country.currency,
            balanceBefore,
            balanceAfter,
            reference: `REGULAR_LOAN_CASHOUT_${transaction.id}`,
            description: `Loan Balance cash-out reservation ${reference}`,
          },
        });

        await tx.notification.create({
          data: {
            userId: user.id,
            type: "WITHDRAWAL",
            title: "Loan cash-out requested",
            message: `Your ${country.currency} ${amount.toFixed(2)} Loan Balance cash-out request is awaiting review.`,
            href: "/dashboard/loan",
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : "";

    const messages: Record<string, string> = {
      NO_LOAN_BALANCE: "No loan balance is available for cash-out.",
      LOAN_CURRENCY_MISMATCH: "Your Loan Balance needs support review before cash-out.",
      INSUFFICIENT_LOAN_BALANCE: "Your Loan Balance is no longer sufficient for that amount.",
      WALLET_NOT_FOUND: "Your main wallet could not be found.",
      INSUFFICIENT_COLLATERAL: `Your main wallet must have at least ${country.currency} ${collateralRequired.toFixed(2)} to withdraw this loan.`,
    };

    if (messages[code]) {
      return { success: false, message: messages[code] };
    }

    console.error("Loan Balance cash-out request failed:", error);
    return {
      success: false,
      message: "We could not submit your cash-out request. Please try again.",
    };
  }

  revalidatePath("/dashboard/loan");
  revalidatePath("/dashboard/wallet");
  revalidatePath("/dashboard/transactions");
  revalidatePath("/admin/withdrawals");

  return {
    success: true,
    message: "Your Loan Balance cash-out request has been submitted for review.",
  };
}