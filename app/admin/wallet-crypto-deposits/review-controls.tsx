"use client";

import { useState, useTransition, type FormEvent } from "react";
import {
  approveWalletCryptoDeposit,
  rejectWalletCryptoDeposit,
} from "./actions";

type Props = {
  depositId: string;
  status: string;
};

export default function WalletCryptoReviewControls({
  depositId,
  status,
}: Props) {
  const [transactionHash, setTransactionHash] = useState("");
  const [verifiedAmount, setVerifiedAmount] = useState("");
  const [blockchainReceivedAt, setBlockchainReceivedAt] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  if (status !== "PENDING") {
    return null;
  }

  function handleApprove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!transactionHash.trim() || !verifiedAmount.trim() || !blockchainReceivedAt) {
      setMessage("Enter the transaction hash, actual amount, and blockchain receipt time.");
      return;
    }

    const receiptDate = new Date(blockchainReceivedAt);

    if (!Number.isFinite(receiptDate.getTime())) {
      setMessage("Enter a valid blockchain receipt date and time.");
      return;
    }

    const receiptIso = receiptDate.toISOString();

    startTransition(async () => {
      const result = await approveWalletCryptoDeposit(
        depositId,
        transactionHash,
        verifiedAmount,
        receiptIso,
      );
      setMessage(result.success ? result.message : result.error);
    });
  }

  function handleReject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    startTransition(async () => {
      const result = await rejectWalletCryptoDeposit(
        depositId,
        rejectionReason,
      );
      setMessage(result.success ? result.message : result.error);
    });
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">
          Blockchain verification
        </h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Enter the details verified on the blockchain. The receipt time must fall within the customer's five-minute deposit window.
        </p>
      </div>

      <form onSubmit={handleApprove} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-700">
            Blockchain transaction hash
          </span>
          <input
            value={transactionHash}
            onChange={(event) => setTransactionHash(event.target.value)}
            placeholder="Enter verified transaction hash"
            required
            maxLength={2000}
            disabled={isPending}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-mono text-xs outline-none focus:border-emerald-600"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-700">
            Actual crypto received
          </span>
          <input
            value={verifiedAmount}
            onChange={(event) => setVerifiedAmount(event.target.value)}
            inputMode="decimal"
            placeholder="Enter verified amount"
            required
            disabled={isPending}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-700">
            Blockchain receipt date and time
          </span>
          <input
            type="datetime-local"
            value={blockchainReceivedAt}
            onChange={(event) => setBlockchainReceivedAt(event.target.value)}
            required
            disabled={isPending}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
          />
        </label>

        <button
          type="submit"
          disabled={
            isPending ||
            !transactionHash.trim() ||
            !verifiedAmount.trim() ||
            !blockchainReceivedAt
          }
          className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Processing..." : "Verify and approve"}
        </button>
      </form>

      <div className="border-t border-slate-200" />

      <form onSubmit={handleReject} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-700">
            Rejection reason
          </span>
          <textarea
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
            placeholder="Explain why this transaction is being rejected"
            rows={3}
            maxLength={1000}
            required
            disabled={isPending}
            className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-500"
          />
        </label>

        <button
          type="submit"
          disabled={isPending || !rejectionReason.trim()}
          className="w-full rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Processing..." : "Reject deposit"}
        </button>
      </form>

      {message && (
        <p
          aria-live="polite"
          className="rounded-lg bg-white p-3 text-xs leading-5 text-slate-700"
        >
          {message}
        </p>
      )}
    </div>
  );
}