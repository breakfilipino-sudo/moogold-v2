import { ArrowDownLeft, CheckCircle2, Clock3, Loader2, XCircle } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

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

    case "PENDING":
    default:
      return {
        label: "Pending",
        className: "bg-amber-50 text-amber-700",
        icon: Clock3,
      };
  }
}

export default async function AdminCryptoPage() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return (
      <div className="mx-auto max-w-5xl py-10 text-center">
        <h1 className="text-xl font-semibold text-slate-900">
          Please sign in
        </h1>
      </div>
    );
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
    return (
      <div className="mx-auto max-w-5xl py-10 text-center">
        <h1 className="text-xl font-semibold text-slate-900">
          Account unavailable
        </h1>
      </div>
    );
  }

  const deposits = await prisma.cryptoDeposit.findMany({
    select: {
      id: true,
      asset: true,
      network: true,
      amount: true,
      usdAmount: true,
      status: true,
      createdAt: true,
      user: {
        select: {
          fullName: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const pendingCount = deposits.filter(
    (deposit) => deposit.status === "PENDING",
  ).length;

  const processingCount = deposits.filter(
    (deposit) => deposit.status === "PROCESSING",
  ).length;

  const completedCount = deposits.filter(
    (deposit) => deposit.status === "COMPLETED",
  ).length;

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-8 sm:space-y-6">
      {/* ================================================== */}
      {/* HEADER */}
      {/* ================================================== */}

      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Crypto
        </h1>

        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
          Review and manage customer crypto deposits.
        </p>
      </div>

      {/* ================================================== */}
      {/* DEPOSIT STATUS SUMMARY */}
      {/* ================================================== */}

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
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
      </div>

      {/* ================================================== */}
      {/* TRANSACTION HISTORY */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 sm:text-base">
              Crypto Transactions
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Customer crypto deposits and their current status.
            </p>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100">
            <ArrowDownLeft className="h-4 w-4 text-slate-600" />
          </div>
        </div>

        {deposits.length === 0 ? (
          <div className="px-4 py-10 text-center sm:px-5">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <ArrowDownLeft className="h-5 w-5 text-slate-400" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-slate-900">
              No crypto transactions yet
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Customer crypto deposits will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500">Customer</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500">Asset</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500">Amount</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500">Date</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deposits.map((deposit) => {
                  const status = getStatusStyle(deposit.status);
                  const amount = deposit.amount?.toString() ?? null;
                  const usdAmount =
                    deposit.usdAmount !== null
                      ? Number(deposit.usdAmount.toString())
                      : null;

                  const amountLabel =
                    amount !== null
                      ? `+${formatBalance(amount)} ${deposit.asset}`
                      : "Amount unavailable";

                  const statusLabel =
                    (deposit.status === "PENDING" ||
                      deposit.status === "PROCESSING") &&
                    amount === null
                      ? "Awaiting verification"
                      : status.label;

                  return (
                    <tr key={deposit.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <p className="max-w-48 truncate text-sm font-medium text-slate-900">
                          {deposit.user.fullName || "Customer"}
                        </p>
                        <p className="mt-1 max-w-48 truncate text-xs text-slate-500">
                          {deposit.user.email || "No email"}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-slate-900">{deposit.asset}</p>
                        <p className="mt-1 text-xs text-slate-500">{deposit.network}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="whitespace-nowrap text-sm font-semibold text-slate-900">
                          {amountLabel}
                        </p>
                        {usdAmount !== null && (
                          <p className="mt-1 text-xs text-slate-500">
                            Approx. {formatUsd(usdAmount)}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">
                        {formatDate(deposit.createdAt)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <a
                          href={`/admin/crypto/${deposit.id}`}
                          className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800"
                        >
                          View
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>    </div>
  );
}