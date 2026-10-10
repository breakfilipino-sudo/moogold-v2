"use client";

import {
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  KeyRound,
  Loader2,
} from "lucide-react";
import {
  requestPinResetOtp,
  verifyPinResetOtp,
} from "@/app/auth/actions";

const MAX_REQUESTS = 3;
const RESEND_SECONDS = 60;
const LOCK_SECONDS = 300;

function formatPhone(value: string) {
  if (value.startsWith("+60")) {
    return value.replace(
      /^(\+60)(\d{2})(\d+)?$/,
      "$1 $2 $3",
    );
  }

  if (value.startsWith("+63")) {
    return value.replace(
      /^(\+63)(\d{3})(\d+)?$/,
      "$1 $2 $3",
    );
  }

  if (value.startsWith("+65")) {
    return value.replace(
      /^(\+65)(\d{4})(\d{4})$/,
      "$1 $2 $3",
    );
  }

  if (value.startsWith("+66")) {
    return value.replace(
      /^(\+66)(\d{2})(\d+)?$/,
      "$1 $2 $3",
    );
  }

  return value;
}

export default function ForgotPinVerifyPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
        </main>
      }
    >
      <ForgotPinVerifyContent />
    </Suspense>
  );
}

function ForgotPinVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone") ?? "";

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [requestCount, setRequestCount] = useState(1);
  const [countdown, setCountdown] =
    useState(RESEND_SECONDS);

  // Stores remaining lock seconds, not an absolute timestamp.
  const [lockedUntil, setLockedUntil] =
    useState<number | null>(null);

  const [remainingLockSeconds, setRemainingLockSeconds] =
    useState(0);

  const inputRefs = useRef<
    Array<HTMLInputElement | null>
  >([]);

  useEffect(() => {
    if (!phone) {
      router.replace("/forgot-pin");
    }
  }, [phone, router]);

  useEffect(() => {
    if (countdown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [countdown]);

  /*
   * Lock countdown.
   *
   * lockedUntil is intentionally used as a remaining-seconds
   * value rather than an absolute timestamp. This keeps the
   * render/effect logic pure and avoids calling Date.now()
   * during the React render/update path.
   */
  useEffect(() => {
  if (!lockedUntil) {
    return;
  }

  const timer = window.setInterval(() => {
    setRemainingLockSeconds((current) => {
      if (current <= 1) {
        window.clearInterval(timer);
        setLockedUntil(null);
        setRequestCount(0);
        setCountdown(0);
        return 0;
      }

      return current - 1;
    });
  }, 1000);

  return () => {
    window.clearInterval(timer);
  };
}, [lockedUntil]);

  function handleChange(
    index: number,
    value: string,
  ) {
    const digit = value
      .replace(/\D/g, "")
      .slice(-1);

    const current = code.split("");
    current[index] = digit;

    const nextCode = current
      .join("")
      .slice(0, 6);

    setCode(nextCode);
    setError("");

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (
      nextCode.length === 6 &&
      /^\d{6}$/.test(nextCode)
    ) {
      void verifyCode(nextCode);
    }
  }

  function handleKeyDown(
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (
      event.key === "Backspace" &&
      !inputRefs.current[index]?.value &&
      index > 0
    ) {
      inputRefs.current[index - 1]?.focus();
      return;
    }

    if (
      event.key === "ArrowLeft" &&
      index > 0
    ) {
      inputRefs.current[index - 1]?.focus();
      return;
    }

    if (
      event.key === "ArrowRight" &&
      index < 5
    ) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(
    event: React.ClipboardEvent<HTMLInputElement>,
  ) {
    event.preventDefault();

    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (!pasted) {
      return;
    }

    setCode(pasted);
    setError("");

    const focusIndex =
      Math.min(pasted.length, 6) - 1;

    if (focusIndex >= 0) {
      inputRefs.current[focusIndex]?.focus();
    }

    if (pasted.length === 6) {
      void verifyCode(pasted);
    }
  }

  async function verifyCode(
    verificationCode: string,
  ) {
    if (loading) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      const formData = new FormData();

      formData.set("phone", phone);
      formData.set("token", verificationCode);

      const result =
        await verifyPinResetOtp(formData);

      if (result?.error) {
        setError(result.error);
        setCode("");

        window.setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 50);

        return;
      }

      if (result?.success) {
        router.push(
          `/reset-pin/new?phone=${encodeURIComponent(
            phone,
          )}`,
        );
      }
    } catch (verifyError) {
      console.error(
        "PIN verification failed:",
        verifyError,
      );

      setError(
        "We could not verify the code. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (
      loading ||
      countdown > 0 ||
      lockedUntil
    ) {
      return;
    }

    if (requestCount >= MAX_REQUESTS) {
      setLockedUntil(LOCK_SECONDS);
      setRemainingLockSeconds(LOCK_SECONDS);

      setError(
        "Too many requests. Please wait 5 minutes before requesting another code.",
      );

      return;
    }

    setError("");
    setLoading(true);

    try {
      const formData = new FormData();

      formData.set("phone", phone);

      const result =
        await requestPinResetOtp(formData);

      if (result?.error) {
        setError(result.error);
        return;
      }

      setRequestCount(
        (current) => current + 1,
      );

      setCountdown(RESEND_SECONDS);
    } catch (resendError) {
      console.error(
        "PIN OTP resend failed:",
        resendError,
      );

      setError(
        "We could not send a new code. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!phone) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-md items-center">
        <div className="w-full">
          <Link
            href="/forgot-pin"
            className="mb-6 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>

          <div className="mb-5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <KeyRound className="h-5 w-5" />
            </div>

            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
              PIN Recovery
            </p>

            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Verify your number
            </h1>

            <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Enter the 6-digit verification code
              sent to
            </p>

            <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
              {formatPhone(phone)}
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            {error && (
              <div className="border-b border-red-100 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/30">
                <p className="text-xs font-semibold leading-5 text-red-700 dark:text-red-300">
                  {error}
                </p>
              </div>
            )}

            <div className="p-4">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Verification code
              </p>

              <div className="flex justify-between gap-1.5 sm:justify-start sm:gap-2">
                {Array.from({ length: 6 }).map(
                  (_, index) => (
                    <input
                      key={index}
                      ref={(element) => {
                        inputRefs.current[index] =
                          element;
                      }}
                      type="text"
                      inputMode="numeric"
                      autoComplete={
                        index === 0
                          ? "one-time-code"
                          : "off"
                      }
                      maxLength={1}
                      value={code[index] ?? ""}
                      onChange={(event) =>
                        handleChange(
                          index,
                          event.target.value,
                        )
                      }
                      onKeyDown={(event) =>
                        handleKeyDown(
                          index,
                          event,
                        )
                      }
                      onPaste={handlePaste}
                      disabled={
                        loading ||
                        !!lockedUntil
                      }
                      aria-label={`Verification digit ${
                        index + 1
                      }`}
                      className="h-12 w-full rounded-lg border border-slate-200 bg-slate-50 text-center text-lg font-black text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-emerald-500 dark:focus:bg-slate-800 dark:focus:ring-emerald-500/10 sm:h-13 sm:w-12"
                    />
                  ),
                )}
              </div>

              <div className="mt-5 border-t border-slate-100 pt-4 text-center dark:border-slate-800">
                {loading ? (
                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Verifying...
                  </div>
                ) : lockedUntil ? (
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                    Please wait{" "}
                    {Math.ceil(
                      remainingLockSeconds /
                        60,
                    )}{" "}
                    minutes before requesting another
                    code.
                  </p>
                ) : countdown > 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Resend available in{" "}
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {countdown}s
                    </span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    className="text-xs font-black text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
                  >
                    Send a new code
                  </button>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push("/forgot-pin")
              }
              className="w-full border-t border-slate-100 px-4 py-3 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              Use a different number
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}