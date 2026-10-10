"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
} from "lucide-react";

import { resetPin } from "@/app/auth/actions";
import AuthShell from "@/components/auth/auth-shell";

export default function ResetPinNewClient() {
  const router = useRouter();
  const params = useSearchParams();

  const phone = params.get("phone") ?? "";

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const pinRefs = useRef<Array<HTMLInputElement | null>>([]);
  const confirmRefs = useRef<Array<HTMLInputElement | null>>([]);

  /*
   * ----------------------------------------------------------
   * PHONE CHECK
   * ----------------------------------------------------------
   */

  useEffect(() => {
    if (!phone) {
      router.replace("/forgot-pin");
    }
  }, [phone, router]);

  /*
   * ----------------------------------------------------------
   * DIGIT INPUT
   * ----------------------------------------------------------
   */

  function handleDigitChange(
    type: "pin" | "confirm",
    index: number,
    value: string,
  ) {
    if (loading) {
      return;
    }

    const digit = value.replace(/\D/g, "").slice(-1);

    const current =
      type === "pin"
        ? pin.split("")
        : confirmPin.split("");

    while (current.length < 4) {
      current.push("");
    }

    current[index] = digit;

    const nextValue = current.join("").slice(0, 4);

    if (type === "pin") {
      setPin(nextValue);
    } else {
      setConfirmPin(nextValue);
    }

    setError("");

    if (digit && index < 3) {
      const refs =
        type === "pin"
          ? pinRefs
          : confirmRefs;

      refs.current[index + 1]?.focus();
    }
  }

  /*
   * ----------------------------------------------------------
   * KEYBOARD NAVIGATION
   * ----------------------------------------------------------
   */

  function handleKeyDown(
    type: "pin" | "confirm",
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    const value =
      type === "pin" ? pin : confirmPin;

    const refs =
      type === "pin"
        ? pinRefs
        : confirmRefs;

    if (
      event.key === "Backspace" &&
      !value[index] &&
      index > 0
    ) {
      event.preventDefault();
      refs.current[index - 1]?.focus();
      return;
    }

    if (
      event.key === "ArrowLeft" &&
      index > 0
    ) {
      event.preventDefault();
      refs.current[index - 1]?.focus();
      return;
    }

    if (
      event.key === "ArrowRight" &&
      index < 3
    ) {
      event.preventDefault();
      refs.current[index + 1]?.focus();
    }
  }

  /*
   * ----------------------------------------------------------
   * PASTE
   * ----------------------------------------------------------
   */

  function handlePaste(
    type: "pin" | "confirm",
    event: React.ClipboardEvent<HTMLInputElement>,
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 4);

    if (!pasted) {
      return;
    }

    if (type === "pin") {
      setPin(pasted);
      setError("");

      const focusIndex =
        Math.min(pasted.length, 4) - 1;

      if (focusIndex >= 0) {
        pinRefs.current[
          focusIndex
        ]?.focus();
      }
    } else {
      setConfirmPin(pasted);
      setError("");

      const focusIndex =
        Math.min(pasted.length, 4) - 1;

      if (focusIndex >= 0) {
        confirmRefs.current[
          focusIndex
        ]?.focus();
      }
    }
  }

  /*
   * ----------------------------------------------------------
   * RESET PIN
   * ----------------------------------------------------------
   */

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");

    if (pin.length !== 4) {
      setError(
        "Please enter your new 4-digit PIN.",
      );
      pinRefs.current[0]?.focus();
      return;
    }

    if (confirmPin.length !== 4) {
      setError(
        "Please confirm your new 4-digit PIN.",
      );
      confirmRefs.current[0]?.focus();
      return;
    }

    if (pin !== confirmPin) {
      setError("The PINs do not match.");
      confirmRefs.current[0]?.focus();
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.set("pin", pin);
      formData.set("confirmPin", confirmPin);

      const result = await resetPin(formData);

      if (result?.error) {
        setError(result.error);

        setPin("");
        setConfirmPin("");

        window.setTimeout(() => {
          pinRefs.current[0]?.focus();
        }, 50);

        return;
      }

      if (result?.success) {
        router.replace("/login?reset=success");
        return;
      }

      setError(
        "We could not update your PIN. Please try again.",
      );
    } catch (error) {
      console.error(
        "PIN reset error:",
        error,
      );

      setError(
        "We could not update your PIN. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * ----------------------------------------------------------
   * RENDER
   * ----------------------------------------------------------
   */

  if (!phone) {
    return null;
  }

  return (
    <AuthShell
      step={3}
      eyebrow="Secure your account"
      title="Create a new PIN"
      description="Choose a new 4-digit PIN for secure everyday sign-ins to your MooGold account."
    >
      <form
        onSubmit={handleSubmit}
        className="rounded-[28px] border border-white/10 bg-white/[.055] p-5 shadow-2xl backdrop-blur-xl sm:p-8"
      >
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/15 bg-emerald-400/10">
          <KeyRound className="h-6 w-6 text-emerald-400" />
        </div>

        {/* Verified phone */}
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/10 bg-emerald-400/[.04] p-4">
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" />

          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-widest text-emerald-400">
              Number verified
            </p>

            <p className="mt-1 truncate text-sm font-bold text-white/65">
              {phone}
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-center text-sm font-semibold leading-5 text-red-200">
            {error}
          </div>
        )}

        {/* New PIN */}
        <PinRow
          label="New PIN"
          value={pin}
          refs={pinRefs}
          show={showPin}
          disabled={loading}
          onChange={(index, value) =>
            handleDigitChange(
              "pin",
              index,
              value,
            )
          }
          onKeyDown={(index, event) =>
            handleKeyDown(
              "pin",
              index,
              event,
            )
          }
          onPaste={(event) =>
            handlePaste("pin", event)
          }
        />

        {/* Confirm PIN */}
        <PinRow
          label="Confirm new PIN"
          value={confirmPin}
          refs={confirmRefs}
          show={showPin}
          disabled={loading}
          onChange={(index, value) =>
            handleDigitChange(
              "confirm",
              index,
              value,
            )
          }
          onKeyDown={(index, event) =>
            handleKeyDown(
              "confirm",
              index,
              event,
            )
          }
          onPaste={(event) =>
            handlePaste("confirm", event)
          }
        />

        {/* Show / hide */}
        <button
          type="button"
          onClick={() =>
            setShowPin((current) => !current)
          }
          disabled={loading}
          className="mx-auto mt-4 flex items-center gap-2 text-xs font-bold text-white/35 transition hover:text-white/60 disabled:opacity-50"
        >
          {showPin ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}

          {showPin ? "Hide PIN" : "Show PIN"}
        </button>

        {/* PIN guidance */}
        <div className="mt-6 space-y-2 text-xs text-white/40">
          <p className="flex gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            Avoid simple sequences like 1234.
          </p>

          <p className="flex gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            Avoid repeated digits like 0000.
          </p>

          <p className="flex gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            Never share your PIN with anyone.
          </p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="mt-7 h-14 w-full rounded-2xl bg-emerald-400 text-sm font-black text-[#06100d] shadow-xl shadow-emerald-500/10 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "Updating your PIN..."
            : "Update PIN"}
        </button>

        {/* Back */}
        <Link
          href="/forgot-pin"
          className="mt-6 flex items-center justify-center gap-2 text-sm font-bold text-white/35 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Start PIN recovery again
        </Link>
      </form>
    </AuthShell>
  );
}

/*
 * ============================================================
 * PIN ROW
 * ============================================================
 */

function PinRow({
  label,
  value,
  refs,
  show,
  disabled,
  onChange,
  onKeyDown,
  onPaste,
}: {
  label: string;
  value: string;
  refs: React.MutableRefObject<
    Array<HTMLInputElement | null>
  >;
  show: boolean;
  disabled: boolean;
  onChange: (
    index: number,
    value: string,
  ) => void;
  onKeyDown: (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => void;
  onPaste: (
    event: React.ClipboardEvent<HTMLInputElement>,
  ) => void;
}) {
  return (
    <div className="mt-7">
      <p className="mb-3 text-center text-xs font-black uppercase tracking-widest text-white/35">
        {label}
      </p>

      <div className="flex justify-center gap-3">
        {Array.from({ length: 4 }).map(
          (_, index) => (
            <input
              key={index}
              ref={(element) => {
                refs.current[index] = element;
              }}
              value={value[index] ?? ""}
              type={show ? "text" : "password"}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              autoComplete={
                index === 0
                  ? "one-time-code"
                  : "off"
              }
              disabled={disabled}
              aria-label={`${label} digit ${
                index + 1
              }`}
              onChange={(event) =>
                onChange(
                  index,
                  event.target.value,
                )
              }
              onKeyDown={(event) =>
                onKeyDown(index, event)
              }
              onPaste={onPaste}
              className="h-16 w-14 rounded-2xl border border-white/10 bg-black/20 text-center text-2xl font-black text-white outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-50"
            />
          ),
        )}
      </div>
    </div>
  );
}