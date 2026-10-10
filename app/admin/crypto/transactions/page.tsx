import {
  ArrowDownLeft,
  ArrowUpRight,
  Bitcoin,
  ChevronRight,
  Clock3,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

type TransactionType = "DEPOSIT" | "WITHDRAWAL";

type CryptoTransaction = {
  id: string;
  type: TransactionType;
  userId: string;
  customer: string;
  asset: string;
  network: string;
  amount: string | null;
totalAmount: string | null;
  status: string;
  createdAt: Date;
  href: string;
};

function formatAmount(value: string) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 18,
  }).format(Number(value));
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

function statusClasses(status: string) {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-700";

    case "REJECTED":
      return "bg-red-100 text-red-700";

    case "PROCESSING":
      return "bg-blue-100 text-blue-700";

    case "CANCELLED":
      return "bg-slate-200 text-slate-600";

    default:
      return "bg-amber-100 text-amber-700";
  }
}

export default async function AdminCryptoTransactionsPage() {
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
    select: {
      id: true,
      role: true,
    },
  });

  if (!admin || admin.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const [deposits, withdrawals] = await Promise.all([
    prisma.cryptoDeposit.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
      take: 100,
    }),

    prisma.cryptoWithdrawal.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
      take: 100,
    }),
  ]);

  const transactions: CryptoTransaction[] = [
    ...deposits.map((deposit) => ({
      id: deposit.id,
      type: "DEPOSIT" as const,
      userId: deposit.user.id,
      customer:
        deposit.user.fullName ||
        deposit.user.email ||
        deposit.user.phone ||
        "Unknown customer",
      asset: deposit.asset,
      network: deposit.network,
      amount: deposit.amount?.toString() ?? null,
totalAmount: deposit.amount?.toString() ?? null,
      status: deposit.status,
      createdAt: deposit.createdAt,
      href: `/admin/crypto/${deposit.id}`,
    })),

    ...withdrawals.map((withdrawal) => ({
      id: withdrawal.id,
      type: "WITHDRAWAL" as const,
      userId: withdrawal.user.id,
      customer:
        withdrawal.user.fullName ||
        withdrawal.user.email ||
        withdrawal.user.phone ||
        "Unknown customer",
      asset: withdrawal.asset,
      network: withdrawal.network,
      amount: withdrawal.amount.toString(),
      totalAmount: withdrawal.totalAmount.toString(),
      status: withdrawal.status,
      createdAt: withdrawal.createdAt,
      href: `/admin/crypto/withdrawals/${withdrawal.id}`,
    })),
  ].sort(
    (a, b) =>
      b.createdAt.getTime() -
      a.createdAt.getTime(),
  );

  const pendingCount = transactions.filter(
    (transaction) =>
      transaction.status === "PENDING",
  ).length;

  const processingCount = transactions.filter(
    (transaction) =>
      transaction.status === "PROCESSING",
  ).length;

  const completedCount = transactions.filter(
    (transaction) =>
      transaction.status === "COMPLETED",
  ).length;

  const depositCount = transactions.filter(
    (transaction) =>
      transaction.type === "DEPOSIT",
  ).length;

  const withdrawalCount = transactions.filter(
    (transaction) =>
      transaction.type === "WITHDRAWAL",
  ).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
        >
          <span aria-hidden="true">←</span>
          Back to Admin
        </Link>

        <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-600">
              Crypto Operations
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900">
              Crypto Transactions
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Manage customer crypto deposits and
              withdrawals from one place.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <Clock3 className="h-5 w-5 text-amber-600" />

            <span className="text-sm font-black text-amber-800">
              {pendingCount} pending review
            </span>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">
              Total
            </p>

            <p className="mt-2 text-2xl font-black text-slate-900">
              {transactions.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">
              Deposits
            </p>

            <p className="mt-2 text-2xl font-black text-emerald-600">
              {depositCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">
              Withdrawals
            </p>

            <p className="mt-2 text-2xl font-black text-blue-600">
              {withdrawalCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">
              Pending
            </p>

            <p className="mt-2 text-2xl font-black text-amber-600">
              {pendingCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">
              Completed
            </p>

            <p className="mt-2 text-2xl font-black text-emerald-600">
              {completedCount}
            </p>

            {processingCount > 0 && (
              <p className="mt-1 text-xs font-semibold text-blue-500">
                {processingCount} processing
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {transactions.length === 0 ? (
            <div className="p-12 text-center">
              <Bitcoin className="mx-auto h-10 w-10 text-slate-300" />

              <h2 className="mt-4 text-lg font-black text-slate-900">
                No crypto transactions
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Customer crypto deposits and
                withdrawals will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {transactions.map((transaction) => {
                const isDeposit =
                  transaction.type === "DEPOSIT";

                return (
                  <Link
                    key={`${transaction.type}-${transaction.id}`}
                    href={transaction.href}
                    className="block p-6 transition hover:bg-slate-50"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 items-start gap-4">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                            isDeposit
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-blue-100 text-blue-600"
                          }`}
                        >
                          {isDeposit ? (
                            <ArrowDownLeft className="h-6 w-6" />
                          ) : (
                            <ArrowUpRight className="h-6 w-6" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-black text-slate-900">
                              {isDeposit
                                ? "Crypto Deposit"
                                : "Crypto Withdrawal"}
                            </p>

                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                                isDeposit
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {isDeposit
                                ? "DEPOSIT"
                                : "WITHDRAWAL"}
                            </span>

                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
                              {transaction.asset}
                            </span>

                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
                              {transaction.network}
                            </span>

                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-black ${statusClasses(
                                transaction.status,
                              )}`}
                            >
                              {transaction.status}
                            </span>
                          </div>

                          <p className="mt-2 text-sm font-semibold text-slate-700">
                            {transaction.customer}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {formatDate(
                              transaction.createdAt,
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-8 lg:justify-end">
                        <div className="text-left lg:text-right">
                          <p className="text-xl font-black text-slate-900">
  {transaction.amount !== null
    ? `${formatAmount(transaction.amount)} ${transaction.asset}`
    : "Awaiting verification"}
</p>

                          {!isDeposit &&
  transaction.totalAmount !== null &&
  transaction.amount !== null &&
  transaction.totalAmount !==
    transaction.amount && (
                              <p className="mt-1 text-xs font-semibold text-slate-400">
                                Total deducted:{" "}
                                {formatAmount(
                                  transaction.totalAmount,
                                )}{" "}
                                {transaction.asset}
                              </p>
                            )}
                        </div>

                        <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

          <p className="text-sm leading-6 text-emerald-800">
            Deposits must be verified against the
            blockchain before approval. Withdrawal
            approvals are processed through the
            existing secure balance and ledger flow.
          </p>
        </div>
      </div>
    </div>
  );
}