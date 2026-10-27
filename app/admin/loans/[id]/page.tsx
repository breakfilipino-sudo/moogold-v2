import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { approveRegularLoan, rejectRegularLoan } from "../actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ result?: string }>;
};

function money(value: string, currency: string) {
  return `${currency} ${Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function label(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function AdminLoanDetailPage({ params, searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const admin = await prisma.user.findUnique({
    where: { authUserId: authUser.id },
    select: { role: true },
  });

  if (!admin || admin.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;
  const query = await searchParams;

  const application = await prisma.regularLoanApplication.findUnique({
    where: { id },
    include: {
      user: {
        select: {
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
          originalName: true,
          mimeType: true,
          sizeBytes: true,
          createdAt: true,
        },
      },
      reviewedBy: { select: { fullName: true } },
    },
  });

  if (!application) notFound();

  const bucket =
    process.env.VERIFICATION_STORAGE_BUCKET?.trim() || "verification-documents";
  const storage = createAdminClient();

  const documents = await Promise.all(
    application.documents.map(async (document) => {
      const { data, error } = await storage.storage
        .from(bucket)
        .createSignedUrl(document.storagePath, 60 * 10);

      return {
        ...document,
        signedUrl: error ? null : data.signedUrl,
      };
    }),
  );

  const canReview = application.status === "PENDING_REVIEW";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/admin/loans" className="text-sm font-semibold text-slate-500 hover:text-slate-900">
          ← All loan applications
        </Link>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                {application.loanType} loan
              </p>
              <h1 className="mt-2 text-2xl font-black text-slate-900">Application review</h1>
              <p className="mt-2 break-all text-xs text-slate-400">ID: {application.id}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
              {label(application.status)}
            </span>
          </div>

          {query.result === "approved" && (
            <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
              Offer saved. The customer must accept it before funds are credited.
            </p>
          )}
          {query.result === "rejected" && (
            <p className="mt-5 rounded-xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">
              Application rejected.
            </p>
          )}

          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <section className="rounded-xl bg-slate-50 p-4">
              <h2 className="font-bold text-slate-900">Applicant</h2>
              <p className="mt-3 text-sm text-slate-700">{application.user.fullName || "Name unavailable"}</p>
              <p className="mt-1 break-words text-sm text-slate-600">{application.user.email || "No email listed"}</p>
              <p className="mt-1 text-sm text-slate-600">{application.user.phone || "No phone listed"}</p>
              <p className="mt-1 text-sm text-slate-600">Registered country: {application.user.countryCode}</p>
            </section>

            <section className="rounded-xl bg-slate-50 p-4">
              <h2 className="font-bold text-slate-900">Requested loan</h2>
              <p className="mt-3 text-sm text-slate-600">Requested amount</p>
              <p className="text-xl font-black text-slate-900">
                {money(application.requestedAmount.toString(), application.currency)}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Term: {application.termMonths} months
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Requested rate: {application.requestedInterestRate.toString()}%
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Requested total repayment: {money(application.requestedTotalRepayment.toString(), application.currency)}
              </p>
            </section>
          </div>

          <section className="mt-8">
            <h2 className="text-lg font-black text-slate-900">Submitted documents</h2>
            <p className="mt-1 text-sm text-slate-500">
              Private document links expire after 10 minutes.
            </p>

            {documents.length === 0 ? (
              <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                No document records were found. Review cannot be completed until the required documentation is available.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {documents.map((document) => (
                  <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
                    <div>
                      <p className="font-semibold text-slate-900">{label(document.type)}</p>
                      <p className="mt-1 break-all text-sm text-slate-600">{document.originalName}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {document.mimeType} · {(document.sizeBytes / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    {document.signedUrl ? (
                      <a
                        href={document.signedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                      >
                        Open document
                      </a>
                    ) : (
                      <span className="text-sm font-semibold text-red-700">Document unavailable</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {canReview && (
            <div className="mt-8 grid gap-6 border-t border-slate-200 pt-7 lg:grid-cols-2">
              <form action={approveRegularLoan} className="rounded-xl border border-emerald-200 p-5">
                <h2 className="text-lg font-black text-slate-900">Approve with offer</h2>
                <p className="mt-2 text-sm text-slate-600">
                  The offer cannot exceed the requested amount. Interest is fixed by the selected term.
                </p>
                <input type="hidden" name="applicationId" value={application.id} />
                <label htmlFor="offerAmount" className="mt-5 block text-sm font-semibold text-slate-700">
                  Offer amount ({application.currency})
                </label>
                <input
                  id="offerAmount"
                  name="offerAmount"
                  type="number"
                  min={application.loanType === "PERSONAL" ? "1000" : "50000"}
                  max={application.requestedAmount.toString()}
                  step="0.01"
                  required
                  defaultValue={application.requestedAmount.toString()}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-slate-900"
                />
                <button type="submit" className="mt-4 w-full rounded-lg bg-emerald-700 px-4 py-3 font-bold text-white hover:bg-emerald-800">
                  Approve offer
                </button>
              </form>

              <form action={rejectRegularLoan} className="rounded-xl border border-red-200 p-5">
                <h2 className="text-lg font-black text-slate-900">Reject application</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Record a clear reason for the decision.
                </p>
                <input type="hidden" name="applicationId" value={application.id} />
                <label htmlFor="rejectionReason" className="mt-5 block text-sm font-semibold text-slate-700">
                  Rejection reason
                </label>
                <textarea
                  id="rejectionReason"
                  name="rejectionReason"
                  required
                  maxLength={500}
                  rows={4}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-slate-900"
                  placeholder="Explain why this application is being rejected"
                />
                <button type="submit" className="mt-4 w-full rounded-lg bg-red-700 px-4 py-3 font-bold text-white hover:bg-red-800">
                  Reject application
                </button>
              </form>
            </div>
          )}

          {!canReview && (
            <section className="mt-8 rounded-xl bg-slate-50 p-5">
              <h2 className="font-bold text-slate-900">Review decision</h2>
              <p className="mt-2 text-sm text-slate-600">
                Reviewed {application.reviewedAt ? `on ${application.reviewedAt.toLocaleString()}` : "date unavailable"}
                {application.reviewedBy?.fullName ? ` by ${application.reviewedBy.fullName}` : ""}.
              </p>
              {application.offerAmount && (
                <>
                  <p className="mt-3 text-sm text-slate-700">
                    Offer: {money(application.offerAmount.toString(), application.currency)}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    Total repayment: {application.offerTotalRepayment
                      ? money(application.offerTotalRepayment.toString(), application.currency)
                      : "Not set"}
                  </p>
                </>
              )}
              {application.rejectionReason && (
                <p className="mt-3 text-sm text-slate-700">
                  Reason: {application.rejectionReason}
                </p>
              )}
              {application.offerAcceptedAt && (
                <p className="mt-3 text-sm text-emerald-700">
                  Customer accepted the offer on {application.offerAcceptedAt.toLocaleString()}.
                </p>
              )}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}