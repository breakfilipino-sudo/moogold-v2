"use client";

import { useActionState, useState } from "react";
import {
  acceptRegularLoanOffer,
  type LoanActionState,
} from "./actions";

const initialState: LoanActionState = { success: false, message: "" };

type Props = {
  applicationId: string;
};

export default function LoanOfferAcceptance({ applicationId }: Props) {
  const [state, action, pending] = useActionState(
    acceptRegularLoanOffer,
    initialState,
  );
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="loan-approved-title"
    >
      <section className="relative w-full max-w-md rounded-3xl border border-emerald-200 bg-white p-6 text-slate-900 shadow-2xl sm:p-8">
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          disabled={pending}
          aria-label="Close approved loan offer"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span aria-hidden="true">×</span>
        </button>

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <span
            aria-hidden="true"
            className="h-3 w-3 rounded-full bg-emerald-700"
          />
        </div>

        <h2 id="loan-approved-title" className="mt-4 text-center text-xl font-semibold">
          Your loan is approved
        </h2>

        <p className="mt-3 text-center text-sm leading-6 text-slate-600">
          Your approved offer is ready. Accept it to credit the amount to your Loan Balance.
        </p>

        {state.message && (
          <p
            role="status"
            className={`mt-4 rounded-xl p-3 text-sm ${
              state.success
                ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {state.message}
          </p>
        )}

        <form action={action} className="mt-5">
          <input type="hidden" name="applicationId" value={applicationId} />
          <button
            type="submit"
            disabled={pending}
            className="flex min-h-12 w-full items-center justify-center rounded-xl bg-emerald-900 px-4 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Accepting loan..." : "Accept Loan"}
          </button>
        </form>
      </section>
    </div>
  );
}