"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Loader2,
  XCircle,
} from "lucide-react";

import {
  approveCryptoWithdrawal,
  rejectCryptoWithdrawal,
} from "../actions";

type ReviewActionsProps = {
  withdrawalId: string;
};

export default function ReviewActions({
  withdrawalId,
}: ReviewActionsProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [rejectionReason, setRejectionReason] =
    useState("");

  async function handleApprove() {
    if (isApproving || isRejecting) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to approve this crypto withdrawal? The withdrawal amount plus fee will be deducted from the user's crypto balance.",
    );

    if (!confirmed) {
      return;
    }

    setIsApproving(true);
    setError("");
    setSuccess("");

    try {
      const result =
        await approveCryptoWithdrawal(
          withdrawalId,
        );

      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }

      if ("success" in result && result.success) {
        setSuccess(
          result.message ||
            "Crypto withdrawal approved successfully.",
        );

        window.location.reload();
      }
    } catch (error) {
      console.error(
        "Failed to approve crypto withdrawal:",
        error,
      );

      setError(
        "We could not approve this crypto withdrawal. Please try again.",
      );
    } finally {
      setIsApproving(false);
    }
  }

  async function handleReject() {
    if (isApproving || isRejecting) {
      return;
    }

    const reason = rejectionReason.trim();

    if (!reason) {
      setError(
        "Please provide a reason for rejecting this withdrawal.",
      );
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to reject this crypto withdrawal?",
    );

    if (!confirmed) {
      return;
    }

    setIsRejecting(true);
    setError("");
    setSuccess("");

    try {
      const result =
        await rejectCryptoWithdrawal(
          withdrawalId,
          reason,
        );

      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }

      if ("success" in result && result.success) {
        setSuccess(
          result.message ||
            "Crypto withdrawal rejected successfully.",
        );

        window.location.reload();
      }
    } catch (error) {
      console.error(
        "Failed to reject crypto withdrawal:",
        error,
      );

      setError(
        "We could not reject this crypto withdrawal. Please try again.",
      );
    } finally {
      setIsRejecting(false);
    }
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-800">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-6 text-emerald-800">
          {success}
        </div>
      )}

      <section className="rounded-3xl border border-blue-200 bg-blue-50 p-6">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-blue-600" />

          <div>
            <h2 className="text-xl font-black text-blue-950">
              Approve Withdrawal
            </h2>

            <p className="mt-1 text-sm font-semibold text-blue-700">
              Confirm the crypto transfer
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-blue-800">
          Approve only after MooGold has verified the
          destination address and is ready to send the
          cryptocurrency. The withdrawal amount plus the
          applicable fee will be deducted from the user&apos;s
          crypto balance.
        </p>

        <button
          type="button"
          onClick={handleApprove}
          disabled={isApproving || isRejecting}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isApproving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Approving...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5" />
              Approve &amp; Deduct Balance
            </>
          )}
        </button>
      </section>

      <section className="rounded-3xl border border-red-200 bg-red-50 p-6">
        <div className="flex items-center gap-3">
          <XCircle className="h-6 w-6 text-red-600" />

          <div>
            <h2 className="text-xl font-black text-red-950">
              Reject Withdrawal
            </h2>

            <p className="mt-1 text-sm font-semibold text-red-700">
              Do not deduct the user&apos;s balance
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-red-800">
          Use this when the withdrawal cannot be processed,
          for example because the destination address or
          withdrawal request is invalid.
        </p>

        <textarea
          value={rejectionReason}
          onChange={(event) =>
            setRejectionReason(event.target.value)
          }
          maxLength={1000}
          rows={4}
          placeholder="Enter the reason for rejecting this withdrawal..."
          disabled={isApproving || isRejecting}
          className="mt-5 w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
        />

        <div className="mt-2 flex justify-end">
          <span className="text-xs font-semibold text-red-500">
            {rejectionReason.length}/1000
          </span>
        </div>

        <button
          type="button"
          onClick={handleReject}
          disabled={isApproving || isRejecting}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-5 py-4 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRejecting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Rejecting...
            </>
          ) : (
            <>
              <XCircle className="h-5 w-5" />
              Reject Withdrawal
            </>
          )}
        </button>
      </section>
    </div>
  );
}