"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
} from "lucide-react";

import {
  originateCryptoLoan,
  repayCryptoLoan,
} from "@/app/dashboard/crypto/finance-actions";
import { estimateCryptoCashConversion, submitCryptoCashConversion } from "@/app/dashboard/crypto/conversion-actions";

const ASSETS = [
  { asset: "USDT", network: "TRON", label: "USDT - Tron (TRC-20)" },
  { asset: "USDC", network: "ETHEREUM", label: "USDC - Ethereum (ERC-20)" },
  { asset: "BTC", network: "BITCOIN", label: "BTC - Bitcoin" },
  { asset: "ETH", network: "ETHEREUM", label: "ETH - Ethereum" },
  { asset: "SOL", network: "SOLANA", label: "SOL - Solana" },
  { asset: "TRN", network: "TRON", label: "TRN - Tron" },
  { asset: "XLM", network: "STELLAR", label: "XLM - Stellar" },
] as const;


type LoanItem = {
  id: string;
  reference: string;
  principalAmount: string;
  outstandingAmount: string;
  collateralAmount: string;
  principalUsdValue: string;
  repaidAmount: string;
  status: string;
  createdAt: string;
  borrowedAsset: string;
  borrowedNetwork: string;
  borrowedAvailable: string;
  collateralAsset: string;
  collateralNetwork: string;
};

type ConversionItem = {
  id: string;
  reference: string;
  asset: string;
  network: string;
  cryptoAmount: string;
  payoutAmount: string;
  payoutCurrency: string;
  bankName: string;
  accountName: string;
  accountNumberLast4: string | null;
  status: string;
  quoteExpiresAt: string;
  createdAt: string;
};

type Props = {
  loans: LoanItem[];
  conversions: ConversionItem[];
  mode: "loan" | "conversion";
  registeredFullName?: string | null;
  bankOptions?: string[];
};

type NoticeState = { type: "success" | "error"; message: string } | null;
function formatCryptoInput(value: string): string {
  const cleaned = value.replace(/,/g, "").replace(/[^\d.]/g, "");
  const dotIndex = cleaned.indexOf(".");
  const normalized =
    dotIndex < 0
      ? cleaned
      : cleaned.slice(0, dotIndex + 1) +
        cleaned.slice(dotIndex + 1).replace(/\./g, "");
  const [integerPart = "", ...decimalParts] = normalized.split(".");
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decimalParts.length > 0
    ? `${groupedInteger}.${decimalParts.join("")}`
    : groupedInteger;
}

function formatAmount(value: string | number, maximumFractionDigits = 8) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "â€”";
  return number.toLocaleString(undefined, {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  });
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString();
}

function pairValue(asset: string, network: string) {
  return `${asset}|${network}`;
}

function parsePair(value: string) {
  const [asset, network] = value.split("|");
  return { asset: asset ?? "", network: network ?? "" };
}

function statusClass(status: string) {
  switch (status.toUpperCase()) {
    case "ACTIVE":
    case "COMPLETED":
    case "REPAID":
    case "APPROVED":
      return "bg-emerald-50 text-emerald-700";
    case "PENDING":
    case "PROCESSING":
      return "bg-amber-50 text-amber-700";
    case "REJECTED":
    case "CANCELLED":
    case "FAILED":
      return "bg-rose-50 text-rose-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function PanelHeading({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
        {icon}
      </div>
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function FieldLabel({
  children,
  htmlFor,
}: {
  children: ReactNode;
  htmlFor: string;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700">
      {children}
    </label>
  );
}

function Notice({ notice }: { notice: NoticeState }) {
  if (!notice) return null;

  return (
    <div
      id="crypto-finance-notice"
      role="status"
      className={`rounded-lg px-3 py-2.5 text-base ${
        notice.type === "success"
          ? "bg-emerald-50 text-emerald-800"
          : "bg-rose-50 text-rose-700"
      }`}
    >
      {notice.message}
    </div>
  );
}

function AssetSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
    >
      {ASSETS.map((item) => (
        <option
          key={`${item.asset}|${item.network}`}
          value={pairValue(item.asset, item.network)}
        >
          {item.label}
        </option>
      ))}
    </select>
  );
}

export default function CryptoFinancePanel({
  loans,
  conversions,
  mode,
  registeredFullName = null,
  bankOptions = [],
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [principalUsd, setPrincipalUsd] = useState("");
  const [principalError, setPrincipalError] = useState("");

  const [borrowedPair, setBorrowedPair] = useState("USDT|TRON");
  const [collateralPair, setCollateralPair] = useState("BTC|BITCOIN");
  const [conversionPair, setConversionPair] = useState("USDT|TRON");
  const [conversionAmount, setConversionAmount] = useState("");
  const [payoutEstimate, setPayoutEstimate] = useState<{
    payoutAmount: string;
    payoutCurrency: string;
  } | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [payoutEstimateKey, setPayoutEstimateKey] = useState("");

  useEffect(() => {
    if (mode !== "conversion" || !notice) return;

    document.getElementById("crypto-finance-notice")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [mode, notice]);

  async function runAction(
    event: FormEvent<HTMLFormElement>,
    action: (data: FormData) => Promise<{ success: boolean; message?: string; error?: string }>,
    afterSuccess?: () => void,
  ) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;

    setBusy(true);
    setNotice(null);

    try {
      const data = new FormData(form);
      const result = await action(data);

      if (!result.success) {
        setNotice({
          type: "error",
          message: result.error || "The request could not be completed.",
        });
        return;
      }

      setNotice({
        type: "success",
        message: result.message || "Your request was submitted.",
      });
      afterSuccess?.();
      router.refresh();
    } catch {
      setNotice({
        type: "error",
        message: "Something went wrong. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleLoan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const rawPrincipal = principalUsd.replace(/,/g, "").trim();
    const principalValue = Number(rawPrincipal);

    if (
      !rawPrincipal ||
      !Number.isFinite(principalValue) ||
      principalValue < 1000 ||
      principalValue > 50000000
    ) {
      setPrincipalError(
        !rawPrincipal || !Number.isFinite(principalValue) || principalValue < 1000
          ? "The minimum loan amount is $1,000."
          : "The maximum loan amount is $50,000,000.",
      );
      return;
    }

    setPrincipalError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    data.set("principalUsd", rawPrincipal);

    const borrowed = parsePair(borrowedPair);
    const collateral = parsePair(collateralPair);
    data.set("borrowedAsset", borrowed.asset);
    data.set("borrowedNetwork", borrowed.network);
    data.set("collateralAsset", collateral.asset);
    data.set("collateralNetwork", collateral.network);

    setBusy(true);
    setNotice(null);
    try {
      const result = await originateCryptoLoan(data);
      if (!result.success) {
        setNotice({ type: "error", message: result.error });
        return;
      }
      setNotice({ type: "success", message: result.message });
      setPrincipalUsd("");
      setPrincipalError("");
      form.reset();
      router.refresh();
    } catch {
      setNotice({ type: "error", message: "Something went wrong. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  async function handleRepayment(event: FormEvent<HTMLFormElement>) {
    await runAction(event, repayCryptoLoan);
  }

  async function handleConversion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    data.set("cryptoAmount", String(data.get("cryptoAmount") ?? "").replace(/,/g, ""));

    const pair = parsePair(conversionPair);
    data.set("asset", pair.asset);
    data.set("network", pair.network);

    setBusy(true);
    setNotice(null);
    try {
      const result = await submitCryptoCashConversion(data);
      if (!result.success) {
        setNotice({ type: "error", message: result.error });
        return;
      }
      setNotice({ type: "success", message: result.message });
      form.reset();
      setConversionAmount("");
      setPayoutEstimate(null);
      setPayoutEstimateKey("");
      router.refresh();
    } catch {
      setNotice({ type: "error", message: "Something went wrong. Please try again." });
    } finally {
      setBusy(false);
    }
  }


  useEffect(() => {
    if (mode !== "conversion") return;

    const amount = conversionAmount.replace(/,/g, "").trim();
    if (!amount || !/^\d+(?:\.\d{1,18})?$/.test(amount) || Number(amount) <= 0) {
      return;
    }

    let active = true;

    const timer = setTimeout(async () => {
      if (!active) return;

      setEstimateLoading(true);
      setPayoutEstimate(null);
      setPayoutEstimateKey("");

      try {
        const pair = parsePair(conversionPair);
        const result = await estimateCryptoCashConversion(
          pair.asset,
          pair.network,
          amount,
        );

        if (!active) return;

        // Mark this amount as completed whether the estimate succeeds or fails.
        setPayoutEstimateKey(`${conversionPair}|${amount}`);

        if (result.success) {
          setPayoutEstimate({
            payoutAmount: result.payoutAmount,
            payoutCurrency: result.payoutCurrency,
          });
        } else {
          setPayoutEstimate(null);
        }
      } catch {
        if (active) {
          setPayoutEstimate(null);
          setPayoutEstimateKey(`${conversionPair}|${amount}`);
        }
      } finally {
        if (active) setEstimateLoading(false);
      }
    }, 500);

    return () => {
      active = false;
      clearTimeout(timer);
      setEstimateLoading(false);
    };
  }, [mode, conversionPair, conversionAmount]);
  const activeLoans = loans.filter((loan) => loan.status === "ACTIVE");

  return (
    <section className="space-y-5 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm sm:p-5">
<div className="px-4 pb-5 sm:px-5">
        <Notice notice={notice} />

        {mode === "loan" && (
          <>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm">
            <p className="text-sm text-slate-500">Loan interest</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">0%</p>
            <p className="mt-1 text-sm text-slate-500">Principal repayment only</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm">
            <p className="text-sm text-slate-500">Minimum loan</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">$1,000</p>
            <p className="mt-1 text-sm text-slate-500">USD equivalent</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm">
            <p className="text-sm text-slate-500">Required collateral</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">40%</p>
            <p className="mt-1 text-sm text-slate-500">Of the loan value</p>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-4 flex items-center gap-2">
              <ArrowDownLeft className="h-4 w-4 text-emerald-700" />
              <h3 className="text-xl font-semibold tracking-tight text-slate-900">Request a crypto loan</h3>
            </div>

            <form onSubmit={handleLoan} className="space-y-4">
              <div>
                <FieldLabel htmlFor="loan-principal">Loan amount (USD)</FieldLabel>
                <input
                  id="loan-principal"
                  name="principalUsd"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={principalUsd}
                  onChange={(event) => {
                    const input = event.target.value.replace(/,/g, "");
                    if (input && !/^\d*\.?\d*$/.test(input)) return;

                    const parts = input.split(".");
                    const normalized =
                      parts.length > 2
                        ? `${parts[0]}.${parts.slice(1).join("")}`
                        : input;
                    const [whole = "", fraction] = normalized.split(".");
                    const formattedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                    const formatted =
                      fraction === undefined
                        ? formattedWhole
                        : `${formattedWhole}.${fraction}`;

                    setPrincipalUsd(formatted);
                    const amount = Number(normalized);

                    if (normalized && Number.isFinite(amount) && amount < 1000) {
                      setPrincipalError("The minimum loan amount is $1,000.");
                    } else if (normalized && Number.isFinite(amount) && amount > 50000000) {
                      setPrincipalError("The maximum loan amount is $50,000,000.");
                    } else {
                      setPrincipalError("");
                    }
                  }}
                  required
                  aria-invalid={Boolean(principalError)}
                  aria-describedby={principalError ? "loan-principal-error" : undefined}
                  placeholder="Enter amount"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
                />
                {principalError && (
                  <p id="loan-principal-error" className="mt-1.5 text-base font-medium text-red-600">
                    {principalError}
                  </p>
                )}
                <p className="mt-1.5 text-sm leading-5 text-slate-500">
                  Minimum $1,000 · Maximum $50,000,000 USD.
                </p>
              </div>

              <div>
                <FieldLabel htmlFor="loan-borrowed">Receive asset</FieldLabel>
                <AssetSelect id="loan-borrowed" value={borrowedPair} onChange={setBorrowedPair} />
              </div>

              <div>
                <FieldLabel htmlFor="loan-collateral">Collateral asset</FieldLabel>
                <AssetSelect id="loan-collateral" value={collateralPair} onChange={setCollateralPair} />
              </div>

              <label className="flex items-start gap-2 text-sm leading-5 text-slate-600">
                <input
                  name="acceptTerms"
                  type="checkbox"
                  required
                  className="mt-1 accent-emerald-700"
                />
                <span>
                  I understand that collateral stays in my crypto balance but is reserved for
                  this loan until the principal is fully repaid.
                </span>
              </label>

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-gradient-to-r from-[#123D2B] to-[#176344] px-5 py-3.5 text-base font-semibold text-white shadow-md shadow-emerald-950/10 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? "Processingâ€¦" : "Request loan"}
              </button>
            </form>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-4 flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-emerald-700" />
              <h3 className="text-xl font-semibold tracking-tight text-slate-900">Repay a loan</h3>
            </div>

            {activeLoans.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-3 py-4 text-base text-slate-500">
                You have no active loans to repay.
              </p>
            ) : (
              <form onSubmit={handleRepayment} className="space-y-4">
                <div>
                  <FieldLabel htmlFor="repay-loan">Active loan</FieldLabel>
                  <select
                    id="repay-loan"
                    name="loanId"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
                  >
                    {activeLoans.map((loan) => (
                      <option key={loan.id} value={loan.id}>
                        {loan.reference} Â· {loan.borrowedAsset} Â· outstanding{" "}
                        {formatAmount(loan.outstandingAmount)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel htmlFor="repay-amount">Repayment amount</FieldLabel>
                  <input
                    id="repay-amount"
                    name="amount"
                    type="number"
                    min="0.00000001"
                    step="any"
                    required
                    placeholder="Amount in borrowed crypto"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-xl border border-emerald-200 bg-white px-5 py-3.5 text-base font-semibold text-emerald-900 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-60"
                >
                  {busy ? "Processingâ€¦" : "Repay principal"}
                </button>
                <p className="text-sm leading-5 text-slate-500">
                  Repayment uses available balance in the borrowed asset and network. Collateral
                  is released only after full repayment.
                </p>
              </form>
            )}
          </div>
        </div>

          </>
        )}

        {mode === "conversion" && (
        <div className="mt-5">
          <div className="mb-5 flex items-center gap-3">
            <Landmark className="h-5 w-5 text-emerald-700" />
            <h3 className="text-xl font-semibold tracking-tight text-slate-900">Convert crypto</h3>
          </div>

          <form onSubmit={handleConversion} className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="conversion-asset">Crypto asset and network</FieldLabel>
              <AssetSelect
                id="conversion-asset"
                value={conversionPair}
                onChange={setConversionPair}
              />
            </div>
            <div>
              <FieldLabel htmlFor="conversion-amount">Crypto amount</FieldLabel>
              <input
                id="conversion-amount"
                name="cryptoAmount"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={conversionAmount}
                onChange={(event) => setConversionAmount(formatCryptoInput(event.target.value))}
                required
                placeholder=""
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-lg text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
              />
              <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
                <p className="text-base font-semibold text-slate-800">You will receive</p>
                <p className="mt-1 text-xl font-semibold text-emerald-800">
                  {!conversionAmount.replace(/,/g, "").trim() ||
                  !/^\d+(?:\.\d{1,18})?$/.test(conversionAmount.replace(/,/g, "").trim()) ||
                  Number(conversionAmount.replace(/,/g, "").trim()) <= 0
                    ? "Enter an amount to estimate"
                    : estimateLoading || payoutEstimateKey !== `${conversionPair}|${conversionAmount.replace(/,/g, "").trim()}`
                      ? "Calculating..."
                      : payoutEstimate
                        ? `${formatAmount(payoutEstimate.payoutAmount, 2)} ${payoutEstimate.payoutCurrency}`
                        : "Estimate unavailable"}
                </p>

              </div>
            </div>
            <div className="sm:col-span-2">
              <h4 className="text-base font-semibold tracking-tight text-slate-900">Bank Payout</h4>
            </div>
            <div>
              <FieldLabel htmlFor="conversion-bank">Bank name</FieldLabel>
              <select
                id="conversion-bank"
                name="bankName"
                required
                disabled={busy || bankOptions.length === 0}
                defaultValue=""
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                <option value="" disabled>
                  {bankOptions.length > 0 ? "Select your bank" : "No banks configured for your country"}
                </option>
                {bankOptions.map((bank) => (
                  <option key={bank} value={bank}>
                    {bank}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel htmlFor="conversion-account-name">Account name</FieldLabel>
              <div
                id="conversion-account-name"
                className="flex min-h-[46px] items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-700"
              >
                {registeredFullName?.trim() ||
                  "Add your full name to your profile before requesting a bank conversion."}
              </div>
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="conversion-account-number">Bank account number</FieldLabel>
              <input
                id="conversion-account-number"
                name="accountNumber"
                inputMode="numeric"
                autoComplete="off"
                maxLength={80}
                required
                placeholder="Enter bank account number"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
              />

            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={busy || bankOptions.length === 0 || !registeredFullName?.trim()}
                className="w-full rounded-xl bg-gradient-to-r from-[#123D2B] to-[#176344] px-5 py-3.5 text-base font-semibold text-white shadow-md shadow-emerald-950/10 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? "Processing…" : "Payout"}
              </button>
            </div>
          </form>
</div>

        )}

        {mode === "loan" && (
        <div className="mt-6">
          <h3 className="mb-3 text-base font-semibold text-slate-900">Loan history</h3>
          {loans.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-3 py-4 text-base text-slate-500">
              No crypto loans yet.
            </p>
          ) : (
            <div className="space-y-3">
              {loans.map((loan) => (
                <div key={loan.id} className="rounded-xl border border-slate-100 p-3 sm:p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{loan.reference}</p>
                      <p className="mt-1 text-sm text-slate-500">{formatDate(loan.createdAt)}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-sm font-medium ${statusClass(loan.status)}`}>
                      {loan.status}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-base sm:grid-cols-3">
                    <div>
                      <p className="text-sm text-slate-500">Loan principal</p>
                      <p className="mt-1 font-medium text-slate-800">
                        {formatAmount(loan.principalAmount)} {loan.borrowedAsset}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Outstanding</p>
                      <p className="mt-1 font-medium text-slate-800">
                        {formatAmount(loan.outstandingAmount)} {loan.borrowedAsset}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Collateral held</p>
                      <p className="mt-1 font-medium text-slate-800">
                        {formatAmount(loan.collateralAmount)} {loan.collateralAsset}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        )}

        {mode === "conversion" && (
        <div className="mt-6">
          <h3 className="mb-3 text-base font-semibold text-slate-900">Conversion history</h3>
          {conversions.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-3 py-4 text-base text-slate-500">
              No conversion requests yet.
            </p>
          ) : (
            <div className="space-y-3">
              {conversions.map((conversion) => (
                <div key={conversion.id} className="rounded-xl border border-slate-100 p-3 sm:p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{conversion.reference}</p>
                      <p className="mt-1 text-sm text-slate-500">{formatDate(conversion.createdAt)}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-sm font-medium ${statusClass(conversion.status)}`}>
                      {conversion.status}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-base">
                    <div>
                      <p className="text-sm text-slate-500">Crypto reserved</p>
                      <p className="mt-1 font-medium text-slate-800">
                        {formatAmount(conversion.cryptoAmount)} {conversion.asset}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Estimated payout</p>
                      <p className="mt-1 font-medium text-slate-800">
                        {formatAmount(conversion.payoutAmount, 2)} {conversion.payoutCurrency}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Bank</p>
                      <p className="mt-1 text-slate-800">{conversion.bankName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Account</p>
                      <p className="mt-1 text-slate-800">
                        {conversion.accountNumberLast4
                          ? `â€¢â€¢â€¢â€¢ ${conversion.accountNumberLast4}`
                          : "Ending digits unavailable"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}
      </div>
    </section>
  );
}
