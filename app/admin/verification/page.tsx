import {
  ArrowRight,
  Clock3,
  FileCheck2,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

type SearchParams = {
  status?: string;
};

type AdminVerificationPageProps = {
  searchParams: Promise<SearchParams>;
};

const VALID_STATUSES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "UNDER_REVIEW",
  "VERIFIED",
  "REJECTED",
  "MORE_INFORMATION_REQUIRED",
] as const;

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

function formatTier(tier: string) {
  switch (tier) {
    case "TIER_1":
      return "Tier 1";
    case "TIER_2":
      return "Tier 2";
    case "TIER_3":
      return "Tier 3";
    default:
      return tier;
  }
}

function getStatusClasses(status: string) {
  switch (status) {
    case "VERIFIED":
      return "bg-emerald-100 text-emerald-700";

    case "UNDER_REVIEW":
    case "IN_PROGRESS":
      return "bg-amber-100 text-amber-700";

    case "REJECTED":
      return "bg-red-100 text-red-700";

    case "MORE_INFORMATION_REQUIRED":
      return "bg-blue-100 text-blue-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

export default async function AdminVerificationPage({
  searchParams,
}: AdminVerificationPageProps) {
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
      fullName: true,
    },
  });

  if (!admin || admin.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const params = await searchParams;

  const selectedStatus =
    params.status &&
    VALID_STATUSES.includes(
      params.status as (typeof VALID_STATUSES)[number],
    )
      ? params.status
      : "";

  const [
    total,
    pending,
    verified,
    rejected,
    moreInformation,
    verifications,
  ] = await Promise.all([
    prisma.userVerification.count(),

    prisma.userVerification.count({
      where: {
        status: {
          in: ["UNDER_REVIEW", "IN_PROGRESS"],
        },
      },
    }),

    prisma.userVerification.count({
      where: {
        status: "VERIFIED",
      },
    }),

    prisma.userVerification.count({
      where: {
        status: "REJECTED",
      },
    }),

    prisma.userVerification.count({
      where: {
        status: "MORE_INFORMATION_REQUIRED",
      },
    }),

    prisma.userVerification.findMany({
      where: selectedStatus
        ? {
            status:
              selectedStatus as
                | "NOT_STARTED"
                | "IN_PROGRESS"
                | "UNDER_REVIEW"
                | "VERIFIED"
                | "REJECTED"
                | "MORE_INFORMATION_REQUIRED",
          }
        : undefined,
      orderBy: [
        {
          submittedAt: "desc",
        },
        {
          updatedAt: "desc",
        },
      ],
      take: 100,
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
        documents: {
          select: {
            id: true,
            type: true,
            status: true,
          },
        },
      },
    }),
  ]);

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
                <ShieldCheck className="h-7 w-7" />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                  Identity & Compliance
                </p>

                <h1 className="mt-1 text-4xl font-black tracking-tight text-slate-900">
                  Verification
                </h1>
              </div>
            </div>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500">
              Review customer identity submissions, verification
              checks, and account verification decisions.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
            <ShieldCheck className="h-4 w-4" />
            Admin Review
          </div>
        </div>

        {/* Statistics */}
        <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              Total
            </p>

            <p className="mt-3 text-3xl font-black text-slate-900">
              {total}
            </p>
          </div>

          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
            <p className="text-sm font-semibold text-amber-700">
              Pending Review
            </p>

            <p className="mt-3 text-3xl font-black text-amber-800">
              {pending}
            </p>
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
            <p className="text-sm font-semibold text-emerald-700">
              Verified
            </p>

            <p className="mt-3 text-3xl font-black text-emerald-800">
              {verified}
            </p>
          </div>

          <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
            <p className="text-sm font-semibold text-red-700">
              Rejected
            </p>

            <p className="mt-3 text-3xl font-black text-red-800">
              {rejected}
            </p>
          </div>

          <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6">
            <p className="text-sm font-semibold text-blue-700">
              More Information
            </p>

            <p className="mt-3 text-3xl font-black text-blue-800">
              {moreInformation}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <form
            method="GET"
            className="flex flex-col gap-4 md:flex-row md:items-end"
          >
            <div className="flex-1">
              <label
                htmlFor="status"
                className="text-xs font-bold uppercase tracking-wider text-slate-400"
              >
                Status
              </label>

              <select
                id="status"
                name="status"
                defaultValue={selectedStatus}
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10"
              >
                <option value="">All verification records</option>
                <option value="UNDER_REVIEW">
                  Under Review
                </option>
                <option value="IN_PROGRESS">
                  In Progress
                </option>
                <option value="VERIFIED">
                  Verified
                </option>
                <option value="REJECTED">
                  Rejected
                </option>
                <option value="MORE_INFORMATION_REQUIRED">
                  More Information Required
                </option>
                <option value="NOT_STARTED">
                  Not Started
                </option>
              </select>
            </div>

            <button
              type="submit"
              className="h-11 rounded-xl bg-slate-900 px-6 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              Apply Filter
            </button>
          </form>
        </div>

        {/* Verification list */}
        <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-xl font-black text-slate-900">
              Verification Submissions
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {verifications.length} record
              {verifications.length === 1 ? "" : "s"} found
            </p>
          </div>

          {verifications.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <FileCheck2 className="mx-auto h-10 w-10 text-slate-300" />

              <h3 className="mt-4 text-lg font-bold text-slate-900">
                No verification records found
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Submitted customer verifications will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {verifications.map((verification) => {
                const customerName =
                  verification.user.fullName ||
                  verification.user.email ||
                  verification.user.phone ||
                  "Unknown customer";

                const documentCount =
                  verification.documents.length;

                return (
                  <div
                    key={verification.id}
                    className="p-6 transition hover:bg-slate-50"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                          <Users className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClasses(
                                verification.status,
                              )}`}
                            >
                              {formatStatus(
                                verification.status,
                              )}
                            </span>

                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                              {formatTier(
                                verification.tier,
                              )}
                            </span>
                          </div>

                          <p className="mt-2 truncate font-bold text-slate-900">
                            {customerName}
                          </p>

                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                            {verification.user.phone ? (
                              <span>
                                {verification.user.phone}
                              </span>
                            ) : null}

                            {verification.user.countryCode ? (
                              <span>
                                {verification.user.countryCode}
                              </span>
                            ) : null}

                            <span>
                              {documentCount} document
                              {documentCount === 1
                                ? ""
                                : "s"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="text-left sm:text-right">
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 sm:justify-end">
                            <Clock3 className="h-3.5 w-3.5" />

                            {formatDate(
                              verification.submittedAt ||
                                verification.updatedAt,
                            )}
                          </div>
                        </div>

                        <Link
                          href={`/admin/verification/${verification.id}`}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                        >
                          Review
                          <ArrowRight className="h-4 w-4" />
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