
"use client";

import {
  ArrowLeft,
  ArrowRight,
  CreditCard,
} from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import type { LanguageCode } from "@/lib/i18n/languages";
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
  walletAccount: string;
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
    walletAccount: "MooGold wallet",
    amountPrompt: "How much would you like to add?",
    maxExceeded: "Maximum deposit amount exceeded",
    exchangeRateUnavailable: "Exchange rate unavailable. Please try again.",
    paymentMethod: "Payment method",
    creditDebitCard: "Credit / Debit Card",
    cardProviders: "Visa, Mastercard and more",
    paymentReference: "Payment reference",
    optional: "optional",
    referencePlaceholder: "Enter a reference if you have one",
    back: "Back",
    preparing: "Preparing...",
    reviewDeposit: "Review Add Fund",
  },
  fil: {
    walletAccount: "MooGold wallet",
    amountPrompt: "Magkano ang nais mong idagdag?",
    maxExceeded: "Lumampas sa maximum na halaga ng deposito",
    exchangeRateUnavailable: "Hindi available ang exchange rate. Pakisubukang muli.",
    paymentMethod: "Paraan ng pagbabayad",
    creditDebitCard: "Credit / Debit Card",
    cardProviders: "Visa, Mastercard at iba pa",
    paymentReference: "Reference ng pagbabayad",
    optional: "opsyonal",
    referencePlaceholder: "Ilagay ang reference kung mayroon",
    back: "Bumalik",
    preparing: "Inihahanda...",
    reviewDeposit: "Suriin ang Dagdag na Pondo",
  },
  ms: {
    walletAccount: "Dompet MooGold",
    amountPrompt: "Berapakah jumlah yang ingin anda tambah?",
    maxExceeded: "Jumlah deposit melebihi had maksimum",
    exchangeRateUnavailable: "Kadar pertukaran tidak tersedia. Sila cuba lagi.",
    paymentMethod: "Kaedah pembayaran",
    creditDebitCard: "Kad Kredit / Debit",
    cardProviders: "Visa, Mastercard dan lain-lain",
    paymentReference: "Rujukan pembayaran",
    optional: "pilihan",
    referencePlaceholder: "Masukkan rujukan jika ada",
    back: "Kembali",
    preparing: "Sedang menyediakan...",
    reviewDeposit: "Semak Tambah Dana",
  },
  zh: {
    walletAccount: "MooGold 钱包",
    amountPrompt: "您想添加多少资金？",
    maxExceeded: "已超过最高存款金额",
    exchangeRateUnavailable: "汇率暂不可用，请重试。",
    paymentMethod: "付款方式",
    creditDebitCard: "信用卡 / 借记卡",
    cardProviders: "Visa、Mastercard 等",
    paymentReference: "付款参考编号",
    optional: "选填",
    referencePlaceholder: "如有参考编号，请在此输入",
    back: "返回",
    preparing: "正在准备...",
    reviewDeposit: "检查存款",
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

  function handleAmountChange(value: string) {
    setAmount(formatAmountInput(value));
  }

  return (
    <form action={formAction} className="space-y-3.5">
      <input type="hidden" name="countryCode" value={countryCode} />

      {/* Account */}
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {labels.walletAccount}
        </p>

        <p className="mt-0.5 text-sm font-black text-slate-900">
          {accountName}
        </p>
      </div>

      {/* Amount */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label
          htmlFor="amount"
          className="block text-sm font-bold text-slate-900"
        >
          {labels.amountPrompt}
        </label>

        <div
          className={`mt-2.5 flex items-center rounded-xl border bg-slate-50 px-3.5 transition focus-within:bg-white focus-within:ring-4 ${
            maxExceeded
              ? "border-red-300 focus-within:border-red-500 focus-within:ring-red-500/10"
              : "border-slate-300 focus-within:border-emerald-500 focus-within:ring-emerald-500/10"
          }`}
        >
          <span
            className={`shrink-0 text-lg font-black ${
              maxExceeded ? "text-red-500" : "text-slate-500"
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
            required
            aria-invalid={maxExceeded}
            className="w-full min-w-0 bg-transparent px-2.5 py-3 text-2xl font-black text-slate-950 outline-none placeholder:text-slate-300"
          />

          <span
            className={`shrink-0 text-xs font-black uppercase tracking-wide ${
              maxExceeded ? "text-red-500" : "text-slate-400"
            }`}
          >
            {currency}
          </span>
        </div>

        {maxExceeded ? (
          <p role="alert" className="mt-2 text-xs font-bold text-red-600">
            {labels.maxExceeded}
          </p>
        ) : null}

        {!maxExceeded &&
        exchangeRate !== null &&
        numericAmount > 0 &&
        currency !== "USD" ? (
          <p className="mt-2 text-[11px] font-medium text-slate-400">
            ≈ ${usdAmount?.toFixed(2)} USD
          </p>
        ) : null}

        {rateError ? (
          <p className="mt-2 text-[11px] font-medium text-amber-600">
            {labels.exchangeRateUnavailable}
          </p>
        ) : null}
      </div>

      {/* Payment method */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-bold text-slate-900">
          {labels.paymentMethod}
        </p>

        <input
          type="hidden"
          name="bankName"
          value="Credit / Debit Card"
        />

        <div className="mt-2.5 rounded-xl border-2 border-emerald-500 bg-emerald-50/40 px-3.5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
              <CreditCard className="h-5 w-5 text-emerald-600" />
            </div>

            <div>
              <p className="text-sm font-black text-slate-900">
                {labels.creditDebitCard}
              </p>

              <p className="mt-0.5 text-xs font-medium text-slate-500">
                {labels.cardProviders}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[9px] font-black italic text-blue-700 shadow-sm">
              VISA
            </span>

            <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[8px] font-black text-red-600 shadow-sm">
              MC
            </span>

            <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[9px] font-black text-slate-700 shadow-sm">
              AMEX
            </span>

            <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[9px] font-black text-slate-700 shadow-sm">
              JCB
            </span>
          </div>
        </div>
      </div>

      {/* Payment reference */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label
          htmlFor="externalReference"
          className="block text-sm font-bold text-slate-900"
        >
          {labels.paymentReference}
          <span className="ml-1 font-medium text-slate-400">
            ({labels.optional})
          </span>
        </label>

        <input
          id="externalReference"
          name="externalReference"
          type="text"
          maxLength={100}
          placeholder={labels.referencePlaceholder}
          className="mt-2.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
        />
      </div>

      {state.error ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
        >
          {state.error}
        </div>
      ) : null}

      {/* Actions */}
      <div className="flex flex-col-reverse gap-2.5 pt-0.5 sm:flex-row">
        <a
          href="/dashboard/wallet"
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          {labels.back}
        </a>

        <button
          type="submit"
          disabled={
            isPending ||
            maxExceeded ||
            rateError ||
            exchangeRate === null
          }
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? labels.preparing : labels.reviewDeposit}

          {!isPending ? <ArrowRight className="h-4 w-4" /> : null}
        </button>
      </div>
    </form>
  );
}