import {
  ArrowLeft,
  Clock3,
  ExternalLink,
  FileText,
} from "lucide-react";
import Link from "next/link";

import { prisma } from "@/lib/prisma";

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
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

function getStatusClasses(status: string) {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-700";

    case "PROCESSING":
      return "bg-blue-100 text-blue-700";

    case "REJECTED":
      return "bg-red-100 text-red-700";

    case "CANCELLED":
      return "bg-slate-100 text-slate-600";

    default:
      return "bg-amber-100 text-amber-700";
  }
}

export default async function AdminDepositsPage() {
  const deposits = await prisma.transaction.findMany({
    where: {
      type: "DEPOSIT",
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          phone: true,
          fullName: true,
        },
      },
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
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Header */}
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/admin"
              className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Admin Dashboard
            </Link>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                <FileText className="h-6 w-6" />
              </div>

              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
                  MooGold Administration
                </p>

                <h1 className="mt-1 text-4xl font-black tracking-tight text-slate-900">
                  Deposits
                </h1>
              </div>
            </div>

            <p className="mt-3 max-w-2xl text-slate-500">
              Review customer deposit requests and monitor their current
              status.
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                <Clock3 className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold text-amber-700">
                  Pending
                </p>

                <p className="text-3xl font-black text-amber-950">
                  {pendingCount}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                <Clock3 className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold text-blue-700">
                  Processing
                </p>

                <p className="text-3xl font-black text-blue-950">
                  {processingCount}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                <FileText className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold text-emerald-700">
                  Completed
                </p>

                <p className="text-3xl font-black text-emerald-950">
                  {completedCount}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Deposits table */}
        <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Deposit Requests
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {deposits.length} total deposit
                  {deposits.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          </div>

          {deposits.length === 0 ? (
            <div className="px-6 py-16 text-center sm:px-8">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <FileText className="h-7 w-7" />
              </div>

              <h3 className="mt-5 text-lg font-bold text-slate-900">
                No deposits yet
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Customer deposit requests will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Reference
                    </th>

                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Customer
                    </th>

                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Deposit
                    </th>

                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      USD Value
                    </th>

                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Rate
                    </th>

                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Status
                    </th>

                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Date
                    </th>

                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {deposits.map((deposit) => {
                    const customerName =
                      deposit.user.fullName ||
                      deposit.user.email ||
                      deposit.user.phone ||
                      "Unknown customer";

                    const usdAmount = Number(
                      deposit.usdAmount ?? 0,
                    );

                    const exchangeRate = Number(
                      deposit.exchangeRate ?? 0,
                    );

                    return (
                      <tr
                        key={deposit.id}
                        className="transition hover:bg-slate-50/70"
                      >
                        <td className="px-6 py-5">
                          <p className="max-w-[220px] truncate font-bold text-slate-900">
                            {deposit.reference}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {deposit.id}
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          <p className="font-semibold text-slate-900">
                            {customerName}
                          </p>

                          {deposit.user.email && (
                            <p className="mt-1 text-xs text-slate-500">
                              {deposit.user.email}
                            </p>
                          )}
                        </td>

                        <td className="px-6 py-5">
                          <p className="font-bold text-slate-900">
                            {formatCurrency(
                              Number(deposit.amount),
                              deposit.currency,
                            )}
                          </p>

                          <p className="mt-1 text-xs font-semibold text-slate-400">
                            {deposit.currency}
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          <p className="font-bold text-emerald-600">
                            {formatCurrency(usdAmount, "USD")}
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          <p className="text-sm font-semibold text-slate-700">
                            {exchangeRate.toFixed(6)}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {deposit.currency} → USD
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${getStatusClasses(
                              deposit.status,
                            )}`}
                          >
                            {deposit.status}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <p className="whitespace-nowrap text-sm font-semibold text-slate-700">
                            {formatDate(deposit.createdAt)}
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          <Link
                            href={`/admin/deposits/${deposit.reference}`}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                          >
                            View
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Protection notice */}
        <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-6">
          <h3 className="font-bold text-amber-950">
            Admin review required
          </h3>

          <p className="mt-2 text-sm leading-6 text-amber-800">
            Deposits shown here are read-only for now. No wallet balance
            is changed from this page. Approval and rejection controls
            will be added separately after the deposit review flow is
            verified.
          </p>
        </div>
      </div>
    </div>
  );
}