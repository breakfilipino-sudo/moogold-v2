"use server";

import { randomUUID } from "node:crypto";

import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getCountryFinancialConfig } from "@/lib/countries";
import { sendAdminEmailAlert } from "@/lib/admin-email-alerts";
import { getWalletCryptoOption } from "@/lib/wallet-crypto-deposits";

export type WalletCryptoRequest = {
  id: string;
  reference: string;
  asset: string;
  network: string;
  receivingAddress: string;
  memo: string | null;
  expiresAt: string;
};

export type WalletCryptoStartResult = {
  success: boolean;
  message: string;
  request?: WalletCryptoRequest;
};

export async function startWalletCryptoDeposit(
  assetValue: string,
): Promise<WalletCryptoStartResult> {
  try {
    const { user } = await getCurrentUser();
    const country = getCountryFinancialConfig(user.countryCode);

    if (!country) {
      return {
        success: false,
        message: "Your registered country does not have a supported wallet currency.",
      };
    }

    const option = getWalletCryptoOption(String(assetValue).trim());

    if (!option) {
      return {
        success: false,
        message: "Select a supported cryptocurrency.",
      };
    }

    const now = new Date();

    const existing = await prisma.walletCryptoDeposit.findFirst({
      where: {
        userId: user.id,
        status: "PENDING",
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        reference: true,
        asset: true,
        network: true,
        receivingAddress: true,
        memo: true,
        expiresAt: true,
      },
    });

    if (existing) {
      return {
        success: true,
        message: "You already have an active deposit request.",
        request: {
          ...existing,
          expiresAt: existing.expiresAt.toISOString(),
        },
      };
    }

    const reference = `WCD-${randomUUID()
      .replaceAll("-", "")
      .slice(0, 20)
      .toUpperCase()}`;

    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

    const deposit = await prisma.$transaction(
      async (tx) => {
        const active = await tx.walletCryptoDeposit.findFirst({
          where: {
            userId: user.id,
            status: "PENDING",
            expiresAt: { gt: now },
          },
          select: { id: true },
        });

        if (active) {
          throw new Error("ACTIVE_REQUEST_EXISTS");
        }

        return tx.walletCryptoDeposit.create({
          data: {
            reference,
            userId: user.id,
            asset: option.asset,
            network: option.network,
            receivingAddress: option.address,
            memo: option.memo ?? null,
            transactionHash: null,
            reportedAmount: null,
            expiresAt,
            countryCode: country.code,
            currency: country.currency,
          },
          select: {
            id: true,
            reference: true,
            asset: true,
            network: true,
            receivingAddress: true,
            memo: true,
            expiresAt: true,
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    try {
      await sendAdminEmailAlert({
        subject: "New five-minute wallet Crypto deposit request",
        message: [
          "A customer started a wallet Crypto deposit request.",
          "",
          `Reference: ${deposit.reference}`,
          `Customer: ${user.fullName || "Not provided"}`,
          `Email: ${user.email || "Not provided"}`,
          `Phone: ${user.phone || "Not provided"}`,
          `Asset: ${deposit.asset}`,
          `Network: ${deposit.network}`,
          `Receiving address: ${deposit.receivingAddress}`,
          `Memo: ${deposit.memo || "Not required"}`,
          `Request started: ${now.toISOString()}`,
          `Deposit deadline: ${expiresAt.toISOString()}`,
          `Registered country: ${country.code}`,
          `Wallet currency: ${country.currency}`,
          "",
          "Check the blockchain for an incoming transfer to the receiving address during this request window. Verify the blockchain receipt time and actual amount before approving.",
        ].join("\n"),
      });
    } catch (emailError) {
      console.error("Wallet Crypto admin email alert failed:", emailError);
    }

    return {
      success: true,
      message: "Your five-minute deposit window has started.",
      request: {
        ...deposit,
        expiresAt: deposit.expiresAt.toISOString(),
      },
    };
  } catch (error) {
    if (error instanceof Error && error.message === "ACTIVE_REQUEST_EXISTS") {
      return {
        success: false,
        message: "You already have an active deposit request. Please use that request first.",
      };
    }

    console.error("Wallet Crypto deposit request error:", error);

    return {
      success: false,
      message: "We could not start your deposit request. Please try again.",
    };
  }
}