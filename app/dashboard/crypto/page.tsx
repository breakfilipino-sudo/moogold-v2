import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Bitcoin,
  CircleArrowDown,
  CircleArrowUp,
  CircleDollarSign,
  Coins,
  Gem,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

import CryptoDepositForm from "./crypto-deposit-form";

const CRYPTO_OPTIONS = [
  {
    asset: "USDT",
    network: "TRON",
    networkLabel: "Tron (TRC-20)",
    icon: CircleDollarSign,
    priceId: "tether",
  },
  {
    asset: "USDC",
    network: "ETHEREUM",
    networkLabel: "Ethereum (ERC-20)",
    icon: CircleDollarSign,
    priceId: "usd-coin",
  },
  {
    asset: "BTC",
    network: "BITCOIN",
    networkLabel: "Bitcoin",
    icon: Bitcoin,
    priceId: "bitcoin",
  },
  {
    asset: "ETH",
    network: "ETHEREUM",
    networkLabel: "Ethereum (ERC-20)",
    icon: Coins,
    priceId: "ethereum",
  },
  {
    asset: "SOL",
    network: "SOLANA",
    networkLabel: "Solana",
    icon: Gem,
    priceId: "solana",
  },
  {
    asset: "TRN",
    network: "TRON",
    networkLabel: "Tron",
    icon: Coins,
    priceId: null,
  },
  {
    asset: "XLM",
    network: "STELLAR",
    networkLabel: "Stellar",
    icon: Coins,
    priceId: "stellar",
  },
] as const;

type CryptoPriceMap = Record<
  string,
  {
    usd?: number;
  }
>;

function formatBalance(value: string) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return value;
  }

  return number.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8,
  });
}

function formatUsd(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatStatus(status: string) {
  switch (status) {
    case "COMPLETED":
      return "Completed";

    case "PROCESSING":
      return "Processing";

    case "REJECTED":
      return "Rejected";

    case "CANCELLED":
      return "Cancelled";

    default:
      return "Pending";
  }
}

function getStatusClasses(status: string) {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700";

    case "PROCESSING":
      return "bg-blue-50 text-blue-700";

    case "REJECTED":
      return "bg-red-50 text-red-700";

    case "CANCELLED":
      return "bg-slate-100 text-slate-600";

    default:
      return "bg-amber-50 text-amber-700";
  }
}

async function getCryptoPrices(): Promise<CryptoPriceMap> {
  const ids = CRYPTO_OPTIONS
    .map((crypto) => crypto.priceId)
    .filter((id) => id !== null)
    .join(",");

  if (!ids) {
    return {};
  }

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
      {
        next: {
          revalidate: 30,
        },
      },
    );

    if (!response.ok) {
      return {};
    }

    return (await response.json()) as CryptoPriceMap;
  } catch {
    return {};
  }
}

export default async function CryptoDashboardPage() {
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

  const [balances, deposits, withdrawals, prices] = await Promise.all([
    prisma.cryptoBalance.findMany({
      where: {
        userId: user.id,
      },
      select: {
        asset: true,
        network: true,
        balance: true,
      },
    }),

    prisma.cryptoDeposit.findMany({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        asset: true,
        network: true,
        amount: true,
        usdAmount: true,
        status: true,
        transactionHash: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
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
        usdAmount: true,
        status: true,
        destinationAddress: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    }),

    getCryptoPrices(),
  ]);

  const balanceMap = new Map(
    balances.map((balance) => [
      `${balance.asset}:${balance.network}`,
      balance.balance.toString(),
    ]),
  );

  const totalUsd = CRYPTO_OPTIONS.reduce((total, crypto) => {
    const balance = Number(
      balanceMap.get(`${crypto.asset}:${crypto.network}`) ?? "0",
    );

    if (
      !Number.isFinite(balance) ||
      balance <= 0 ||
      crypto.priceId === null
    ) {
      return total;
    }

    const price = prices[crypto.priceId]?.usd ?? 0;

    return total + balance * price;
  }, 0);

  const recentActivity = [
    ...deposits.map((deposit) => ({
      id: `deposit-${deposit.id}`,
      type: "DEPOSIT" as const,
      asset: deposit.asset,
      network: deposit.network,
      amount:
        deposit.amount?.toString() ??
        "No deposit detected",
      usdAmount:
        deposit.usdAmount !== null
          ? Number(deposit.usdAmount)
          : null,
      status: deposit.status,
      createdAt: deposit.createdAt,
      transactionHash: deposit.transactionHash,
      destinationAddress: null,
    })),
    ...withdrawals.map((withdrawal) => ({
      id: `withdrawal-${withdrawal.id}`,
      type: "WITHDRAWAL" as const,
      asset: withdrawal.asset,
      network: withdrawal.network,
      amount: withdrawal.amount.toString(),
      usdAmount:
        withdrawal.usdAmount !== null
          ? Number(withdrawal.usdAmount)
          : null,
      status: withdrawal.status,
      createdAt: withdrawal.createdAt,
      transactionHash: null,
      destinationAddress: withdrawal.destinationAddress,
    })),
  ]
    .sort(
      (a, b) =>
        b.createdAt.getTime() - a.createdAt.getTime(),
    )
    .slice(0, 8);

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Coins className="h-4 w-4" />
          </div>

          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              Crypto
            </h1>

            <p className="text-sm text-slate-500">
              Manage your cryptocurrency assets.
            </p>
          </div>
        </div>
      </div>

      {/* Total balance and actions */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <p className="text-xs font-medium text-slate-500">
              Total crypto value
            </p>

            <p className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
              {formatUsd(totalUsd)}
            </p>

            <p className="mt-0.5 text-xs text-slate-400">
              Current market value
            </p>
          </div>

          <div className="flex w-full gap-2 sm:w-auto">
            <Link
              href="#crypto-deposit"
              className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white transition hover:bg-emerald-700 sm:flex-none"
            >
              <CircleArrowDown className="h-3.5 w-3.5" />
              Deposit
            </Link>

            <Link
              href="/dashboard/crypto/withdrawal"
              className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 sm:flex-none"
            >
              <CircleArrowUp className="h-3.5 w-3.5" />
              Withdraw
            </Link>
          </div>
        </div>
      </section>

      {/* Assets */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <SectionHeader
          title="Your crypto assets"
          description="Balances held in your MooGold crypto wallet."
        />

        <div className="divide-y divide-slate-100">
          {CRYPTO_OPTIONS.map((crypto) => {
            const Icon = crypto.icon;

            const balance =
              balanceMap.get(
                `${crypto.asset}:${crypto.network}`,
              ) ?? "0";

            const numericBalance = Number(balance);

            const marketPrice =
              crypto.priceId !== null
                ? prices[crypto.priceId]?.usd ?? null
                : null;

            const usdValue =
              marketPrice !== null &&
              Number.isFinite(numericBalance)
                ? numericBalance * marketPrice
                : null;

            return (
              <div
                key={`${crypto.asset}:${crypto.network}`}
                className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-slate-50 sm:px-5"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <Icon className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {crypto.asset}
                    </p>

                    <span className="text-xs text-slate-400">
                      {crypto.networkLabel}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    {formatBalance(balance)}{" "}
                    <span className="font-normal text-slate-400">
                      {crypto.asset}
                    </span>
                  </p>

                  {usdValue !== null && (
                    <p className="mt-0.5 text-xs text-slate-400">
                      {formatUsd(usdValue)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Deposit form */}
      <section
        id="crypto-deposit"
        className="rounded-xl border border-slate-200 bg-white"
      >
        <SectionHeader
          title="Deposit"
          description="Choose an asset and network to receive crypto."
        />

        <div className="px-4 py-4 sm:px-5">
          <CryptoDepositForm />
        </div>
      </section>

      {/* Recent activity */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <SectionHeader
          title="Recent crypto activity"
          description="Your latest deposits and withdrawals."
        />

        {recentActivity.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-slate-400">
              No crypto activity yet.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-3 px-4 py-3.5 sm:px-5"
              >
                <div
                  className={[
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    activity.type === "DEPOSIT"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-slate-100 text-slate-600",
                  ].join(" ")}
                >
                  {activity.type === "DEPOSIT" ? (
                    <ArrowDownToLine className="h-4 w-4" />
                  ) : (
                    <ArrowUpFromLine className="h-4 w-4" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {activity.type === "DEPOSIT"
                        ? "Deposit"
                        : "Withdrawal"}
                    </p>

                    <span className="text-xs text-slate-400">
                      {activity.asset}
                    </span>
                  </div>

                  <p className="mt-0.5 truncate text-xs text-slate-400">
                    {activity.network} ·{" "}
                    {formatDate(activity.createdAt)}
                  </p>

                  {activity.destinationAddress && (
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      To {activity.destinationAddress}
                    </p>
                  )}

                  {activity.transactionHash && (
                    <p className="mt-0.5 max-w-60 truncate font-mono text-[10px] text-slate-300">
                      {activity.transactionHash}
                    </p>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    {formatBalance(activity.amount)}{" "}
                    <span className="font-normal text-slate-400">
                      {activity.asset}
                    </span>
                  </p>

                  {activity.usdAmount !== null && (
                    <p className="mt-0.5 text-xs text-slate-400">
                      {formatUsd(activity.usdAmount)}
                    </p>
                  )}

                  <span
                    className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusClasses(
                      activity.status,
                    )}`}
                  >
                    {formatStatus(activity.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
      <h2 className="text-sm font-semibold text-slate-900">
        {title}
      </h2>

      {description && (
        <p className="mt-0.5 text-xs text-slate-400">
          {description}
        </p>
      )}
    </div>
  );
}