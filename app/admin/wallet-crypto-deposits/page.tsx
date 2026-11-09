import Link from "next/link";
import {
  ArrowLeft,
  Bitcoin,
  CheckCircle2,
  Clock3,
  XCircle,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import WalletCryptoReviewControls from "./review-controls";

function formatCrypto(value: string) {
  const number = Number(value);
  if (!Number.isFinite(number)) return value;

  return number.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 18,
  });
}

function formatMoney(value: string | null, currency: string) {
  if (value === null) return "Not available";

  const number = Number(value);
  if (!Number.isFinite(number)) return value;

  return `${currency} ${number.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: Date) {
  return value.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusStyle(status: string, expired: boolean) {
  if (status === "COMPLETED") {
    return {
      label: "Approved",
      className: "bg-emerald-50 text-emerald-700",
      Icon: CheckCircle2,
    };
  }

  if (status === "REJECTED") {
    return {
      label: "Rejected",
      className: "bg-red-50 text-red-700",
      Icon: XCircle,
    };
  }

  if (expired) {
    return {
      label: "Expired - verify receipt time",
      className: "bg-red-50 text-red-700",
      Icon: Clock3,
    };
  }

  return {
    label: "Pending review",
    className: "bg-amber-50 text-amber-700",
    Icon: Clock3,
  };
}

export default async function AdminWalletCryptoDepositsPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return (
      <div className="mx-auto max-w-5xl py-12 text-center">
        <h1 className="text-xl font-semibold text-slate-900">
          Please sign in
        </h1>
      </div>
    );
  }

  const admin = await prisma.user.findUnique({
    where: { authUserId: authUser.id },
    select: { role: true },
  });

  if (admin?.role !== "ADMIN") {
    return (
      <div className="mx-auto max-w-5xl py-12 text-center">
        <h1 className="text-xl font-semibold text-slate-900">
          You are not authorized to view this page.
        </h1>
      </div>
    );
  }

  const deposits = await prisma.walletCryptoDeposit.findMany({
    include: {
      user: {
        select: {
          fullName: true,
          email: true,
          phone: true,
          countryCode: true,
        },
      },
      reviewedBy: {
        select: { fullName: true },
      },
      transaction: {
        select: { reference: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const pendingCount = deposits.filter(
    (deposit) => deposit.status === "PENDING",
  ).length;
  const completedCount = deposits.filter(
    (deposit) => deposit.status === "COMPLETED",
  ).length;
  const rejectedCount = deposits.filter(
    (deposit) => deposit.status === "REJECTED",
  ).length;

  return (
    <main className="mx-auto max-w-6xl space-y-6 pb-10">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Admin dashboard
        </Link>

        <div className="mt-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50">
            <Bitcoin className="h-5 w-5 text-amber-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Wallet Crypto Deposits
            </h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Verify blockchain payments and credit the customer's main cash wallet.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Pending
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-600">
            {pendingCount}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Approved
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">
            {completedCount}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Rejected
          </p>
          <p className="mt-1 text-2xl font-bold text-red-600">
            {rejectedCount}
          </p>
        </div>
      </div>

      <section className="space-y-4">
        {deposits.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center">
            <Bitcoin className="mx-auto h-8 w-8 text-slate-300" />
            <h2 className="mt-3 text-sm font-semibold text-slate-900">
              No wallet crypto requests yet
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Customer submissions from the separate Wallet Crypto funding page will appear here.
            </p>
          </div>
        ) : (
          deposits.map((deposit) => {
            const isExpired =
              deposit.status === "PENDING" &&
              deposit.expiresAt.getTime() <= Date.now();
            const status = statusStyle(deposit.status, isExpired);
            const StatusIcon = status.Icon;

            return (
              <article
                key={deposit.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {deposit.asset} · {deposit.network}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Reference: {deposit.reference}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Started {formatDate(deposit.createdAt)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Deposit deadline {formatDate(deposit.expiresAt)}
                    </p>
                    {deposit.blockchainReceivedAt && (
                      <p className="mt-1 text-xs text-emerald-700">
                        Blockchain receipt {formatDate(deposit.blockchainReceivedAt)}
                      </p>
                    )}
                  </div>

                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${status.className}`}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    {status.label}
                  </span>
                </div>

                <div className="grid gap-5 p-4 sm:grid-cols-2 sm:p-5">
                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Customer
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {deposit.user.fullName || "Customer"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {deposit.user.email || "No email"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {deposit.user.phone || "No phone"} · {deposit.user.countryCode || "No country"}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Customer reported amount
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        Not provided
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Transaction hash
                      </p>
                      <p className="mt-1 break-all rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-700">
                        {deposit.transactionHash || "Not recorded yet"}
                      </p>

                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Receiving address
                      </p>
                      <p className="mt-1 break-all font-mono text-xs text-slate-600">
                        {deposit.receivingAddress}
                      </p>
                      {deposit.memo && (
                        <p className="mt-1 text-xs text-slate-500">
                          Memo: {deposit.memo}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {deposit.status === "COMPLETED" ? (
                      <div className="rounded-xl bg-emerald-50 p-4">
                        <p className="text-xs font-semibold text-emerald-800">
                          Verified amount
                        </p>
                        <p className="mt-1 text-lg font-bold text-emerald-900">
                          {deposit.verifiedAmount?.toString() || "—"} {deposit.asset}
                        </p>
                        <p className="mt-2 text-xs text-emerald-800">
                          Main cash wallet credit: {formatMoney(deposit.usdAmount?.toString() ?? null, "USD")}
                        </p>
                        <p className="text-xs text-emerald-800">
                          Local equivalent: {formatMoney(deposit.localAmount?.toString() ?? null, deposit.currency)}
                        </p>
                        <p className="mt-2 text-[11px] text-emerald-700">
                          Crypto price: {deposit.cryptoPriceSource || "—"} · FX: {deposit.fxSource || "—"}
                        </p>
                        <p className="mt-1 text-[11px] text-emerald-700">
                          Reviewed by {deposit.reviewedBy?.fullName || "Admin"} · {deposit.reviewedAt ? formatDate(deposit.reviewedAt) : ""}
                        </p>
                        {deposit.transaction && (
                          <p className="mt-1 break-all text-[11px] text-emerald-700">
                            Wallet transaction: {deposit.transaction.reference}
                          </p>
                        )}
                      </div>
                    ) : deposit.status === "REJECTED" ? (
                      <div className="rounded-xl bg-red-50 p-4">
                        <p className="text-xs font-semibold text-red-800">
                          Rejection reason
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-red-700">
                          {deposit.rejectionReason || "No reason recorded"}
                        </p>
                        <p className="mt-2 text-[11px] text-red-700">
                          Reviewed by {deposit.reviewedBy?.fullName || "Admin"}
                        </p>
                      </div>
                    ) : (
                      <WalletCryptoReviewControls
                        depositId={deposit.id}
                        status={deposit.status}
                      />
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}
