"use client";
import Link from "next/link";

import { useActionState, useState } from "react";
import type { WithdrawalCountryConfig } from "@/lib/withdrawal";
import { requestRegularLoanCashout, type LoanActionState } from "./actions";

type Props = {
  balance: string;
  currency: string;
  accountName: string;
  currencySymbol: string;
  withdrawalConfig: WithdrawalCountryConfig | null;
};

const initialState: LoanActionState = {
  success: false,
  message: "",
};

function formatAmountInput(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  const normalized = dot < 0
    ? cleaned
    : cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, "").slice(0, 2);
  const [integerPart = "", decimalPart] = normalized.split(".");
  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decimalPart === undefined ? grouped : `${grouped}.${decimalPart}`;
}

export default function LoanCashout({
  balance,
  currency,
  currencySymbol,
  accountName,
  withdrawalConfig,
}: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    requestRegularLoanCashout,
    initialState,
  );
  const [amountText, setAmountText] = useState("");
  const available = Number(balance) > 0;
  const enteredAmount = Number(amountText.replace(/,/g, ""));
  const exceedsBalance =
    amountText.trim() !== "" &&
    Number.isFinite(enteredAmount) &&
    enteredAmount > Number(balance);
  const collateralPopup =
    !state.success &&
    state.message.startsWith("Your main wallet must have at least");

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-emerald-100">
          Available for cash-out in {currency}
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-emerald-900"
        >
          Withdraw
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="loan-cashout-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 text-slate-900 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="loan-cashout-title" className="text-xl font-semibold">
                  {available ? "Cash out Loan Balance" : "No loan balance available"}
                </h2>
                {!available && (
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Your Loan Balance is currently zero. Accept an approved loan offer before requesting a cash-out.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-lg px-3 py-1 text-xl text-slate-500 hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            {available && withdrawalConfig && (
              <form action={formAction} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="loan-cashout-amount" className="mb-1.5 block text-sm font-medium">
                    Amount ({currency})
                  </label>
                  <input
                    id="loan-cashout-amount"
                    name="amount"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    required
                    value={amountText}
                    onChange={(event) => setAmountText(formatAmountInput(event.target.value))}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                    placeholder="Enter amount"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Available: {currencySymbol}{Number(balance).toLocaleString()} {currency}
                  </p>
                  {exceedsBalance && (
                    <p id="loan-cashout-balance-error" role="alert" className="mt-2 text-sm font-medium text-red-600">
                      The amount entered is greater than your available Loan Balance. Please enter {currencySymbol}{Number(balance).toLocaleString()} or less.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="loan-cashout-account-name" className="mb-1.5 block text-sm font-medium">
                    Account name
                  </label>
                  <input
                    id="loan-cashout-account-name"
                    value={accountName}
                    readOnly
                    aria-readonly="true"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700"
                  />
                </div>

                <div>
                  <label htmlFor="loan-cashout-bank" className="mb-1.5 block text-sm font-medium">
                    Bank
                  </label>
                  {withdrawalConfig.bankFieldMode === "select" ? (
                    <select
                      id="loan-cashout-bank"
                      name="bankName"
                      required
                      defaultValue=""
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                    >
                      <option value="" disabled>Select your bank</option>
                      {withdrawalConfig.banks.map((bank) => (
                        <option key={bank} value={bank}>{bank}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="loan-cashout-bank"
                      name="bankName"
                      required
                      list="loan-cashout-banks"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                      placeholder="Enter bank name"
                    />
                  )}
                  <datalist id="loan-cashout-banks">
                    {withdrawalConfig.banks.map((bank) => (
                      <option key={bank} value={bank} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label htmlFor="loan-cashout-account" className="mb-1.5 block text-sm font-medium">
                    Account number
                  </label>
                  <input
                    id="loan-cashout-account"
                    name="accountNumber"
                    required
                    inputMode="numeric"
                    autoComplete="off"
                    minLength={withdrawalConfig.accountNumberMinLength}
                    maxLength={withdrawalConfig.accountNumberMaxLength}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                    placeholder="Enter account number"
                  />
                </div>

                {withdrawalConfig.routingNumberRequired && (
                  <div>
                    <label htmlFor="loan-cashout-routing" className="mb-1.5 block text-sm font-medium">
                      {withdrawalConfig.routingNumberLabel ?? "Routing number"}
                    </label>
                    <input
                      id="loan-cashout-routing"
                      name="routingNumber"
                      required
                      inputMode="numeric"
                      maxLength={withdrawalConfig.routingNumberLength}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                      placeholder={`Enter ${withdrawalConfig.routingNumberLabel ?? "routing number"}`}
                    />
                  </div>
                )}


                {state.message && !collateralPopup && (
                  <p
                    role="status"
                    className={`rounded-xl px-4 py-3 text-sm ${
                      state.success
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-rose-50 text-rose-800"
                    }`}
                  >
                    {state.message}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={pending || exceedsBalance}
                  className="w-full rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pending ? "Processing…" : "Withdraw"}
                </button>
              </form>
            )}

            {available && !withdrawalConfig && (
              <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                Bank cash-out is not currently supported for your registered country.
              </p>
            )}

            {!available && (
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-6 w-full rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-900"
              >
                Close
              </button>
            )}
          </section>
          {collateralPopup && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4" role="presentation">
              <section
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="loan-collateral-title"
                className="w-full max-w-md rounded-2xl bg-white p-6 text-slate-900 shadow-2xl"
              >
                <h3 id="loan-collateral-title" className="text-lg font-semibold">
                  More funds needed in your main wallet
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {state.message}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Need help?{" "}
                  <Link
                    href="/dashboard/support/new"
                    className="font-semibold text-emerald-800 underline underline-offset-2"
                  >
                    Contact Customer Support
                  </Link>
                  .
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-5 w-full rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-900"
                >
                  Close
                </button>
              </section>
            </div>
          )}
        </div>
      )}
    </>
  );
}
