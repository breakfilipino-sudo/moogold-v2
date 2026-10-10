"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Landmark,
  UserRound,
} from "lucide-react";

import {
  getBankAccountRule,
  type WithdrawalCountryConfig,
} from "@/lib/withdrawal";

import { requestWithdrawal } from "./actions";

interface WithdrawFormProps {
  cashBalance: number;
  accountHolder: string;
  withdrawalConfig: WithdrawalCountryConfig;
  currency: string;
  currencySymbol: string;
  successReference?: string;
}

function formatBalance(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getAccountLengthText(
  minLength: number,
  maxLength: number,
  allowedLengths?: readonly number[],
) {
  if (allowedLengths?.length) {
    if (allowedLengths.length === 1) {
      return `${allowedLengths[0]} digits`;
    }

    return `${allowedLengths.join(" or ")} digits`;
  }

  if (minLength === maxLength) {
    return `${minLength} digits`;
  }

  return `${minLength}–${maxLength} digits`;
}

export default function WithdrawForm({
  cashBalance,
  accountHolder,
  withdrawalConfig,
  currency,
  currencySymbol,
  successReference,
}: WithdrawFormProps) {
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] =
    useState("");
  const [routingNumber, setRoutingNumber] =
    useState("");

  const accountRule = useMemo(() => {
    if (!bankName) {
      return null;
    }

    return getBankAccountRule(
      withdrawalConfig.code,
      bankName,
    );
  }, [bankName, withdrawalConfig.code]);

  const accountLengthText = accountRule
    ? getAccountLengthText(
        accountRule.accountNumberMinLength,
        accountRule.accountNumberMaxLength,
        accountRule.allowedLengths,
      )
    : null;

  if (successReference) {
    return (
      <div className="mx-auto w-full max-w-xl">
        <div className="rounded-3xl border border-black/6 bg-white p-5 shadow-[0_16px_45px_rgba(16,32,27,0.05)] sm:p-8">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>

            <h1 className="mt-5 text-2xl font-black tracking-tight text-[#10201b]">
              Withdrawal submitted
            </h1>

            <p className="mt-2 max-w-sm text-sm leading-6 text-black/45">
              Your withdrawal request has been submitted
              successfully.
            </p>

            <div className="mt-6 w-full rounded-2xl border border-black/6 bg-[#f7f9f8] px-4 py-3.5 text-left">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-black/35">
                Reference
              </p>

              <p className="mt-1 break-all text-sm font-bold text-[#10201b]">
                {successReference}
              </p>
            </div>

            <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard/wallet"
                className="flex h-12 flex-1 items-center justify-center rounded-xl bg-[#10201b] px-5 text-sm font-black text-white transition hover:bg-[#18352d]"
              >
                Back to Wallet
              </Link>

              <Link
                href="/dashboard"
                className="flex h-12 flex-1 items-center justify-center rounded-xl border border-black/10 bg-white px-5 text-sm font-bold text-[#10201b] transition hover:bg-black/2.5"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const bankIsSelectable =
    withdrawalConfig.bankFieldMode === "select";

  return (
    <form
      action={requestWithdrawal}
      className="mx-auto w-full max-w-2xl"
    >
      <div className="mb-5 sm:mb-7">
        <Link
          href="/dashboard/wallet"
          className="mb-4 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-black/45 transition hover:text-[#10201b]"
        >
          <ArrowLeft className="h-4 w-4" />
          Wallet
        </Link>

        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700/60">
          Withdraw
        </p>

        <h1 className="mt-1.5 text-[28px] font-black tracking-tight text-[#10201b] sm:text-3xl">
          Withdraw money
        </h1>

        <p className="mt-1.5 text-sm leading-5 text-black/45">
          Transfer money from your wallet to your bank account.
        </p>
      </div>

      <section className="mb-4 rounded-2xl border border-black/6 bg-white px-4 py-4 shadow-[0_8px_25px_rgba(16,32,27,0.04)] sm:mb-5 sm:rounded-3xl sm:px-6 sm:py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
            <Landmark className="h-[18px] w-[18px] text-emerald-700" />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-bold text-black/40">
              Available balance
            </p>

            <p className="mt-0.5 text-2xl font-black tracking-tight text-[#10201b]">
              {currencySymbol}
              {formatBalance(cashBalance)}
            </p>

            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-black/30">
              {currency}
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-black/6 bg-white shadow-[0_12px_35px_rgba(16,32,27,0.05)] sm:rounded-3xl">
        <div className="border-b border-black/6 px-4 py-5 sm:px-7 sm:py-6">
          <div className="mb-4">
            <h2 className="text-base font-black text-[#10201b]">
              Withdrawal amount
            </h2>

            <p className="mt-1 text-sm leading-5 text-black/40">
              Enter the amount you want to withdraw.
            </p>
          </div>

          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-black/30 sm:left-5">
              {currencySymbol}
            </span>

            <input
              name="amount"
              type="number"
              inputMode="decimal"
              min="10"
              max={cashBalance}
              step="0.01"
              value={amount}
              onChange={(event) =>
                setAmount(event.target.value)
              }
              placeholder="0.00"
              required
              className="h-16 w-full appearance-none rounded-xl border border-black/10 bg-[#f8faf9] pl-10 pr-4 text-[25px] font-black tracking-tight text-[#10201b] outline-none transition placeholder:text-black/20 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 sm:h-[68px] sm:rounded-2xl sm:pl-11 sm:pr-5 sm:text-[26px] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>

          <p className="mt-2 text-xs text-black/35">
            Minimum withdrawal: {currencySymbol}10.00 {currency}
          </p>
        </div>

        <div className="px-4 py-5 sm:px-7 sm:py-6">
          <div className="mb-5">
            <h2 className="text-base font-black text-[#10201b]">
              Bank details
            </h2>

            <p className="mt-1 text-sm leading-5 text-black/40">
              Use a bank account registered in your name.
            </p>
          </div>

          <div className="space-y-4 sm:space-y-5">
            <div>
              <label className="mb-2 block text-xs font-black text-[#10201b]">
                Account holder
              </label>

              <div className="flex min-h-14 items-center gap-3 rounded-xl border border-black/8 bg-[#f8faf9] px-4 sm:rounded-2xl">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white">
                  <UserRound className="h-4 w-4 text-black/45" />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#10201b]">
                    {accountHolder}
                  </p>

                  <p className="mt-0.5 text-[11px] text-black/35">
                    Registered account name
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="bankName"
                className="mb-2 block text-xs font-black text-[#10201b]"
              >
                Bank
              </label>

              {bankIsSelectable ? (
                <div className="relative">
                  <select
                    id="bankName"
                    name="bankName"
                    value={bankName}
                    onChange={(event) => {
                      setBankName(event.target.value);
                      setAccountNumber("");
                    }}
                    required
                    className="h-14 w-full appearance-none rounded-xl border border-black/10 bg-white px-4 pr-11 text-sm font-semibold text-[#10201b] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 sm:rounded-2xl"
                  >
                    <option value="">
                      Select your bank
                    </option>

                    {withdrawalConfig.banks.map(
                      (bank) => (
                        <option key={bank} value={bank}>
                          {bank}
                        </option>
                      ),
                    )}
                  </select>

                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
                </div>
              ) : (
                <input
                  id="bankName"
                  name="bankName"
                  type="text"
                  autoComplete="organization"
                  value={bankName}
                  onChange={(event) => {
                    setBankName(event.target.value);
                    setAccountNumber("");
                  }}
                  placeholder="Enter your bank name"
                  required
                  className="h-14 w-full rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold text-[#10201b] outline-none transition placeholder:text-black/25 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 sm:rounded-2xl"
                />
              )}
            </div>

            <div>
              <label
                htmlFor="accountNumber"
                className="mb-2 block text-xs font-black text-[#10201b]"
              >
                Account number
              </label>

              <input
                id="accountNumber"
                name="bankAccountNumber"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={
                  accountRule?.accountNumberMaxLength
                }
                value={accountNumber}
                onChange={(event) =>
                  setAccountNumber(
                    event.target.value.replace(/\D/g, ""),
                  )
                }
                placeholder={
                  accountRule
                    ? `Enter ${accountLengthText}`
                    : "Select your bank first"
                }
                disabled={!bankName}
                required
                className="h-14 w-full rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold tracking-wide text-[#10201b] outline-none transition placeholder:text-black/25 placeholder:tracking-normal focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:bg-[#f8faf9] disabled:text-black/30 sm:rounded-2xl"
              />

              {accountRule ? (
                <p className="mt-1.5 text-[11px] font-medium text-black/35">
                  Required length: {accountLengthText}
                </p>
              ) : null}
            </div>

            {withdrawalConfig.routingNumberRequired && (
              <div>
                <label
                  htmlFor="routingNumber"
                  className="mb-2 block text-xs font-black text-[#10201b]"
                >
                  {withdrawalConfig.routingNumberLabel ??
                    "Routing number"}
                </label>

                <input
                  id="routingNumber"
                  name="routingNumber"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={
                    withdrawalConfig.routingNumberLength
                  }
                  value={routingNumber}
                  onChange={(event) =>
                    setRoutingNumber(
                      event.target.value.replace(/\D/g, ""),
                    )
                  }
                  placeholder={`Enter ${withdrawalConfig.routingNumberLength ?? 9}-digit ${
                    withdrawalConfig.routingNumberLabel?.toLowerCase() ??
                    "routing number"
                  }`}
                  required
                  className="h-14 w-full rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold tracking-wide text-[#10201b] outline-none transition placeholder:text-black/25 placeholder:tracking-normal focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 sm:rounded-2xl"
                />
              </div>
            )}
          </div>

          <div className="mt-5 rounded-xl bg-[#f5f8f6] px-4 py-3.5 sm:mt-6 sm:rounded-2xl sm:py-4">
            <p className="text-sm font-bold text-[#10201b]">
              Check your details before submitting.
            </p>

            <p className="mt-1 text-xs leading-5 text-black/40">
              Make sure the bank details and withdrawal amount
              are correct.
            </p>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2.5 sm:mt-7 sm:flex-row sm:gap-3">
            <Link
              href="/dashboard/wallet"
              className="flex h-12 w-full items-center justify-center rounded-xl border border-black/10 bg-white px-5 text-sm font-bold text-[#10201b] transition hover:bg-black/2.5 sm:h-13 sm:flex-1 sm:rounded-2xl"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={!bankName || !accountNumber}
              className="h-12 w-full rounded-xl bg-[#10201b] px-5 text-sm font-black text-white shadow-[0_8px_20px_rgba(16,32,27,0.12)] transition hover:bg-[#18352d] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 sm:h-13 sm:flex-1 sm:rounded-2xl"
            >
              Submit Withdrawal
            </button>
          </div>
        </div>
      </section>
    </form>
  );
}