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
        principalLocal <= 0 ||
        principalUsd <= 0 ||
        projectedProfitUsd < 0 ||
        !Number.isFinite(exchangeRate)
      ) {
        throw new Error(
          "The investment amounts or exchange rate are invalid.",
        );
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
