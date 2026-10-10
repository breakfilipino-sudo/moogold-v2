import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  User,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import {
  approveDeposit,
  rejectDeposit,
} from "../actions";

type AdminDepositPageProps = {
  params: Promise<{
    reference: string;
  }>;
};

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
    month: "long",
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

export default async function AdminDepositPage({
  params,
}: AdminDepositPageProps) {
  const { reference } = await params;

  const deposit = await prisma.transaction.findFirst({
    where: {
      reference,
      type: "DEPOSIT",
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          phone: true,
          fullName: true,
          createdAt: true,
        },
      },
    },
  });

  if (!deposit) {
    notFound();
  }

  const localAmount = Number(deposit.amount);
  const usdAmount = Number(deposit.usdAmount ?? 0);
  const exchangeRate = Number(deposit.exchangeRate ?? 0);

  const customerName =
    deposit.user.fullName ||
    deposit.user.email ||
    deposit.user.phone ||
    "Unknown customer";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <div>
          <Link
            href="/admin/deposits"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Deposits
          </Link>

          <div className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
                Deposit Review
              </p>

              <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900">
                Deposit Details
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Review the transaction information before taking any
                administrative action.
              </p>
            </div>

            <span
              className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-bold ${getStatusClasses(
                deposit.status,
              )}`}
            >
              {deposit.status}
            </span>
          </div>
        </div>

        {/* Main deposit card */}
        <div className="mt-10 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/70 p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                <FileText className="h-7 w-7" />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Deposit Reference
                </p>

                <p className="mt-1 break-all text-xl font-black text-slate-900">
                  {deposit.reference}
                </p>
              </div>
            </div>
          </div>

          <div className="p-8">
            {/* Amounts */}
            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-6">
                <p className="text-sm font-semibold text-slate-500">
                  Deposit Amount
                </p>

                <p className="mt-2 text-3xl font-black text-slate-900">
                  {formatCurrency(localAmount, deposit.currency)}
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  Original deposit currency
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-50 p-6">
                <p className="text-sm font-semibold text-emerald-700">
                  USD Value
                </p>

                <p className="mt-2 text-3xl font-black text-emerald-700">
                  {formatCurrency(usdAmount, "USD")}
                </p>

                <p className="mt-1 text-sm text-emerald-600">
                  Amount that would be credited to the wallet
                </p>
              </div>
            </div>

            {/* Transaction details */}
            <div className="mt-8">
              <h2 className="text-lg font-black text-slate-900">
                Transaction Information
              </h2>

              <div className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200">
                <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-medium text-slate-500">
                    Exchange Rate
                  </span>

                  <span className="font-bold text-slate-900">
                    1 {deposit.currency} = {exchangeRate.toFixed(6)} USD
                  </span>
                </div>

                <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-medium text-slate-500">
                    Transaction Type
                  </span>

                  <span className="font-bold text-slate-900">
                    {deposit.type}
                  </span>
                </div>

                <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-medium text-slate-500">
                    Status
                  </span>

                  <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${getStatusClasses(
                      deposit.status,
                    )}`}
                  >
                    {deposit.status}
                  </span>
                </div>

                <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-medium text-slate-500">
                    Description
                  </span>

                  <span className="font-semibold text-slate-900">
                    {deposit.description || "No description"}
                  </span>
                </div>

                <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-medium text-slate-500">
                    Created
                  </span>

                  <span className="font-semibold text-slate-900">
                    {formatDate(deposit.createdAt)}
                  </span>
                </div>

                <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-medium text-slate-500">
                    Last Updated
                  </span>

                  <span className="font-semibold text-slate-900">
                    {formatDate(deposit.updatedAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Customer */}
            <div className="mt-8">
              <h2 className="text-lg font-black text-slate-900">
                Customer
              </h2>

              <div className="mt-4 rounded-2xl border border-slate-200 p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                    <User className="h-6 w-6" />
                  </div>

                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">
                      {customerName}
                    </p>

                    {deposit.user.email && (
                      <p className="mt-1 break-all text-sm text-slate-500">
                        {deposit.user.email}
                      </p>
                    )}

                    {deposit.user.phone && (
                      <p className="mt-1 text-sm text-slate-500">
                        {deposit.user.phone}
                      </p>
                    )}

                    <p className="mt-3 text-xs text-slate-400">
                      User ID: {deposit.user.id}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-5 text-sm text-slate-500">
                  <CalendarDays className="h-4 w-4" />
                  Customer account created{" "}
                  {formatDate(deposit.user.createdAt)}
                </div>
              </div>
            </div>

            {/* Review notice */}
            <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

                <div>
                  <h3 className="font-bold text-amber-950">
                    Administrative review
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-amber-800">
                    Review the payment details below. For pending deposits, use the approval or rejection controls after verifying the payment.
                  </p>
                </div>
              </div>
            </div>

            {/* Administrative actions */}
{deposit.status === "PENDING" && (
  <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
    <div className="flex items-start gap-3">
      <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />

      <div>
        <h3 className="font-bold text-slate-900">
          Deposit Action
        </h3>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          Confirm the customer&apos;s payment before approving this deposit.
          Approval will credit the USD value to the customer&apos;s cash balance.
        </p>
      </div>
    </div>

    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
      <form action={approveDeposit} className="flex-1">
        <input
          type="hidden"
          name="reference"
          value={deposit.reference}
        />

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
        >
          <CheckCircle2 className="h-5 w-5" />
          Approve Deposit
        </button>
      </form>

    <form action={rejectDeposit} className="flex-1">
        <input
          type="hidden"
          name="reference"
          value={deposit.reference}
        />

        <input
          type="hidden"
          name="reason"
          value="Payment could not be verified."
        />

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700 transition hover:bg-red-100"
        >
          <XCircle className="h-5 w-5" />
          Reject Deposit
        </button>
      </form>
    </div>

    <p className="mt-4 text-xs leading-5 text-slate-400">
      Approval is permanent for this transaction. The customer&apos;s cash balance will only be credited once.
    </p>
  </div>
)}

{deposit.status !== "PENDING" && (
  <div className="mt-8 flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
    <Clock3 className="h-5 w-5 shrink-0 text-slate-400" />

    <p className="text-sm text-slate-500">
      This deposit has already been processed. No further administrative
      action is available.
    </p>
  </div>
)}
          </div>
        </div>
      </div>
    </div>
  );
}