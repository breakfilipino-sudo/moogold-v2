
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, AlertCircle, AlertTriangle, KeyRound } from "lucide-react";

import {
  approveSpecialCardVerification,
  markSpecialCardCodeIncorrect,
  rejectSpecialCardSubmission,
} from "@/app/admin/wealth-box/actions";

type SpecialCardAdminControlsProps = {
  submissionId: string;
  verificationCode?: string;
};

export default function SpecialCardAdminControls({
  submissionId,
  verificationCode,
}: SpecialCardAdminControlsProps) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleAction(
    action: "approve" | "incorrect" | "insufficient" | "card-details" | "custom",
    customReason = "",
  ) {
    if (loadingAction !== null) return;

    setLoadingAction(action);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.set("submissionId", submissionId);

      if (action === "approve") {
        await approveSpecialCardVerification(formData);
      } else if (action === "incorrect") {
        await markSpecialCardCodeIncorrect(formData);
      } else {
        const reason =
          action === "insufficient"
            ? "Insufficient funds"
            : action === "card-details"
              ? "Wrong card details"
              : customReason.trim();

        if (!reason) {
          throw new Error("Enter a rejection reason.");
        }

        formData.set("reason", reason);
        await rejectSpecialCardSubmission(formData);
      }

      setShowRejectForm(false);
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Unable to complete this action.",
      );
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-black text-slate-900">
        Admin Review Actions
      </h2>

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          {errorMessage}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Customer-entered code
        </p>
        <p className="mt-2 font-mono text-2xl font-black tracking-[0.25em] text-emerald-700">
          {verificationCode || "Awaiting submission"}
        </p>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Review the customer&apos;s 6-digit verification code directly above.
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button
            type="button"
            disabled={loadingAction !== null}
            onClick={() => void handleAction("approve")}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            {loadingAction === "approve" ? "Processing..." : "Approve & Create Funding"}
          </button>

          <button
            type="button"
            disabled={loadingAction !== null}
            onClick={() => void handleAction("incorrect")}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
          >
            <KeyRound className="h-4 w-4" />
            Verification Code Incorrect
          </button>

          <button
            type="button"
            disabled={loadingAction !== null}
            onClick={() => void handleAction("insufficient")}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
          >
            <AlertTriangle className="h-4 w-4" />
            Insufficient Funds
          </button>

          <button
            type="button"
            disabled={loadingAction !== null}
            onClick={() => void handleAction("card-details")}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            Card Details Wrong
          </button>

          <button
            type="button"
            disabled={loadingAction !== null}
            onClick={() => setShowRejectForm((current) => !current)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            Reject with Reason
          </button>
        </div>

        {showRejectForm && (
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <textarea
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              placeholder="Enter custom rejection reason for customer..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:border-red-400 focus:bg-white"
              rows={3}
            />

            <div className="flex gap-3">
              <button
                type="button"
                disabled={loadingAction !== null || !rejectionReason.trim()}
                onClick={() => void handleAction("custom", rejectionReason)}
                className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {loadingAction === "custom" ? "Processing..." : "Confirm Custom Rejection"}
              </button>

              <button
                type="button"
                disabled={loadingAction !== null}
                onClick={() => setShowRejectForm(false)}
                className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}