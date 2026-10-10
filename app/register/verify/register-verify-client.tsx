"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  MessageSquareLock,
} from "lucide-react";

import {
  resendRegistrationOtp,
  verifyRegistrationOtp,
} from "@/app/auth/actions";

import AuthShell from "@/components/auth/auth-shell";
import { translate } from "@/lib/i18n/translations";

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

  const t = (key: Parameters<typeof translate>[1]) => translate("en", key);

  // Load the language saved by the landing page or account settings.

  // Redirect if the verification URL has no phone number.
  useEffect(() => {
    if (!phone) {
      router.replace("/register");
    }
  }, [phone, router]);

  // Resend countdown.
  useEffect(() => {
    if (countdown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCountdown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [countdown]);

  // Lock countdown.
  useEffect(() => {
    if (lockRemaining <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setLockRemaining((current) => {
        if (current <= 1) {
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [lockRemaining]);

  // Verify the six-digit registration OTP.
  async function verifyOtp(token: string) {
    if (loading || lockRemaining > 0) {
      return;
    }

    if (token.length !== 6) {
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

      setError(t("verificationFailed"));
    } catch (verificationError) {
      console.error(
        "Registration OTP verification error:",
        verificationError,
      );

      setError(t("verificationFailed"));
    } finally {
      setLoading(false);
    }
  }

  // Handle individual digits, mobile autofill, and multi-digit input.
  function handleChange(index: number, value: string) {
    if (loading || lockRemaining > 0) {
      return;
    }

    const digits = value.replace(/\D/g, "");

    if (!digits) {
      const characters = code.split("");

      while (characters.length < 6) {
        characters.push("");
      }

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

    while (characters.length < 6) {
      characters.push("");
    }

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

  // Keyboard navigation between OTP boxes.
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

      return;
    }
  }

  // Paste a complete OTP into the input group.
  function handlePaste(
    event: React.ClipboardEvent<HTMLInputElement>,
  ) {
    event.preventDefault();

    if (loading || lockRemaining > 0) {
      return;
    }

    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (!pasted) {
      return;
    }

    setCode(pasted);
    setError("");

    if (pasted.length === 6) {
      void verifyOtp(pasted);
    }
  }

  // Request another OTP, retaining the existing limits.
  async function resendOtp() {
    if (loading || countdown > 0 || lockRemaining > 0) {
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
    } catch (resendError) {
      console.error(
        "Registration OTP resend error:",
        resendError,
      );

      setError(
        "We could not send the verification code. Please try again.",
      );
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
      eyebrow={t("verifyYourPhone")}
      title={t("verifyYourPhone")}
      description={t("verificationDescription")}
    >
      <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/15 bg-emerald-400/10">
          <MessageSquareLock className="h-6 w-6 text-emerald-400" />
        </div>

        <p className="text-center text-xs font-black uppercase tracking-widest text-white/35">
          {t("verificationCode")}
        </p>

        <p className="mt-2 text-center text-lg font-black tracking-wide text-white">
          {phone}
        </p>

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-center text-sm font-semibold leading-5 text-red-200"
          >
            {error}
          </div>
        )}

        <div className="mt-7 flex justify-center gap-2 sm:gap-3">
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
              autoComplete={index === 0 ? "one-time-code" : "off"}
              disabled={loading || lockRemaining > 0}
              aria-label={`${t("verificationCode")} ${index + 1}`}
              onChange={(event) =>
                handleChange(index, event.target.value)
              }
              onKeyDown={(event) => handleKeyDown(index, event)}
              onPaste={handlePaste}
              className="h-14 w-11 rounded-2xl border border-white/10 bg-black/20 text-center text-xl font-black text-white outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-50 sm:h-16 sm:w-14"
            />
          ))}
        </div>

        <div className="mt-7 text-center">
          {loading ? (
            <p className="text-sm font-bold text-white/45">
              {t("verifying")}
            </p>
          ) : lockRemaining > 0 ? (
            <p className="text-sm font-bold text-red-300">
              {`Try again in ${lockMinutes} ${
                lockMinutes === 1 ? "minute" : "minutes"
              }.`}
            </p>
          ) : countdown > 0 ? (
            <p className="text-sm text-white/35">
              Didn&apos;t receive it?{" "}
              <span className="font-black text-white/65">
                {t("resendIn")} {countdown}s
              </span>
            </p>
          ) : (
            <button
              type="button"
              onClick={resendOtp}
              disabled={loading}
              className="text-sm font-black text-emerald-400 transition hover:text-emerald-300 disabled:opacity-50"
            >
              {t("resendCode")}
            </button>
          )}
        </div>

        <div className="mt-7 flex items-start gap-3 rounded-2xl bg-black/20 p-4">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />

          <p className="text-xs leading-5 text-white/40">
            Never share your verification code with anyone, including
            someone claiming to be MooGold support.
          </p>
        </div>

        <Link
          href="/register"
          className="mt-6 flex items-center justify-center gap-2 text-sm font-bold text-white/35 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToRegistration")}
        </Link>
      </div>
    </AuthShell>
  );
}