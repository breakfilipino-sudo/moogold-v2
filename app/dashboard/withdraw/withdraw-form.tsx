"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowLeftRight,
  ChevronDown,
  Landmark,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import {
  getBankAccountRule,
  type WithdrawalCountryConfig,
} from "@/lib/withdrawal";

import { requestWithdrawal } from "./actions";

interface WithdrawFormProps {
  cashBalance: number;
  withdrawalExchangeRate: number | null;
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
  withdrawalExchangeRate,
  accountHolder,
  withdrawalConfig,
  currency,
  currencySymbol,
  successReference,
}: WithdrawFormProps) {
  const router = useRouter();

  useEffect(() => {
    if (!successReference) return;

    const timeout = window.setTimeout(
      () => router.replace("/dashboard"),
      10_000,
    );

    return () => window.clearTimeout(timeout);
  }, [successReference, router]);

  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");

  const localBalance =
    withdrawalExchangeRate === null
      ? null
      : cashBalance * withdrawalExchangeRate;

  const enteredAmount = Number(amount.replace(/,/g, ""));
  const amountExceedsBalance =
    amount.trim() !== "" &&
    localBalance !== null &&
    enteredAmount > localBalance;

  const submittedUsdAmount =
    withdrawalExchangeRate !== null && withdrawalExchangeRate > 0
      ? (
          Number(amount.replace(/,/g, "")) /
          withdrawalExchangeRate
        ).toFixed(2)
      : "0";

  const accountRule = useMemo(() => {
    if (!bankName) {
      return null;
    }

    return getBankAccountRule(withdrawalConfig.code, bankName);
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
      <div className="mx-auto w-full max-w-xl py-6 sm:py-10">
        <div className="relative rounded-3xl border border-slate-200 bg-white px-5 py-8 text-center shadow-sm sm:px-8">
          <Link
            href="/dashboard"
            aria-label="Return to dashboard"
            title="Return to dashboard"
            className="absolute left-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <ArrowLeftRight className="h-7 w-7" />
          </div>

          <h1 className="mt-5 text-xl font-bold tracking-tight text-slate-900">
            Withdrawal Successfully Submitted
          </h1>

          <p className="mt-4 text-xs font-medium text-slate-500">
            Reference: <span className="font-mono text-slate-700">{successReference}</span>
          </p>
        </div>
      </div>
    );
  }
  const bankIsSelectable = withdrawalConfig.bankFieldMode === "select";

  return (
    <form action={requestWithdrawal} className="mx-auto w-full max-w-xl">
      {/* Top Bar Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/dashboard/wallet"
          className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-xs transition hover:border-slate-300 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Wallet
        </Link>

        {/* Header Tag */}
        <div className="flex items-center gap-2.5">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
          <h1 className="text-lg font-bold text-slate-900">
            Withdraw money
          </h1>
        </div>
      </div>

      {/* Hero Card (Balance) */}
      <section className="relative mb-6 overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl shadow-slate-950/10 sm:p-7">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Available Balance
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-4xl font-black tracking-tight text-white">
                {currencySymbol}{localBalance === null ? "—" : formatBalance(localBalance)}
              </span>
              <span className="text-sm font-bold text-emerald-400 uppercase">
                {currency}
              </span>
            </div>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
            <Landmark className="h-6 w-6 text-emerald-400" />
          </div>
        </div>
      </section>

      {/* Form Steps */}
      <div className="space-y-6">
        {/* Step 1: Amount Block */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-7">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-extrabold text-emerald-800">
                01
              </span>
              <h2 className="text-base font-bold text-slate-900">
                Withdrawal amount
              </h2>
            </div>
            <span className="text-xs font-medium text-slate-400">
              No minimum withdrawal amount
            </span>
          </div>

          <p className="mb-4 text-sm text-slate-500">
            Enter the amount you want to withdraw.
          </p>

          <div className="relative">
            <span className="pointer-events-none absolute left-4.5 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">
              {currencySymbol}
            </span>

            <input
              type="hidden"
              name="amount"
              value={submittedUsdAmount}
            />

            <input
              type="text"
              inputMode="decimal"
              minLength={1}
              value={amount}
              onChange={(event) => {
                const raw = event.target.value
                  .replace(/,/g, "")
                  .replace(/[^\d.]/g, "")
                  .replace(/(\..*)\./g, "$1");

                const [integerPart, ...decimalParts] = raw.split(".");
                const formattedInteger = integerPart.replace(
                  /\B(?=(\d{3})+(?!\d))/g,
                  ",",
                );

                const formatted =
                  decimalParts.length > 0
                    ? `${formattedInteger}.${decimalParts.join("")}`
                    : formattedInteger;

                setAmount(formatted);
              }}
              placeholder="0.00"
              required
              className="h-16 w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 text-2xl font-extrabold text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
            />
          </div>

          {amountExceedsBalance && (
            <p role="alert" className="mt-3 text-sm font-semibold text-red-600">
              Amount exceeds your available balance of {currencySymbol}
              {formatBalance(localBalance!)}.
            </p>
          )}
        </div>
        {/* Step 2: Bank Details */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-7">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-extrabold text-emerald-800">
              02
            </span>
            <h2 className="text-base font-bold text-slate-900">
              Bank details
            </h2>
          </div>

          <p className="mb-6 text-sm text-slate-500">
            Use a bank account registered in your name.
          </p>

          <div className="space-y-5">
            {/* Account Holder Readonly Field */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Account holder
              </label>

              <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600 shadow-xs ring-1 ring-slate-200/60">
                  <UserRound className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-slate-900">
                    {accountHolder}
                  </p>
                  <p className="text-xs font-medium text-slate-400">
                    Registered account name
                  </p>
                </div>
              </div>
            </div>

            {/* Bank Select/Input */}
            <div>
              <label
                htmlFor="bankName"
                className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500"
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
                    className="h-14 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 pr-11 text-base font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  >
                    <option value="">Select your bank</option>
                    {withdrawalConfig.banks.map((bank) => (
                      <option key={bank} value={bank}>
                        {bank}
                      </option>
                    ))}
                  </select>

                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
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
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                />
              )}
            </div>

            {/* Account Number */}
            <div>
              <label
                htmlFor="accountNumber"
                className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                Account number
              </label>

              <input
                id="accountNumber"
                name="bankAccountNumber"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={accountRule?.accountNumberMaxLength}
                value={accountNumber}
                onChange={(event) =>
                  setAccountNumber(event.target.value.replace(/\D/g, ""))
                }
                placeholder={
                  accountRule
                    ? `Enter ${accountLengthText}`
                    : "Select your bank first"
                }
                disabled={!bankName}
                required
                className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold tracking-wider text-slate-900 outline-none transition placeholder:text-slate-400 placeholder:tracking-normal focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300"
              />

              {accountRule ? (
                <p className="mt-1.5 text-xs font-medium text-slate-400">
                  Required length: {accountLengthText}
                </p>
              ) : null}
            </div>

            {/* Routing Number */}
            {withdrawalConfig.routingNumberRequired && (
              <div>
                <label
                  htmlFor="routingNumber"
                  className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500"
                >
                  {withdrawalConfig.routingNumberLabel ?? "Routing number"}
                </label>

                <input
                  id="routingNumber"
                  name="routingNumber"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={withdrawalConfig.routingNumberLength}
                  value={routingNumber}
                  onChange={(event) =>
                    setRoutingNumber(event.target.value.replace(/\D/g, ""))
                  }
                  placeholder={`Enter ${withdrawalConfig.routingNumberLength ?? 9}-digit ${
                    withdrawalConfig.routingNumberLabel?.toLowerCase() ??
                    "routing number"
                  }`}
                  required
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold tracking-wider text-slate-900 outline-none transition placeholder:text-slate-400 placeholder:tracking-normal focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>
            )}
          </div>
        </div>

        {/* Notice Badge */}
        <div className="flex items-start gap-3.5 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-slate-900">
              Check your details.
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Make sure the bank details and withdrawal amount are correct.
            </p>
          </div>
        </div>

        {/* Single Submit Button */}
        <button
          type="submit"
          disabled={!bankName || !accountNumber || !amount.trim() || amountExceedsBalance || Number.isNaN(enteredAmount) || enteredAmount <= 0}
          className="flex h-14 w-full items-center justify-center rounded-2xl bg-emerald-500 text-base font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          Withdraw
        </button>
      </div>
    </form>
  );
}