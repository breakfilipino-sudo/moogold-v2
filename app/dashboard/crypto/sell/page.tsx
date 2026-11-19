import { ArrowLeft, ArrowUpFromLine } from "lucide-react";
import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import CryptoTradeForm from "@/components/crypto/crypto-trade-form";

export default async function CryptoSellPage() {
  const { user } = await getCurrentUser();

  const [wallet, balances] = await Promise.all([
    prisma.wallet.findUnique({
      where: { userId: user.id },
      select: {
        cashBalance: true,
        currency: true,
      },
    }),

    prisma.cryptoBalance.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        asset: true,
        network: true,
        balance: true,
        reservedBalance: true,
      },
      orderBy: {
        asset: "asc",
      },
    }),
  ]);

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <ArrowUpFromLine className="h-4 w-4" />
          </div>

          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              Sell Crypto
            </h1>
            <p className="text-xs text-slate-500">
              Sell available cryptocurrency into your cash wallet.
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/crypto"
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Crypto
        </Link>
      </div>

      <CryptoTradeForm
        direction="SELL"
        walletCashBalance={wallet?.cashBalance.toString() ?? "0"}
        walletCurrency={wallet?.currency ?? "USD"}
        cryptoBalances={balances.map((balance) => ({
          id: balance.id,
          asset: balance.asset,
          network: balance.network,
          balance: balance.balance.sub(balance.reservedBalance).toString(),
        }))}
      />
    </div>
  );
}
