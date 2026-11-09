"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  ArrowDownToLine,
  CheckCircle2,
  Info,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  WalletCards,
  X,
} from "lucide-react";

import { buyGold } from "@/app/dashboard/gold/actions";

type BuyGoldFormProps = {
  walletBalance: number;
  localCurrency: string;
  localWalletBalance: number | null;
  goldPrice: number;
  goldAskPrice: number | null;
};

type TradeResult = {
  success: boolean;
  message: string;
  reference?: string;
  quantity?: number;
  amount?: number;
};

const MIN_TRADE_USD = 100;
const MAX_TRADE_USD = 1_000_000;

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);

const localMoney = (value: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const goldAmount = (value: number) => `${value.toFixed(8)} oz`;

export default function BuyGoldForm({
  walletBalance,
  localCurrency,
  localWalletBalance,
  goldPrice,
  goldAskPrice,
}: BuyGoldFormProps) {
  const [amount, setAmount] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [result, setResult] = useState<TradeResult | null>(null);

  const [isPending, startTransition] = useTransition();

  const numericAmount = useMemo(() => {
    const parsed = Number(amount.replace(/,/g, ""));

    return Number.isFinite(parsed) ? parsed : 0;
  }, [amount]);

  const executionPrice =
    goldAskPrice && goldAskPrice > 0 ? goldAskPrice : goldPrice;

  const estimatedQuantity =
    executionPrice > 0 && numericAmount > 0
      ? numericAmount / executionPrice
      : 0;

  const hasAmount = numericAmount > 0;

  const exceedsBalance =
    hasAmount && numericAmount > walletBalance;

  const belowMinimum =
    hasAmount && numericAmount < MIN_TRADE_USD;

  const exceedsMaximum =
    hasAmount && numericAmount > MAX_TRADE_USD;

  const validAmount =
    hasAmount &&
    !exceedsBalance &&
    !belowMinimum &&
    !exceedsMaximum &&
    executionPrice > 0;

  function handleAmountChange(value: string) {
    const unformatted = value.replace(/,/g, "");

    if (unformatted === "") {
      setAmount("");
      setResult(null);
      return;
    }

    if (!/^\d*\.?\d{0,2}$/.test(unformatted)) {
      return;
    }

    const [integerPart, fractionPart] = unformatted.split(".");
    const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    setAmount(
      fractionPart !== undefined
        ? `${groupedInteger}.${fractionPart}`
        : groupedInteger,
    );
    setResult(null);
  }

  function handleContinue() {
    if (!validAmount) {
      return;
    }

    setResult(null);
    setShowConfirmation(true);
  }

  function handlePurchase() {
    if (!validAmount || isPending) {
      return;
    }

    const formData = new FormData();

    formData.set("amount", numericAmount.toFixed(2));

    startTransition(async () => {
      const response = await buyGold(formData);

      setResult(response);

      if (response.success) {
        setShowConfirmation(false);
        setAmount("");
      }
    });
  }

  return (
    <>
      <div className="overflow-hidden rounded-[28px] border border-emerald-950/10 bg-white p-5 shadow-[0_18px_55px_rgba(16,32,27,0.08)] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/30">
              Order details
            </p>

            <h2 className="mt-1 text-lg font-black tracking-tight text-[#10201b]">
              Purchase gold
            </h2>

            <p className="mt-2 text-sm leading-6 text-black/40">
              Enter the amount you would like to use from your wallet.
            </p>
          </div>

          <div className="hidden rounded-2xl bg-[#edf7f2] p-3 text-emerald-700 sm:block">
            <ArrowDownToLine className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-7">
          <label
            htmlFor="gold-purchase-amount"
            className="text-xs font-black text-[#10201b]"
          >
            Purchase amount
          </label>

          <div className="relative mt-2">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-black/25">
              $
            </span>

            <input
              id="gold-purchase-amount"
              name="amount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              onChange={(event) =>
                handleAmountChange(event.target.value)
              }
              placeholder="0.00"
              disabled={isPending}
              className="h-16 w-full rounded-2xl border border-black/10 bg-black/2 pl-10 pr-4 text-2xl font-black text-[#10201b] outline-none transition placeholder:text-black/15 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
        </div>

        {hasAmount &&
          (exceedsBalance || belowMinimum || exceedsMaximum) && (
            <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4">
              <p className="text-xs font-bold leading-5 text-red-800">
                {exceedsBalance
                  ? `You only have ${money(walletBalance)}${
                      localCurrency !== "USD" && localWalletBalance !== null
                        ? ` (${localMoney(localWalletBalance, localCurrency)})`
                        : ""
                    } available in your wallet.`
                  : belowMinimum
                    ? `The minimum gold purchase is ${money(
                        MIN_TRADE_USD,
                      )}.`
                    : `The maximum gold purchase is ${money(
                        MAX_TRADE_USD,
                      )}.`}
              </p>
            </div>
          )}

        {result && (
          <div
            className={[
              "mt-5 rounded-2xl border p-4",
              result.success
                ? "border-emerald-100 bg-emerald-50"
                : "border-red-100 bg-red-50",
            ].join(" ")}
          >
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              )}

              <div className="min-w-0">
                <p
                  className={[
                    "text-sm font-black",
                    result.success
                      ? "text-emerald-900"
                      : "text-red-900",
                  ].join(" ")}
                >
                  {result.success
                    ? "Purchase successful"
                    : "Purchase could not be completed"}
                </p>

                <p
                  className={[
                    "mt-1 text-xs leading-5",
                    result.success
                      ? "text-emerald-900/60"
                      : "text-red-900/60",
                  ].join(" ")}
                >
                  {result.message}
                </p>

                {result.success && result.reference && (
                  <p className="mt-2 break-all text-[10px] font-black uppercase tracking-wider text-emerald-800/50">
                    Reference: {result.reference}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {exceedsBalance && !belowMinimum && !exceedsMaximum && executionPrice > 0 ? (
          <Link
            href="/dashboard/deposit-method"
            className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-sm font-black text-[#06100d] shadow-lg shadow-emerald-500/15 transition hover:bg-emerald-400"
          >
            <WalletCards className="h-4 w-4" />
            Add funds
          </Link>
        ) : (
          <button
            type="button"
            disabled={!validAmount || isPending}
            onClick={handleContinue}
            className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#0a1713] text-sm font-black text-white transition hover:bg-[#10251e] disabled:cursor-not-allowed disabled:bg-[#0a1713]/30"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing purchase...
              </>
            ) : (
              <>
                <LockKeyhole className="h-4 w-4" />
                Continue to review
              </>
            )}
          </button>
        )}

        <p className="mt-3 text-center text-[10px] font-semibold text-black/25">
          You will review the transaction before any funds are moved.
        </p>
      </div>

      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="bg-[#0a1713] p-6 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-3 inline-flex rounded-xl bg-emerald-400/10 p-2.5 text-emerald-300">
                    <ShieldCheck className="h-5 w-5" />
                  </div>

                  <h2 className="text-2xl font-black">
                    Confirm purchase
                  </h2>

                  <p className="mt-1 text-xs text-white/40">
                    Please review the details carefully.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowConfirmation(false)}
                  className="rounded-xl p-2 text-white/40 transition hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="rounded-2xl bg-[#f7faf8] p-5">
                <div className="space-y-4">
                  <ConfirmationRow
                    label="Purchase amount"
                    value={money(numericAmount)}
                  />

                  <ConfirmationRow
                    label="Execution price"
                    value={`${money(executionPrice)} / oz`}
                  />

                  <ConfirmationRow
                    label="Gold received"
                    value={goldAmount(estimatedQuantity)}
                  />

                  <div className="h-px bg-black/5" />

                  <ConfirmationRow
                    label="Wallet balance after"
                    value={money(
                      Math.max(
                        0,
                        walletBalance - numericAmount,
                      ),
                    )}
                    strong
                  />
                </div>
              </div>

              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />

                <p className="text-xs font-medium leading-5 text-amber-900/70">
                  By confirming, you authorize MooGold to debit
                  your available wallet balance and credit the
                  corresponding gold holding.
                </p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setShowConfirmation(false)}
                  className="h-13 rounded-2xl border border-black/10 px-4 text-sm font-black text-black/50 transition hover:bg-black/3 disabled:opacity-40"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={handlePurchase}
                  className="flex h-13 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 text-sm font-black text-[#06100d] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Confirm purchase
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CalculationRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className={[
          "text-xs",
          strong
            ? "font-black text-[#10201b]"
            : "font-semibold text-black/35",
        ].join(" ")}
      >
        {label}
      </span>

      <span
        className={[
          "text-right text-xs",
          strong
            ? "font-black text-[#10201b]"
            : "font-bold text-black/60",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

function ConfirmationRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs font-semibold text-black/35">
        {label}
      </span>

      <span
        className={[
          "text-right text-sm",
          strong
            ? "font-black text-[#10201b]"
            : "font-bold text-black/60",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}
