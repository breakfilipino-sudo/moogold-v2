import {
  ArrowDownRight,
  Bitcoin,
  CheckCircle2,
  Clock3,
  Coins,
  ExternalLink,
  Loader2,
  XCircle,
} from "lucide-react";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

const CRYPTO_NETWORK_LABELS: Record<string, string> = {
  ETHEREUM: "Ethereum (ERC-20)",
  TRON: "Tron (TRC-20)",
  BITCOIN: "Bitcoin",
  SOLANA: "Solana",
  STELLAR: "Stellar",
};

function formatNetwork(network: string) {
  return CRYPTO_NETWORK_LABELS[network] ?? network;
}

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

function formatUsd(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: Date) {
  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getStatusStyle(status: string) {
  switch (status) {
    case "COMPLETED":
      return {
        label: "Completed",
        className: "bg-emerald-50 text-emerald-700",
        icon: CheckCircle2,
      };

    case "REJECTED":
      return {
        label: "Rejected",
        className: "bg-red-50 text-red-700",
        icon: XCircle,
      };

    case "CANCELLED":
      return {
        label: "Cancelled",
        className: "bg-slate-100 text-slate-600",
        icon: XCircle,
      };

    case "PROCESSING":
      return {
        label: "Processing",
        className: "bg-blue-50 text-blue-700",
        icon: Loader2,
      };

    default:
      return {
        label: "Pending",
        className: "bg-amber-50 text-amber-700",
        icon: Clock3,
      };
  }
}

async function getAdminUser() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return null;
  }

  return prisma.user.findUnique({
    where: {
      authUserId: authUser.id,
    },
    select: {
      id: true,
      role: true,
    },
  });
}

export default async function AdminCryptoWithdrawalsPage() {
  const admin = await getAdminUser();

  if (!admin || admin.role !== "ADMIN") {
    return (
      <div className="mx-auto max-w-5xl py-10 text-center">
        <h1 className="text-xl font-semibold text-slate-900">
          Access denied
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          You are not authorized to view crypto withdrawals.
        </p>
      </div>
    );
  }

  const withdrawals =
    await prisma.cryptoWithdrawal.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            fullName: true,
          },
        },
        cryptoBalance: {
          select: {
            balance: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

  const pendingCount = withdrawals.filter(
    (withdrawal) => withdrawal.status === "PENDING",
  ).length;

  const processingCount = withdrawals.filter(
    (withdrawal) => withdrawal.status === "PROCESSING",
  ).length;

  const completedCount = withdrawals.filter(
    (withdrawal) => withdrawal.status === "COMPLETED",
  ).length;

  const rejectedCount = withdrawals.filter(
    (withdrawal) => withdrawal.status === "REJECTED",
  ).length;

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-8 sm:space-y-6">
      <div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Crypto Withdrawals
            </h1>

            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Review and manage cryptocurrency withdrawal
              requests.
            </p>
          </div>

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
            <ArrowDownRight className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3 sm:rounded-2xl sm:p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs">
            Pending
          </p>

          <p className="mt-1 text-lg font-bold text-amber-600 sm:text-2xl">
            {pendingCount}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 sm:rounded-2xl sm:p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs">
            Processing
          </p>

          <p className="mt-1 text-lg font-bold text-blue-600 sm:text-2xl">
            {processingCount}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 sm:rounded-2xl sm:p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs">
            Completed
          </p>

          <p className="mt-1 text-lg font-bold text-emerald-600 sm:text-2xl">
            {completedCount}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 sm:rounded-2xl sm:p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs">
            Rejected
          </p>

          <p className="mt-1 text-lg font-bold text-red-600 sm:text-2xl">
            {rejectedCount}
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3 sm:px-5 sm:py-4">
          <h2 className="text-sm font-semibold text-slate-900 sm:text-base">
            Withdrawal Requests
          </h2>

          <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">
            Most recent cryptocurrency withdrawal requests.
          </p>
        </div>

        {withdrawals.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <ArrowDownRight className="h-5 w-5 text-slate-400" />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-slate-900">
              No withdrawals yet
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Crypto withdrawal requests will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {withdrawals.map((withdrawal) => {
              const status = getStatusStyle(
                withdrawal.status,
              );

              const StatusIcon = status.icon;

              const customer =
                withdrawal.user.fullName ||
                withdrawal.user.email ||
                withdrawal.user.phone ||
                "Unknown customer";

              const usdAmount =
                withdrawal.usdAmount !== null
                  ? Number(
                      withdrawal.usdAmount.toString(),
                    )
                  : null;

              const amount =
                withdrawal.amount.toString();

              const fee =
                withdrawal.fee.toString();

              const total =
                withdrawal.totalAmount.toString();

              return (
                <Link
                  key={withdrawal.id}
                  href={`/admin/crypto/withdrawals/${withdrawal.id}`}
                  className="block px-3 py-4 transition hover:bg-slate-50 sm:px-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100">
                        {withdrawal.asset === "BTC" ? (
                          <Bitcoin className="h-4 w-4 text-slate-700" />
                        ) : (
                          <Coins className="h-4 w-4 text-slate-700" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {customer}
                        </p>

                        <p className="mt-0.5 text-[10px] text-slate-400 sm:text-xs">
                          {withdrawal.asset} ·{" "}
                          {formatNetwork(
                            withdrawal.network,
                          )}
                        </p>

                        <p className="mt-0.5 text-[10px] text-slate-400 sm:text-xs">
                          {formatDate(
                            withdrawal.createdAt,
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-xs font-bold text-slate-900 sm:text-sm">
                        -{formatBalance(total)}{" "}
                        {withdrawal.asset}
                      </p>

                      {usdAmount !== null && (
                        <p className="mt-0.5 text-[10px] text-slate-400 sm:text-xs">
                          {formatUsd(usdAmount)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold sm:px-2.5 sm:text-[10px] ${status.className}`}
                    >
                      <StatusIcon
                        className={`h-2.5 w-2.5 ${
                          withdrawal.status ===
                          "PROCESSING"
                            ? "animate-spin"
                            : ""
                        }`}
                      />

                      {status.label}
                    </span>

                    <span className="text-[10px] text-slate-400 sm:text-xs">
                      Amount: {formatBalance(amount)}{" "}
                      {withdrawal.asset}
                      {" · "}
                      Fee: {formatBalance(fee)}{" "}
                      {withdrawal.asset}
                    </span>
                  </div>

                  <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                      Destination
                    </p>

                    <p className="mt-0.5 break-all font-mono text-[9px] leading-4 text-slate-500">
                      {withdrawal.destinationAddress}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <div className="flex justify-end">
        <Link
          href="/admin/crypto"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Crypto deposits
        </Link>
      </div>
    </div>
  );
}