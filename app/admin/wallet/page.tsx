import {
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

type SearchParams = {
  search?: string;
  balanceType?: string;
  direction?: string;
};

type AdminWalletPageProps = {
  searchParams: Promise<SearchParams>;
};

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
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

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function AdminWalletPage({
  searchParams,
}: AdminWalletPageProps) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const admin = await prisma.user.findUnique({
    where: { authUserId: authUser.id },
    select: { role: true },
  });

  if (!admin || admin.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const search = params.search?.trim() || "";

  const selectedBalanceType = ["CASH", "REFERRAL", "PORTFOLIO"].includes(
    params.balanceType || "",
  )
    ? params.balanceType
    : "";

  const selectedDirection = ["CREDIT", "DEBIT"].includes(
    params.direction || "",
  )
    ? params.direction
    : "";

  const searchFilter = search
    ? {
        OR: [
          {
            user: {
              fullName: { contains: search, mode: "insensitive" as const },
            },
          },
          {
            user: {
              email: { contains: search, mode: "insensitive" as const },
            },
          },
          {
            user: {
              phone: { contains: search, mode: "insensitive" as const },
            },
          },
        ],
      }
    : {};

  const ledgerFilter = {
    ...(selectedBalanceType
      ? {
          balanceType: selectedBalanceType as
            | "CASH"
            | "REFERRAL"
            | "PORTFOLIO",
        }
      : {}),
    ...(selectedDirection
      ? {
          direction: selectedDirection as "CREDIT" | "DEBIT",
        }
      : {}),
    ...(search
      ? {
          wallet: {
            user: {
              OR: [
                {
                  fullName: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
                {
                  email: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
                {
                  phone: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              ],
            },
          },
        }
      : {}),
  };

  const [walletTotals, walletCount, wallets, ledgerEntries, ledgerCount] =
    await Promise.all([
      prisma.wallet.groupBy({
        by: ["currency"],
        _sum: {
          cashBalance: true,
          referralBalance: true,
          portfolioValue: true,
        },
        orderBy: {
          currency: "asc",
        },
      }),

      prisma.wallet.count(),

      prisma.wallet.findMany({
        where: searchFilter,
        select: {
          id: true,
          cashBalance: true,
          referralBalance: true,
          portfolioValue: true,
          currency: true,
          updatedAt: true,
          user: {
            select: {
              fullName: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 200,
      }),

      prisma.walletLedgerEntry.findMany({
        where: ledgerFilter,
        select: {
          id: true,
          balanceType: true,
          direction: true,
          amount: true,
          currency: true,
          balanceBefore: true,
          balanceAfter: true,
          description: true,
          createdAt: true,
          transaction: {
            select: {
              reference: true,
              type: true,
              status: true,
            },
          },
          wallet: {
            select: {
              user: {
                select: {
                  fullName: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),

      prisma.walletLedgerEntry.count({
        where: ledgerFilter,
      }),
    ]);

  const summary = [
    ...walletTotals.flatMap((total) => {
      const currency = total.currency;

      return [
        {
          label: `Cash balance (${currency})`,
          value: formatMoney(
            Number(total._sum.cashBalance ?? 0),
            currency,
          ),
          description: `Combined customer cash balances in ${currency}`,
        },
        {
          label: `Referral balance (${currency})`,
          value: formatMoney(
            Number(total._sum.referralBalance ?? 0),
            currency,
          ),
          description: `Combined customer referral balances in ${currency}`,
        },
        {
          label: `Portfolio balance (${currency})`,
          value: formatMoney(
            Number(total._sum.portfolioValue ?? 0),
            currency,
          ),
          description: `Combined customer portfolio values in ${currency}`,
        },
      ];
    }),
    {
      label: "Customer wallets",
      value: walletCount.toLocaleString("en-US"),
      description: "Registered wallets",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/admin"
              className="text-sm font-semibold text-slate-500 hover:text-slate-900"
            >
              ← Admin Dashboard
            </Link>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">
              Wallet Management
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Customer wallet balances and recorded ledger activity.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
            <Wallet className="h-4 w-4" />
            Read-only administration
          </div>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summary.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-slate-500">
                {item.label}
              </p>
              <p className="mt-3 break-words text-2xl font-black text-slate-900">
                {item.value}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                {item.description}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-6">
            <div className="flex items-center gap-2">
              <WalletCards className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-900">
                Customer wallets
              </h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Latest 200 wallets, ordered by last update.
            </p>

            <form className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input
                type="search"
                name="search"
                defaultValue={search}
                placeholder="Search customer name, email, or phone"
                className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
              />
              <input
                type="hidden"
                name="balanceType"
                value={selectedBalanceType}
              />
              <input
                type="hidden"
                name="direction"
                value={selectedDirection}
              />
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-700"
              >
                Search
              </button>
              {search && (
                <Link
                  href="/admin/wallet"
                  className="rounded-xl border border-slate-200 px-5 py-3 text-center text-sm font-semibold text-slate-600"
                >
                  Clear
                </Link>
              )}
            </form>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4">Customer</th>
                  <th className="px-5 py-4">Cash</th>
                  <th className="px-5 py-4">Referral</th>
                  <th className="px-5 py-4">Portfolio</th>
                  <th className="px-5 py-4">Currency</th>
                  <th className="px-5 py-4">Last updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {wallets.map((wallet) => (
                  <tr key={wallet.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {wallet.user.fullName || "Unnamed customer"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {wallet.user.email || wallet.user.phone || "—"}
                      </p>
                    </td>
                    <td className="px-5 py-4 font-semibold tabular-nums text-slate-900">
                      {formatMoney(Number(wallet.cashBalance), wallet.currency)}
                    </td>
                    <td className="px-5 py-4 tabular-nums text-slate-700">
                      {formatMoney(Number(wallet.referralBalance), wallet.currency)}
                    </td>
                    <td className="px-5 py-4 tabular-nums text-slate-700">
                      {formatMoney(Number(wallet.portfolioValue), wallet.currency)}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {wallet.currency}
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      {formatDate(wallet.updatedAt)}
                    </td>
                  </tr>
                ))}
                {wallets.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                      No customer wallets found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-6">
            <h2 className="text-lg font-bold text-slate-900">
              Wallet ledger history
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Latest 100 matching entries. {ledgerCount.toLocaleString("en-US")} matching records in total.
            </p>

            <form className="mt-5 grid gap-3 sm:grid-cols-3">
              <input
                type="search"
                name="search"
                defaultValue={search}
                placeholder="Search customer"
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
              />
              <select
                name="balanceType"
                defaultValue={selectedBalanceType}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
              >
                <option value="">All balance types</option>
                <option value="CASH">Cash</option>
                <option value="REFERRAL">Referral</option>
                <option value="PORTFOLIO">Portfolio</option>
              </select>
              <select
                name="direction"
                defaultValue={selectedDirection}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
              >
                <option value="">All directions</option>
                <option value="CREDIT">Credit</option>
                <option value="DEBIT">Debit</option>
              </select>
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-700 sm:col-span-3"
              >
                Filter ledger
              </button>
            </form>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4">Customer</th>
                  <th className="px-5 py-4">Balance type</th>
                  <th className="px-5 py-4">Direction</th>
                  <th className="px-5 py-4">Amount</th>
                  <th className="px-5 py-4">Before</th>
                  <th className="px-5 py-4">After</th>
                  <th className="px-5 py-4">Transaction</th>
                  <th className="px-5 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgerEntries.map((entry) => {
                  const isCredit = entry.direction === "CREDIT";
                  const DirectionIcon = isCredit
                    ? ArrowDownCircle
                    : ArrowUpCircle;

                  return (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {entry.wallet.user.fullName || "Unnamed customer"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {entry.wallet.user.email || entry.wallet.user.phone || "—"}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {formatLabel(entry.balanceType)}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                          isCredit
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}>
                          <DirectionIcon className="h-3.5 w-3.5" />
                          {formatLabel(entry.direction)}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-semibold tabular-nums text-slate-900">
                        {formatMoney(Number(entry.amount), entry.currency)}
                      </td>
                      <td className="px-5 py-4 tabular-nums text-slate-600">
                        {formatMoney(Number(entry.balanceBefore), entry.currency)}
                      </td>
                      <td className="px-5 py-4 tabular-nums text-slate-600">
                        {formatMoney(Number(entry.balanceAfter), entry.currency)}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-mono text-xs text-slate-700">
                          {entry.transaction.reference}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatLabel(entry.transaction.type)} · {formatLabel(entry.transaction.status)}
                        </p>
                        {entry.description && (
                          <p className="mt-1 max-w-xs text-xs text-slate-400">
                            {entry.description}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-slate-500">
                        {formatDate(entry.createdAt)}
                      </td>
                    </tr>
                  );
                })}
                {ledgerEntries.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-slate-500">
                      No wallet ledger entries found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-6 text-xs leading-5 text-slate-400">
          This page is read-only. It does not modify wallet balances, ledger entries, transactions, or customer accounts.
        </p>
      </div>
    </div>
  );
}