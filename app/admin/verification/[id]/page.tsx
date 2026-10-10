import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  IdCard,
  Mail,
  MapPin,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";

import {
  approveVerification,
  rejectVerification,
  requestMoreInformation,
} from "../actions";

import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type AdminVerificationDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDate(date: Date | null) {
  if (!date) {
    return "Not provided";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDateOnly(date: Date | null) {
  if (!date) {
    return "Not provided";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatTier(tier: string) {
  switch (tier) {
    case "TIER_2":
      return "Tier 2 — Verified";

    case "TIER_3":
      return "Tier 3 — Enhanced";

    default:
      return "Tier 1 — Basic";
  }
}

function formatDocumentType(type: string) {
  switch (type) {
    case "NATIONAL_ID":
      return "Government ID";

    case "PASSPORT":
      return "Passport";

    case "DRIVERS_LICENSE":
      return "Driver's License";

    case "RESIDENCE_PERMIT":
      return "Residence Permit";

    case "SELFIE":
      return "Live Selfie";

    default:
      return "Identity Document";
  }
}

function getStatusClasses(status: string) {
  switch (status) {
    case "VERIFIED":
      return "bg-emerald-100 text-emerald-700";

    case "REJECTED":
      return "bg-red-100 text-red-700";

    case "MORE_INFORMATION_REQUIRED":
      return "bg-orange-100 text-orange-700";

    case "UNDER_REVIEW":
      return "bg-blue-100 text-blue-700";

    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getDocumentStatusClasses(status: string) {
  switch (status) {
    case "APPROVED":
      return "bg-emerald-100 text-emerald-700";

    case "REJECTED":
      return "bg-red-100 text-red-700";

    default:
      return "bg-amber-100 text-amber-700";
  }
}

async function getAdmin() {
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
    },
  });

  if (!admin || admin.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return admin;
}

export default async function AdminVerificationDetailPage({
  params,
}: AdminVerificationDetailPageProps) {
  await getAdmin();

  const { id } = await params;

  const verification = await prisma.userVerification.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      userId: true,
      tier: true,
      status: true,
      dateOfBirth: true,
      countryCode: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      stateProvince: true,
      postalCode: true,
      submittedAt: true,
      reviewedAt: true,
      rejectionReason: true,
      informationRequest: true,

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
          storagePath: true,
          status: true,
          rejectionReason: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },

      checks: {
        select: {
          id: true,
          type: true,
          status: true,
          result: true,
          checkedAt: true,
        },
        orderBy: {
          checkedAt: "desc",
        },
      },
    },
  });

  if (!verification) {
    notFound();
  }

  const bucket =
    process.env.VERIFICATION_STORAGE_BUCKET ||
    "verification-documents";

  const adminSupabase = createAdminClient();

  const documentsWithUrls = await Promise.all(
    verification.documents.map(async (document) => {
      const { data, error } =
        await adminSupabase.storage
          .from(bucket)
          .createSignedUrl(document.storagePath, 60 * 10);

      return {
        ...document,
        signedUrl:
          error || !data
            ? null
            : data.signedUrl,
      };
    }),
  );

  const identityDocument = documentsWithUrls.find(
    (document) =>
      document.type === "NATIONAL_ID" ||
      document.type === "PASSPORT" ||
      document.type === "DRIVERS_LICENSE" ||
      document.type === "RESIDENCE_PERMIT" ||
      document.type === "OTHER",
  );

  const selfieDocument = documentsWithUrls.find(
    (document) => document.type === "SELFIE",
  );

  const approveTier2 = approveVerification.bind(
    null,
    verification.id,
  );

  const approveTier3 = approveVerification.bind(
    null,
    verification.id,
  );

  const reject = rejectVerification.bind(
    null,
    verification.id,
  );

  const requestInformation =
    requestMoreInformation.bind(
      null,
      verification.id,
    );

  const isVerified =
    verification.status === "VERIFIED";

  const canReview =
    verification.status === "UNDER_REVIEW" ||
    verification.status === "IN_PROGRESS" ||
    verification.status ===
      "MORE_INFORMATION_REQUIRED";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
        {/* Header */}
        <div>
          <Link
            href="/admin/verification"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Verification
          </Link>

          <div className="mt-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
                Identity &amp; Compliance
              </p>

              <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900">
                Verification Review
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Review the customer&apos;s identity
                submission before making a verification
                decision.
              </p>
            </div>

            <div
              className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${getStatusClasses(
                verification.status,
              )}`}
            >
              {verification.status === "VERIFIED" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : verification.status === "REJECTED" ? (
                <XCircle className="h-4 w-4" />
              ) : (
                <Clock3 className="h-4 w-4" />
              )}

              {verification.status.replaceAll("_", " ")}
            </div>
          </div>
        </div>

        {/* Customer summary */}
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm lg:col-span-2">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <User className="h-7 w-7" />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Customer
                </p>

                <h2 className="mt-1 text-2xl font-black text-slate-900">
                  {verification.user.fullName ||
                    "MooGold Customer"}
                </h2>

                <div className="mt-4 space-y-2">
                  {verification.user.email ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Mail className="h-4 w-4 shrink-0" />
                      <span className="break-all">
                        {verification.user.email}
                      </span>
                    </div>
                  ) : null}

                  {verification.user.phone ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span className="flex h-4 w-4 items-center justify-center text-xs font-black">
                        #
                      </span>
                      {verification.user.phone}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Current tier
                </p>

                <p className="mt-2 font-bold text-slate-900">
                  {formatTier(verification.tier)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Registered country
                </p>

                <p className="mt-2 font-bold text-slate-900">
                  {verification.user.countryCode ||
                    verification.countryCode ||
                    "Not provided"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Account created
                </p>

                <p className="mt-2 font-bold text-slate-900">
                  {formatDateOnly(
                    verification.user.createdAt,
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-slate-950 p-7 text-white shadow-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-400">
                  Verification status
                </p>

                <h2 className="mt-1 text-xl font-black">
                  {formatTier(verification.tier)}
                </h2>
              </div>
            </div>

            <div className="mt-8 border-t border-white/10 pt-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Submitted
              </p>

              <p className="mt-2 text-sm font-bold text-white">
                {formatDate(verification.submittedAt)}
              </p>
            </div>

            <div className="mt-6 border-t border-white/10 pt-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Reviewed
              </p>

              <p className="mt-2 text-sm font-bold text-white">
                {formatDate(verification.reviewedAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Personal information */}
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <FileText className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-900">
                Customer Information
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Information submitted for identity verification.
              </p>
            </div>
          </div>

          <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Full name
              </p>

              <p className="mt-2 font-bold text-slate-900">
                {verification.user.fullName ||
                  "Not provided"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Date of birth
              </p>

              <p className="mt-2 font-bold text-slate-900">
                {formatDateOnly(
                  verification.dateOfBirth,
                )}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Country
              </p>

              <p className="mt-2 font-bold text-slate-900">
                {verification.countryCode ||
                  verification.user.countryCode ||
                  "Not provided"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                User ID
              </p>

              <p className="mt-2 break-all font-mono text-xs font-bold text-slate-700">
                {verification.user.id}
              </p>
            </div>
          </div>
        </div>

        {/* Address record */}
        {(verification.addressLine1 ||
          verification.city ||
          verification.stateProvince ||
          verification.postalCode) && (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <MapPin className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Address Record
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Address information currently stored on
                  the verification record.
                </p>
              </div>
            </div>

            <div className="mt-6 text-sm leading-7 text-slate-700">
              {verification.addressLine1 ? (
                <p>{verification.addressLine1}</p>
              ) : null}

              {verification.addressLine2 ? (
                <p>{verification.addressLine2}</p>
              ) : null}

              <p>
                {[
                  verification.city,
                  verification.stateProvince,
                  verification.postalCode,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
          </div>
        )}

        {/* Submitted documents */}
        <div className="mt-8">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Submitted evidence
            </p>

            <h2 className="mt-1 text-2xl font-black text-slate-900">
              Identity Documents
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Review the government ID and live selfie submitted
              by the customer.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Government ID */}
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                    <IdCard className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="font-black text-slate-900">
                      Government ID
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      {identityDocument
                        ? formatDocumentType(
                            identityDocument.type,
                          )
                        : "Not submitted"}
                    </p>
                  </div>
                </div>

                {identityDocument ? (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${getDocumentStatusClasses(
                      identityDocument.status,
                    )}`}
                  >
                    {identityDocument.status}
                  </span>
                ) : null}
              </div>

              <div className="bg-slate-100">
                {identityDocument?.signedUrl ? (
                  <div className="flex min-h-[360px] items-center justify-center p-4">
                    <Image
                      src={identityDocument.signedUrl}
                      alt="Customer government identification"
                      width={1200}
                      height={900}
                      unoptimized
                      className="max-h-[520px] max-w-full rounded-2xl object-contain shadow-sm"
                    />
                  </div>
                ) : (
                  <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
                    <FileCheck2 className="h-10 w-10 text-slate-300" />

                    <p className="mt-4 font-bold text-slate-700">
                      Government ID unavailable
                    </p>

                    <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                      The submitted document could not be loaded
                      from secure storage.
                    </p>
                  </div>
                )}
              </div>

              {identityDocument?.rejectionReason ? (
                <div className="border-t border-red-100 bg-red-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-red-600">
                    Document issue
                  </p>

                  <p className="mt-2 text-sm leading-6 text-red-700">
                    {identityDocument.rejectionReason}
                  </p>
                </div>
              ) : null}
            </div>

            {/* Selfie */}
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <User className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="font-black text-slate-900">
                      Live Selfie
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Camera capture
                    </p>
                  </div>
                </div>

                {selfieDocument ? (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${getDocumentStatusClasses(
                      selfieDocument.status,
                    )}`}
                  >
                    {selfieDocument.status}
                  </span>
                ) : null}
              </div>

              <div className="bg-slate-100">
                {selfieDocument?.signedUrl ? (
                  <div className="flex min-h-[360px] items-center justify-center p-4">
                    <Image
                      src={selfieDocument.signedUrl}
                      alt="Customer verification selfie"
                      width={900}
                      height={1200}
                      unoptimized
                      className="max-h-[520px] max-w-full rounded-2xl object-contain shadow-sm"
                    />
                  </div>
                ) : (
                  <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
                    <User className="h-10 w-10 text-slate-300" />

                    <p className="mt-4 font-bold text-slate-700">
                      Selfie unavailable
                    </p>

                    <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                      The submitted selfie could not be loaded
                      from secure storage.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Verification checks */}
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-900">
                Verification Checks
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Internal checks recorded for this submission.
              </p>
            </div>
          </div>

          {verification.checks.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
              No verification checks have been recorded yet.
            </div>
          ) : (
            <div className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-100">
              {verification.checks.map((check) => (
                <div
                  key={check.id}
                  className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-bold text-slate-900">
                      {check.type.replaceAll("_", " ")}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {formatDate(check.checkedAt)}
                    </p>

                    {check.result ? (
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {check.result}
                      </p>
                    ) : null}
                  </div>

                  <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
                      check.status === "PASSED"
                        ? "bg-emerald-100 text-emerald-700"
                        : check.status === "FAILED"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {check.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

              <div>
                <p className="font-bold text-amber-950">
                  Liveness status
                </p>

                <p className="mt-1 text-sm leading-6 text-amber-800">
                  Camera capture confirms that the submitted image
                  originated from the live camera flow. Actual
                  biometric liveness detection remains pending
                  until a dedicated liveness engine is integrated.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Existing decision messages */}
        {verification.rejectionReason ? (
          <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <div>
                <p className="font-bold text-red-950">
                  Rejection reason
                </p>

                <p className="mt-2 text-sm leading-6 text-red-700">
                  {verification.rejectionReason}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {verification.informationRequest ? (
          <div className="mt-8 rounded-3xl border border-orange-200 bg-orange-50 p-6">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />

              <div>
                <p className="font-bold text-orange-950">
                  Information requested
                </p>

                <p className="mt-2 text-sm leading-6 text-orange-700">
                  {verification.informationRequest}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Administrative actions */}
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Administrative decision
            </p>

            <h2 className="mt-1 text-2xl font-black text-slate-900">
              Review Actions
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Choose the appropriate verification outcome after
              reviewing the customer information and submitted
              documents.
            </p>
          </div>

          {isVerified ? (
            <div className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

                <div>
                  <p className="font-bold text-emerald-950">
                    Verification approved
                  </p>

                  <p className="mt-1 text-sm leading-6 text-emerald-700">
                    This customer is currently verified as{" "}
                    <strong>
                      {formatTier(verification.tier)}
                    </strong>
                    .
                  </p>
                </div>
              </div>
            </div>
          ) : !canReview ? (
            <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <p className="font-bold text-slate-900">
                No review action is available
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                This verification is currently in a state that
                does not allow administrative review.
              </p>
            </div>
          ) : (
            <div className="mt-7 space-y-6">
              {/* Approvals */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

                  <div>
                    <h3 className="font-black text-emerald-950">
                      Approve verification
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-emerald-800">
                      Approve the customer after reviewing the
                      submitted identity evidence.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <form action={approveTier2}>
                    <input
                      type="hidden"
                      name="tier"
                      value="TIER_2"
                    />

                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-black text-white transition hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve Tier 2
                    </button>
                  </form>

                  <form action={approveTier3}>
                    <input
                      type="hidden"
                      name="tier"
                      value="TIER_3"
                    />

                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:bg-slate-800"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Approve Tier 3
                    </button>
                  </form>
                </div>
              </div>

              {/* More information */}
              <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6">
                <h3 className="font-black text-orange-950">
                  Request more information
                </h3>

                <p className="mt-1 text-sm leading-6 text-orange-800">
                  Ask the customer to provide additional information
                  before a final decision is made.
                </p>

                <form
                  action={requestInformation}
                  className="mt-5"
                >
                  <textarea
                    name="message"
                    required
                    minLength={5}
                    rows={4}
                    placeholder="Explain what additional information is required..."
                    className="w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                  />

                  <button
                    type="submit"
                    className="mt-3 inline-flex items-center justify-center rounded-2xl bg-orange-600 px-5 py-3 text-sm font-black text-white transition hover:bg-orange-700"
                  >
                    Request More Information
                  </button>
                </form>
              </div>

              {/* Reject */}
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
                <h3 className="font-black text-red-950">
                  Reject verification
                </h3>

                <p className="mt-1 text-sm leading-6 text-red-800">
                  Provide a clear reason for rejecting this
                  verification submission.
                </p>

                <form
                  action={reject}
                  className="mt-5"
                >
                  <textarea
                    name="reason"
                    required
                    minLength={5}
                    rows={4}
                    placeholder="Explain why this verification is being rejected..."
                    className="w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                  />

                  <button
                    type="submit"
                    className="mt-3 inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject Verification
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Record footer */}
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Submitted{" "}
              {formatDate(verification.submittedAt)}
            </div>

            <div className="break-all font-mono text-xs text-slate-400">
              Verification ID: {verification.id}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}