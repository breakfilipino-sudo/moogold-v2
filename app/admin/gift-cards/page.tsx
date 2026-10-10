import {
  ArrowLeft,
  Clock3,
  ExternalLink,
  Gift,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

import { prisma } from "@/lib/prisma";

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
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

function getStatusClasses(status: string) {
  switch (status) {
    case "APPROVED":
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

export default async function AdminGiftCardsPage() {
  const submissions = await prisma.giftCardSubmission.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          phone: true,
          fullName: true,
        },
      },
      product: {
        select: {
          id: true,
          name: true,
          currency: true,
          brand: {
            select: {
              name: true,
              logoUrl: true,
            },
          },
        },
      },
    },
  });

  const pendingCount = submissions.filter(
    (submission) => submission.status === "PENDING",
  ).length;

  const processingCount = submissions.filter(
    (submission) => submission.status === "PROCESSING",
  ).length;

  const approvedCount = submissions.filter(
    (submission) => submission.status === "APPROVED",
  ).length;

  const rejectedCount = submissions.filter(
    (submission) => submission.status === "REJECTED",
  ).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Header */}
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/admin"
              className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Admin Dashboard
            </Link>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                <Gift className="h-6 w-6" />
              </div>

              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-amber-600">
                  MooGold Administration
                </p>

                <h1 className="mt-1 text-4xl font-black tracking-tight text-slate-900">
                  Gift Cards
                </h1>
              </div>
            </div>

            <p className="mt-3 max-w-2xl text-slate-500">
              Review customer gift-card submissions and monitor their current
              redemption status.
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                <Clock3 className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold text-amber-700">
                  Pending
                </p>

                <p className="text-3xl font-black text-amber-950">
                  {pendingCount}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                <Clock3 className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold text-blue-700">
                  Processing
                </p>

                <p className="text-3xl font-black text-blue-950">
                  {processingCount}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                <Gift className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold text-emerald-700">
                  Approved
                </p>

                <p className="text-3xl font-black text-emerald-950">
                  {approvedCount}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                <Gift className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold text-red-700">
                  Rejected
                </p>

                <p className="text-3xl font-black text-red-950">
                  {rejectedCount}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Gift card submissions table */}
        <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Gift Card Submissions
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {submissions.length} submission
                  {submissions.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          </div>

          {submissions.length === 0 ? (
            <div className="px-6 py-16 text-center sm:px-8">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Gift className="h-7 w-7" />
              </div>

              <h3 className="mt-5 text-lg font-bold text-slate-900">
                No gift-card submissions yet
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Customer gift-card redemption requests will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1250px] text-left">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Submission
                    </th>

                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Customer
                    </th>

                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Gift Card
                    </th>

                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Quantity
                    </th>

                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Card Value
                    </th>

                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      USD Credit
                    </th>

                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Status
                    </th>

                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Date
                    </th>

                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {submissions.map((submission) => {
                    const customerName =
                      submission.user.fullName ||
                      submission.user.email ||
                      submission.user.phone ||
                      "Unknown customer";

                    const nativeCredit = Number(
                      submission.totalCreditAmount,
                    );

                    const totalFaceValue = Number(
                      submission.totalFaceValue,
                    );

                    return (
                      <tr
                        key={submission.id}
                        className="transition hover:bg-slate-50/70"
                      >
                        <td className="px-6 py-5">
                          <p className="max-w-[220px] truncate font-bold text-slate-900">
                            {submission.id}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {submission.product.brand.name}
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          <p className="font-semibold text-slate-900">
                            {customerName}
                          </p>

                          {submission.user.email && (
                            <p className="mt-1 text-xs text-slate-500">
                              {submission.user.email}
                            </p>
                          )}
                        </td>

                        <td className="px-6 py-5">
                          <p className="font-bold text-slate-900">
                            {submission.product.brand.name}
                          </p>

                          <p className="mt-1 text-xs font-semibold text-slate-400">
                            {submission.product.name}
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          <p className="font-bold text-slate-900">
                            {submission.quantity}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            card{submission.quantity === 1 ? "" : "s"}
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          <p className="font-bold text-slate-900">
                            {formatCurrency(
                              totalFaceValue,
                              submission.currency,
                            )}
                          </p>

                          <p className="mt-1 text-xs font-semibold text-slate-400">
                            {submission.currency}
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          <p className="font-bold text-emerald-600">
                            {formatCurrency(nativeCredit, "USD")}
                          </p>

                          {submission.currency !== "USD" && (
                            <p className="mt-1 text-xs text-slate-400">
                              Before FX conversion
                            </p>
                          )}
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${getStatusClasses(
                              submission.status,
                            )}`}
                          >
                            {submission.status}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <p className="whitespace-nowrap text-sm font-semibold text-slate-700">
                            {formatDate(submission.createdAt)}
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          <Link
                            href={`/admin/gift-cards/${submission.id}`}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                          >
                            View
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Protection notice */}
        <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <h3 className="font-bold text-amber-950">
                Admin review required
              </h3>

              <p className="mt-2 text-sm leading-6 text-amber-800">
                Gift-card submissions shown here do not automatically credit
                the customer&apos;s wallet. Each submission must be reviewed
                and approved before the eligible USD value is credited to the
                customer&apos;s cash balance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}