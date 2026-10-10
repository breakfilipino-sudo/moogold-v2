import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ShieldAlert,
} from "lucide-react";

import CloseAccountForm from "./close-account-form";

export default function CloseAccountPage() {
  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto w-full max-w-xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-5">
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Settings
          </Link>

          <div className="mt-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
              <ShieldAlert className="h-5 w-5 text-red-600" />
            </div>

            <div>
              <h1 className="text-xl font-black text-slate-900">
                Close account
              </h1>

              <p className="mt-0.5 text-sm text-slate-500">
                Permanently close your MooGold account.
              </p>
            </div>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
          <div className="border-b border-red-100 bg-red-50 px-5 py-4 sm:px-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <div>
                <h2 className="text-sm font-black text-red-900">
                  Before you continue
                </h2>

                <p className="mt-1 text-xs leading-5 text-red-700">
                  Account closure is a permanent account action.
                  Please make sure you have resolved any outstanding
                  activity before continuing.
                </p>
              </div>
            </div>
          </div>

          <div className="px-5 py-5 sm:px-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Please check your account
                </p>

                <ul className="mt-2 space-y-2 text-xs leading-5 text-slate-500">
                  <li>
                    • Make sure there are no pending deposits or
                    withdrawals.
                  </li>

                  <li>
                    • Make sure you have no pending investment or
                    other financial activity.
                  </li>

                  <li>
                    • Any remaining financial obligations must be
                    resolved before closure can be completed.
                  </li>

                  <li>
                    • MooGold may retain records where required for
                    financial, security, legal, or regulatory purposes.
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold leading-5 text-slate-600">
                  Your account will first be placed into a closure
                  request state. This allows MooGold to protect your
                  financial records and process the closure safely.
                </p>
              </div>

              <CloseAccountForm />

              <Link
                href="/dashboard/settings"
                className="flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Keep my account
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}