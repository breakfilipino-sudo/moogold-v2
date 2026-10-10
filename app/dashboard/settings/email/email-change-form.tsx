"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { requestEmailChange } from "./actions";

type EmailChangeFormProps = {
  currentEmail: string;
};

type Step = "email" | "sent" | "success";

export default function EmailChangeForm({
  currentEmail,
}: EmailChangeFormProps) {
  const searchParams = useSearchParams();

  const verified = searchParams.get("verified");
  const callbackError = searchParams.get("error");

  const hasEmail = Boolean(currentEmail.trim());

  const initialStep: Step =
    verified === "1" ? "success" : "email";

  const initialError =
    callbackError === "email-in-use"
      ? "This email address is already associated with another MooGold account."
      : "";

  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>(initialStep);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);

  useEffect(() => {
    if (
      verified !== "1" &&
      callbackError !== "email-in-use"
    ) {
      return;
    }

    window.history.replaceState(
      {},
      "",
      "/dashboard/settings/email",
    );
  }, [verified, callbackError]);

  async function handleSubmit(
    formData: FormData,
  ) {
    if (loading) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result =
        await requestEmailChange(formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.email) {
        setEmail(result.email);
      }

      setStep("sent");
    } catch (requestError) {
      console.error(
        "Email change request failed:",
        requestError,
      );

      setError(
        "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (step === "success") {
    return (
      <div className="space-y-3">
        <BackToSettings />

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <IconBox>
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </IconBox>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-600">
                  Security
                </p>

                <h1 className="mt-0.5 text-base font-black text-slate-950">
                  Email address updated
                </h1>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-5">
            <p className="text-sm leading-6 text-slate-500">
              Your MooGold email address has been
              successfully confirmed and updated.
            </p>

            <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />

              <p className="text-xs leading-5 text-emerald-900/70">
                Your confirmed email is now associated
                with your MooGold account.
              </p>
            </div>

            <Link
              href="/dashboard/settings"
              className="flex w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800"
            >
              Return to Settings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (step === "sent") {
    return (
      <div className="space-y-3">
        <BackToSettings />

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <IconBox>
                <Mail className="h-5 w-5 text-emerald-600" />
              </IconBox>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-600">
                  Verification
                </p>

                <h1 className="mt-0.5 text-base font-black text-slate-950">
                  Check your email
                </h1>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-5">
            <p className="text-sm leading-6 text-slate-500">
              We sent a confirmation link to:
            </p>

            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="break-all text-sm font-bold text-slate-800">
                {email}
              </p>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />

              <p className="text-xs leading-5 text-emerald-900/70">
                Your email will only be changed after
                the confirmation link has been verified.
              </p>
            </div>

            <p className="text-xs leading-5 text-slate-400">
              If you do not see the message, check your
              spam or junk folder.
            </p>

            <Link
              href="/dashboard/settings"
              className="flex w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800"
            >
              Return to Settings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <BackToSettings />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <IconBox>
              <Mail className="h-5 w-5 text-emerald-600" />
            </IconBox>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-600">
                {hasEmail ? "Profile" : "Account"}
              </p>

              <h1 className="mt-0.5 text-base font-black text-slate-950">
                {hasEmail
                  ? "Change email address"
                  : "Add email address"}
              </h1>

              <p className="mt-0.5 text-xs text-slate-500">
                {hasEmail
                  ? "Update the email linked to your MooGold account."
                  : "Add an email address to help secure your account."}
              </p>
            </div>
          </div>
        </div>

        <form
          action={handleSubmit}
          className="space-y-4 p-5"
        >
          {hasEmail && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.13em] text-slate-400">
                Current email
              </p>

              <p className="mt-1 break-all text-sm font-bold text-slate-800">
                {currentEmail}
              </p>
            </div>
          )}

          {!hasEmail && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />

              <p className="text-xs leading-5 text-emerald-900/70">
                Adding an email gives you another secure
                way to manage and protect your account.
              </p>
            </div>
          )}

          {error && <ErrorMessage message={error} />}

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-xs font-bold text-slate-600"
            >
              {hasEmail
                ? "New email address"
                : "Email address"}
            </label>

            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="you@example.com"
              disabled={loading}
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            />

            <p className="mt-1.5 text-[11px] leading-5 text-slate-400">
              We&apos;ll send a confirmation link before
              the email is added to your account.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Sending confirmation..."
              : hasEmail
                ? "Change Email"
                : "Add Email"}
          </button>
        </form>
      </div>
    </div>
  );
}

function BackToSettings() {
  return (
    <Link
      href="/dashboard/settings"
      className="inline-flex items-center gap-2 px-1 py-1 text-xs font-bold text-slate-500 transition hover:text-slate-900"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Back to Settings
    </Link>
  );
}

function IconBox({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
      {children}
    </div>
  );
}

function ErrorMessage({
  message,
}: {
  message: string;
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
      <p className="text-xs font-semibold leading-5 text-red-700">
        {message}
      </p>
    </div>
  );
}