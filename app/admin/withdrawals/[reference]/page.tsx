import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Clock3,
  UserRound,
  XCircle,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  approveWithdrawal,
  rejectWithdrawal,
} from "../actions";

type PageProps = {
  params: Promise<{
    reference: string;
  }>;
  searchParams: Promise<{
    success?: string;
  }>;
};

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
  const numericAmount = Number(
    amount.toString(),
  );

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

function getBalanceSource(
  balanceType: string | null,
) {
  switch (balanceType) {
    case "REFERRAL":
      return {
        label: "Referral balance",
        shortLabel: "Referral",
      };

    case "CASH":
      return {
        label: "Cash balance",
        shortLabel: "Cash",
      };

    default:
      return {
        label: "Unknown balance",
        shortLabel: "Unknown",
      };
  }
}

export default async function AdminWithdrawalDetailPage({
  params,
  searchParams,
}: PageProps) {
  await requireAdmin();

  const { reference } = await params;
  const { success } = await searchParams;

  const transaction =
    await prisma.transaction.findUnique({
      where: {
        reference,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            countryCode: true,
            createdAt: true,
          },
        },

        withdrawalDetails: true,

        approvedBy: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    });

  if (
    !transaction ||
    transaction.type !== "WITHDRAWAL"
  ) {
    notFound();
  }

  const customerName =
    transaction.user.fullName ||
    transaction.user.email ||
    transaction.user.phone ||
    "MooGold User";

  const balanceSource = getBalanceSource(
    transaction.balanceType,
  );

  const accountNumber =
    transaction.withdrawalDetails
      ?.bankAccountNumber || "";

  const maskedAccountNumber = accountNumber
    ? `•••• ${accountNumber.slice(-4)}`
    : "Not provided";

  const routingNumber =
    transaction.withdrawalDetails
      ?.routingNumber || "";

  const maskedRoutingNumber = routingNumber
    ? `••••${routingNumber.slice(-5)}`
    : "Not provided";

  const isPending =
    transaction.status === "PENDING";

  const isUSWithdrawal =
    transaction.user.countryCode === "US";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Back */}
        <Link
          href="/admin/withdrawals"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Withdrawals
        </Link>

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Banknote className="h-5 w-5" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-emerald-700">
                    Withdrawal Review
                  </p>

                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                    {balanceSource.shortLabel}
                  </span>
                </div>

                <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                  {formatAmount(
                    transaction.amount,
                    transaction.currency,
                  )}
                </h1>
              </div>
            </div>

            <p className="text-sm text-slate-500">
              Reference:{" "}
              <span className="font-medium text-slate-700">
                {transaction.reference}
              </span>
            </p>
          </div>

          <span
            className={[
              "inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium",
              transaction.status === "PENDING"
                ? "bg-amber-100 text-amber-700"
                : transaction.status === "COMPLETED"
                  ? "bg-emerald-100 text-emerald-700"
                  : transaction.status === "REJECTED"
                    ? "bg-rose-100 text-rose-700"
                    : "bg-slate-100 text-slate-600",
            ].join(" ")}
          >
            {transaction.status === "PENDING" && (
              <Clock3 className="h-4 w-4" />
            )}

            {transaction.status === "COMPLETED" && (
              <CheckCircle2 className="h-4 w-4" />
            )}

            {transaction.status === "REJECTED" && (
              <XCircle className="h-4 w-4" />
            )}

            {statusLabel(transaction.status)}
          </span>
        </div>

        {/* Success message */}
        {success === "approved" && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">
                Withdrawal approved
              </p>

              <p className="mt-1 text-emerald-700">
                The withdrawal has been marked as completed.
              </p>
            </div>
          </div>
        )}

        {success === "rejected" && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">
                Withdrawal rejected
              </p>

              <p className="mt-1 text-amber-700">
                The withdrawal was rejected and the amount was
                returned to the customer&apos;s{" "}
                {balanceSource.label.toLowerCase()}.
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Main details */}
          <div className="space-y-6">
            {/* Withdrawal details */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
                <h2 className="text-base font-semibold text-slate-950">
                  Withdrawal Details
                </h2>
              </div>

              <div className="grid gap-x-8 gap-y-6 px-5 py-6 sm:grid-cols-2 sm:px-6">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Amount
                  </p>

                  <p className="mt-1 text-lg font-semibold text-slate-950">
                    {formatAmount(
                      transaction.amount,
                      transaction.currency,
                    )}
                  </p>

                  {transaction.currency !== "USD" &&
                    transaction.usdAmount && (
                      <p className="mt-1 text-xs text-slate-500">
                        ≈{" "}
                        {formatAmount(
                          transaction.usdAmount,
                          "USD",
                        )}
                      </p>
                    )}
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Balance source
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {balanceSource.label}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Method
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-900">
                    Bank transfer
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Bank
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {transaction.withdrawalDetails
                      ?.bankName || "Not provided"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Account name
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {transaction.withdrawalDetails
                      ?.bankAccountName ||
                      "Not provided"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Account number
                  </p>

                  <p className="mt-1 text-sm font-medium tracking-wide text-slate-900">
                    {maskedAccountNumber}
                  </p>
                </div>

                {isUSWithdrawal && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Routing number
                    </p>

                    <p className="mt-1 text-sm font-medium tracking-wide text-slate-900">
                      {maskedRoutingNumber}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Requested
                  </p>

                  <p className="mt-1 text-sm text-slate-700">
                    {formatDate(
                      transaction.createdAt,
                    )}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Reference
                  </p>

                  <p className="mt-1 break-all font-mono text-sm text-slate-700">
                    {transaction.reference}
                  </p>
                </div>
              </div>
            </section>

            {/* Customer */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
                <div className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-slate-500" />

                  <h2 className="text-base font-semibold text-slate-950">
                    Customer
                  </h2>
                </div>
              </div>

              <div className="grid gap-x-8 gap-y-6 px-5 py-6 sm:grid-cols-2 sm:px-6">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Name
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {customerName}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Country
                  </p>

                  <p className="mt-1 text-sm text-slate-700">
                    {transaction.user.countryCode ||
                      "Not provided"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Email
                  </p>

                  <p className="mt-1 break-all text-sm text-slate-700">
                    {transaction.user.email ||
                      "Not provided"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Phone
                  </p>

                  <p className="mt-1 text-sm text-slate-700">
                    {transaction.user.phone ||
                      "Not provided"}
                  </p>
                </div>
              </div>
            </section>

            {/* Rejection reason */}
            {transaction.status === "REJECTED" &&
              transaction.rejectionReason && (
                <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5 sm:p-6">
                  <div className="flex items-start gap-3">
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />

                    <div>
                      <h2 className="text-sm font-semibold text-rose-900">
                        Rejection reason
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-rose-800">
                        {transaction.rejectionReason}
                      </p>
                    </div>
                  </div>
                </section>
              )}
          </div>

          {/* Review panel */}
          <aside className="h-fit space-y-6 lg:sticky lg:top-6">
            {isPending ? (
              <>
                {/* Balance notice */}
                <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <div className="flex items-start gap-3">
                    <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

                    <div>
                      <h2 className="text-sm font-semibold text-amber-900">
                        Withdrawal awaiting review
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-amber-800">
                        The withdrawal amount has already been
                        deducted from the customer&apos;s{" "}
                        {balanceSource.label.toLowerCase()}.
                      </p>

                      <p className="mt-2 text-sm leading-6 text-amber-800">
                        Approving this request will not deduct
                        the amount again.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Approve */}
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-base font-semibold text-slate-950">
                    Approve Withdrawal
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Confirm that the withdrawal can be processed
                    to the customer&apos;s bank account.
                  </p>

                  <form
                    action={approveWithdrawal}
                    className="mt-5"
                  >
                    <input
                      type="hidden"
                      name="reference"
                      value={transaction.reference}
                    />

                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve Withdrawal
                    </button>
                  </form>
                </section>

                {/* Reject */}
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-base font-semibold text-slate-950">
                    Reject Withdrawal
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    The withdrawal amount will be returned to the
                    customer&apos;s{" "}
                    {balanceSource.label.toLowerCase()}.
                  </p>

                  <form
                    action={rejectWithdrawal}
                    className="mt-5 space-y-4"
                  >
                    <input
                      type="hidden"
                      name="reference"
                      value={transaction.reference}
                    />

                    <div>
                      <label
                        htmlFor="rejectionReason"
                        className="mb-2 block text-sm font-medium text-slate-700"
                      >
                        Reason
                      </label>

                      <textarea
                        id="rejectionReason"
                        name="rejectionReason"
                        required
                        maxLength={500}
                        rows={4}
                        placeholder="Enter the reason for rejecting this withdrawal..."
                        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                      />
                    </div>

                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject Withdrawal
                    </button>
                  </form>
                </section>
              </>
            ) : (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  {transaction.status === "COMPLETED" ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  ) : (
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                  )}

                  <div>
                    <h2 className="text-sm font-semibold text-slate-950">
                      Withdrawal{" "}
                      {statusLabel(
                        transaction.status,
                      )}
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      This withdrawal has already been processed.
                      No further action is available.
                    </p>

                    {transaction.approvedBy && (
                      <p className="mt-3 text-xs text-slate-400">
                        Reviewed by{" "}
                        {transaction.approvedBy.fullName ||
                          transaction.approvedBy.email ||
                          "Admin"}
                      </p>
                    )}
                  </div>
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}