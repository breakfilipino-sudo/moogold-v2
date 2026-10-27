import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  UserRound,
  Wallet,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { decryptSpecialCardValue } from "@/lib/helpers/special-card-security";
import SpecialCardAdminControls from "./special-card-admin-controls";

export const dynamic = "force-dynamic";

function formatMoney(value: unknown, currency: string) {
  const amount = Number(value);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: /^[A-Z]{3}$/.test(currency) ? currency : "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: Date | null | undefined) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function decryptSafely(value: string | null | undefined) {
  if (!value?.trim()) return null;

  try {
    return decryptSpecialCardValue(value);
  } catch {
    return value;
  }
}

export default async function SpecialCardReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const admin = await prisma.user.findUnique({
    where: { authUserId: authUser.id },
    select: { role: true },
  });

  if (admin?.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;

  const submission = await prisma.wealthSpecialCardSubmission.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      fundingId: true,
      principalLocal: true,
      principalUsd: true,
      localCurrency: true,
      projectedProfitUsd: true,
      maturityAmountUsd: true,
      durationDays: true,
      payoutDate: true,
      verificationCodeIssuedAt: true,
      verificationCodeExpiresAt: true,
      verifiedAt: true,
      failedAttempts: true,
      lastCodeRequestAt: true,
      reviewedAt: true,
      rejectionReason: true,
      createdAt: true,
      updatedAt: true,
      cardNumberEncrypted: true,
      membershipNumberEncrypted: true,
      expirationDate: true,
      verificationCodeHash: true,
      user: {
        select: {
          fullName: true,
          email: true,
          phone: true,
        },
      },
      plan: {
        select: {
          name: true,
          durationDays: true,
        },
      },
      reviewedBy: {
        select: {
          fullName: true,
          email: true,
        },
      },
    },
  });

  if (!submission) notFound();

  const canReview =
    !submission.fundingId &&
    ["PENDING_REVIEW", "CODE_ISSUED", "EXPIRED"].includes(
      submission.status,
    );

  const customerName =
    submission.user.fullName?.trim() ||
    submission.user.email ||
    "Customer";

  const cardNumber = decryptSafely(submission.cardNumberEncrypted);
  const membershipNumber = decryptSafely(submission.membershipNumberEncrypted);

  const rawRecord = submission as Record<string, unknown>;
const rawCode =
  (typeof rawRecord.verificationCode === "string" && rawRecord.verificationCode) ||
  (typeof rawRecord.code === "string" && rawRecord.code) ||
  (typeof rawRecord.verificationCodeHash === "string" && rawRecord.verificationCodeHash) ||
  null;

// Attempt to decrypt if encrypted, or return raw string
const codeValue = decryptSafely(rawCode) || rawCode;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          href="/admin/wealth-box"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Wealth Box
        </Link>

        <header className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
            Wealth Box · Admin review
          </p>

          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-black sm:text-3xl">
                Special Card submission
              </h1>

              <p className="mt-2 break-all text-sm text-slate-300">
                Reference: {submission.id}
              </p>
            </div>

            <span className="inline-flex w-fit rounded-full bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-wide">
              {statusLabel(submission.status)}
            </span>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="rounded-2xl bg-slate-100 p-3">
                <UserRound className="h-5 w-5 text-slate-700" />
              </span>

              <h2 className="text-lg font-black text-slate-900">
                Customer details
              </h2>
            </div>

            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="text-slate-500">Name</dt>
                <dd className="mt-1 font-bold text-slate-900">
                  {customerName}
                </dd>
              </div>

              <div>
                <dt className="text-slate-500">Email</dt>
                <dd className="mt-1 break-all font-semibold text-slate-900">
                  {submission.user.email || "Not provided"}
                </dd>
              </div>

              <div>
                <dt className="text-slate-500">Registered phone</dt>
                <dd className="mt-1 font-semibold text-slate-900">
                  {submission.user.phone || "Not provided"}
                </dd>
              </div>
            </dl>

            <div className="mt-6 border-t border-slate-100 pt-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
                <CreditCard className="h-4 w-4" />
                Submitted Card Information
              </div>

              <div className="mt-3 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Special Card Number
                  </p>

                  <p className="mt-1 break-all font-mono text-sm font-bold text-slate-950">
                    {cardNumber || "Unavailable"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Membership Number
                  </p>

                  <p className="mt-1 break-all font-mono text-sm font-bold text-slate-950">
                    {membershipNumber || "Unavailable"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Expiration Date
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-950">
                    {submission.expirationDate || "Not provided"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Six-Digit Verification Status
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    {submission.verifiedAt
                      ? "Verification approved"
                      : submission.status === "REJECTED"
                        ? "Verification rejected"
                        : submission.status === "EXPIRED"
                          ? "Verification expired"
                          : "Awaiting admin review"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="rounded-2xl bg-emerald-50 p-3">
                <Wallet className="h-5 w-5 text-emerald-700" />
              </span>

              <h2 className="text-lg font-black text-slate-900">
                Funding summary
              </h2>
            </div>

            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="text-slate-500">Wealth Box plan</dt>
                <dd className="mt-1 font-bold text-slate-900">
                  {submission.plan.name}
                </dd>
              </div>

              <div>
                <dt className="text-slate-500">Submitted amount</dt>
                <dd className="mt-1 text-xl font-black text-slate-950">
                  {formatMoney(
                    submission.principalLocal,
                    submission.localCurrency,
                  )}
                </dd>
                <dd className="mt-1 text-slate-500">
                  USD equivalent:{" "}
                  {formatMoney(submission.principalUsd, "USD")}
                </dd>
              </div>

              <div>
                <dt className="text-slate-500">Duration</dt>
                <dd className="mt-1 font-bold text-slate-900">
                  {submission.plan.durationDays} days
                </dd>
              </div>

              <div>
                <dt className="text-slate-500">Projected profit (USD)</dt>
                <dd className="mt-1 font-bold text-slate-900">
                  {formatMoney(submission.projectedProfitUsd, "USD")}
                </dd>
              </div>

              <div>
                <dt className="text-slate-500">
                  Projected maturity amount (USD)
                </dt>
                <dd className="mt-1 font-bold text-slate-900">
                  {formatMoney(submission.maturityAmountUsd, "USD")}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-slate-600" />

            <h2 className="text-lg font-black text-slate-900">
              Submission history
            </h2>
          </div>

          <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-slate-500">Submitted</p>
              <p className="mt-1 font-semibold text-slate-900">
                {formatDate(submission.createdAt)}
              </p>
            </div>

            <div>
              <p className="text-slate-500">Last updated</p>
              <p className="mt-1 font-semibold text-slate-900">
                {formatDate(submission.updatedAt)}
              </p>
            </div>

            <div>
              <p className="text-slate-500">Attempts submitted</p>
              <p className="mt-1 font-semibold text-slate-900">
                {submission.failedAttempts} of 5
              </p>
            </div>

            <div>
              <p className="text-slate-500">Last customer attempt</p>
              <p className="mt-1 font-semibold text-slate-900">
                {formatDate(submission.lastCodeRequestAt)}
              </p>
            </div>

            <div>
              <p className="text-slate-500">Verification code issued</p>
              <p className="mt-1 font-semibold text-slate-900">
                {formatDate(submission.verificationCodeIssuedAt)}
              </p>
            </div>

            <div>
              <p className="text-slate-500">Verification code expires</p>
              <p className="mt-1 font-semibold text-slate-900">
                {formatDate(submission.verificationCodeExpiresAt)}
              </p>
            </div>

            <div>
              <p className="text-slate-500">Verified</p>
              <p className="mt-1 font-semibold text-slate-900">
                {formatDate(submission.verifiedAt)}
              </p>
            </div>

            <div>
              <p className="text-slate-500">Reviewed</p>
              <p className="mt-1 font-semibold text-slate-900">
                {formatDate(submission.reviewedAt)}
                {submission.reviewedBy
                  ? ` · ${
                      submission.reviewedBy.fullName ||
                      submission.reviewedBy.email ||
                      "Admin"
                    }`
                  : ""}
              </p>
            </div>
          </div>

          {submission.rejectionReason &&
            submission.rejectionReason !== "INCORRECT_CODE_RETRY" && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="font-bold text-red-900">
                  Rejection reason
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-red-800">
                  {submission.rejectionReason}
                </p>
              </div>
            )}
        </section>

        {submission.fundingId && (
          <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-700" />
              <h2 className="font-black text-emerald-950">
                Funding record created
              </h2>
            </div>

            <p className="mt-2 text-sm text-emerald-900">
              This submission has a linked funding record. Continue reviewing
              it in the existing funding workflow.
            </p>

            <Link
              href={`/admin/wealth-box/${submission.fundingId}`}
              className="mt-4 inline-flex rounded-xl bg-emerald-800 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-900"
            >
              Open funding record
            </Link>
          </section>
        )}

        {canReview && (
          <SpecialCardAdminControls
            submissionId={submission.id}
            verificationCode={codeValue ?? undefined}
          />
        )}

        {!canReview && !submission.fundingId && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-3">
              <Clock3 className="h-5 w-5 text-slate-500" />
              <p className="font-semibold text-slate-700">
                This submission is no longer available for review actions.
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}