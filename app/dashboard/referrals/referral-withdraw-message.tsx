"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, X } from "lucide-react";

type ReferralWithdrawMessageProps = {
  balance: number;
  minimum: number;
  currency: string;
};

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export default function ReferralWithdrawMessage({
  balance,
  minimum,
  currency,
}: ReferralWithdrawMessageProps) {
  const [open, setOpen] = useState(false);

  const remaining = Math.max(0, minimum - balance);
  const meetsMinimum = balance >= minimum;

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-bold text-black shadow-sm transition hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-white/30"
      >
        Withdraw
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#07130f]/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="referral-withdraw-title"
            className="w-full max-w-md overflow-hidden rounded-3xl border border-[#e3ebe6] bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-[#edf1ee] px-5 py-5 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f0f6f2]">
                  <Clock3 className="h-5 w-5 text-[#315c4d]" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#82928a]">
                    Referral withdrawals
                  </p>
                  <h2
                    id="referral-withdraw-title"
                    className="mt-1 text-lg font-bold text-[#10201b]"
                  >
                    Withdrawal information
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-xl p-2 text-[#71827a] transition hover:bg-[#f2f5f3] hover:text-[#10201b]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5 sm:px-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#f5f8f6] p-4">
                  <p className="text-xs font-medium text-[#82928a]">
                    Your balance
                  </p>
                  <p className="mt-2 text-lg font-bold text-[#10201b]">
                    {formatMoney(balance, currency)}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f5f8f6] p-4">
                  <p className="text-xs font-medium text-[#82928a]">
                    Minimum required
                  </p>
                  <p className="mt-2 text-lg font-bold text-[#10201b]">
                    {formatMoney(minimum, currency)}
                  </p>
                </div>
              </div>

              {!meetsMinimum && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-sm font-bold text-amber-900">
                    You need {formatMoney(remaining, currency)} more.
                  </p>
                  <p className="mt-1 text-xs leading-5 text-amber-800/80">
                    Your balance must reach the minimum withdrawal amount before you meet the balance requirement.
                  </p>
                </div>
              )}

              {meetsMinimum && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                    <p className="text-sm font-bold text-emerald-900">
                      Minimum balance reached
                    </p>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-emerald-800/80">
                    Your referral balance meets the minimum requirement.
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-[#edf1ee] px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-11 w-full rounded-xl bg-[#10201b] px-5 text-sm font-bold text-white transition hover:bg-[#193b30]"
              >
                Got it
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
