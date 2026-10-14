import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

import SpecialCardVerificationForm from "./special-card-verification-form";

export const dynamic = "force-dynamic";

export default async function SpecialCardVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ submissionId?: string }>;
}) {
  const params = await searchParams;
  const submissionId = String(params.submissionId ?? "").trim();

  if (!submissionId) {
    return (
      <main className="flex min-h-full items-center justify-center bg-[#f7faf8] px-4 py-8">
        <div className="w-full max-w-sm rounded-xl bg-white p-5 text-sm text-[#64756e] shadow-sm ring-1 ring-black/5">
          Verification request not found.
          <Link
            href="/dashboard/wealth-box"
            className="mt-4 inline-flex items-center gap-2 font-semibold text-[#173b2f]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Wealth Box
          </Link>
        </div>
      </main>
    );
  }

  const currentUser = await getCurrentUser();

  const submission = await prisma.wealthSpecialCardSubmission.findFirst({
    where: {
      id: submissionId,
      userId: currentUser.user.id,
    },
    select: {
      id: true,
      status: true,
      rejectionReason: true,
    },
  });

  if (!submission) {
    return (
      <main className="flex min-h-full items-center justify-center bg-[#f7faf8] px-4 py-8">
        <section className="w-full max-w-sm rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <h1 className="text-base font-semibold text-[#173b2f]">
            Verification unavailable
          </h1>
          <p className="mt-2 text-sm text-[#71827b]">
            We could not find this request.
          </p>
          <Link
            href="/dashboard/wealth-box"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#173b2f]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Wealth Box
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-full items-center justify-center bg-[#f7faf8] px-4 py-8">
      <div className="w-full max-w-sm">
        <Link
          href="/dashboard/wealth-box"
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#64756e] transition hover:text-[#173b2f]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>

        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eaf4ee] text-[#176b4d]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-[#173b2f]">
                Verify your card
              </h1>
              <p className="mt-0.5 text-xs text-[#71827b]">
                Enter the code to continue.
              </p>
            </div>
          </div>

          <SpecialCardVerificationForm
            submissionId={submission.id}
            initialError={
              submission.rejectionReason === "INCORRECT_CODE_RETRY"
                ? "Incorrect code. Please enter the correct six-digit code."
                : ""
            }
/>
        </section>
      </div>
    </main>
  );
}
