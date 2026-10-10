"use client";

import { useState } from "react";
import { AlertTriangle, Eye, EyeOff, Loader2 } from "lucide-react";

import { requestAccountClosure } from "./actions";

export default function CloseAccountForm() {
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!/^\d{4}$/.test(pin) || !confirmed || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const formData = new FormData();
      formData.set("pin", pin);

      const result = await requestAccountClosure(formData);

      if (result?.error) {
        setError(result.error);
      }
    } catch (submitError) {
      console.error(
        "Failed to request account closure:",
        submitError,
      );

      setError(
        "Unable to process your account closure request. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const pinComplete = /^\d{4}$/.test(pin);

  return (
    <div className="space-y-3">
      <div>
        <label
          htmlFor="closure-pin"
          className="mb-1.5 block text-xs font-bold text-slate-700"
        >
          Confirm with your 4-digit PIN
        </label>

        <div className="relative">
          <input
            id="closure-pin"
            type={showPin ? "text" : "password"}
            inputMode="numeric"
            autoComplete="current-password"
            maxLength={4}
            value={pin}
            onChange={(event) => {
              const value = event.target.value.replace(/\D/g, "");
              setPin(value);
              setError("");
            }}
            placeholder="••••"
            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-12 text-center text-lg font-black tracking-[0.45em] text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-red-300 focus:ring-2 focus:ring-red-100"
          />

          <button
            type="button"
            onClick={() => setShowPin((current) => !current)}
            aria-label={showPin ? "Hide PIN" : "Show PIN"}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            {showPin ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>

        <p className="mt-1.5 text-[11px] text-slate-400">
          Enter your current MooGold security PIN to confirm this action.
        </p>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:bg-slate-50">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => {
            setConfirmed(event.target.checked);
            setError("");
          }}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-red-600 focus:ring-red-500"
        />

        <span className="text-xs font-semibold leading-5 text-slate-600">
          I understand that I am requesting permanent closure of my
          MooGold account and that required financial records may be
          retained.
        </span>
      </label>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-xs font-semibold leading-5 text-red-700">
            {error}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!pinComplete || !confirmed || isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3.5 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <AlertTriangle className="h-4 w-4" />
            Continue to close account
          </>
        )}
      </button>
    </div>
  );
}