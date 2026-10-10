import {
  ArrowDownCircle,
  ArrowUpCircle,
  Coins,
  Gift,
  History,
  Search,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type SearchParams = {
  type?: string;
  status?: string;
  search?: string;
};

type AdminTransactionsPageProps = {
  searchParams: Promise<SearchParams>;
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

function getTypeClasses(type: string) {
  switch (type) {
    case "DEPOSIT":
      return "bg-emerald-100 text-emerald-700";

    case "WITHDRAWAL":
      return "bg-red-100 text-red-700";

    case "REFERRAL_REWARD":
      return "bg-purple-100 text-purple-700";

    case "GOLD_PURCHASE":
      return "bg-yellow-100 text-yellow-700";

    case "GOLD_SALE":
      return "bg-orange-100 text-orange-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case "DEPOSIT":
      return ArrowDownCircle;

    case "WITHDRAWAL":
      return ArrowUpCircle;

    case "REFERRAL_REWARD":
      return Gift;

    case "GOLD_PURCHASE":
    case "GOLD_SALE":
      return Coins;

    default:
      return WalletCards;
  }
}

function formatType(type: string) {
  return type
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default async function AdminTransactionsPage({
  searchParams,
}: AdminTransactionsPageProps) {
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

  const selectedType = params.type || "";
  const selectedStatus = params.status || "";
  const search = params.search?.trim() || "";

  const transactions = await prisma.transaction.findMany({
    where: {
      ...(selectedType
        ? {
            type: selectedType as
              | "DEPOSIT"
              | "WITHDRAWAL"
              | "REFERRAL_REWARD"
              | "BALANCE_ADJUSTMENT"
              | "GOLD_PURCHASE"
              | "GOLD_SALE",
          }
        : {}),

      ...(selectedStatus
        ? {
            status: selectedStatus as
              | "PENDING"
              | "PROCESSING"
              | "COMPLETED"
              | "REJECTED"
              | "CANCELLED",
          }
        : {}),

      ...(search
        ? {
            OR: [
              {
                reference: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                user: {
                  email: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
              {
                user: {
                  fullName: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
              {
                user: {
                  phone: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            ],
          }
        : {}),
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

    orderBy: {
      createdAt: "desc",
    },

    take: 100,
  });

  const totalTransactions = await prisma.transaction.count();

  const pendingTransactions = await prisma.transaction.count({
    where: {
      status: "PENDING",
    },
  });

  const completedTransactions = await prisma.transaction.count({
    where: {
      status: "COMPLETED",
    },
  });

  const rejectedTransactions = await prisma.transaction.count({
    where: {
      status: "REJECTED",
    },
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Header */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/admin"
              className="text-sm font-semibold text-slate-500 transition hover:text-slate-900"
            >
              ← Back to Admin
            </Link>

            <div className="mt-6 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
                <History className="h-7 w-7" />
              </div>

              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-emerald-600">
                  Financial Activity
                </p>

                <h1 className="mt-1 text-4xl font-black tracking-tight text-slate-900">
                  Transactions
                </h1>
              </div>
            </div>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500">
              Monitor deposits, withdrawals, referral rewards, gold activity,
              and other financial transactions across MooGold.
            </p>
          </div>
        </div>

        {/* Statistics */}
        <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              Total Transactions
            </p>

            <p className="mt-3 text-3xl font-black text-slate-900">
              {totalTransactions}
            </p>
          </div>

          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
            <p className="text-sm font-semibold text-amber-700">
              Pending
            </p>

            <p className="mt-3 text-3xl font-black text-amber-800">
              {pendingTransactions}
            </p>
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
            <p className="text-sm font-semibold text-emerald-700">
              Completed
            </p>

            <p className="mt-3 text-3xl font-black text-emerald-800">
              {completedTransactions}
            </p>
          </div>

          <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
            <p className="text-sm font-semibold text-red-700">
              Rejected
            </p>

            <p className="mt-3 text-3xl font-black text-red-800">
              {rejectedTransactions}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <form
            method="GET"
            className="grid gap-4 lg:grid-cols-[1fr_200px_200px_auto]"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Search reference, customer..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-medium outline-none transition focus:border-emerald-500 focus:bg-white"
              />
            </div>

            <select
              name="type"
              defaultValue={selectedType}
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none transition focus:border-emerald-500"
            >
              <option value="">All Types</option>
              <option value="DEPOSIT">Deposits</option>
              <option value="WITHDRAWAL">Withdrawals</option>
              <option value="REFERRAL_REWARD">
                Referral Rewards
              </option>
              <option value="BALANCE_ADJUSTMENT">
                Balance Adjustments
              </option>
              <option value="GOLD_PURCHASE">
                Gold Purchases
              </option>
              <option value="GOLD_SALE">Gold Sales</option>
            </select>

            <select
              name="status"
              defaultValue={selectedStatus}
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none transition focus:border-emerald-500"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <button
              type="submit"
              className="h-12 rounded-2xl bg-slate-900 px-6 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              Filter
            </button>
          </form>
        </div>

        {/* Transactions */}
        <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-xl font-black text-slate-900">
              Transaction History
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Showing {transactions.length} transaction
              {transactions.length === 1 ? "" : "s"}
            </p>
          </div>

          {transactions.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <History className="mx-auto h-10 w-10 text-slate-300" />

              <h3 className="mt-4 text-lg font-bold text-slate-900">
                No transactions found
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Try changing your search or filters.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {transactions.map((transaction) => {
                const TypeIcon = getTypeIcon(transaction.type);

                const customerName =
                  transaction.user.fullName ||
                  transaction.user.email ||
                  transaction.user.phone ||
                  "Unknown customer";

                const amount = Number(transaction.amount);

                return (
                  <div
                    key={transaction.id}
                    className="p-6 transition hover:bg-slate-50"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                      {/* Transaction identity */}
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                          <TypeIcon className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${getTypeClasses(
                                transaction.type,
                              )}`}
                            >
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

                          <p className="mt-2 break-all font-bold text-slate-900">
                            {transaction.reference}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {customerName}
                          </p>
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="xl:text-right">
                        <p className="text-2xl font-black text-slate-900">
                          {formatCurrency(amount, transaction.currency)}
                        </p>

                        {transaction.usdAmount && (
                          <p className="mt-1 text-sm font-semibold text-emerald-600">
                            USD value:{" "}
                            {formatCurrency(
                              Number(transaction.usdAmount),
                              "USD",
                            )}
                          </p>
                        )}

                        <p className="mt-1 text-xs text-slate-400">
                          {formatDate(transaction.createdAt)}
                        </p>
                      </div>

                      {/* Action */}
                      <div>
                        <Link
                          href={
                            transaction.type === "DEPOSIT"
                              ? `/admin/deposits/${transaction.reference}`
                              : `/admin/transactions/${transaction.reference}`
                          }
                          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}