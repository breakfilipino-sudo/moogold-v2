import {
  ArrowLeft,
  ArrowDownCircle,
  ArrowUpCircle,
  Coins,
  Gift,
  WalletCards,
  CalendarDays,
  User,
  Mail,
  Phone,
  FileText,
  Hash,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

type AdminTransactionPageProps = {
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

function formatType(type: string) {
  return type
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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

export default async function AdminTransactionDetailPage({
  params,
}: AdminTransactionPageProps) {
  const { reference } = await params;

  const transaction = await prisma.transaction.findUnique({
    where: {
      reference,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          phone: true,
          fullName: true,
          createdAt: true,
          wallet: {
            select: {
              cashBalance: true,
              portfolioValue: true,
            },
          },
        },
      },
    },
  });

  if (!transaction) {
    notFound();
  }

  const customerName =
    transaction.user.fullName ||
    transaction.user.email ||
    transaction.user.phone ||
    "Unknown customer";

  const amount = Number(transaction.amount);
  const usdAmount =
    transaction.usdAmount !== null
      ? Number(transaction.usdAmount)
      : null;

  const exchangeRate =
    transaction.exchangeRate !== null
      ? Number(transaction.exchangeRate)
      : null;

  const cashBalance = Number(
    transaction.user.wallet?.cashBalance ?? 0,
  );

  const portfolioValue = Number(
    transaction.user.wallet?.portfolioValue ?? 0,
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <div>
          <Link
            href="/admin/transactions"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Transactions
          </Link>

          <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
  {transaction.type === "DEPOSIT" && (
    <ArrowDownCircle className="h-8 w-8" />
  )}

  {transaction.type === "WITHDRAWAL" && (
    <ArrowUpCircle className="h-8 w-8" />
  )}

  {transaction.type === "REFERRAL_REWARD" && (
    <Gift className="h-8 w-8" />
  )}

  {(transaction.type === "GOLD_PURCHASE" ||
    transaction.type === "GOLD_SALE") && (
    <Coins className="h-8 w-8" />
  )}

  {transaction.type === "BALANCE_ADJUSTMENT" && (
    <WalletCards className="h-8 w-8" />
  )}
</div>

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                    {formatType(transaction.type)}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClasses(
                      transaction.status,
                    )}`}
                  >
                    {transaction.status}
                  </span>
                </div>

                <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">
                  Transaction Details
                </h1>

                <p className="mt-2 break-all font-mono text-sm text-slate-500">
                  {transaction.reference}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Transaction amount
              </p>

              <p className="mt-1 text-2xl font-black text-slate-900">
                {formatCurrency(amount, transaction.currency)}
              </p>

              {usdAmount !== null && (
                <p className="mt-1 text-sm font-semibold text-emerald-600">
                  USD value:{" "}
                  {formatCurrency(usdAmount, "USD")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* Left column */}
          <div className="space-y-8 lg:col-span-2">
            {/* Transaction information */}
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                  <FileText className="h-5 w-5 text-slate-700" />
                </div>

                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    Transaction Information
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Complete financial transaction record.
                  </p>
                </div>
              </div>

              <div className="mt-8 grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Transaction type
                  </p>

                  <p className="mt-2 font-bold text-slate-900">
                    {formatType(transaction.type)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Status
                  </p>

                  <span
                    className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusClasses(
                      transaction.status,
                    )}`}
                  >
                    {transaction.status}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Original amount
                  </p>

                  <p className="mt-2 font-bold text-slate-900">
                    {formatCurrency(
                      amount,
                      transaction.currency,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Currency
                  </p>

                  <p className="mt-2 font-bold text-slate-900">
                    {transaction.currency}
                  </p>
                </div>

                {usdAmount !== null && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      USD value
                    </p>

                    <p className="mt-2 font-bold text-emerald-600">
                      {formatCurrency(usdAmount, "USD")}
                    </p>
                  </div>
                )}

                {exchangeRate !== null && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Exchange rate
                    </p>

                    <p className="mt-2 font-bold text-slate-900">
                      {exchangeRate}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Created
                  </p>

                  <p className="mt-2 text-sm font-bold text-slate-900">
                    {formatDate(transaction.createdAt)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Last updated
                  </p>

                  <p className="mt-2 text-sm font-bold text-slate-900">
                    {formatDate(transaction.updatedAt)}
                  </p>
                </div>
              </div>

              {transaction.description && (
                <div className="mt-8 rounded-2xl bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Description
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {transaction.description}
                  </p>
                </div>
              )}
            </div>

            {/* Customer */}
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                  <User className="h-5 w-5 text-slate-700" />
                </div>

                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    Customer
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Account associated with this transaction.
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <p className="text-2xl font-black text-slate-900">
                  {customerName}
                </p>

                <div className="mt-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-slate-400" />

                    <span className="text-sm text-slate-700">
                      {transaction.user.email || "No email"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-slate-400" />

                    <span className="text-sm text-slate-700">
                      {transaction.user.phone || "No phone number"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-5 w-5 text-slate-400" />

                    <span className="text-sm text-slate-700">
                      Account created{" "}
                      {formatDate(transaction.user.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <Hash className="h-5 w-5 text-slate-400" />

                    <span className="break-all font-mono text-xs text-slate-500">
                      User ID: {transaction.user.id}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Read-only notice */}
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

                <div>
                  <h3 className="font-bold text-amber-950">
                    Administrative record
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-amber-800">
                    This transaction detail page is currently
                    read-only. No balance or transaction data can
                    be changed from this page.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-8">
            {/* Wallet snapshot */}
            <div className="rounded-3xl bg-slate-950 p-7 text-white shadow-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
                  <WalletCards className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-300">
                    Current wallet
                  </p>

                  <h2 className="mt-1 text-xl font-black">
                    Balance Snapshot
                  </h2>
                </div>
              </div>

              <div className="mt-8">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Cash balance
                </p>

                <p className="mt-2 text-3xl font-black">
                  {formatCurrency(cashBalance, "USD")}
                </p>
              </div>

              <div className="mt-6 border-t border-white/10 pt-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Portfolio value
                </p>

                <p className="mt-2 text-xl font-bold">
                  {formatCurrency(portfolioValue, "USD")}
                </p>
              </div>

              <p className="mt-6 text-xs leading-5 text-slate-400">
                This is the customer&apos;s current wallet
                snapshot, not a historical balance at the time
                of this transaction.
              </p>
            </div>

            {/* Reference */}
            <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Transaction reference
              </p>

              <p className="mt-3 break-all rounded-2xl bg-slate-50 p-4 font-mono text-sm font-bold text-slate-700">
                {transaction.reference}
              </p>
            </div>

            {/* Navigation */}
            <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
              <h3 className="font-black text-slate-900">
                Administrative Navigation
              </h3>

              <div className="mt-5 space-y-3">
                <Link
                  href="/admin/transactions"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-4 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Transactions
                </Link>

                {transaction.type === "DEPOSIT" && (
                  <Link
                    href={`/admin/deposits/${transaction.reference}`}
                    className="flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Open Deposit Review
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}