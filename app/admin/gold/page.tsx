import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

type SearchParams = {
  search?: string;
  type?: string;
};

type AdminGoldPageProps = {
  searchParams: Promise<SearchParams>;
};

const GOLD_TYPES = ["GOLD_PURCHASE", "GOLD_SALE"] as const;

function formatDate(date: Date | null) {
  if (!date) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatMoney(value: unknown, currency = "USD") {
  const amount = Number(value ?? 0);

  return `${currency} ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatQuantity(value: unknown) {
  return `${Number(value ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8,
  })} oz`;
}

function displayName(user: {
  fullName: string | null;
  email: string | null;
  phone: string | null;
}) {
  return user.fullName || user.email || user.phone || "MooGold user";
}

export default async function AdminGoldPage({
  searchParams,
}: AdminGoldPageProps) {
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
      role: true,
    },
  });

  if (!admin || admin.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const search = params.search?.trim().slice(0, 100) || "";

  const selectedType =
    params.type &&
    GOLD_TYPES.includes(params.type as (typeof GOLD_TYPES)[number])
      ? params.type
      : "";

  const transactionWhere = {
    type: selectedType
      ? (selectedType as (typeof GOLD_TYPES)[number])
      : {
          in: [...GOLD_TYPES],
        },
    ...(search
      ? {
          OR: [
            {
              reference: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              description: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              user: {
                is: {
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
            },
          ],
        }
      : {}),
  };

  const holdingWhere = search
    ? {
        user: {
          is: {
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
    : {};

  const [
    holdings,
    holdingTotals,
    latestSnapshot,
    snapshots,
    transactions,
    purchaseCount,
    saleCount,
  ] = await Promise.all([
    prisma.goldHolding.findMany({
      where: holdingWhere,
      orderBy: {
        updatedAt: "desc",
      },
      take: 200,
      select: {
        id: true,
        quantity: true,
        value: true,
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
    }),
    prisma.goldHolding.aggregate({
      _sum: {
        quantity: true,
        value: true,
      },
      _count: {
        _all: true,
      },
    }),
    prisma.goldMarketSnapshot.findFirst({
      orderBy: {
        capturedAt: "desc",
      },
      select: {
        price: true,
        source: true,
        capturedAt: true,
      },
    }),
    prisma.goldMarketSnapshot.findMany({
      orderBy: {
        capturedAt: "desc",
      },
      take: 12,
      select: {
        id: true,
        price: true,
        source: true,
        capturedAt: true,
      },
    }),
    prisma.transaction.findMany({
      where: transactionWhere,
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
      select: {
        id: true,
        type: true,
        status: true,
        amount: true,
        currency: true,
        usdAmount: true,
        exchangeRate: true,
        description: true,
        reference: true,
        createdAt: true,
        approvedAt: true,
        user: {
          select: {
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
    }),
    prisma.transaction.count({
      where: {
        type: "GOLD_PURCHASE",
        status: "COMPLETED",
      },
    }),
    prisma.transaction.count({
      where: {
        type: "GOLD_SALE",
        status: "COMPLETED",
      },
    }),
  ]);

  const completedPurchases = transactions.filter(
    (transaction) =>
      transaction.type === "GOLD_PURCHASE" &&
      transaction.status === "COMPLETED",
  );

  const completedSales = transactions.filter(
    (transaction) =>
      transaction.type === "GOLD_SALE" &&
      transaction.status === "COMPLETED",
  );

  const purchaseVolume = completedPurchases.reduce(
    (total, transaction) => total + Number(transaction.usdAmount ?? transaction.amount),
    0,
  );

  const saleVolume = completedSales.reduce(
    (total, transaction) => total + Number(transaction.usdAmount ?? transaction.amount),
    0,
  );

  const summary = [
    {
      label: "Customers holding gold",
      value: holdingTotals._count._all.toLocaleString("en-US"),
    },
    {
      label: "Total gold held",
      value: formatQuantity(holdingTotals._sum.quantity),
    },
    {
      label: "Recorded holding value",
      value: formatMoney(holdingTotals._sum.value),
    },
    {
      label: "Completed purchases",
      value: purchaseCount.toLocaleString("en-US"),
    },
    {
      label: "Completed sales",
      value: saleCount.toLocaleString("en-US"),
    },
  ];

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-7">
        <Link
          href="/admin"
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          ← Admin dashboard
        </Link>

        <div className="mt-4">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Gold Management
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Monitor customer gold holdings, recorded market prices, and gold trading activity.
          </p>
        </div>
      </div>

      <section className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {summary.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-2 text-xl font-bold tabular-nums text-slate-900">
              {item.value}
            </p>
          </div>
        ))}
      </section>

      <section className="mb-7 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1">
          <p className="text-sm font-medium text-slate-500">
            Latest recorded market snapshot
          </p>

          {latestSnapshot ? (
            <>
              <p className="mt-3 text-3xl font-bold tabular-nums text-slate-900">
                {formatMoney(latestSnapshot.price)}
                <span className="ml-1 text-sm font-medium text-slate-500">
                  / oz
                </span>
              </p>
              <p className="mt-3 text-xs text-slate-500">
                Source: {latestSnapshot.source}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Captured: {formatDate(latestSnapshot.capturedAt)}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              No market snapshots have been recorded yet.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Completed purchase volume
          </p>
          <p className="mt-3 text-2xl font-bold tabular-nums text-slate-900">
            {formatMoney(purchaseVolume)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Based on the currently filtered transaction records.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Completed sale volume
          </p>
          <p className="mt-3 text-2xl font-bold tabular-nums text-slate-900">
            {formatMoney(saleVolume)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Based on the currently filtered transaction records.
          </p>
        </div>
      </section>

      <section className="mb-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">
            Recent market snapshots
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Previously saved market prices. This page does not fetch or create new snapshots.
          </p>
        </div>

        {snapshots.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            No market history is available.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[550px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Price per oz</th>
                  <th className="px-5 py-3 font-semibold">Source</th>
                  <th className="px-5 py-3 font-semibold">Captured</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {snapshots.map((snapshot) => (
                  <tr key={snapshot.id}>
                    <td className="px-5 py-3 font-semibold text-slate-900">
                      {formatMoney(snapshot.price)}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {snapshot.source}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-slate-600">
                      {formatDate(snapshot.capturedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">
            Customer gold holdings
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Showing up to 200 matching customer records.
          </p>
        </div>

        {holdings.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-500">
            No customer gold holdings found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Gold quantity</th>
                  <th className="px-5 py-3 font-semibold">Recorded value</th>
                  <th className="px-5 py-3 font-semibold">Last updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {holdings.map((holding) => (
                  <tr key={holding.id}>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {displayName(holding.user)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {holding.user.email || holding.user.phone || "—"}
                      </p>
                    </td>
                    <td className="px-5 py-4 font-medium tabular-nums text-slate-900">
                      {formatQuantity(holding.quantity)}
                    </td>
                    <td className="px-5 py-4 font-medium tabular-nums text-slate-900">
                      {formatMoney(holding.value, holding.currency)}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-slate-600">
                      {formatDate(holding.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">
            Gold transactions
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Showing up to 100 matching purchase and sale records.
          </p>
        </div>

        <form
          method="GET"
          action="/admin/gold"
          className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row"
        >
          <input
            type="search"
            name="search"
            defaultValue={search}
            placeholder="Search customer, email, phone, or reference"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
          />

          <select
            name="type"
            defaultValue={selectedType}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
          >
            <option value="">All gold transactions</option>
            <option value="GOLD_PURCHASE">Purchases</option>
            <option value="GOLD_SALE">Sales</option>
          </select>

          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Search
          </button>

          {(search || selectedType) && (
            <Link
              href="/admin/gold"
              className="rounded-xl border border-slate-200 px-5 py-3 text-center text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Clear
            </Link>
          )}
        </form>

        {transactions.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-500">
            No gold transactions found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Amount</th>
                  <th className="px-5 py-3 font-semibold">Gold price / oz</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Reference</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {displayName(transaction.user)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {transaction.user.email || transaction.user.phone || "—"}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={
                          transaction.type === "GOLD_PURCHASE"
                            ? "font-semibold text-blue-700"
                            : "font-semibold text-emerald-700"
                        }
                      >
                        {transaction.type === "GOLD_PURCHASE" ? "Purchase" : "Sale"}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-medium tabular-nums text-slate-900">
                      {formatMoney(transaction.amount, transaction.currency)}
                    </td>
                    <td className="px-5 py-4 tabular-nums text-slate-600">
                      {transaction.exchangeRate
                        ? `${formatMoney(transaction.exchangeRate)} / oz`
                        : "—"}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {transaction.status}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-600">
                      {transaction.reference}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-slate-600">
                      {formatDate(transaction.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        This administration page is read-only. It does not change customer holdings,
        execute purchases or sales, adjust wallet balances, or create market snapshots.
        Recorded holding values are not presented as live market prices.
      </p>
    </main>
  );
}