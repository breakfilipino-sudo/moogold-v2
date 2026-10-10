"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MessageSquareLock,
  ShieldCheck,
} from "lucide-react";

import {
  resendRegistrationOtp,
  verifyRegistrationOtp,
} from "@/app/auth/actions";

import AuthShell from "@/components/auth/auth-shell";

const MAX_REQUESTS = 3;
const RESEND_SECONDS = 60;
const LOCK_SECONDS = 300;

export default function RegisterVerifyClient() {
  const router = useRouter();
  const params = useSearchParams();

  const phone = params.get("phone") ?? "";

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [requestCount, setRequestCount] = useState(1);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [lockRemaining, setLockRemaining] = useState(0);

  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!phone) {
      router.replace("/register");
    }
  }, [phone, router]);

  useEffect(() => {
    if (countdown <= 0) return;

    const timer = window.setInterval(() => {
      setCountdown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    if (lockRemaining <= 0) return;

    const timer = window.setInterval(() => {
      setLockRemaining((current) =>
        current <= 1 ? 0 : current - 1,
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, [lockRemaining]);

  async function verifyOtp(token: string) {
    if (loading || lockRemaining > 0 || token.length !== 6) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();

      formData.set("phone", phone);
      formData.set("token", token);

      const result = await verifyRegistrationOtp(formData);

      if (result?.error) {
        setError(result.error);
        setCode("");

        window.setTimeout(() => {
          refs.current[0]?.focus();
        }, 40);

        return;
      }

      if (result?.success) {
        router.replace(
          `/register/pin?phone=${encodeURIComponent(phone)}`,
        );
        return;
      }

      setError(
        "The verification code could not be confirmed. Please try again.",
      );
    } catch (error) {
      console.error("Registration OTP verification error:", error);
      setError("We could not verify the code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(index: number, value: string) {
    if (loading || lockRemaining > 0) return;

    const digits = value.replace(/\D/g, "");

    if (!digits) {
      const characters = code.split("");

      while (characters.length < 6) characters.push("");

      characters[index] = "";

      setCode(characters.join("").slice(0, 6));
      setError("");
      return;
    }

    if (digits.length > 1) {
      const nextCode = digits.slice(0, 6);

      setCode(nextCode);
      setError("");

      if (nextCode.length === 6) {
        void verifyOtp(nextCode);
      }

      return;
    }

    const characters = code.split("");

    while (characters.length < 6) characters.push("");

    characters[index] = digits[0];

    const nextCode = characters.join("").slice(0, 6);

    setCode(nextCode);
    setError("");

    if (index < 5) {
      refs.current[index + 1]?.focus();
    }

    if (nextCode.length === 6) {
      void verifyOtp(nextCode);
    }
  }

  function handleKeyDown(
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Backspace") {
      if (!code[index] && index > 0) {
        refs.current[index - 1]?.focus();
      }

      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      refs.current[index - 1]?.focus();
      return;
    }

    if (event.key === "ArrowRight" && index < 5) {
      event.preventDefault();
      refs.current[index + 1]?.focus();
    }
  }

  function handlePaste(
    event: React.ClipboardEvent<HTMLInputElement>,
  ) {
    event.preventDefault();

    if (loading || lockRemaining > 0) return;

    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (!pasted) return;

    setCode(pasted);
    setError("");

    if (pasted.length === 6) {
      void verifyOtp(pasted);
    }
  }

  async function resendOtp() {
    if (
      loading ||
      countdown > 0 ||
      lockRemaining > 0
    ) {
      return;
    }

    if (requestCount >= MAX_REQUESTS) {
      setLockRemaining(LOCK_SECONDS);
      setError(
        "Verification limit reached. Please wait 5 minutes before requesting another code.",
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.set("phone", phone);

      const result = await resendRegistrationOtp(formData);

      if (result?.error) {
        setError(result.error);
        return;
      }

      setRequestCount((current) => current + 1);
      setCountdown(RESEND_SECONDS);
      setCode("");

      window.setTimeout(() => {
        refs.current[0]?.focus();
      }, 50);
    } catch (error) {
      console.error("Registration OTP resend error:", error);
      setError("We could not send a new code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const lockMinutes = Math.max(
    1,
    Math.ceil(lockRemaining / 60),
  );

  if (!phone) {
    return null;
  }

  return (
    <AuthShell
      step={2}
      eyebrow="Mobile verification"
      title="Verify your mobile"
      description="Enter the 6-digit code sent to your phone."
    >
      <div className="rounded-2xl border border-white/10 bg-white/[.045] p-4 shadow-2xl backdrop-blur-xl sm:p-5">
        <div className="flex items-center gap-3 rounded-xl border border-emerald-400/10 bg-emerald-400/[.035] px-3.5 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10">
            <MessageSquareLock className="h-4 w-4 text-emerald-400" />
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
              Verification code sent
            </p>

            <p className="mt-0.5 truncate text-sm font-bold text-white">
              {phone}
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-3.5 py-3 text-center text-xs font-semibold leading-5 text-red-200">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-center gap-1.5 sm:gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <input
              key={index}
              ref={(element) => {
                refs.current[index] = element;
              }}
              value={code[index] ?? ""}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              autoComplete={
                index === 0 ? "one-time-code" : "off"
              }
              disabled={loading || lockRemaining > 0}
              aria-label={`Verification digit ${index + 1}`}
              onChange={(event) =>
                handleChange(index, event.target.value)
              }
              onKeyDown={(event) =>
                handleKeyDown(index, event)
              }
              onPaste={handlePaste}
              className="h-12 w-10 rounded-xl border border-white/10 bg-black/20 text-center text-lg font-black text-white outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-50 sm:h-14 sm:w-12"
            />
          ))}
        </div>

        <div className="mt-5 text-center">
          {loading ? (
            <p className="text-xs font-bold text-white/45">
              Verifying code…
            </p>
          ) : lockRemaining > 0 ? (
            <p className="text-xs font-bold text-red-300">
              Try again in {lockMinutes} minute
              {lockMinutes === 1 ? "" : "s"}.
            </p>
          ) : countdown > 0 ? (
            <p className="text-xs text-white/30">
              Didn&apos;t receive it?{" "}
              <span className="font-black text-white/60">
                Resend in {countdown}s
              </span>
            </p>
          ) : (
            <button
              type="button"
              onClick={resendOtp}
              disabled={loading}
              className="text-xs font-black text-emerald-400 transition hover:text-emerald-300 disabled:opacity-50"
            >
              Send a new code
            </button>
          )}
        </div>

        <div className="mt-5 flex items-start gap-2 border-t border-white/8 pt-4">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />

          <p className="text-[11px] leading-4.5 text-white/30">
            Never share your verification code with anyone.
          </p>
        </div>

        <Link
          href="/register"
          className="mt-4 flex items-center justify-center gap-1.5 text-xs font-bold text-white/30 transition hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Change registration details
        </Link>
      </div>
    </AuthShell>
  );
}