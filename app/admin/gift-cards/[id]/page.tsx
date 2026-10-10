import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Gift,
  Image as ImageIcon,
  Mail,
  Phone,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptGiftCardCode } from "@/lib/helpers/gift-card-security";

import {
  approveGiftCard,
  rejectGiftCard,
  startGiftCardReview,
} from "../actions";

const DEFAULT_STORAGE_BUCKET = "gift-cards";

function getStorageBucket() {
  return (
    process.env.GIFT_CARD_STORAGE_BUCKET?.trim() ||
    DEFAULT_STORAGE_BUCKET
  );
}

function formatMoney(amount: number, currency: string) {
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

function formatStatus(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase();
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

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { authUserId: authUser.id },
        ...(authUser.email ? [{ email: authUser.email }] : []),
      ],
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!user || user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return user;
}

async function getSignedPhotoUrl(path: string) {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient.storage
    .from(getStorageBucket())
    .createSignedUrl(path, 60 * 60);

  if (error || !data?.signedUrl) {
    console.error("Gift-card signed URL error:", error);

    return null;
  }

  return data.signedUrl;
}

async function getExchangeRate(currency: string) {
  if (currency === "USD") {
    return 1;
  }

  try {
    const response = await fetch(
      `https://api.frankfurter.app/latest?from=${encodeURIComponent(
        currency,
      )}&to=USD`,
      {
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      rates?: Record<string, number>;
    };

    const rate = Number(data.rates?.USD);

    return Number.isFinite(rate) && rate > 0 ? rate : null;
  } catch {
    return null;
  }
}

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminGiftCardDetailPage({
  params,
}: PageProps) {
  await requireAdmin();

  const { id } = await params;

  const submission = await prisma.giftCardSubmission.findUnique({
    where: {
      id,
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
      product: {
        include: {
          brand: true,
          denominations: {
            where: {
              active: true,
            },
            orderBy: {
              value: "asc",
            },
          },
        },
      },
      reviewedBy: {
        select: {
          fullName: true,
          email: true,
        },
      },
      cards: {
        orderBy: {
          sequence: "asc",
        },
      },
      transaction: {
        select: {
          id: true,
          reference: true,
          amount: true,
          currency: true,
          usdAmount: true,
          exchangeRate: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  if (!submission) {
    notFound();
  }

  const exchangeRate = await getExchangeRate(submission.currency);

  const estimatedUsdCredit =
    exchangeRate === null
      ? null
      : Number(submission.totalCreditAmount) * exchangeRate;

  const cards = await Promise.all(
    submission.cards.map(async (card) => {
      let decryptedCode: string | null = null;

      if (card.giftCardCodeHash && card.giftCardCode) {
        try {
          decryptedCode = decryptGiftCardCode(card.giftCardCode);
        } catch (error) {
          console.error(
            `Unable to decrypt gift-card code for card ${card.id}:`,
            error,
          );
        }
      }

      const photoUrl = card.photoPath
        ? await getSignedPhotoUrl(card.photoPath)
        : null;

      return {
        ...card,
        decryptedCode,
        photoUrl,
      };
    }),
  );

  const customerName =
    submission.user.fullName ||
    submission.user.email ||
    submission.user.phone ||
    "Unknown customer";

  const canReview =
    submission.status === "PENDING" ||
    submission.status === "PROCESSING";

  const isPending = submission.status === "PENDING";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Header */}
        <div>
          <Link
            href="/admin/gift-cards"
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Gift Cards
          </Link>

          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                <Gift className="h-6 w-6" />
              </div>

              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-amber-600">
                  MooGold Administration
                </p>

                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <h1 className="text-4xl font-black tracking-tight text-slate-900">
                    {submission.product.brand.name}
                  </h1>

                  <span
                    className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${getStatusClasses(
                      submission.status,
                    )}`}
                  >
                    {formatStatus(submission.status)}
                  </span>
                </div>

                <p className="mt-2 text-slate-500">
                  {submission.product.name}
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  Submitted {formatDate(submission.createdAt)}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Submission ID
              </p>

              <p className="mt-2 max-w-[280px] break-all font-mono text-xs font-semibold text-slate-700">
                {submission.id}
              </p>
            </div>
          </div>

          <p className="mt-4 max-w-3xl text-slate-500">
            Review the submitted gift cards, verify the information provided,
            and approve or reject the redemption request.
          </p>
        </div>

        {/* Overview */}
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {/* Customer */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                  Customer
                </p>

                <h2 className="mt-1 font-black text-slate-900">
                  {customerName}
                </h2>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {submission.user.email ? (
                <div className="flex items-start gap-3 text-sm text-slate-500">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="break-all">
                    {submission.user.email}
                  </span>
                </div>
              ) : null}

              {submission.user.phone ? (
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>{submission.user.phone}</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Submission summary */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Submission Summary
            </p>

            <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Cards
                </p>

                <p className="mt-1 text-2xl font-black text-slate-900">
                  {submission.quantity}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Currency
                </p>

                <p className="mt-1 text-2xl font-black text-slate-900">
                  {submission.currency}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Face Value
                </p>

                <p className="mt-1 font-bold text-slate-900">
                  {formatMoney(
                    Number(submission.totalFaceValue),
                    submission.currency,
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Credit Value
                </p>

                <p className="mt-1 font-bold text-slate-900">
                  {formatMoney(
                    Number(submission.totalCreditAmount),
                    submission.currency,
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* USD wallet credit */}
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
              Estimated Wallet Credit
            </p>

            {estimatedUsdCredit !== null ? (
              <>
                <p className="mt-3 text-3xl font-black text-emerald-950">
                  {formatMoney(estimatedUsdCredit, "USD")}
                </p>

                <p className="mt-2 text-sm font-semibold text-emerald-700">
                  1 {submission.currency} ={" "}
                  {exchangeRate?.toFixed(6)} USD
                </p>
              </>
            ) : (
              <p className="mt-4 text-sm font-semibold text-emerald-800">
                Current exchange rate unavailable.
              </p>
            )}

            <p className="mt-4 text-xs leading-5 text-emerald-700">
              The final wallet credit is calculated again during approval.
            </p>
          </div>
        </div>

        {/* Customer note */}
        {submission.description ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Customer Note
            </p>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {submission.description}
            </p>
          </div>
        ) : null}

        {/* Submitted cards */}
        <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
            <h2 className="text-xl font-black text-slate-900">
              Submitted Gift Cards
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Review each submitted card before processing the redemption.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {cards.map((card) => (
              <div key={card.id} className="p-6 sm:p-8">
                <div className="flex flex-col gap-8 xl:flex-row">
                  {/* Card information */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
                          Gift Card
                        </p>

                        <h3 className="mt-1 text-xl font-black text-slate-900">
                          Card {card.sequence}
                        </h3>
                      </div>

                      <div className="rounded-xl bg-slate-50 px-3 py-2 text-right">
                        <p className="text-xs font-semibold text-slate-400">
                          Face value
                        </p>

                        <p className="mt-1 font-black text-slate-900">
                          {formatMoney(
                            Number(card.faceValue),
                            submission.currency,
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-5 sm:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Redemption Credit
                        </p>

                        <p className="mt-2 font-black text-slate-900">
                          {formatMoney(
                            Number(card.creditAmount),
                            submission.currency,
                          )}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Submission Method
                        </p>

                        <p className="mt-2 font-bold text-slate-900">
                          {card.giftCardCode && card.photoPath
                            ? "Code + Photo"
                            : card.giftCardCode
                              ? "Code"
                              : card.photoPath
                                ? "Photo"
                                : "No card information"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Gift Card Code
                      </p>

                      {card.decryptedCode ? (
                        <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                          <code className="break-all text-sm font-semibold text-slate-800">
                            {card.decryptedCode}
                          </code>
                        </div>
                      ) : (
                        <div className="mt-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4">
                          <p className="text-sm text-slate-500">
                            No code submitted.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card photo */}
                  <div className="w-full xl:w-[360px]">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Card Photo
                    </p>

                    {card.photoUrl ? (
                      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                        <a
                          href={card.photoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative block"
                        >
                          <Image
                            src={card.photoUrl}
                            alt={`Gift card ${card.sequence}`}
                            width={640}
                            height={360}
                            unoptimized
                            className="max-h-[360px] w-full object-contain transition group-hover:opacity-90"
                          />

                          <div className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-xs font-bold text-slate-700 shadow-sm">
                            <ExternalLink className="h-3.5 w-3.5" />
                            Open full image
                          </div>
                        </a>
                      </div>
                    ) : (
                      <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                        <div>
                          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                            <ImageIcon className="h-6 w-6" />
                          </div>

                          <p className="mt-3 text-sm font-bold text-slate-700">
                            No photo submitted
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            This card was submitted without an image.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Review information */}
        {submission.reviewedBy ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Review Information
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Reviewed By
                </p>

                <p className="mt-1 font-bold text-slate-900">
                  {submission.reviewedBy.fullName ||
                    submission.reviewedBy.email ||
                    "Admin"}
                </p>
              </div>

              {submission.reviewedAt ? (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Reviewed On
                  </p>

                  <p className="mt-1 font-bold text-slate-900">
                    {formatDate(submission.reviewedAt)}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Rejection */}
        {submission.rejectionReason ? (
          <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                <XCircle className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-black text-red-950">
                  Rejection Reason
                </h2>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-red-800">
                  {submission.rejectionReason}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Completed transaction */}
        {submission.transaction ? (
          <div className="mt-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="font-black text-emerald-950">
                  Wallet Credit Completed
                </h2>

                <p className="mt-1 text-sm text-emerald-800">
                  The customer&apos;s wallet was credited successfully.
                </p>

                <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                      Transaction
                    </p>

                    <p className="mt-1 break-all font-mono text-xs font-semibold text-emerald-950">
                      {submission.transaction.reference}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                      USD Credited
                    </p>

                    <p className="mt-1 font-black text-emerald-950">
                      {submission.transaction.usdAmount !== null
                        ? formatMoney(
                            Number(submission.transaction.usdAmount),
                            "USD",
                          )
                        : "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                      Native Credit
                    </p>

                    <p className="mt-1 font-black text-emerald-950">
                      {formatMoney(
                        Number(submission.transaction.amount),
                        submission.transaction.currency,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                      Exchange Rate
                    </p>

                    <p className="mt-1 font-black text-emerald-950">
                      {submission.transaction.exchangeRate
                        ? Number(
                            submission.transaction.exchangeRate,
                          ).toFixed(8)
                        : "1"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Review actions */}
        {canReview ? (
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {/* Approve */}
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-black text-emerald-950">
                    Approve Submission
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-emerald-800">
                    Approving this submission will credit the eligible USD
                    amount to the customer&apos;s wallet.
                  </p>
                </div>
              </div>

              <form action={approveGiftCard} className="mt-6">
                <input
                  type="hidden"
                  name="submissionId"
                  value={submission.id}
                />

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve Gift Card
                </button>
              </form>
            </div>

            {/* Reject */}
            <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                  <XCircle className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-black text-red-950">
                    Reject Submission
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-red-800">
                    Provide a clear reason so the customer understands why
                    the submission was rejected.
                  </p>
                </div>
              </div>

              <form
                action={rejectGiftCard}
                className="mt-6 space-y-4"
              >
                <input
                  type="hidden"
                  name="submissionId"
                  value={submission.id}
                />

                <textarea
                  name="rejectionReason"
                  required
                  maxLength={500}
                  rows={4}
                  placeholder="Enter the reason for rejecting this submission..."
                  className="w-full resize-none rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                />

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-3.5 text-sm font-bold text-red-700 transition hover:bg-red-100"
                >
                  <XCircle className="h-4 w-4" />
                  Reject Gift Card
                </button>
              </form>
            </div>
          </div>
        ) : null}

        {/* Status notices */}
        {isPending ? (
          <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                <Clock3 className="h-5 w-5" />
              </div>

              <div>
                <h3 className="font-black text-amber-950">
                  Waiting for Administrative Review
                </h3>

                <p className="mt-1 text-sm text-amber-800">
                  This submission has not yet been reviewed.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {submission.status === "PROCESSING" ? (
          <div className="mt-8 rounded-3xl border border-blue-200 bg-blue-50 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                <Clock3 className="h-5 w-5" />
              </div>

              <div>
                <h3 className="font-black text-blue-950">
                  Submission Under Review
                </h3>

                <p className="mt-1 text-sm text-blue-800">
                  This submission is currently being reviewed by an
                  administrator.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Start review */}
        {isPending ? (
          <form action={startGiftCardReview}>
            <input
              type="hidden"
              name="submissionId"
              value={submission.id}
            />

            <button type="submit" className="hidden">
              Start review
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}