"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ShieldAlert,
  XCircle,
} from "lucide-react";

import {
  approveSpecialCardVerification,
  markSpecialCardCodeIncorrect,
  rejectSpecialCardSubmission,
} from "../../actions";

type Props = {
  submissionId: string;
  status: string;
  phone: string | null;
  failedAttempts: number;
  lastCodeRequestAt: string | null;
};

const rejectionOptions = [
  {
    label: "Insufficient funds",
    reason: "Insufficient funds",
  },
  {
    label: "Wrong card details",
    reason: "Wrong card details",
  },
];

export function SpecialCardAdminControls({
  submissionId,
  status,
  failedAttempts,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const canVerify =
    failedAttempts > 0 &&
    failedAttempts < 5 &&
    ["PENDING_REVIEW", "CODE_ISSUED", "EXPIRED"].includes(status);

  const canReject =
    ["PENDING_REVIEW", "CODE_ISSUED", "EXPIRED"].includes(status);

  function runAction(
    action: (formData: FormData) => Promise<{ success: true }>,
    successMessage: string,
    reason?: string,
  ) {
    setError(null);
    setNotice(null);

    const formData = new FormData();
    formData.set("submissionId", submissionId);
    if (reason) formData.set("reason", reason);

    startTransition(async () => {
      try {
        await action(formData);
        setNotice(successMessage);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not update this submission.",
        );
      }
    });
  }

  const verificationLabel =
    status === "VERIFIED"
      ? "Verification successful"
      : status === "CODE_ISSUED"
        ? "Awaiting manual review"
        : status === "EXPIRED"
          ? "Verification expired"
          : status === "REJECTED"
            ? "Submission rejected"
            : "Awaiting manual review";

  return (
    <section className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="rounded-2xl bg-emerald-50 p-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-700" />
          </span>
          <div>
            <h2 className="text-lg font-black text-slate-900">
              Verification review
            </h2>
            <p className="text-sm text-slate-500">
              Confirm the result after manually checking the code.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Customer-entered code
          </p>
          <p
            className="mt-2 font-mono text-2xl font-black tracking-[0.25em] text-slate-800"
            aria-label="Verification digits hidden"
          >
            ******
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Submitted digits are never displayed or compared automatically.
            Admins must verify the result manually.
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-500">
            Current status
          </p>
          <p className="mt-1 font-bold text-slate-900">
            {verificationLabel}
          </p>
          <p className="mt-3 text-sm text-slate-600">
            Submitted attempts: {failedAttempts} of 5
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            runAction(
              approveSpecialCardVerification,
              "Verification approved. Funding is pending separate admin approval.",
            )
          }
          disabled={isPending || !canVerify}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" />
          {isPending ? "Processing..." : "Verification successful"}
        </button>

        <button
          type="button"
          onClick={() =>
            runAction(
              markSpecialCardCodeIncorrect,
              "The attempt was marked incorrect. The customer has been notified to retry.",
            )
          }
          disabled={isPending || !canVerify}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3 font-bold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShieldAlert className="h-4 w-4" />
          {isPending ? "Processing..." : "Verification code incorrect"}
        </button>

        {!canVerify && canReject && failedAttempts === 0 && (
          <p className="mt-3 text-xs leading-5 text-slate-500">
            The customer must submit a verification attempt before you can
            confirm success or mark a code incorrect.
          </p>
        )}

        {failedAttempts >= 5 && (
          <p className="mt-3 text-xs leading-5 text-red-700">
            The five-attempt limit has been reached. Verification approval and
            retry are disabled.
          </p>
        )}

        <button
          type="button"
          onClick={() => router.refresh()}
          disabled={isPending}
          className="mt-4 w-full rounded-2xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Refresh verification status
        </button>
      </div>

      <div className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="rounded-2xl bg-red-50 p-3">
            <XCircle className="h-5 w-5 text-red-700" />
          </span>
          <div>
            <h2 className="text-lg font-black text-slate-900">
              Reject submission
            </h2>
            <p className="text-sm text-slate-500">
              Choose the confirmed reason for rejection.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {rejectionOptions.map((option) => (
            <button
              key={option.reason}
              type="button"
              onClick={() =>
                runAction(
                  rejectSpecialCardSubmission,
                  `Submission rejected: ${option.reason}.`,
                  option.reason,
                )
              }
              disabled={isPending || !canReject}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-700 px-5 py-3 font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />
              {isPending ? "Processing..." : option.label}
            </button>
          ))}
        </div>

        <p className="mt-4 text-xs leading-5 text-slate-500">
          Rejection notifies the customer and closes the submission. A linked
          funding record must be handled through the existing funding workflow.
        </p>
      </div>

      {(error || notice) && (
        <div
          role={error ? "alert" : "status"}
          className={`rounded-2xl p-4 text-sm font-semibold lg:col-span-2 ${
            error
              ? "border border-red-200 bg-red-50 text-red-800"
              : "border border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {error || notice}
        </div>
      )}
    </section>
  );
}
