import Link from "next/link";
import { Search, Users, WalletCards } from "lucide-react";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

type SearchParams = {
  search?: string;
  status?: string;
};

type AdminUsersPageProps = {
  searchParams: Promise<SearchParams>;
};

const VALID_STATUSES = [
  "ACTIVE",
  "CLOSURE_REQUESTED",
  "CLOSED",
] as const;

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getStatusClasses(status: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-100 text-emerald-700";
    case "CLOSURE_REQUESTED":
      return "bg-amber-100 text-amber-700";
    case "CLOSED":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function formatAmount(amount: unknown, currency: string) {
  const value = Number(amount ?? 0);

  return `${currency} ${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps) {
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

  const selectedStatus =
    params.status &&
    VALID_STATUSES.includes(
      params.status as (typeof VALID_STATUSES)[number],
    )
      ? params.status
      : "";

  const where = {
    role: "USER" as const,
    ...(selectedStatus
      ? {
          accountStatus:
            selectedStatus as (typeof VALID_STATUSES)[number],
        }
      : {}),
    ...(search
      ? {
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
            {
              referralCode: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  };

  const [
    totalUsers,
    activeUsers,
    closureRequests,
    closedUsers,
    customers,
  ] = await Promise.all([
    prisma.user.count({
      where: { role: "USER" },
    }),
    prisma.user.count({
      where: {
        role: "USER",
        accountStatus: "ACTIVE",
      },
    }),
    prisma.user.count({
      where: {
        role: "USER",
        accountStatus: "CLOSURE_REQUESTED",
      },
    }),
    prisma.user.count({
      where: {
        role: "USER",
        accountStatus: "CLOSED",
      },
    }),
    prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        countryCode: true,
        referralCode: true,
        accountStatus: true,
        createdAt: true,
        wallet: {
          select: {
            cashBalance: true,
            currency: true,
          },
        },
        goldHolding: {
          select: {
            quantity: true,
            value: true,
            currency: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    }),
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <Link
            href="/admin"
            className="text-sm font-semibold text-slate-500 transition hover:text-slate-900"
          >
            Admin Dashboard
          </Link>

          <div className="mt-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Users className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">
                Customer Management
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                View registered customers and their account information.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Total Customers",
              value: totalUsers,
            },
            {
              label: "Active Accounts",
              value: activeUsers,
            },
            {
              label: "Closure Requests",
              value: closureRequests,
            },
            {
              label: "Closed Accounts",
              value: closedUsers,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-slate-500">
                {item.label}
              </p>
              <p className="mt-2 text-3xl font-black text-slate-900">
                {item.value.toLocaleString("en-US")}
              </p>
            </div>
          ))}
        </div>

        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <form
            action="/admin/users"
            method="GET"
            className="flex flex-col gap-3 md:flex-row"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                name="search"
                defaultValue={search}
                placeholder="Search name, email, phone or referral code"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <select
              name="status"
              defaultValue={selectedStatus}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-emerald-500"
            >
              <option value="">All account statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="CLOSURE_REQUESTED">Closure Requested</option>
              <option value="CLOSED">Closed</option>
            </select>

            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
            >
              Search
            </button>

            <Link
              href="/admin/users"
              className="rounded-xl border border-slate-200 px-6 py-3 text-center text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Clear
            </Link>
          </form>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">Customers</h2>
              <p className="text-xs text-slate-500">
                Showing up to 100 most recently registered matching customers.
              </p>
            </div>

            <span className="text-sm font-semibold text-slate-500">
              {customers.length} result{customers.length === 1 ? "" : "s"}
            </span>
          </div>

          {customers.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <Users className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 font-semibold text-slate-700">
                No customers found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Try changing your search or account status filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Customer</th>
                    <th className="px-5 py-4 font-semibold">Phone</th>
                    <th className="px-5 py-4 font-semibold">Country</th>
                    <th className="px-5 py-4 font-semibold">Account</th>
                    <th className="px-5 py-4 font-semibold">Wallet Balance</th>
                    <th className="px-5 py-4 font-semibold">Gold Holding</th>
                    <th className="px-5 py-4 font-semibold">Referral Code</th>
                    <th className="px-5 py-4 font-semibold">Registered</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {customers.map((customer) => (
                    <tr key={customer.id} className="transition hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {customer.fullName || "Unnamed customer"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {customer.email || "No email"}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {customer.phone || "—"}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {customer.countryCode || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(customer.accountStatus)}`}
                        >
                          {formatStatus(customer.accountStatus)}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-semibold text-slate-700">
                        {customer.wallet
                          ? formatAmount(
                              customer.wallet.cashBalance,
                              customer.wallet.currency,
                            )
                          : "—"}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {customer.goldHolding
                          ? `${Number(customer.goldHolding.quantity).toLocaleString("en-US", {
                              maximumFractionDigits: 8,
                            })} units`
                          : "—"}
                        {customer.goldHolding && (
                          <p className="mt-1 text-xs text-slate-400">
                            {formatAmount(
                              customer.goldHolding.value,
                              customer.goldHolding.currency,
                            )}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {customer.referralCode || "—"}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-slate-500">
                        {formatDate(customer.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center gap-2 text-xs text-slate-400">
          <WalletCards className="h-4 w-4" />
          Customer information is read-only on this page.
        </div>
      </div>
    </div>
  );
}