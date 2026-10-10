import {
  Bitcoin,
  ChevronRight,
  CircleDollarSign,
  Coins,
  Gem,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

import CryptoDepositForm from "./crypto-deposit-form";

const CRYPTO_OPTIONS = [
  {
    asset: "USDT",
    network: "TRON",
    networkLabel: "Tron (TRC-20)",
    icon: CircleDollarSign,
  },
  {
    asset: "USDC",
    network: "ETHEREUM",
    networkLabel: "Ethereum (ERC-20)",
    icon: CircleDollarSign,
  },
  {
    asset: "BTC",
    network: "BITCOIN",
    networkLabel: "Bitcoin",
    icon: Bitcoin,
  },
  {
    asset: "ETH",
    network: "ETHEREUM",
    networkLabel: "Ethereum (ERC-20)",
    icon: Coins,
  },
  {
    asset: "SOL",
    network: "SOLANA",
    networkLabel: "Solana",
    icon: Gem,
  },
  {
    asset: "TRN",
    network: "TRON",
    networkLabel: "Tron",
    icon: Coins,
  },
  {
    asset: "XLM",
    network: "STELLAR",
    networkLabel: "Stellar",
    icon: Coins,
  },
] as const;

function formatBalance(value: string) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return number.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8,
  });
}

export default async function CryptoDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return null;
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
    return null;
  }

  const balances = await prisma.cryptoBalance.findMany({
    where: {
      userId: user.id,
    },
    select: {
      asset: true,
      network: true,
      balance: true,
    },
  });

  const balanceMap = new Map(
    balances.map((item) => [
      `${item.asset}:${item.network}`,
      item.balance.toString(),
    ]),
  );

  /*
   * Stablecoins are valued at $1 for the dashboard total.
   * This ensures an approved USDT/USDC balance immediately
   * appears in the total.
   */
  const stablecoinTotal = balances.reduce((total, item) => {
    if (item.asset === "USDT" || item.asset === "USDC") {
      return total + Number(item.balance);
    }

    return total;
  }, 0);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Crypto
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your crypto assets
          </p>
        </div>
      </div>

      {/* Total */}
      <section className="rounded-2xl bg-slate-950 p-5 text-white sm:p-6">
        <p className="text-sm text-slate-400">
          Total crypto balance
        </p>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight sm:text-4xl">
            $
            {stablecoinTotal.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
          <span className="text-sm text-slate-400">
            USD
          </span>
        </div>
      </section>

      {/* Assets */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-900">
            Assets
          </h2>
        </div>

        <div className="divide-y divide-slate-100">
          {CRYPTO_OPTIONS.map((crypto) => {
            const Icon = crypto.icon;

            const balance =
              balanceMap.get(
                `${crypto.asset}:${crypto.network}`,
              ) ?? "0";

            return (
              <div
                key={`${crypto.asset}:${crypto.network}`}
                className="flex items-center gap-3 px-5 py-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100">
                  <Icon className="h-5 w-5 text-slate-700" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">
                    {crypto.asset}
                  </p>

                  <p className="text-xs text-slate-400">
                    {crypto.networkLabel}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-semibold text-slate-900">
                    {formatBalance(balance)}
                  </p>

                  <p className="text-xs text-slate-400">
                    {crypto.asset}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Deposit */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">
              Deposit
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Add crypto to your MooGold balance
            </p>
          </div>

          <ChevronRight className="h-5 w-5 text-slate-400" />
        </div>

        <div className="mt-5">
          <CryptoDepositForm />
        </div>
      </section>
    </div>
  );
}