"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Loader2,
  XCircle,
} from "lucide-react";

import {
  approveCryptoDeposit,
  rejectCryptoDeposit,
} from "../actions";

type ReviewActionsProps = {
  depositId: string;
  asset: string;
  currentAmount: string;
};

export default function ReviewActions({
  depositId,
  asset,
  currentAmount,
}: ReviewActionsProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState(currentAmount);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  async function handleApprove() {
    if (isApproving || isRejecting) return;

    const amount = receivedAmount.trim();
    if (!/^\d+(?:\.\d{1,18})?$/.test(amount) || /^0+(?:\.0+)?$/.test(amount)) {
      setError("Enter the actual amount received, greater than zero, with no more than 18 decimal places.");
      return;
    }

    const confirmed = window.confirm(
      `Confirm that MooGold received ${amount} ${asset}. This exact amount will be saved and credited to the customer's crypto balance.`,
    );
    if (!confirmed) return;

    setIsApproving(true);
    setError("");
    setSuccess("");

    try {
      const result = await approveCryptoDeposit(depositId, amount);

      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }

      if ("success" in result && result.success) {
        setSuccess(result.message || "Crypto deposit approved successfully.");
        window.location.reload();
      }
    } catch (err) {
      console.error("Failed to approve crypto deposit:", err);
      setError("We could not approve this crypto deposit. Please try again.");
    } finally {
      setIsApproving(false);
    }
  }

  async function handleReject() {
    if (isApproving || isRejecting) return;

    const reason = rejectionReason.trim();
    if (!reason) {
      setError("Please provide a reason for rejecting this deposit.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to reject this crypto deposit?",
    );
    if (!confirmed) return;

    setIsRejecting(true);
    setError("");
    setSuccess("");

    try {
      const result = await rejectCryptoDeposit(depositId, reason);

      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }

      if ("success" in result && result.success) {
        setSuccess(result.message || "Crypto deposit rejected successfully.");
        window.location.reload();
      }
    } catch (err) {
      console.error("Failed to reject crypto deposit:", err);
      setError("We could not reject this crypto deposit. Please try again.");
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

      <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          <div>
            <h2 className="text-xl font-black text-emerald-950">Approve Deposit</h2>
            <p className="mt-1 text-sm font-semibold text-emerald-700">
              Confirm the actual amount received
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-emerald-800">
          Verify the incoming transaction, then enter the amount actually received.
          This exact amount will be saved to the deposit, credited to the user&apos;s
          crypto balance, and recorded in the ledger.
        </p>

        <label
          htmlFor="actual-received-amount"
          className="mt-5 block text-sm font-bold text-emerald-950"
        >
          Actual amount received ({asset})
        </label>
        <input
          id="actual-received-amount"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={receivedAmount}
          onChange={(event) => setReceivedAmount(event.target.value)}
          disabled={isApproving || isRejecting}
          placeholder={`Amount in ${asset}`}
          aria-describedby="actual-received-help"
          className="mt-2 w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-base font-bold text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:opacity-60"
        />
        <p id="actual-received-help" className="mt-2 text-xs leading-5 text-emerald-800">
          Use the amount verified from the incoming transaction, not an estimated amount.
          Maximum 18 decimal places.
        </p>

        <button
          type="button"
          onClick={handleApprove}
          disabled={isApproving || isRejecting}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isApproving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Approving...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5" />
              Approve &amp; Credit Balance
            </>
          )}
        </button>
      </section>

      <section className="rounded-3xl border border-red-200 bg-red-50 p-6">
        <div className="flex items-center gap-3">
          <XCircle className="h-6 w-6 text-red-600" />
          <div>
            <h2 className="text-xl font-black text-red-950">Reject Deposit</h2>
            <p className="mt-1 text-sm font-semibold text-red-700">
              Do not credit the user&apos;s balance
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-red-800">
          Use this only when the deposit should not be credited to the customer.
        </p>

        <textarea
          value={rejectionReason}
          onChange={(event) => setRejectionReason(event.target.value)}
          maxLength={1000}
          rows={4}
          placeholder="Enter the reason for rejecting this deposit..."
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
              Reject Deposit
            </>
          )}
        </button>
      </section>
    </div>
  );
}
