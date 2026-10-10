"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  KeyRound,
  Loader2,
  Phone,
} from "lucide-react";

import { requestPinResetOtp } from "@/app/auth/actions";

type ForgotPinClientProps = {
  registeredPhone?: string;
  authenticatedFlow?: boolean;
};

function formatPhone(phone: string) {
  if (!phone) {
    return "";
  }

  if (phone.startsWith("+60")) {
    return phone.replace(
      /^(\+60)(\d{2})(\d+)?$/,
      "$1 $2 $3",
    );
  }

  if (phone.startsWith("+63")) {
    return phone.replace(
      /^(\+63)(\d{3})(\d+)?$/,
      "$1 $2 $3",
    );
  }

  if (phone.startsWith("+65")) {
    return phone.replace(
      /^(\+65)(\d{4})(\d{4})$/,
      "$1 $2 $3",
    );
  }

  if (phone.startsWith("+66")) {
    return phone.replace(
      /^(\+66)(\d{2})(\d+)?$/,
      "$1 $2 $3",
    );
  }

  return phone;
}

function maskPhone(phone: string) {
  if (phone.length <= 6) {
    return phone;
  }

  return `${phone.slice(0, 4)} •••• ${phone.slice(-3)}`;
}

export default function ForgotPinClient({
  registeredPhone,
  authenticatedFlow = false,
}: ForgotPinClientProps) {
  const router = useRouter();

  const [phone, setPhone] = useState(
    registeredPhone ?? "",
  );

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");

    if (!phone.trim()) {
      setError("Please enter your mobile number.");
      return;
    }

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

      if (result?.success && result.phone) {
        router.push(
          `/forgot-pin/verify?phone=${encodeURIComponent(
            result.phone,
          )}`,
        );
      }
    } catch (submitError) {
      console.error(
        "Forgot PIN request failed:",
        submitError,
      );

      setError(
        "We could not start PIN recovery. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-md items-center">
        <div className="w-full">
          <Link
            href={
              authenticatedFlow
                ? "/dashboard/settings"
                : "/login"
            }
            className="mb-6 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {authenticatedFlow
              ? "Settings"
              : "Back to sign in"}
          </Link>

          <div className="mb-5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <KeyRound className="h-5 w-5" />
            </div>

            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
              Login & Security
            </p>

            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Forgot PIN
            </h1>

            <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
              We&apos;ll send a verification code to
              your registered mobile number.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
          >
            {error && (
              <div className="border-b border-red-100 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/30">
                <p className="text-xs font-semibold leading-5 text-red-700 dark:text-red-300">
                  {error}
                </p>
              </div>
            )}

            <div className="p-4">
              <label
                htmlFor="phone"
                className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400"
              >
                Registered mobile number
              </label>

              {authenticatedFlow ? (
                <div className="flex min-h-12 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-800">
                  <Phone className="h-4 w-4 shrink-0 text-slate-400" />

                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {maskPhone(
                        formatPhone(phone),
                      )}
                    </p>

                    <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                      Registered on your MooGold account
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={phone}
                    onChange={(event) =>
                      setPhone(
                        event.target.value,
                      )
                    }
                    required
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="+60 12 345 6789"
                    className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-emerald-500 dark:focus:ring-emerald-500/10"
                  />

                  <p className="mt-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                    Enter the mobile number registered to
                    your account.
                  </p>
                </>
              )}
            </div>

            <div className="border-t border-slate-100 p-3 dark:border-slate-800">
              <button
                type="submit"
                disabled={loading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-xs font-black text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending code...
                  </>
                ) : (
                  "Continue"
                )}
              </button>
            </div>
          </form>

          <p className="mt-5 text-center text-[10px] leading-5 text-slate-400 dark:text-slate-500">
            For your security, verification codes are
            temporary and can only be requested a limited
            number of times.
          </p>
        </div>
      </div>
    </main>
  );
}