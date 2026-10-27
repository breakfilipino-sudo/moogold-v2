"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getCryptoUsdPrices } from "@/lib/crypto/prices";
import { createClient } from "@/lib/supabase/server";

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

function parseAmount(value: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Please enter a valid crypto amount.");
  }

  if (amount > 1_000_000_000) {
    throw new Error("Crypto amount is too large.");
  }

  return amount;
}

/*
 * ============================================================
 * APPROVE CRYPTO DEPOSIT
 * ============================================================
 */

export async function approveCryptoDeposit(
  formData: FormData,
): Promise<void> {
  const admin = await requireAdmin();

  const depositId = String(
    formData.get("depositId") ?? "",
  ).trim();

  const amountString = String(
    formData.get("verifiedAmount") ?? "",
  ).trim();

  const transactionHash = String(
    formData.get("transactionHash") ?? "",
  ).trim();

  const senderAddress = String(
    formData.get("senderAddress") ?? "",
  ).trim();

  const blockNumber = String(
    formData.get("blockNumber") ?? "",
  ).trim();

  const confirmationsString = String(
    formData.get("confirmations") ?? "",
  ).trim();

  if (!depositId) {
    throw new Error("Crypto deposit ID is required.");
  }

  const verifiedAmount = parseAmount(amountString);

  const confirmations =
    confirmationsString === ""
      ? null
      : Number(confirmationsString);

  if (
    confirmations !== null &&
    (!Number.isInteger(confirmations) ||
      confirmations < 0)
  ) {
    throw new Error(
      "Confirmations must be a whole number.",
    );
  }

  try {
    const cryptoUsdPrices = await getCryptoUsdPrices();
    await prisma.$transaction(
      async (tx) => {
        const deposit =
          await tx.cryptoDeposit.findUnique({
            where: {
              id: depositId,
            },
          });

        if (!deposit) {
          throw new Error(
            "Crypto deposit not found.",
          );
        }

        if (deposit.status !== "PENDING") {
          throw new Error(
            `This crypto deposit has already been ${deposit.status.toLowerCase()}.`,
          );
        }

        const cryptoBalance =
          await tx.cryptoBalance.findUnique({
            where: {
              id: deposit.cryptoBalanceId,
            },
          });

        if (!cryptoBalance) {
          throw new Error(
            "The customer's crypto balance could not be found.",
          );
        }

        if (
          cryptoBalance.userId !==
          deposit.userId
        ) {
          throw new Error(
            "Crypto balance ownership validation failed.",
          );
        }

        if (
          cryptoBalance.asset !==
            deposit.asset ||
          cryptoBalance.network !==
            deposit.network
        ) {
          throw new Error(
            "Crypto asset/network validation failed.",
          );
        }

        const balanceBefore =
          cryptoBalance.balance;

        const balanceAfter =
          balanceBefore.add(
            verifiedAmount,
          );

        const approvedAt = new Date();

        const claimedDeposit = await tx.cryptoDeposit.updateMany({
          where: {
            id: deposit.id,
            status: "PENDING",
          },
          data: {
            amount: verifiedAmount,
            transactionHash:
              transactionHash ||
              deposit.transactionHash,
            senderAddress:
              senderAddress || null,
            blockNumber:
              blockNumber || null,
            confirmations,
            status: "COMPLETED",
            reviewedById: admin.id,
            reviewedAt: approvedAt,
            description:
              "Crypto deposit approved after manual blockchain verification.",
          },
        });

        if (claimedDeposit.count !== 1) {
          throw new Error(
            "This crypto deposit has already been reviewed. Refresh the page and check its current status.",
          );
        }

        await tx.cryptoLedgerEntry.create({
          data: {
            cryptoBalanceId:
              cryptoBalance.id,
            depositId:
              deposit.id,
            asset:
              deposit.asset,
            network:
              deposit.network,
            direction:
              "CREDIT",
            amount:
              verifiedAmount,
            balanceBefore,
            balanceAfter,
            description:
              `Crypto deposit approved: ${deposit.id}`,
          },
        });

        const updated =
          await tx.cryptoBalance.updateMany({
            where: {
              id: cryptoBalance.id,
              balance: balanceBefore,
            },
            data: {
              balance: balanceAfter,
            },
          });

        if (updated.count !== 1) {
          throw new Error(
            "The crypto balance changed while this deposit was being approved. Please try again.",
          );
        }
        let notificationMessage =
          `${verifiedAmount} ${deposit.asset} has been added to your MooGold crypto wallet.`;

        const depositUsdPrice = cryptoUsdPrices[deposit.asset];

        if (
          typeof depositUsdPrice === "number" &&
          Number.isFinite(depositUsdPrice) &&
          depositUsdPrice > 0 &&
          verifiedAmount * depositUsdPrice >= 1000
        ) {
          const existingBonus = await tx.cryptoDepositBonus.findUnique({
            where: { userId: deposit.userId },
            select: { id: true },
          });

          if (!existingBonus) {
            const bonusAmount = new Prisma.Decimal("300")
              .div(String(depositUsdPrice))
              .toDecimalPlaces(18, Prisma.Decimal.ROUND_DOWN);

            if (bonusAmount.gt(0)) {
              const bonusBalanceBefore = balanceAfter;
              const bonusBalanceAfter =
                bonusBalanceBefore.add(bonusAmount);

              const bonusBalanceUpdate =
                await tx.cryptoBalance.updateMany({
                  where: {
                    id: cryptoBalance.id,
                    balance: bonusBalanceBefore,
                  },
                  data: { balance: bonusBalanceAfter },
                });

              if (bonusBalanceUpdate.count !== 1) {
                throw new Error(
                  "The crypto balance changed while applying the bonus. Please retry approval.",
                );
              }

              await tx.cryptoDepositBonus.create({
                data: {
                  userId: deposit.userId,
                  qualifyingDepositId: deposit.id,
                  cryptoBalanceId: cryptoBalance.id,
                  asset: deposit.asset,
                  network: deposit.network,
                  amount: bonusAmount,
                  usdValue: new Prisma.Decimal("300.00"),
                  exchangeRate: new Prisma.Decimal(
                    String(depositUsdPrice),
                  ).toDecimalPlaces(8),
                },
              });

              await tx.cryptoLedgerEntry.create({
                data: {
                  cryptoBalanceId: cryptoBalance.id,
                  asset: deposit.asset,
                  network: deposit.network,
                  direction: "CREDIT",
                  amount: bonusAmount,
                  balanceBefore: bonusBalanceBefore,
                  balanceAfter: bonusBalanceAfter,
                  description:
                    `One-time $300 USD crypto deposit milestone bonus: ${deposit.id}`,
                },
              });

              notificationMessage +=
                ` You also received a one-time $300 USD-equivalent crypto bonus (${bonusAmount.toString()} ${deposit.asset}).`;
            }
          }
        }

        await tx.notification.create({
          data: {
            userId: deposit.userId,
            type: "CRYPTO_DEPOSIT",
            title: "You have received",
            message: notificationMessage,
            href: `/dashboard/crypto/deposit/${depositId}`,
          },
        });
      },
      {
        isolationLevel: "Serializable",
      },
    );
  } catch (error) {
    console.error(
      "Failed to approve crypto deposit:",
      error,
    );

    throw new Error(
      error instanceof Error
        ? error.message
        : "Unable to approve this crypto deposit.",
    );
  }

  revalidatePath(
    "/admin/crypto-deposits",
  );

  revalidatePath(
    `/admin/crypto-deposits/${depositId}`,
  );

  revalidatePath(
    "/dashboard/crypto",
  );

  revalidatePath(
    `/dashboard/crypto/deposit/${depositId}`,
  );

  revalidatePath("/dashboard");

  redirect(
    `/admin/crypto-deposits/${depositId}`,
  );
}

/*
 * ============================================================
 * REJECT CRYPTO DEPOSIT
 * ============================================================
 */

export async function rejectCryptoDeposit(
  formData: FormData,
): Promise<void> {
  await requireAdmin();
  const depositId = String(
    formData.get("depositId") ?? "",
  ).trim();

  const reason = String(
    formData.get("reason") ?? "",
  ).trim();

  if (!depositId) {
    throw new Error(
      "Crypto deposit ID is required.",
    );
  }

  if (!reason) {
    throw new Error(
      "A rejection reason is required.",
    );
  }

  if (reason.length > 1000) {
    throw new Error(
      "Rejection reason is too long.",
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      const deposit =
        await tx.cryptoDeposit.findUnique({
          where: {
            id: depositId,
          },
        });

      if (!deposit) {
        throw new Error(
          "Crypto deposit not found.",
        );
      }

      if (deposit.status !== "PENDING") {
        throw new Error(
          "This crypto deposit could not be rejected. It may already have been processed.",
        );
      }

      const claimedDeposit = await tx.cryptoDeposit.updateMany({
        where: {
          id: deposit.id,
          status: "PENDING",
        },
        data: {
          status: "REJECTED",
          rejectionReason: reason,
          reviewedAt: new Date(),
          description:
            `Crypto deposit rejected: ${reason}`,
        },
      });

      if (claimedDeposit.count !== 1) {
        throw new Error(
          "This crypto deposit has already been reviewed. Refresh the page and check its current status.",
        );
      }

      await tx.notification.create({
        data: {
          userId: deposit.userId,
          type: "CRYPTO_DEPOSIT",
          title: "Crypto deposit rejected",
          message:
            `Your ${deposit.asset} deposit request was rejected. Reason: ${reason}`,
          href: `/dashboard/crypto/deposit/${depositId}`,
        },
      });
      },
      {
        isolationLevel: "Serializable",
      },
    );
  } catch (error) {
    console.error(
      "Failed to reject crypto deposit:",
      error,
    );

    throw new Error(
      error instanceof Error
        ? error.message
        : "Unable to reject this crypto deposit.",
    );
  }

  revalidatePath(
    "/admin/crypto-deposits",
  );

  revalidatePath(
    `/admin/crypto-deposits/${depositId}`,
  );

  revalidatePath(
    `/dashboard/crypto/deposit/${depositId}`,
  );

  revalidatePath(
    "/dashboard/crypto",
  );

  redirect(
    `/admin/crypto-deposits/${depositId}`,
  );
}