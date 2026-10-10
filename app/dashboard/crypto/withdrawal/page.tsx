import { ArrowLeft, Coins } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

import CryptoWithdrawalForm from "./crypto-withdrawal-form";

const CRYPTO_PRICE_IDS: Record<string, string | null> = {
  USDT: "tether",
  USDC: "usd-coin",
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  TRN: null,
  XLM: "stellar",
};

async function getCryptoPrices() {
  const ids = Object.values(CRYPTO_PRICE_IDS).filter(
    (id): id is string => Boolean(id),
  );

  if (ids.length === 0) {
    return {};
  }

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(
        ",",
      )}&vs_currencies=usd`,
      {
        next: {
          revalidate: 30,
        },
      },
    );

    if (!response.ok) {
      return {};
    }

    return (await response.json()) as Record<
      string,
      {
        usd?: number;
      }
    >;
  } catch {
    return {};
  }
}

export default async function CryptoWithdrawalPage() {
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
    select: {
      id: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  const [balances, withdrawalHistory, prices] = await Promise.all([
    prisma.cryptoBalance.findMany({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        asset: true,
        network: true,
        balance: true,
      },
      orderBy: {
        asset: "asc",
      },
    }),

    prisma.cryptoWithdrawal.findMany({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        asset: true,
        network: true,
        amount: true,
        fee: true,
        totalAmount: true,
        destinationAddress: true,
        status: true,
        rejectionReason: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    }),

    getCryptoPrices(),
  ]);

  const totalCryptoUsd = balances.reduce((total, balance) => {
    const priceId = CRYPTO_PRICE_IDS[balance.asset];
    const price = priceId ? prices[priceId]?.usd ?? 0 : 0;

    return total + Number(balance.balance) * price;
  }, 0);

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Coins className="h-4 w-4" />
          </div>

          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              Withdraw Crypto
            </h1>

            <p className="text-xs text-slate-500">
              Send cryptocurrency to an external wallet.
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/crypto"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Crypto
        </Link>
      </div>

      <CryptoWithdrawalForm
        totalCryptoUsd={totalCryptoUsd}
        balances={balances.map((balance) => ({
          id: balance.id,
          asset: balance.asset,
          network: balance.network,
          balance: balance.balance.toString(),
        }))}
        withdrawalHistory={withdrawalHistory.map((withdrawal) => ({
          id: withdrawal.id,
          asset: withdrawal.asset,
          network: withdrawal.network,
          amount: withdrawal.amount.toString(),
          fee: withdrawal.fee.toString(),
          totalAmount: withdrawal.totalAmount.toString(),
          destinationAddress: withdrawal.destinationAddress,
          status: withdrawal.status,
          rejectionReason: withdrawal.rejectionReason,
          createdAt: withdrawal.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}