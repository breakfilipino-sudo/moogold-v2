import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Bitcoin,
  CircleDollarSign,
  Coins,
  Gem,
} from "lucide-react";
import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { getWithdrawalCountryConfig } from "@/lib/withdrawal";

import CryptoActionModals from "@/components/crypto/crypto-action-modals";

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
  const { user } = await getCurrentUser();

  const [balances, deposits, withdrawals, loans, conversions, prices] = await Promise.all([
    prisma.cryptoBalance.findMany({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        asset: true,
        network: true,
        balance: true,
        reservedBalance: true,
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
        fee: true,
        totalAmount: true,
        rejectionReason: true,
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

    prisma.cryptoLoan.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        reference: true,
        principalAmount: true,
        collateralAmount: true,
        principalUsdValue: true,
        repaidAmount: true,
        status: true,
        createdAt: true,
        borrowedCryptoBalance: {
          select: {
            asset: true,
            network: true,
            balance: true,
            reservedBalance: true,
          },
        },
        cryptoBalance: {
          select: {
            asset: true,
            network: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),

    prisma.cryptoCashConversion.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        reference: true,
        asset: true,
        network: true,
        cryptoAmount: true,
        payoutAmount: true,
        payoutCurrency: true,
        bankName: true,
        accountName: true,
        accountNumberLast4: true,
        status: true,
        quoteExpiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
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
        deposit.amount?.toString() ?? "No deposit detected",
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
    <div className="space-y-4 pb-5">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="relative flex flex-col gap-5 bg-gradient-to-br from-[#0B241B] via-[#103D2B] to-[#176344] px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-7">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100/90">
              Total crypto value
            </p>

            <p className="mt-1 text-4xl font-semibold tracking-[-0.045em] text-white sm:text-5xl">
              {formatUsd(totalUsd)}
            </p>

            
          </div>


        </div>
      </section>
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
<CryptoActionModals
            totalCryptoUsd={totalUsd}
            registeredFullName={user.fullName}
            bankOptions={[...(getWithdrawalCountryConfig(user.countryCode)?.banks ?? [])]}
            withdrawalBalances={balances.map((balance) => ({
              id: balance.id,
              asset: balance.asset,
              network: balance.network,
              balance: balance.balance.sub(balance.reservedBalance).toString(),
            }))}
            withdrawalHistory={withdrawals.map((withdrawal) => ({
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
            loans={loans.map((loan) => ({
              id: loan.id,
              reference: loan.reference,
              principalAmount: loan.principalAmount.toString(),
              outstandingAmount: loan.principalAmount.sub(loan.repaidAmount).toString(),
              collateralAmount: loan.collateralAmount.toString(),
              principalUsdValue: loan.principalUsdValue.toString(),
              repaidAmount: loan.repaidAmount.toString(),
              status: loan.status,
              createdAt: loan.createdAt.toISOString(),
              borrowedAsset: loan.borrowedCryptoBalance.asset,
              borrowedNetwork: loan.borrowedCryptoBalance.network,
              borrowedAvailable: loan.borrowedCryptoBalance.balance
                .sub(loan.borrowedCryptoBalance.reservedBalance)
                .toString(),
              collateralAsset: loan.cryptoBalance.asset,
              collateralNetwork: loan.cryptoBalance.network,
            }))}
            conversions={conversions.map((conversion) => ({
              id: conversion.id,
              reference: conversion.reference,
              asset: conversion.asset,
              network: conversion.network,
              cryptoAmount: conversion.cryptoAmount.toString(),
              payoutAmount: conversion.payoutAmount.toString(),
              payoutCurrency: conversion.payoutCurrency,
              bankName: conversion.bankName,
              accountName: conversion.accountName,
              accountNumberLast4: conversion.accountNumberLast4,
              status: conversion.status,
              quoteExpiresAt: conversion.quoteExpiresAt.toISOString(),
              createdAt: conversion.createdAt.toISOString(),
            }))}
          />
</div>
      <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-5">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-3">
        <SectionHeader title="Assets" />

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
                className="group flex items-center gap-3 px-4 py-4 transition-colors hover:bg-slate-50/80 sm:gap-4 sm:px-5"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-100 bg-white shadow-sm">
                  {crypto.asset !== "TRN" ? (
                    <img
                      src={`https://assets.coincap.io/assets/icons/${crypto.asset === "BTC" ? "btc" : crypto.asset === "ETH" ? "eth" : crypto.asset === "SOL" ? "sol" : crypto.asset === "USDT" ? "usdt" : crypto.asset === "USDC" ? "usdc" : "xlm"}@2x.png`}
                      alt={`${crypto.asset} logo`}
                      width={44}
                      height={44}
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-rose-50 text-xs font-bold text-rose-700">
                      TRN
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {crypto.asset}
                    </p>

                    <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
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
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {formatUsd(usdValue)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <details className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-4 text-sm font-semibold text-slate-800 outline-none transition-colors hover:text-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-inset sm:px-5 [&::-webkit-details-marker]:hidden">
          <span>Activity</span>
          <span className="text-xs font-medium text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
        </summary>

        {recentActivity.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm font-medium text-slate-700">
              No crypto activity yet.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                title={[
                  activity.destinationAddress
                    ? `To ${activity.destinationAddress}`
                    : null,
                  activity.transactionHash
                    ? `Transaction: ${activity.transactionHash}`
                    : null,
                ].filter(Boolean).join(" \u00B7 ") || undefined}
                className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-slate-50/80 sm:px-4"
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
                    {activity.network}{" \u00B7 "}
                    {formatDate(activity.createdAt)}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    {formatBalance(activity.amount)}{" "}
                    <span className="font-normal text-slate-400">
                      {activity.asset}
                    </span>
                  </p>

                  {activity.usdAmount !== null && (
                    <p className="mt-1 text-xs font-medium text-slate-500">
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
      </details>
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="border-b border-slate-100 bg-white px-4 py-3.5 sm:px-5">
      <h2 className="text-sm font-semibold tracking-tight text-slate-900">
        {title}
      </h2>
    </div>
  );
}
