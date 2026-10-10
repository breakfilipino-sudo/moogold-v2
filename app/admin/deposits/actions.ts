"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

const MINIMUM_DEPOSIT_USD = 10;
const REFERRAL_QUALIFICATION_USD = 100;
const REFERRAL_REWARD_USD = 10;

async function requireAdmin() {
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

  if (!user || user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return user;
}

/*
 * ============================================================
 * APPROVE DEPOSIT
 * ============================================================
 */

export async function approveDeposit(
  formData: FormData,
): Promise<void> {
  const admin = await requireAdmin();

  const reference = String(
    formData.get("reference") ?? "",
  ).trim();

  if (!reference) {
    throw new Error("Deposit reference is required.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const deposit = await tx.transaction.findUnique({
        where: {
          reference,
        },
      });

      if (!deposit) {
        throw new Error("Deposit not found.");
      }

      if (deposit.type !== "DEPOSIT") {
        throw new Error("This transaction is not a deposit.");
      }

      if (deposit.status !== "PENDING") {
        throw new Error(
          `This deposit has already been ${deposit.status.toLowerCase()}.`,
        );
      }

      const usdAmount = deposit.usdAmount;

      if (!usdAmount || usdAmount.lessThanOrEqualTo(0)) {
        throw new Error(
          "This deposit does not have a valid USD amount.",
        );
      }

      if (usdAmount.lessThan(MINIMUM_DEPOSIT_USD)) {
        throw new Error(
          "The minimum deposit is $10 USD.",
        );
      }

      const wallet = await tx.wallet.findUnique({
        where: {
          userId: deposit.userId,
        },
        include: {
          user: {
            select: {
              referredBy: {
                select: {
                  id: true,
                  referrerId: true,
                  status: true,
                  rewardAmount: true,
                  rewardCurrency: true,
                  qualifiedAt: true,
                },
              },
            },
          },
        },
      });

      if (!wallet) {
        throw new Error(
          "The customer wallet could not be found.",
        );
      }

      const balanceBefore = wallet.cashBalance;
      const balanceAfter = balanceBefore.add(usdAmount);
      const approvedAt = new Date();

      await tx.transaction.update({
        where: {
          id: deposit.id,
        },
        data: {
          status: "COMPLETED",
          approvedById: admin.id,
          approvedAt,
        },
      });

      await tx.balanceAdjustment.create({
        data: {
          userId: deposit.userId,
          adminId: admin.id,
          transactionId: deposit.id,
          balanceType: "CASH",
          direction: "CREDIT",
          amount: usdAmount,
          currency: "USD",
          reason: `Deposit approved: ${deposit.reference}`,
          reference: `ADJ-${deposit.reference}`,
        },
      });

      await tx.walletLedgerEntry.create({
        data: {
          walletId: wallet.id,
          transactionId: deposit.id,
          balanceType: "CASH",
          direction: "CREDIT",
          amount: usdAmount,
          currency: "USD",
          balanceBefore,
          balanceAfter,
          description: `Deposit approved: ${deposit.reference}`,
        },
      });

      await tx.wallet.update({
        where: {
          id: wallet.id,
        },
        data: {
          cashBalance: balanceAfter,
        },
      });

      /*
       * Customer notification:
       * only sent after the deposit is actually completed.
       */
      await tx.notification.create({
        data: {
          userId: deposit.userId,
          type: "DEPOSIT",
          title: "Deposit approved",
          message:
            `Your deposit of $${usdAmount.toFixed(2)} ` +
            "has been approved and added to your MooGold wallet.",
          href: `/dashboard/deposit/${reference}`,
        },
      });

      /*
       * ========================================================
       * REFERRAL REWARD
       * ========================================================
       */

      const referral = wallet.user.referredBy;

      if (
        referral &&
        referral.status === "PENDING"
      ) {
        const approvedDeposits =
          await tx.transaction.aggregate({
            where: {
              userId: deposit.userId,
              type: "DEPOSIT",
              status: "COMPLETED",
            },
            _sum: {
              usdAmount: true,
            },
          });

        const totalApprovedDeposits = Number(
          approvedDeposits._sum.usdAmount ?? 0,
        );

        if (
          totalApprovedDeposits >=
          REFERRAL_QUALIFICATION_USD
        ) {
          const referralReward =
            REFERRAL_REWARD_USD;

          const referralWallet =
            await tx.wallet.findUnique({
              where: {
                userId: referral.referrerId,
              },
            });

          if (!referralWallet) {
            throw new Error(
              "The referrer's wallet could not be found.",
            );
          }

          const referralBalanceBefore =
            referralWallet.referralBalance;

          const referralBalanceAfter =
            referralBalanceBefore.add(
              referralReward,
            );

          const rewardReference =
            `MG-REF-${Date.now()}-${crypto
              .randomUUID()
              .slice(0, 8)
              .toUpperCase()}`;

          const rewardTransaction =
            await tx.transaction.create({
              data: {
                userId: referral.referrerId,
                type: "REFERRAL_REWARD",
                status: "COMPLETED",
                balanceType: "REFERRAL",
                amount: referralReward,
                currency: "USD",
                usdAmount: referralReward,
                description:
                  `Referral reward for referred user ${deposit.userId} reaching $100 in approved deposits.`,
                reference: rewardReference,
                approvedById: admin.id,
                approvedAt,
              },
            });

          await tx.balanceAdjustment.create({
            data: {
              userId: referral.referrerId,
              adminId: admin.id,
              transactionId: rewardTransaction.id,
              balanceType: "REFERRAL",
              direction: "CREDIT",
              amount: referralReward,
              currency: "USD",
              reason:
                `Referral reward: referred user qualified after reaching $${REFERRAL_QUALIFICATION_USD.toFixed(2)} in approved deposits.`,
              reference:
                `RADJ-${rewardReference}`,
            },
          });

          await tx.walletLedgerEntry.create({
            data: {
              walletId: referralWallet.id,
              transactionId: rewardTransaction.id,
              balanceType: "REFERRAL",
              direction: "CREDIT",
              amount: referralReward,
              currency: "USD",
              balanceBefore:
                referralBalanceBefore,
              balanceAfter:
                referralBalanceAfter,
              description:
                `Referral reward credited: ${rewardReference}`,
            },
          });

          await tx.wallet.update({
            where: {
              id: referralWallet.id,
            },
            data: {
              referralBalance:
                referralBalanceAfter,
            },
          });

          await tx.referral.update({
            where: {
              id: referral.id,
            },
            data: {
              status: "REWARDED",
              rewardAmount: referralReward,
              rewardCurrency: "USD",
              qualifiedAt:
                referral.qualifiedAt ??
                approvedAt,
              rewardedAt: approvedAt,
            },
          });

          /*
           * Referral notification belongs to the referrer,
           * not the customer who made the deposit.
           */
          await tx.notification.create({
            data: {
              userId: referral.referrerId,
              type: "REFERRAL",
              title: "Referral reward received",
              message:
                "You received a $10.00 referral reward.",
              href: "/dashboard/referrals",
            },
          });
        }
      }
    });
  } catch (error) {
    console.error(
      "Failed to approve deposit:",
      error,
    );

    throw new Error(
      error instanceof Error
        ? error.message
        : "Unable to approve this deposit.",
    );
  }

  revalidatePath("/admin/deposits");
  revalidatePath(`/admin/deposits/${reference}`);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/wallet");
  revalidatePath("/dashboard/referrals");
  revalidatePath("/dashboard/transactions");

  revalidatePath("/admin/transactions");

  redirect(
    `/admin/deposits/${reference}`,
  );
}

/*
 * ============================================================
 * REJECT DEPOSIT
 * ============================================================
 */

export async function rejectDeposit(
  formData: FormData,
): Promise<void> {
  await requireAdmin();

  const reference = String(
    formData.get("reference") ?? "",
  ).trim();

  const reason = String(
    formData.get("reason") ?? "",
  ).trim();

  if (!reference) {
    throw new Error(
      "Deposit reference is required.",
    );
  }

  if (!reason) {
    throw new Error(
      "Please provide a rejection reason.",
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      const deposit =
        await tx.transaction.findUnique({
          where: {
            reference,
          },
        });

      if (!deposit) {
        throw new Error("Deposit not found.");
      }

      if (deposit.type !== "DEPOSIT") {
        throw new Error(
          "This transaction is not a deposit.",
        );
      }

      if (deposit.status !== "PENDING") {
        throw new Error(
          "This deposit could not be rejected. It may no longer be pending.",
        );
      }

      await tx.transaction.update({
        where: {
          id: deposit.id,
        },
        data: {
          status: "REJECTED",
          rejectionReason: reason,
          description:
            `Deposit rejected: ${reason}`,
        },
      });

      await tx.notification.create({
        data: {
          userId: deposit.userId,
          type: "DEPOSIT",
          title: "Deposit rejected",
          message:
            `Your deposit request was rejected. Reason: ${reason}`,
          href: `/dashboard/deposit/${reference}`,
        },
      });
    });
  } catch (error) {
    console.error(
      "Failed to reject deposit:",
      error,
    );

    throw new Error(
      error instanceof Error
        ? error.message
        : "Unable to reject this deposit.",
    );
  }

  revalidatePath("/admin/deposits");
  revalidatePath(`/admin/deposits/${reference}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/wallet");
  revalidatePath("/dashboard/transactions");

  redirect(
    `/admin/deposits/${reference}`,
  );
}