import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  KeyRound,
  ShieldCheck,
} from "lucide-react";

export default function SecuritySettingsPage() {
  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Header */}
        <div className="mb-5">
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Settings
          </Link>

          <div className="mt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>

              <div>
                <h1 className="text-xl font-black text-slate-900">
                  Login &amp; Security
                </h1>

                <p className="mt-0.5 text-sm text-slate-500">
                  Manage how you protect and access your MooGold account.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Security */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              Account security
            </p>

            <h2 className="mt-1 text-base font-black text-slate-900">
              Sign-in protection
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Review the security methods connected to your account.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {/* PIN */}
            <Link
              href="/dashboard/settings/pin"
              className="group flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50 sm:px-6"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                  <KeyRound className="h-4 w-4 text-slate-600" />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">
                    4-digit PIN
                  </p>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Change the PIN you use to sign in.
                  </p>
                </div>
              </div>

              <ChevronRight className="h-4.5 w-4.5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
            </Link>

            {/* Phone */}
            <Link
              href="/dashboard/settings/phone"
              className="group flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50 sm:px-6"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                  <ShieldCheck className="h-4 w-4 text-slate-600" />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">
                    Mobile number
                  </p>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Change your registered mobile number.
                  </p>
                </div>
              </div>

              <ChevronRight className="h-4.5 w-4.5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
            </Link>

            {/* Email */}
            <Link
              href="/dashboard/settings/email"
              className="group flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50 sm:px-6"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                  <ShieldCheck className="h-4 w-4 text-slate-600" />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">
                    Email address
                  </p>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Manage your registered email address.
                  </p>
                </div>
              </div>

              <ChevronRight className="h-4.5 w-4.5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
            </Link>
          </div>
        </section>

        {/* Current login architecture */}
        <section className="mt-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:px-6">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-4.5 w-4.5 shrink-0 text-emerald-600" />

            <div>
              <p className="text-sm font-bold text-slate-900">
                MooGold sign-in
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Your account uses your registered mobile number and
                4-digit PIN for normal sign-in.
              </p>
            </div>
          </div>
        </section>

        {/* Back */}
        <div className="mt-5">
          <Link
            href="/dashboard/settings"
            className="text-sm font-bold text-emerald-600 transition hover:text-emerald-700"
          >
            Back to Settings
          </Link>
        </div>
      </div>
    </div>
  );
}