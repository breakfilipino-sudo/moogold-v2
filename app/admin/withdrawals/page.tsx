import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Clock3,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
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

  return admin;
}

function formatAmount(
  amount: { toString(): string },
  currency: string,
) {
  const numericAmount = Number(amount.toString());

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "PROCESSING":
      return "Processing";
    case "COMPLETED":
      return "Completed";
    case "REJECTED":
      return "Rejected";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}

export default async function AdminWithdrawalsPage() {
  await requireAdmin();

  const withdrawals = await prisma.transaction.findMany({
    where: {
      type: "WITHDRAWAL",
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
      withdrawalDetails: {
        select: {
          bankName: true,
          bankAccountName: true,
          bankAccountNumber: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const pendingCount = withdrawals.filter(
    (transaction) => transaction.status === "PENDING",
  ).length;

  const completedCount = withdrawals.filter(
    (transaction) => transaction.status === "COMPLETED",
  ).length;

  const rejectedCount = withdrawals.filter(
    (transaction) => transaction.status === "REJECTED",
  ).length;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Banknote className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-medium text-emerald-700">
                    Wallet Management
                  </p>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                    Withdrawals
                  </h1>
                </div>
              </div>

              <p className="max-w-2xl text-sm text-slate-500">
                Review and manage customer withdrawal requests.
              </p>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Pending
              </p>

              <Clock3 className="h-5 w-5 text-amber-600" />
            </div>

            <p className="text-3xl font-semibold text-slate-950">
              {pendingCount}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Awaiting review
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Completed
              </p>

              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>

            <p className="text-3xl font-semibold text-slate-950">
              {completedCount}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Successfully processed
            </p>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Rejected
              </p>

              <XCircle className="h-5 w-5 text-rose-600" />
            </div>

            <p className="text-3xl font-semibold text-slate-950">
              {rejectedCount}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Declined requests
            </p>
          </div>
        </div>

        {/* Withdrawals */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
            <h2 className="text-base font-semibold text-slate-950">
              Withdrawal Requests
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              All customer withdrawal activity.
            </p>
          </div>

          {withdrawals.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <Banknote className="h-5 w-5 text-slate-500" />
              </div>

              <h3 className="text-sm font-semibold text-slate-950">
                No withdrawals yet
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Customer withdrawal requests will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Customer
                    </th>

                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Amount
                    </th>

                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Bank
                    </th>

                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Date
                    </th>

                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {withdrawals.map((transaction) => {
                    const customerName =
                      transaction.user.fullName ||
                      transaction.user.email ||
                      transaction.user.phone ||
                      "MooGold User";

                    const bankName =
                      transaction.withdrawalDetails?.bankName ||
                      "Bank transfer";

                    return (
                      <tr
                        key={transaction.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-slate-950">
                              {customerName}
                            </p>

                            {transaction.user.email &&
                              transaction.user.fullName && (
                                <p className="mt-0.5 text-xs text-slate-500">
                                  {transaction.user.email}
                                </p>
                              )}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-slate-950">
                            {formatAmount(
                              transaction.amount,
                              transaction.currency,
                            )}
                          </p>

                          {transaction.currency !== "USD" &&
                            transaction.usdAmount && (
                              <p className="mt-0.5 text-xs text-slate-500">
                                ≈{" "}
                                {formatAmount(
                                  transaction.usdAmount,
                                  "USD",
                                )}
                              </p>
                            )}
                        </td>

                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-700">
                            {bankName}
                          </p>

                          {transaction.withdrawalDetails
                            ?.bankAccountNumber && (
                            <p className="mt-0.5 text-xs text-slate-500">
                              ••••{" "}
                              {transaction.withdrawalDetails.bankAccountNumber.slice(
                                -4,
                              )}
                            </p>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={[
                              "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                              transaction.status === "PENDING"
                                ? "bg-amber-100 text-amber-700"
                                : transaction.status ===
                                    "COMPLETED"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : transaction.status ===
                                      "REJECTED"
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-slate-100 text-slate-600",
                            ].join(" ")}
                          >
                            {statusLabel(transaction.status)}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                          {formatDate(transaction.createdAt)}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/admin/withdrawals/${transaction.reference}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
                          >
                            View
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}