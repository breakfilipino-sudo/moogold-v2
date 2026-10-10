"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import { changePin } from "@/app/dashboard/settings/pin/actions";

type ChangePinFormProps = {
  phone: string;
};

function maskPhone(phone: string) {
  if (!phone) {
    return "your registered number";
  }

  if (phone.length <= 6) {
    return phone;
  }

  return `${phone.slice(0, 4)} •••• ${phone.slice(-3)}`;
}

export default function ChangePinForm({
  phone,
}: ChangePinFormProps) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [showCurrentPin, setShowCurrentPin] =
    useState(false);
  const [showNewPin, setShowNewPin] =
    useState(false);
  const [showConfirmPin, setShowConfirmPin] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentPinComplete = /^\d{4}$/.test(
    currentPin,
  );

  const newPinComplete = /^\d{4}$/.test(newPin);

  const confirmPinComplete =
    /^\d{4}$/.test(confirmPin);

  const pinsMatch =
    newPinComplete &&
    confirmPinComplete &&
    newPin === confirmPin;

  const canSubmit =
    currentPinComplete &&
    newPinComplete &&
    confirmPinComplete &&
    pinsMatch &&
    !loading;

  function updatePin(
    setter: (value: string) => void,
    value: string,
  ) {
    setter(value.replace(/\D/g, "").slice(0, 4));
    setError("");
    setSuccess(false);
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!canSubmit) {
      if (!currentPinComplete) {
        setError(
          "Enter your current 4-digit PIN.",
        );
        return;
      }

      if (!newPinComplete) {
        setError(
          "Enter a new 4-digit PIN.",
        );
        return;
      }

      if (!confirmPinComplete) {
        setError(
          "Confirm your new 4-digit PIN.",
        );
        return;
      }

      if (!pinsMatch) {
        setError(
          "Your new PINs do not match.",
        );
        return;
      }

      return;
    }

    if (currentPin === newPin) {
      setError(
        "Your new PIN must be different from your current PIN.",
      );
      return;
    }

    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const formData = new FormData();

      formData.set("currentPin", currentPin);
      formData.set("newPin", newPin);
      formData.set("confirmPin", confirmPin);

      const result = await changePin(formData);

      if (result?.error) {
        setError(result.error);
        return;
      }

      if (result?.success) {
        setSuccess(true);
        setCurrentPin("");
        setNewPin("");
        setConfirmPin("");
      }
    } catch (submitError) {
      console.error(
        "Failed to change PIN:",
        submitError,
      );

      setError(
        "We could not change your PIN. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <Link
        href="/dashboard/settings"
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Settings
      </Link>

      <div className="mb-5">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
          <KeyRound className="h-5 w-5" />
        </div>

        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
          Login & Security
        </p>

        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Change PIN
        </h1>

        <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
          Update the 4-digit security PIN you use to
          sign in to MooGold.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {success && (
          <div className="border-b border-emerald-100 bg-emerald-50 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/30">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />

              <div>
                <p className="text-xs font-black text-emerald-800 dark:text-emerald-300">
                  PIN changed successfully
                </p>

                <p className="mt-0.5 text-[10px] leading-4 text-emerald-700 dark:text-emerald-400">
                  Your new PIN is now active.
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="border-b border-red-100 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/30">
            <p className="text-xs font-semibold leading-5 text-red-700 dark:text-red-300">
              {error}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 p-4">
            <PinField
              id="current-pin"
              label="Current PIN"
              description={`Your current PIN • ${maskPhone(phone)}`}
              value={currentPin}
              onChange={(value) =>
                updatePin(
                  setCurrentPin,
                  value,
                )
              }
              show={showCurrentPin}
              onToggle={() =>
                setShowCurrentPin(
                  (current) => !current,
                )
              }
              autoComplete="current-password"
            />

            <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
              <PinField
                id="new-pin"
                label="New PIN"
                description="Choose a new 4-digit security PIN"
                value={newPin}
                onChange={(value) =>
                  updatePin(
                    setNewPin,
                    value,
                  )
                }
                show={showNewPin}
                onToggle={() =>
                  setShowNewPin(
                    (current) => !current,
                  )
                }
                autoComplete="new-password"
              />
            </div>

            <PinField
              id="confirm-pin"
              label="Confirm new PIN"
              description="Enter your new PIN again"
              value={confirmPin}
              onChange={(value) =>
                updatePin(
                  setConfirmPin,
                  value,
                )
              }
              show={showConfirmPin}
              onToggle={() =>
                setShowConfirmPin(
                  (current) => !current,
                )
              }
              autoComplete="new-password"
            />

            {newPinComplete &&
              confirmPinComplete &&
              !pinsMatch && (
                <p className="text-[11px] font-semibold text-red-600 dark:text-red-400">
                  The new PINs do not match.
                </p>
              )}

            {newPinComplete &&
              confirmPinComplete &&
              pinsMatch &&
              currentPin !== newPin && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-500/10">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />

                  <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                    Your new PIN is ready to be applied.
                  </p>
                </div>
              )}
          </div>

          <div className="border-t border-slate-100 p-3 dark:border-slate-800">
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-xs font-black text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Changing PIN...
                </>
              ) : (
                "Change PIN"
              )}
            </button>
          </div>
        </form>
      </div>

      <p className="mt-5 text-center text-[10px] leading-5 text-slate-400 dark:text-slate-500">
        If you no longer know your current PIN, use
        Forgot PIN from Login & Security.
      </p>
    </div>
  );
}

function PinField({
  id,
  label,
  description,
  value,
  onChange,
  show,
  onToggle,
  autoComplete,
}: {
  id: string;
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  autoComplete: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400"
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          inputMode="numeric"
          autoComplete={autoComplete}
          maxLength={4}
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder="••••"
          className="h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 pr-12 text-center text-lg font-black tracking-[0.45em] text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-emerald-500 dark:focus:bg-slate-800 dark:focus:ring-emerald-500/10"
        />

        <button
          type="button"
          onClick={onToggle}
          aria-label={
            show ? `Hide ${label}` : `Show ${label}`
          }
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        >
          {show ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>

      <p className="mt-1.5 text-[10px] text-slate-400 dark:text-slate-500">
        {description}
      </p>
    </div>
  );
}