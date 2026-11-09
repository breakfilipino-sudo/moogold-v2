"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";


async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const admin = await prisma.user.findUnique({
    where: {
      authUserId: authUser.id,
    },
  });

  if (!admin || admin.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return admin;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function formatLocalAmount(
  amount: number,
  currency: string,
) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatMaturityDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}


export async function updateWealthFundingGatewayUrl(
  formData: FormData,
): Promise<void> {
  await requireAdmin();

  const fundingId = String(formData.get("fundingId") ?? "").trim();
  const gatewayUrl = String(formData.get("gatewayUrl") ?? "").trim();

  if (!fundingId) {
    throw new Error("Wealth Box funding ID is required.");
  }

  if (!gatewayUrl) {
    throw new Error("Please enter the payment gateway URL.");
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(gatewayUrl);
  } catch {
    throw new Error("Please enter a valid payment gateway URL.");
  }

  if (
    parsedUrl.protocol !== "https:" ||
    parsedUrl.username ||
    parsedUrl.password
  ) {
    throw new Error(
      "The payment gateway URL must use HTTPS and cannot contain embedded credentials.",
    );
  }

  const funding = await prisma.wealthFunding.findUnique({
    where: { id: fundingId },
    select: {
      id: true,
      paymentMethod: true,
      status: true,
    },
  });

  if (!funding) {
    throw new Error("Wealth Box funding request was not found.");
  }

  if (
    funding.paymentMethod !== "GCASH" &&
    funding.paymentMethod !== "TOUCH_N_GO"
  ) {
    throw new Error(
      "Gateway URLs can only be assigned to GCash or Touch ’n Go requests.",
    );
  }

  if (funding.status !== "PENDING") {
    throw new Error(
      "A gateway URL can only be assigned while the funding request is pending.",
    );
  }

  const updated = await prisma.wealthFunding.updateMany({
    where: {
      id: fundingId,
      status: "PENDING",
      paymentMethod: {
        in: ["GCASH", "TOUCH_N_GO"],
      },
    },
    data: {
      gatewayUrl: parsedUrl.toString(),
    },
  });

  if (updated.count !== 1) {
    throw new Error(
      "The funding request changed while saving. Refresh and try again.",
    );
  }

  revalidatePath("/admin/wealth-box");
  revalidatePath(`/admin/wealth-box/${fundingId}`);
  revalidatePath("/dashboard/wealth-box");

  redirect(`/admin/wealth-box/${fundingId}`);
}
export async function approveWealthFunding(
  formData: FormData,
): Promise<void> {
  const admin = await requireAdmin();

  const fundingId = String(
    formData.get("fundingId") ?? "",
  ).trim();

  if (!fundingId) {
    throw new Error(
      "Wealth Box funding ID is required.",
    );
  }

  const approvedAt = new Date();

  try {
    await prisma.$transaction(async (tx) => {
      const funding =
        await tx.wealthFunding.findUnique({
          where: {
            id: fundingId,
          },
          include: {
            user: true,
            plan: true,
            cryptoDeposit: true,
          },
        });

      if (!funding) {
        throw new Error(
          "Wealth Box funding request was not found.",
        );
      }

      if (funding.status !== "PENDING") {
        throw new Error(
          `This funding request has already been ${funding.status.toLowerCase()}.`,
        );
      }

      if (funding.investmentId) {
        throw new Error(
          "This funding request already has an investment.",
        );
      }

      // Special Card funding requires a verified submission linked to this funding.
      if (funding.paymentMethod === "SPECIAL_CARD") {
        const verifiedSubmission =
          await tx.wealthSpecialCardSubmission.findFirst({
            where: {
              fundingId: funding.id,
              status: "VERIFIED",
              verifiedAt: { not: null },
            },
            select: { id: true },
          });

        if (!verifiedSubmission) {
          throw new Error(
            "This Special Card submission has not been verified.",
          );
        }
      }

      if (funding.durationDays <= 0) {
        throw new Error(
          "The investment duration is invalid.",
        );
      }

      const principalLocal = roundMoney(
        Number(funding.principalLocal),
      );

      const principalUsd = Number(
        funding.principalUsd,
      );

      const projectedProfitUsd = roundMoney(
        Number(funding.projectedProfitUsd),
      );

      const exchangeRate = Number(
        funding.exchangeRate,
      );

      if (
        !Number.isFinite(principalLocal) ||
        principalLocal <= 0 ||
        principalUsd <= 0 ||
        projectedProfitUsd < 0 ||
        !Number.isFinite(exchangeRate)
      ) {
        throw new Error(
          "The investment amounts or exchange rate are invalid.",
        );
      }

      // Approval must respect the registered country's active plan maximum.
      const registeredCountryCode =
        funding.user.countryCode?.trim().toUpperCase();

      if (!registeredCountryCode) {
        throw new Error(
          "The customer's registered country is missing. This funding request cannot be approved.",
        );
      }

      const countryConfig =
        await tx.wealthPlanCountry.findUnique({
          where: {
            planId_countryCode: {
              planId: funding.planId,
              countryCode: registeredCountryCode,
            },
          },
          select: {
            active: true,
            maximumLocalAmount: true,
            currencySymbol: true,
          },
        });

      if (!countryConfig || !countryConfig.active) {
        throw new Error(
          "The investment plan is not active for the customer's registered country.",
        );
      }

      if (countryConfig.maximumLocalAmount !== null) {
        const maximumLocalAmount = Number(
          countryConfig.maximumLocalAmount,
        );

        if (
          !Number.isFinite(maximumLocalAmount) ||
          maximumLocalAmount <= 0
        ) {
          throw new Error(
            "The investment plan has an invalid maximum amount.",
          );
        }

        if (principalLocal > maximumLocalAmount) {
          throw new Error(
            `The maximum investment is ${countryConfig.currencySymbol}${maximumLocalAmount.toLocaleString("en-US")}.`,
          );
        }
      }
      const maturityDate = addDays(
        approvedAt,
        funding.durationDays,
      );

      const dailyProfitUsd = roundMoney(
        projectedProfitUsd /
          funding.durationDays,
      );

      /*
       * Profit is credited to the Wealth Box investment
       * immediately on approval. It is not added to the
       * main wallet balance.
       *
       * The earnings processor creates daily history
       * records but must not add these profits again.
       */
      const investment =
        await tx.wealthInvestment.create({
          data: {
            userId: funding.userId,
            planId: funding.planId,

            principalUsd: funding.principalUsd,
            principalLocal: funding.principalLocal,
            localCurrency: funding.localCurrency,
            exchangeRate: funding.exchangeRate,

            returnPercentage: funding.returnPercentage,
            dailyProfitUsd,
            projectedProfitUsd:
              funding.projectedProfitUsd,
            maturityAmountUsd:
              funding.maturityAmountUsd,

            startDate: approvedAt,
            maturityDate,

            accumulatedProfitUsd:
              projectedProfitUsd,
            daysCompleted: 0,

            status: "ACTIVE",
          },
        });

      await tx.wealthFunding.update({
        where: {
          id: funding.id,
        },
        data: {
          status: "COMPLETED",
          reviewedById: admin.id,
          reviewedAt: approvedAt,
          investmentId: investment.id,
          payoutDate: maturityDate,
        },
      });

      if (funding.cryptoDepositId) {
        await tx.cryptoDeposit.update({
          where: {
            id: funding.cryptoDepositId,
          },
          data: {
            status: "COMPLETED",
            reviewedById: admin.id,
            reviewedAt: approvedAt,
          },
        });
      }

      /*
       * Use the same local-value calculation as the
       * Wealth Box balance preview.
       */
      const localPerUsd =
        principalUsd > 0
          ? principalLocal / principalUsd
          : 0;

      const profitLocal = roundMoney(
        projectedProfitUsd * localPerUsd,
      );

      const maturityAmountLocal = roundMoney(
        principalLocal + profitLocal,
      );

      const registeredName =
        funding.user.fullName?.trim();

      const firstName =
        registeredName
          ?.split(/\s+/)
          .filter(Boolean)[0] || "there";

      const investmentAmountText =
        formatLocalAmount(
          principalLocal,
          funding.localCurrency,
        );

      const profitAmountText =
        formatLocalAmount(
          profitLocal,
          funding.localCurrency,
        );

      const maturityAmountText =
        formatLocalAmount(
          maturityAmountLocal,
          funding.localCurrency,
        );

      const maturityDateText =
        formatMaturityDate(maturityDate);

      const durationText =
        `${funding.durationDays}-day plan`;

      const message =
        `Hi, ${firstName}! Your Wealth Box investment of ` +
        `${investmentAmountText} has been approved. ` +
        `You have earned an extra ${profitAmountText} ` +
        `with your ${durationText}. Your total Wealth Box ` +
        `value is ${maturityAmountText}. Cash out will be ` +
        `available on ${maturityDateText}.`;

      /*
       * Save the message in the existing notification
       * system. It stays unread until the customer views
       * or dismisses it through the dashboard UI.
       */
      await tx.notification.create({
        data: {
          userId: funding.userId,
          type: "SYSTEM",
          title: "Your Wealth Box investment is approved",
          message,
          href: "/dashboard/wealth-box",
        },
      });
    });
  } catch (error) {
    console.error(
      "Failed to approve Wealth Box funding:",
      error,
    );

    throw new Error(
      error instanceof Error
        ? error.message
        : "Unable to approve this Wealth Box funding request.",
    );
  }

  revalidatePath("/admin/wealth-box");
  revalidatePath(`/admin/wealth-box/${fundingId}`);
  revalidatePath("/dashboard/wealth-box");
  revalidatePath("/dashboard/notifications");

  redirect(`/admin/wealth-box/${fundingId}`);
}

export async function rejectWealthFunding(
  formData: FormData,
): Promise<void> {
  const admin = await requireAdmin();

  const fundingId = String(
    formData.get("fundingId") ?? "",
  ).trim();

  const reason = String(
    formData.get("reason") ?? "",
  ).trim();

  if (!fundingId) {
    throw new Error(
      "Wealth Box funding ID is required.",
    );
  }

  if (!reason) {
    throw new Error(
      "Please provide a rejection reason.",
    );
  }

  if (reason.length > 500) {
    throw new Error(
      "The rejection reason is too long.",
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      const funding =
        await tx.wealthFunding.findUnique({
          where: {
            id: fundingId,
          },
          include: {
            cryptoDeposit: true,
          },
        });

      if (!funding) {
        throw new Error(
          "Wealth Box funding request was not found.",
        );
      }

      if (funding.status !== "PENDING") {
        throw new Error(
          `This funding request has already been ${funding.status.toLowerCase()}.`,
        );
      }

      if (funding.investmentId) {
        throw new Error(
          "This funding request already has an investment.",
        );
      }

      // Special Card funding requires a verified submission linked to this funding.
      if (funding.paymentMethod === "SPECIAL_CARD") {
        const verifiedSubmission =
          await tx.wealthSpecialCardSubmission.findFirst({
            where: {
              fundingId: funding.id,
              status: "VERIFIED",
              verifiedAt: { not: null },
            },
            select: { id: true },
          });

        if (!verifiedSubmission) {
          throw new Error(
            "This Special Card submission has not been verified.",
          );
        }
      }

      const reviewedAt = new Date();

      await tx.wealthFunding.update({
        where: {
          id: funding.id,
        },
        data: {
          status: "REJECTED",
          reviewedById: admin.id,
          reviewedAt,
          rejectionReason: reason,
        },
      });

      if (funding.cryptoDepositId) {
        await tx.cryptoDeposit.update({
          where: {
            id: funding.cryptoDepositId,
          },
          data: {
            status: "REJECTED",
            reviewedById: admin.id,
            reviewedAt,
            rejectionReason: reason,
          },
        });
      }

      await tx.notification.create({
        data: {
          userId: funding.userId,
          type: "SYSTEM",
          title: "Wealth Box funding rejected",
          message: `Your Wealth Box funding request was rejected. Reason: ${reason}`,
          href: "/dashboard/wealth-box",
        },
      });
    });
  } catch (error) {
    console.error(
      "Failed to reject Wealth Box funding:",
      error,
    );

    throw new Error(
      error instanceof Error
        ? error.message
        : "Unable to reject this Wealth Box funding request.",
    );
  }

  revalidatePath("/admin/wealth-box");
  revalidatePath(`/admin/wealth-box/${fundingId}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/wealth-box");
  revalidatePath("/dashboard/notifications");

  redirect(`/admin/wealth-box/${fundingId}`);
}

export async function setMayaWealthFundingDecision(formData: FormData) {
  await requireAdmin();

  const fundingId = String(formData.get("fundingId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();

  const messages: Record<string, { title: string; message: string }> = {
    INCORRECT_CODE: {
      title: "Maya verification",
      message: "The Maya verification code was incorrect. Please try again with the correct code.",
    },
    INSUFFICIENT_FUNDS: {
      title: "Maya payment update",
      message: "There are insufficient funds to complete this Maya payment.",
    },
    WRONG_CREDENTIALS: {
      title: "Maya payment update",
      message: "The Maya credentials provided could not be verified. Please check the details.",
    },
  };

  const selectedMessage = messages[decision];

  if (!fundingId || !selectedMessage) {
    throw new Error("Invalid Maya funding decision.");
  }

  const funding = await prisma.wealthFunding.findFirst({
    where: {
      id: fundingId,
      status: "PENDING",
      paymentMethod: "MAYA",
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!funding) {
    throw new Error("Pending Maya Wealth Box funding request not found.");
  }

  await prisma.notification.create({
    data: {
      userId: funding.userId,
      type: "SYSTEM",
      title: selectedMessage.title,
      message: selectedMessage.message,
      href: "/dashboard/wealth-box",
    },
  });

  revalidatePath("/admin/wealth-box");
  revalidatePath(`/admin/wealth-box/${fundingId}`);
  revalidatePath("/dashboard/wealth-box");
  revalidatePath("/dashboard/notifications");

  redirect(`/admin/wealth-box/${fundingId}`);
}
const INCORRECT_CODE_RETRY = "INCORRECT_CODE_RETRY";
const INCORRECT_CODE_MESSAGE =
  "Incorrect code. Please enter the correct six-digit code.";

const REVIEWABLE_STATUSES = [
  "PENDING_REVIEW",
  "CODE_ISSUED",
  "EXPIRED",
] as const;

function isReviewableStatus(status: string) {
  return REVIEWABLE_STATUSES.some((value) => value === status);
}

function revalidateSpecialCardReview(submissionId: string) {
  revalidatePath("/admin/wealth-box");
  revalidatePath(`/admin/wealth-box/special-card/${submissionId}`);
  revalidatePath("/dashboard/wealth-box");
  revalidatePath("/dashboard/notifications");
}

/**
 * Admin-confirmed successful verification.
 *
 * The submitted digits are never compared, stored, or returned.
 * An authorized admin makes the verification decision manually.
 * Funding remains PENDING until the existing funding approval flow runs.
 */
export async function approveSpecialCardVerification(
  formData: FormData,
): Promise<{ success: true }> {
  const admin = await requireAdmin();
  const submissionId = String(
    formData.get("submissionId") ?? "",
  ).trim();

  if (!submissionId) {
    throw new Error("Special Card submission ID is required.");
  }

  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const submission =
      await tx.wealthSpecialCardSubmission.findUnique({
        where: { id: submissionId },
        select: {
          id: true,
          userId: true,
          planId: true,
          status: true,
          fundingId: true,
          failedAttempts: true,
          principalLocal: true,
          principalUsd: true,
          localCurrency: true,
          exchangeRate: true,
          returnPercentage: true,
          projectedProfitUsd: true,
          maturityAmountUsd: true,
          durationDays: true,
          payoutDate: true,
        },
      });

    if (!submission || submission.fundingId) {
      throw new Error(
        "This submission already has funding or cannot be reviewed.",
      );
    }

    if (!isReviewableStatus(submission.status)) {
      throw new Error(
        "This Special Card submission is no longer awaiting review.",
      );
    }

    if (submission.failedAttempts < 1) {
      throw new Error(
        "The customer must submit a verification attempt before approval.",
      );
    }

    if (submission.failedAttempts >= 5) {
      throw new Error(
        "The five-attempt verification limit has been reached.",
      );
    }

    // Conditional update prevents two reviewers from approving the same
    // submission concurrently. The transaction rolls back if funding creation
    // or linking fails.
    const verified = await tx.wealthSpecialCardSubmission.updateMany({
      where: {
        id: submission.id,
        fundingId: null,
        status: submission.status,
        failedAttempts: submission.failedAttempts,
      },
      data: {
        status: "VERIFIED",
        verifiedAt: now,
        reviewedById: admin.id,
        reviewedAt: now,
        rejectionReason: null,
        verificationCodeHash: null,
        verificationCodeExpiresAt: null,
      },
    });

    if (verified.count !== 1) {
      throw new Error(
        "The submission changed during review. Refresh and try again.",
      );
    }

    const funding = await tx.wealthFunding.create({
      data: {
        userId: submission.userId,
        planId: submission.planId,
        paymentMethod: "SPECIAL_CARD",
        status: "PENDING",
        principalLocal: submission.principalLocal,
        principalUsd: submission.principalUsd,
        localCurrency: submission.localCurrency,
        exchangeRate: submission.exchangeRate,
        returnPercentage: submission.returnPercentage,
        projectedProfitUsd: submission.projectedProfitUsd,
        maturityAmountUsd: submission.maturityAmountUsd,
        durationDays: submission.durationDays,
        payoutDate: submission.payoutDate,
        externalReference:
          `SPECIAL-${submission.id}-${now.getTime()}`,
      },
      select: {
        id: true,
      },
    });

    const linked = await tx.wealthSpecialCardSubmission.updateMany({
      where: {
        id: submission.id,
        fundingId: null,
        status: "VERIFIED",
        verifiedAt: now,
      },
      data: {
        fundingId: funding.id,
      },
    });

    if (linked.count !== 1) {
      throw new Error(
        "Unable to link the funding record to the verified submission.",
      );
    }

    await tx.notification.create({
      data: {
        userId: submission.userId,
        type: "SYSTEM",
        title: "Special Card verification successful",
        message:
          "Your Special Card verification was successful. " +
          "Your Wealth Box funding request is now pending admin review. " +
          "Your investment will not begin until funding is approved.",
        href: "/dashboard/wealth-box",
      },
    });

    return { id: submission.id };
  });

  revalidateSpecialCardReview(result.id);
  return { success: true };
}

/**
 * Mark the latest customer-submitted attempt as incorrect.
 * The submission remains reviewable so the customer can try again.
 */
export async function markSpecialCardCodeIncorrect(
  formData: FormData,
): Promise<{ success: true }> {
  const admin = await requireAdmin();
  const submissionId = String(
    formData.get("submissionId") ?? "",
  ).trim();

  if (!submissionId) {
    throw new Error("Special Card submission ID is required.");
  }

  const submission =
    await prisma.wealthSpecialCardSubmission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        userId: true,
        status: true,
        fundingId: true,
        failedAttempts: true,
      },
    });

  if (!submission || submission.fundingId) {
    throw new Error(
      "This submission cannot be updated here.",
    );
  }

  if (!isReviewableStatus(submission.status)) {
    throw new Error(
      "This Special Card submission is no longer awaiting review.",
    );
  }

  if (submission.failedAttempts < 1) {
    throw new Error(
      "There is no customer verification attempt to review.",
    );
  }

  if (submission.failedAttempts >= 5) {
    throw new Error(
      "The five-attempt verification limit has been reached.",
    );
  }

  const now = new Date();

  const changed = await prisma.wealthSpecialCardSubmission.updateMany({
    where: {
      id: submission.id,
      fundingId: null,
      status: submission.status,
      failedAttempts: submission.failedAttempts,
    },
    data: {
      status: "PENDING_REVIEW",
      reviewedById: admin.id,
      reviewedAt: now,
      rejectionReason: INCORRECT_CODE_RETRY,
      verificationCodeHash: null,
      verificationCodeExpiresAt: null,
    },
  });

  if (changed.count !== 1) {
    throw new Error(
      "The submission changed during review. Refresh and try again.",
    );
  }

  await prisma.notification.create({
    data: {
      userId: submission.userId,
      type: "SYSTEM",
      title: "Please retry Special Card verification",
      message: INCORRECT_CODE_MESSAGE,
      href: "/dashboard/wealth-box",
    },
  });

  revalidateSpecialCardReview(submission.id);
  return { success: true };
}

/**
 * Reject a submission for one of the two supported business reasons.
 */
export async function rejectSpecialCardSubmission(
  formData: FormData,
): Promise<{ success: true }> {
  const admin = await requireAdmin();

  const submissionId = String(
    formData.get("submissionId") ?? "",
  ).trim();

  const reason = String(
    formData.get("reason") ?? "",
  ).trim();

  if (!reason || reason.length > 500) {
  throw new Error("Enter a rejection reason of no more than 500 characters.");
}

  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const submission =
      await tx.wealthSpecialCardSubmission.findUnique({
        where: { id: submissionId },
        select: {
          id: true,
          userId: true,
          status: true,
          fundingId: true,
        },
      });

    if (!submission || submission.fundingId) {
      throw new Error(
        "This submission cannot be rejected here. Review its linked funding instead.",
      );
    }

    if (!isReviewableStatus(submission.status)) {
      throw new Error(
        "This Special Card submission is no longer awaiting review.",
      );
    }

    const changed = await tx.wealthSpecialCardSubmission.updateMany({
      where: {
        id: submission.id,
        fundingId: null,
        status: submission.status,
      },
      data: {
        status: "REJECTED",
        reviewedById: admin.id,
        reviewedAt: now,
        rejectionReason: reason,
        verificationCodeHash: null,
        verificationCodeExpiresAt: null,
      },
    });

    if (changed.count !== 1) {
      throw new Error(
        "The submission changed during review. Refresh and try again.",
      );
    }

    await tx.notification.create({
      data: {
        userId: submission.userId,
        type: "SYSTEM",
        title: "Wealth Box Special Card submission rejected",
        message:
          `Your Special Card submission was rejected. Reason: ${reason}`,
        href: "/dashboard/wealth-box",
      },
    });

    return { id: submission.id };
  });

  revalidateSpecialCardReview(result.id);
  return { success: true };
}
