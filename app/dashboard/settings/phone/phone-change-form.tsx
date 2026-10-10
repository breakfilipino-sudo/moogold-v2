"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Phone,
  ShieldCheck,
} from "lucide-react";

import {
  requestPhoneChangeVerification,
  updatePhoneNumber,
  verifyCurrentPhone,
} from "./actions";

type PhoneChangeFormProps = {
  currentPhone: string;
};

type Step =
  | "verify-current"
  | "enter-new"
  | "success";

export default function PhoneChangeForm({
  currentPhone,
}: PhoneChangeFormProps) {
  const [step, setStep] =
    useState<Step>("verify-current");

  const [phone, setPhone] = useState("");
  const [token, setToken] = useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [codeSent, setCodeSent] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSendCode() {
    if (isSubmitting) {
      return;
    }

    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const result =
        await requestPhoneChangeVerification();

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.success) {
        setCodeSent(true);
        setToken("");
        setSuccess(
          "A 6-digit verification code has been sent to your current mobile number.",
        );
      }
    } catch (submitError) {
      console.error(
        "Failed to request current phone verification:",
        submitError,
      );

      setError(
        "Unable to send the verification code. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyCurrentPhone() {
    if (isSubmitting) {
      return;
    }

    setError("");
    setSuccess("");

    if (!/^\d{6}$/.test(token)) {
      setError(
        "Please enter the 6-digit verification code.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();

      formData.set("token", token);

      const result =
        await verifyCurrentPhone(formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.success) {
        setToken("");
        setCodeSent(false);
        setStep("enter-new");
        setSuccess(
          "Your current mobile number has been verified.",
        );
      }
    } catch (submitError) {
      console.error(
        "Failed to verify current phone:",
        submitError,
      );

      setError(
        "Unable to verify your current mobile number. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdatePhone() {
    if (isSubmitting) {
      return;
    }

    setError("");
    setSuccess("");

    if (!phone.trim()) {
      setError(
        "Please enter your new mobile number.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();

      formData.set("phone", phone);

      const result =
        await updatePhoneNumber(formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.success && result.phone) {
        setPhone(result.phone);
        setStep("success");
        setSuccess(
          "Your mobile number has been changed successfully.",
        );
      }
    } catch (submitError) {
      console.error(
        "Failed to update phone number:",
        submitError,
      );

      setError(
        "Unable to update your mobile number. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetVerification() {
    setToken("");
    setCodeSent(false);
    setError("");
    setSuccess("");
  }

  return (
    <>
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Settings
      </Link>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <Phone className="h-5 w-5 text-emerald-600" />
            </div>

            <div>
              <h1 className="text-lg font-black text-slate-900">
                Change Mobile Number
              </h1>

              <p className="mt-0.5 text-xs text-slate-500">
                Verify your current number before replacing it.
              </p>
            </div>
          </div>
        </div>

        {step === "verify-current" && (
          <div className="space-y-5 p-5 sm:p-6">
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Current mobile number
              </p>

              <p className="mt-1 text-sm font-bold text-slate-900">
                {currentPhone || "Not available"}
              </p>
            </div>

            {!codeSent ? (
              <>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />

                    <p className="text-xs leading-5 text-emerald-800">
                      We&apos;ll send a 6-digit verification
                      code to your current mobile number to
                      confirm ownership.
                    </p>
                  </div>
                </div>

                {error && (
                  <ErrorMessage message={error} />
                )}

                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={
                    isSubmitting ||
                    !currentPhone
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending Code...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      Send Verification Code
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

                    <div>
                      <p className="text-sm font-bold text-emerald-900">
                        Verify your current number
                      </p>

                      <p className="mt-1 text-xs leading-5 text-emerald-700">
                        Enter the 6-digit code sent to{" "}
                        <span className="font-bold">
                          {currentPhone}
                        </span>
                        .
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="phoneVerificationCode"
                    className="text-sm font-bold text-slate-700"
                  >
                    Verification code
                  </label>

                  <input
                    id="phoneVerificationCode"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={token}
                    onChange={(event) =>
                      setToken(
                        event.target.value
                          .replace(/\D/g, "")
                          .slice(0, 6),
                      )
                    }
                    placeholder="000000"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-xl font-black tracking-[0.45em] text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-100"
                  />
                </div>

                {success && (
                  <SuccessMessage message={success} />
                )}

                {error && (
                  <ErrorMessage message={error} />
                )}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={resetVerification}
                    disabled={isSubmitting}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Send Again
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleVerifyCurrentPhone
                    }
                    disabled={
                      isSubmitting ||
                      token.length !== 6
                    }
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        Verify Number
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {step === "enter-new" && (
          <div className="space-y-5 p-5 sm:p-6">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

                <div>
                  <p className="text-sm font-bold text-emerald-900">
                    Current number verified
                  </p>

                  <p className="mt-1 text-xs leading-5 text-emerald-700">
                    You can now enter the new mobile number
                    for your MooGold account.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="newPhone"
                className="text-sm font-bold text-slate-700"
              >
                New mobile number
              </label>

              <input
                id="newPhone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) =>
                  setPhone(event.target.value)
                }
                placeholder="+60 123456789"
                disabled={isSubmitting}
                autoFocus
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              />

              <p className="mt-2 text-xs leading-5 text-slate-400">
                Your new number will be saved after it passes
                our validation checks. No additional verification
                code is required.
              </p>
            </div>

            {error && (
              <ErrorMessage message={error} />
            )}

            {success && (
              <SuccessMessage message={success} />
            )}

            <button
              type="button"
              onClick={handleUpdatePhone}
              disabled={
                isSubmitting ||
                !phone.trim()
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating Number...
                </>
              ) : (
                <>
                  <Phone className="h-4 w-4" />
                  Save New Number
                </>
              )}
            </button>
          </div>
        )}

        {step === "success" && (
          <div className="p-5 sm:p-6">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>

              <h2 className="mt-4 text-base font-black text-emerald-950">
                Mobile number updated
              </h2>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-emerald-800">
                Your MooGold account is now linked to your new
                mobile number.
              </p>

              <p className="mt-4 text-base font-black text-emerald-950">
                {phone}
              </p>

              <Link
                href="/dashboard/settings"
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white transition hover:bg-slate-800"
              >
                Back to Settings
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function ErrorMessage({
  message,
}: {
  message: string;
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
      <p className="text-sm font-semibold leading-5 text-red-700">
        {message}
      </p>
    </div>
  );
}

function SuccessMessage({
  message,
}: {
  message: string;
}) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
      <p className="text-sm font-semibold leading-5 text-emerald-700">
        {message}
      </p>
    </div>
  );
}