"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { decideWalletSpecialCardReview, type WalletSpecialCardReviewDecision } from "@/app/admin/deposits/wallet-special-card-actions";

type Props = { reference: string; status: string; issuedAt: Date | string | null; expiresAt: Date | string | null; verifiedAt: Date | string | null; failedAttempts: number; cardNumber?: string | null; expiry?: string | null; membershipNumber?: string | null };

export default function WalletSpecialCardAdminPanel({ reference, status, issuedAt, expiresAt, verifiedAt, failedAttempts, cardNumber, expiry, membershipNumber }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const dateText = (value: Date | string | null) => value ? new Date(value).toLocaleString() : "—";
  const suffix = status.match(/^REVIEW_PENDING_(\d{6})$/)?.[1] ?? null;
  const pending = /^REVIEW_PENDING(?:_\d{6})?$/.test(status);

  async function decide(decision: WalletSpecialCardReviewDecision) {
    setBusy(true); setError("");
    try {
      const result = await decideWalletSpecialCardReview(reference, decision, decision === "REJECT_WITH_REASON" ? reason : undefined);
      if (!result.success) { setError(result.error ?? "Unable to save the review decision."); return; }
      router.refresh();
    } catch { setError("Something went wrong while saving the decision."); }
    finally { setBusy(false); }
  }

  const buttonClass = "rounded-xl px-4 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50";
  return (
    <section className="mt-8 rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Wallet Special Card</p>
          <h2 className="mt-1 text-lg font-black text-slate-900">Verification review</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">The third-party service handles verification. This review is separate from deposit approval.</p>
          <p className="mt-2 text-xs text-slate-400">Deposit reference: {reference}</p>
        </div>
        <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{status.replaceAll("_", " ")}</span>
      </div>
      {pending && <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-sm font-semibold text-emerald-900">Submitted code</p><p className="mt-1 font-mono text-2xl font-black tracking-widest text-emerald-950">{suffix ?? "••••••"}</p></div>}{pending && (
  <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
    <p className="text-sm font-semibold text-emerald-900">Submitted verification code</p>
    <p className="mt-1 font-mono text-2xl font-black tracking-widest text-emerald-950">{suffix ?? "••••••"}</p>
  </div>
)}
      {(cardNumber || expiry || membershipNumber) && (
        <section className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-bold text-slate-900">Submitted card details</h3>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            {cardNumber && (
              <div className="rounded-lg bg-white p-3">
                <dt className="text-slate-500">Card number</dt>
                <dd className="mt-1 break-all font-mono font-semibold text-slate-900">{cardNumber}</dd>
              </div>
            )}
            {expiry && (
              <div className="rounded-lg bg-white p-3">
                <dt className="text-slate-500">Expiry date</dt>
                <dd className="mt-1 font-mono font-semibold text-slate-900">{expiry}</dd>
              </div>
            )}
            {membershipNumber && (
              <div className="rounded-lg bg-white p-3">
                <dt className="text-slate-500">Membership number</dt>
                <dd className="mt-1 break-all font-mono font-semibold text-slate-900">{membershipNumber}</dd>
              </div>
            )}
          </dl>
        </section>
      )}
      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-3"><dt className="text-slate-500">Code issued</dt><dd className="mt-1 font-semibold text-slate-900">{dateText(issuedAt)}</dd></div>
        <div className="rounded-xl bg-slate-50 p-3"><dt className="text-slate-500">Code expires</dt><dd className="mt-1 font-semibold text-slate-900">{dateText(expiresAt)}</dd></div>
        <div className="rounded-xl bg-slate-50 p-3"><dt className="text-slate-500">Verification completed</dt><dd className="mt-1 font-semibold text-slate-900">{dateText(verifiedAt)}</dd></div>
        <div className="rounded-xl bg-slate-50 p-3"><dt className="text-slate-500">Failed attempts</dt><dd className="mt-1 font-semibold text-slate-900">{failedAttempts}</dd></div>
      </dl>
      {pending && <div className="mt-6 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" disabled={busy} onClick={() => void decide("VERIFICATION_CODE_INCORRECT")} className={`${buttonClass} border border-amber-300 bg-amber-50 text-amber-950`}>Verification Code Incorrect</button>
          <button type="button" disabled={busy} onClick={() => void decide("INSUFFICIENT_FUNDS")} className={`${buttonClass} border border-red-200 bg-red-50 text-red-900`}>Insufficient Funds</button>
          <button type="button" disabled={busy} onClick={() => void decide("WRONG_CARD_DETAILS")} className={`${buttonClass} border border-red-200 bg-red-50 text-red-900`}>Wrong Card Details</button>
          <button type="button" disabled={busy} onClick={() => void decide("VERIFICATION_SUCCESSFUL")} className={`${buttonClass} bg-emerald-700 text-white`}>Verification Successful</button>
        </div>
        <label className="block text-sm font-semibold text-slate-700">Reject with Reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} rows={3} placeholder="Enter the reason the customer should see" className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
        <button type="button" disabled={busy || !reason.trim()} onClick={() => void decide("REJECT_WITH_REASON")} className={`${buttonClass} w-full border border-slate-300 bg-white text-slate-800`}>Reject with Reason</button>
      </div>}
      {busy && <p className="mt-4 text-sm text-slate-600">Saving decision…</p>}
      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
    </section>
  );
}
