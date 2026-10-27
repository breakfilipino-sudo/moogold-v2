"use client";

import {
  ArrowLeft,
  CreditCard,
} from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import type { LanguageCode } from "@/lib/i18n/languages";
import { getMinimumTopUpAmount } from "@/lib/deposit/minimum-top-up";
import { requestDeposit } from "./actions";

type DepositFormProps = {
  accountName: string;
  countryCode: string;
  currency: string;
  currencySymbol: string;
  language: LanguageCode;
};

type FormState = {
  error?: string;
};

type DepositLabels = {
  amountPrompt: string;
  maxExceeded: string;
  exchangeRateUnavailable: string;
  paymentMethod: string;
  creditDebitCard: string;
  cardProviders: string;
  paymentReference: string;
  optional: string;
  referencePlaceholder: string;
  back: string;
  preparing: string;
  reviewDeposit: string;
};

const LABELS: Record<LanguageCode, DepositLabels> = {
  en: {
    amountPrompt: "Enter amount",
    maxExceeded: "Maximum deposit amount exceeded",
    exchangeRateUnavailable: "Exchange rate unavailable. Please try again.",
    paymentMethod: "Deposit method",
    creditDebitCard: "Credit / Debit Card",
    cardProviders: "Visa, Mastercard and more",
    paymentReference: "Note",
    optional: "optional",
    referencePlaceholder: "Add a note (optional)",
    back: "Back",
    preparing: "Preparing...",
    reviewDeposit: "Continue",
  },
  fil: {
    amountPrompt: "Ilagay ang halaga",
    maxExceeded: "Lumampas sa maximum na halaga ng deposito",
    exchangeRateUnavailable: "Hindi available ang exchange rate. Pakisubukang muli.",
    paymentMethod: "Deposit method",
    creditDebitCard: "Credit / Debit Card",
    cardProviders: "Visa, Mastercard at iba pa",
    paymentReference: "Note",
    optional: "opsyonal",
    referencePlaceholder: "Magdagdag ng nota",
    back: "Bumalik",
    preparing: "Inihahanda...",
    reviewDeposit: "Magpatuloy",
  },
  ms: {
    amountPrompt: "Masukkan jumlah",
    maxExceeded: "Jumlah deposit melebihi had maksimum",
    exchangeRateUnavailable: "Kadar pertukaran tidak tersedia. Sila cuba lagi.",
    paymentMethod: "Deposit method",
    creditDebitCard: "Kad Kredit / Debit",
    cardProviders: "Visa, Mastercard dan lain-lain",
    paymentReference: "Note",
    optional: "pilihan",
    referencePlaceholder: "Tambah nota",
    back: "Kembali",
    preparing: "Sedang menyediakan...",
    reviewDeposit: "Teruskan",
  },
  zh: {
    amountPrompt: "输入金额",
    maxExceeded: "已超过最高存款金额",
    exchangeRateUnavailable: "汇率暂不可用，请重试。",
    paymentMethod: "Deposit method",
    creditDebitCard: "信用卡 / 借记卡",
    cardProviders: "Visa、Mastercard 等",
    paymentReference: "Note",
    optional: "选填",
    referencePlaceholder: "添加备注",
    back: "返回",
    preparing: "正在准备...",
    reviewDeposit: "继续",
  },
};

const initialState: FormState = {};
const MAX_DEPOSIT_USD = 100_000;

function formatAmountInput(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  const firstDot = cleaned.indexOf(".");

  const integerPart =
    firstDot === -1 ? cleaned : cleaned.slice(0, firstDot);

  const decimalPart =
    firstDot === -1
      ? ""
      : cleaned.slice(firstDot + 1).replace(/\./g, "").slice(0, 2);

  const normalizedInteger = integerPart.replace(/^0+(?=\d)/, "");
  const formattedInteger = normalizedInteger.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ",",
  );

  if (firstDot === -1) {
    return formattedInteger;
  }

  return `${formattedInteger || "0"}.${decimalPart}`;
}

function getRawAmount(value: string) {
  return value.replace(/,/g, "");
}

async function depositAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const formattedAmount = String(formData.get("amount") ?? "");

  formData.set("amount", getRawAmount(formattedAmount));

  try {
    await requestDeposit(formData);
    return {};
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to prepare your deposit request. Please try again.",
    };
  }
}

export default function DepositForm({
  accountName,
  countryCode,
  currency,
  currencySymbol,
  language,
}: DepositFormProps) {
  const labels = LABELS[language] ?? LABELS.en;
  const minimumTopUp = getMinimumTopUpAmount(countryCode) ?? 0;

  const [state, formAction, isPending] = useActionState(
    depositAction,
    initialState,
  );

  const [amount, setAmount] = useState("");

  const [exchangeRate, setExchangeRate] = useState<number | null>(
    currency === "USD" ? 1 : null,
  );

  const [rateError, setRateError] = useState(false);

  useEffect(() => {
    if (currency === "USD") {
      return;
    }

    let cancelled = false;

    async function loadExchangeRate() {
      try {
        setRateError(false);

        const response = await fetch(
          `https://api.frankfurter.dev/v2/rate/${encodeURIComponent(
            currency,
          )}/USD`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          throw new Error("Unable to retrieve exchange rate.");
        }

        const data = (await response.json()) as { rate?: number };
        const rate = Number(data?.rate);

        if (!Number.isFinite(rate) || rate <= 0) {
          throw new Error("Invalid exchange rate.");
        }

        if (!cancelled) {
          setExchangeRate(rate);
        }
      } catch {
        if (!cancelled) {
          setExchangeRate(null);
          setRateError(true);
        }
      }
    }

    void loadExchangeRate();

    return () => {
      cancelled = true;
    };
  }, [currency]);

  const rawAmount = getRawAmount(amount);
  const numericAmount = rawAmount ? Number(rawAmount) : 0;

  const usdAmount =
    exchangeRate !== null && Number.isFinite(numericAmount)
      ? numericAmount * exchangeRate
      : null;

  const maxExceeded =
    usdAmount !== null && usdAmount > MAX_DEPOSIT_USD;
  const minimumNotMet =
    numericAmount > 0 && numericAmount < minimumTopUp;

  function handleAmountChange(value: string) {
    setAmount(formatAmountInput(value));
  }

  return (
    <form action={formAction} className="mx-auto w-full max-w-sm space-y-5 pb-8">
      <input type="hidden" name="countryCode" value={countryCode} />
      <input type="hidden" name="bankName" value="Credit / Debit Card" />

      {/* Back Button and Heading */}
      <div className="space-y-3 px-0.5">
        <div>
          <a
            href="/dashboard/wallet"
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{labels.back}</span>
          </a>
        </div>

        <h1 className="text-base font-bold tracking-tight text-slate-900">
          Add funds to your MooGold wallet
        </h1>
      </div>
{/* Heading */}

      {/* Central Bold Amount Input Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-center space-y-1">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
          {labels.amountPrompt} ({currency})
        </p>

        <div className="flex items-center justify-center gap-0 px-1">
          <span
            className={`text-3xl font-black tracking-tight ${
              maxExceeded ? "text-red-500" : "text-slate-950"
            }`}
          >
            {currencySymbol}
          </span>

          <input
            id="amount"
            name="amount"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(event) => handleAmountChange(event.target.value)}
            placeholder="0.00"
            autoComplete="off"
    style={{ width: `${Math.min(12, Math.max(4, (amount || "0.00").length))}ch` }}
            required
            aria-invalid={maxExceeded || minimumNotMet}
            className={` min-w-0 w-auto  bg-transparent text-left text-3xl font-black tracking-tight outline-none placeholder:text-slate-200 ${
              maxExceeded ? "text-red-500" : "text-slate-950"
            }`}
          />
        </div>

        {maxExceeded ? (
          <p role="alert" className="text-xs font-bold text-red-600 pt-1">
            {labels.maxExceeded}
          </p>
        ) : null}

        {!maxExceeded && minimumNotMet ? (
          <p role="alert" className="text-xs font-bold text-red-600 pt-1">
            The minimum top up amount is {currencySymbol}{minimumTopUp.toLocaleString("en-US")}.
          </p>
        ) : null}

        {!maxExceeded &&
        exchangeRate !== null &&
        numericAmount > 0 &&
        currency !== "USD" ? (
          <p className="text-[11px] font-semibold text-slate-400 pt-0.5">
            ≈ ${usdAmount?.toFixed(2)} USD
          </p>
        ) : null}

        {rateError ? (
          <p className="text-[11px] font-semibold text-amber-600 pt-0.5">
            {labels.exchangeRateUnavailable}
          </p>
        ) : null}
      </div>

      {/* Deposit Method Section */}
      <div className="space-y-2">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 px-1">
          {labels.paymentMethod}
        </h3>

        <div className="flex items-center justify-between rounded-2xl border-2 border-emerald-600 bg-emerald-50/20 p-3.5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <CreditCard className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-900">
                {labels.creditDebitCard}
              </p>
              <p className="text-[10px] font-medium text-slate-500">
                {labels.cardProviders}
              </p>
            </div>
          </div>

          <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-emerald-600 bg-emerald-600 text-white">
            <div className="h-1.5 w-1.5 rounded-full bg-white" />
          </div>
        </div>
      </div>

      {/* Note Optional */}
      <div className="space-y-1.5">
        <label
          htmlFor="externalReference"
          className="block text-xs font-bold text-slate-700 px-1"
        >
          {labels.paymentReference}{" "}
          <span className="font-normal text-slate-400">
            ({labels.optional})
          </span>
        </label>

        <input
          id="externalReference"
          name="externalReference"
          type="text"
          maxLength={100}
          placeholder={labels.referencePlaceholder}
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs font-medium text-slate-900 outline-none shadow-sm transition placeholder:text-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
        />
      </div>

      {state.error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700"
        >
          {state.error}
        </div>
      ) : null}

      {/* Bottom Action Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={
            isPending ||
            maxExceeded ||
            rateError ||
            exchangeRate === null
          }
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#126344] py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-md transition hover:bg-[#0a3829] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span>{isPending ? labels.preparing : labels.reviewDeposit}</span>
        </button>
      </div>
    </form>
  );
}