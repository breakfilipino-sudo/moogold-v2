import {
  ArrowLeft,
  Bitcoin,
  ChevronRight,
  Clock3,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 18,
  }).format(value);
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

    default:
      return "bg-amber-100 text-amber-700";
  }
}

export default async function AdminCryptoDepositsPage() {
  const deposits =
    await prisma.cryptoDeposit.findMany({
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
    });

  const pendingCount =
    deposits.filter(
      (deposit) =>
        deposit.status === "PENDING",
    ).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin
        </Link>

        <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-600">
              Crypto Operations
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900">
              Crypto Deposits
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Review cryptocurrency deposits and manually verify blockchain
              transactions before crediting customer crypto balances.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <Clock3 className="h-5 w-5 text-amber-600" />

            <span className="text-sm font-black text-amber-800">
              {pendingCount} pending review
            </span>
          </div>
        </div>

        <div className="mt-10 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {deposits.length === 0 ? (
            <div className="p-12 text-center">
              <Bitcoin className="mx-auto h-10 w-10 text-slate-300" />

              <h2 className="mt-4 text-lg font-black text-slate-900">
                No crypto deposits
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Crypto deposit requests will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {deposits.map((deposit) => {
                const customer =
                  deposit.user.fullName ||
                  deposit.user.email ||
                  deposit.user.phone ||
                  "Unknown customer";

                return (
                  <Link
                    key={deposit.id}
                    href={`/admin/crypto-deposits/${deposit.id}`}
                    className="block p-6 transition hover:bg-slate-50"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                          <Bitcoin className="h-6 w-6" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-black text-slate-900">
                              {deposit.asset}
                            </p>

                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
                              {deposit.network}
                            </span>

                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-black ${statusClasses(
                                deposit.status,
                              )}`}
                            >
                              {deposit.status}
                            </span>
                          </div>

                          <p className="mt-2 text-sm font-semibold text-slate-700">
                            {customer}
                          </p>

                          <p className="mt-1 break-all font-mono text-xs text-slate-400">
                            {deposit.id}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-8 lg:justify-end">
                        <div className="text-left lg:text-right">
                          <p className="text-xl font-black text-slate-900">
                            {formatAmount(
                              Number(deposit.amount),
                            )}{" "}
                            {deposit.asset}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {formatDate(
                              deposit.createdAt,
                            )}
                          </p>
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
            Customer-submitted amounts are informational only. Administrators
            must verify the actual blockchain transaction and enter the
            verified amount before approval.
          </p>
        </div>
      </div>
    </div>
  );
}