"use client";

import { useActionState } from "react";
import {
  saveCryptoSellPremium,
  type SavePremiumState,
} from "./actions";

const initialState: SavePremiumState = {
  success: false,
  error: "",
};

type Props = {
  currentPremium: string;
};

export default function CryptoPricingForm({ currentPremium }: Props) {
  const [state, formAction, pending] = useActionState(
    saveCryptoSellPremium,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label
          htmlFor="sellPremiumPercent"
          className="block text-sm font-semibold text-slate-800"
        >
          Sell premium percentage
        </label>

        <div className="mt-2 flex items-center gap-3">
          <input
            id="sellPremiumPercent"
            name="sellPremiumPercent"
            type="number"
            min="0"
            max="999.9999"
            step="0.0001"
            defaultValue={currentPremium}
            required
            className="w-full max-w-xs rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
          <span className="text-sm font-semibold text-slate-600">%</span>
        </div>

        <p className="mt-2 text-xs leading-5 text-slate-500">
          This percentage is added to the verified market-based value when
          calculating customer Sell quotes. Buy quotes do not use this premium.
        </p>
      </div>

      {state.success && (
        <p role="status" className="text-sm font-medium text-emerald-700">
          {state.message}
        </p>
      )}

      {!state.success && state.error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save Sell premium"}
      </button>
    </form>
  );
}
