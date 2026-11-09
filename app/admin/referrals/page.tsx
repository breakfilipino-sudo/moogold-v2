import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

type SearchParams = {
  search?: string;
  status?: string;
};

type AdminReferralsPageProps = {
  searchParams: Promise<SearchParams>;
};

const VALID_STATUSES = [
  "PENDING",
  "QUALIFIED",
  "REWARDED",
  "REVOKED",
] as const;

function formatDate(date: Date | null) {
  if (!date) return "—";

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

function statusClasses(status: string) {
  switch (status) {
    case "REWARDED":
      return "bg-emerald-100 text-emerald-700";
    case "QUALIFIED":
      return "bg-blue-100 text-blue-700";
    case "PENDING":
      return "bg-amber-100 text-amber-700";
    case "REVOKED":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function formatAmount(amount: unknown, currency: string) {
  if (amount === null || amount === undefined) return "—";

  const value = Number(amount);

  return `${currency} ${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getDisplayName(user: {
  fullName: string | null;
  email: string | null;
  phone: string | null;
}) {
  return user.fullName || user.email || user.phone || "MooGold user";
}

export default async function AdminReferralsPage({
  searchParams,
}: AdminReferralsPageProps) {
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
    ...(selectedStatus
      ? {
          status: selectedStatus as (typeof VALID_STATUSES)[number],
        }
      : {}),
    ...(search
      ? {
          OR: [
            {
              referrer: {
                is: {
                  OR: [
                    { fullName: { contains: search, mode: "insensitive" as const } },
                    { email: { contains: search, mode: "insensitive" as const } },
                    { phone: { contains: search, mode: "insensitive" as const } },
                    { referralCode: { contains: search, mode: "insensitive" as const } },
                  ],
                },
              },
            },
            {
              referredUser: {
                is: {
                  OR: [
                    { fullName: { contains: search, mode: "insensitive" as const } },
                    { email: { contains: search, mode: "insensitive" as const } },
                    { phone: { contains: search, mode: "insensitive" as const } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };

  const [referrals, total, pending, qualified, rewarded, revoked] =
    await Promise.all([
      prisma.referral.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        take: 200,
        select: {
          id: true,
          status: true,
          rewardAmount: true,
          rewardCurrency: true,
          createdAt: true,
          qualifiedAt: true,
          rewardedAt: true,
          referrer: {
            select: {
              fullName: true,
              email: true,
              phone: true,
              referralCode: true,
            },
          },
          referredUser: {
            select: {
              fullName: true,
              email: true,
              phone: true,
            },
          },
        },
      }),
      prisma.referral.count(),
      prisma.referral.count({ where: { status: "PENDING" } }),
      prisma.referral.count({ where: { status: "QUALIFIED" } }),
      prisma.referral.count({ where: { status: "REWARDED" } }),
      prisma.referral.count({ where: { status: "REVOKED" } }),
    ]);

  const summary = [
    { label: "Total referrals", value: total },
    { label: "Pending", value: pending },
    { label: "Qualified", value: qualified },
    { label: "Rewarded", value: rewarded },
    { label: "Revoked", value: revoked },
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
            Referral Management
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Review referral activity, qualification, and recorded rewards.
          </p>
        </div>
      </div>

      <section className="mb-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {summary.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
              {item.value.toLocaleString("en-US")}
            </p>
          </div>
        ))}
      </section>

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form
          method="GET"
          action="/admin/referrals"
          className="flex flex-col gap-3 sm:flex-row"
        >
          <input
            type="search"
            name="search"
            defaultValue={search}
            placeholder="Search names, email, phone, or referral code"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
          />

          <select
            name="status"
            defaultValue={selectedStatus}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
          >
            <option value="">All statuses</option>
            {VALID_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatStatus(status)}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Search
          </button>

          {(search || selectedStatus) && (
            <Link
              href="/admin/referrals"
              className="rounded-xl border border-slate-200 px-5 py-3 text-center text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Clear
            </Link>
          )}
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-1 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold text-slate-900">
            Referral records
          </h2>
          <p className="text-xs text-slate-500">
            Showing {referrals.length} of matching records
            {referrals.length === 200 ? " (maximum 200)" : ""}
          </p>
        </div>

        {referrals.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="font-semibold text-slate-800">
              No referral records found
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Try changing your search or status filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Referrer</th>
                  <th className="px-5 py-4 font-semibold">Referred customer</th>
                  <th className="px-5 py-4 font-semibold">Referral code</th>
                  <th className="px-5 py-4 font-semibold">Reward</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Registered</th>
                  <th className="px-5 py-4 font-semibold">Qualified</th>
                  <th className="px-5 py-4 font-semibold">Rewarded</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {referrals.map((referral) => (
                  <tr key={referral.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {getDisplayName(referral.referrer)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {referral.referrer.email || referral.referrer.phone || "—"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {getDisplayName(referral.referredUser)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {referral.referredUser.email || referral.referredUser.phone || "—"}
                      </p>
                    </td>

                    <td className="px-5 py-4 font-mono text-xs text-slate-600">
                      {referral.referrer.referralCode || "—"}
                    </td>

                    <td className="px-5 py-4 font-semibold tabular-nums text-slate-900">
                      {formatAmount(
                        referral.rewardAmount,
                        referral.rewardCurrency || "USD",
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(referral.status)}`}
                      >
                        {formatStatus(referral.status)}
                      </span>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap text-slate-600">
                      {formatDate(referral.createdAt)}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap text-slate-600">
                      {formatDate(referral.qualifiedAt)}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap text-slate-600">
                      {formatDate(referral.rewardedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        Referral qualification follows the existing approved-deposit rules.
        Reward amounts and dates shown here come from saved referral records.
        This page does not issue rewards or change referral statuses.
      </p>
    </main>
  );
}