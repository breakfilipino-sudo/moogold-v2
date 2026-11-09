"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createCryptoTradeQuote,
  executeCryptoTrade,
  getCryptoTradeFormBalance,
  type TradeQuoteView,
} from "@/app/dashboard/crypto/trade-actions";
import type { TradeAssetCode } from "@/app/dashboard/crypto/trade-actions";

const ASSETS: { value: TradeAssetCode; label: string }[] = [
  { value: "USDT", label: "USDT - Tether" },
  { value: "USDC", label: "USDC - USD Coin" },
  { value: "BTC", label: "BTC - Bitcoin" },
  { value: "ETH", label: "ETH - Ethereum" },
  { value: "SOL", label: "SOL - Solana" },
  { value: "XLM", label: "XLM - Stellar" },
  { value: "BNB", label: "BNB - BNB Smart Chain" },
  { value: "TRX", label: "TRX - Tron" },
  { value: "SUI", label: "SUI - Sui" },
];

type CryptoBalance = {
  id: string;
  asset: string;
  network: string;
  balance: string;
};

type FormBalance = {
  displayCurrency: string;
  displayWalletBalance: string;
  minimumBuyAmount: string;
};

function formatMoney(value: string, currency: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return value;

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}

function formatCurrencyCodeAmount(value: string, currency: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return `${currency} ${value}`;

  return `${currency} ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatCryptoTwoDecimals(value: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return value;

  return amount.toFixed(2);
}

function formatCrypto(value: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return value;

  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function normalizeAmount(value: string, direction: "BUY" | "SELL") {
  const cleaned = value.replace(/,/g, "").replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  const integerPart = parts.shift() ?? "";
  const fractionPart = parts.join("").slice(0, direction === "BUY" ? 2 : 18);
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return cleaned.includes(".")
    ? `${groupedInteger}.${fractionPart}`
    : groupedInteger;
}

function unformatAmount(value: string) {
  return value.replace(/,/g, "").trim();
}

function getNumericAmount(value: string) {
  const amount = Number(unformatAmount(value));
  return Number.isFinite(amount) ? amount : 0;
}

type TradeReceipt = {
  direction: "BUY" | "SELL";
  asset: TradeAssetCode;
  cryptoAmount: string;
  displayCurrency: string;
  displayCashAmount: string;
  reference: string;
  createdAt: string;
};

export default function CryptoTradeForm({
  direction,
  walletCashBalance,
  walletCurrency,
  cryptoBalances = [],
}: {
  direction: "BUY" | "SELL";
  walletCashBalance: string;
  walletCurrency: string;
  cryptoBalances?: CryptoBalance[];
}) {
  const router = useRouter();
  const [asset, setAsset] = useState<TradeAssetCode>("USDT");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<TradeQuoteView | null>(null);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<TradeReceipt | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [formBalance, setFormBalance] = useState<FormBalance | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [balanceLoadError, setBalanceLoadError] = useState("");

  const requestNumber = useRef(0);

  const isBuy = direction === "BUY";
  const numericAmount = getNumericAmount(amount);
  const insufficientBuyBalance =
    isBuy &&
    !loadingBalance &&
    Boolean(formBalance) &&
    numericAmount > 0 &&
    numericAmount > Number(formBalance?.displayWalletBalance ?? 0);

  const selectedCryptoBalance = useMemo(() => {
    return cryptoBalances
      .filter((item) => item.asset === asset)
      .reduce((total, item) => total + Number(item.balance || 0), 0);
  }, [cryptoBalances, asset]);

  const amountWarning = useMemo(() => {
    if (!amount.trim() || numericAmount <= 0) return "";

    if (isBuy) {
      if (formBalance && numericAmount < Number(formBalance.minimumBuyAmount)) {
        return `Minimum purchase: ${formatCurrencyCodeAmount(formBalance.minimumBuyAmount, formBalance.displayCurrency)} ($10 equivalent).`;
      }

      if (
        formBalance &&
        numericAmount > Number(formBalance.displayWalletBalance)
      ) {
        return "Insufficient cash wallet balance.";
      }
    } else if (numericAmount > selectedCryptoBalance) {
      return `Insufficient ${asset} balance. Available: ${formatCrypto(
        selectedCryptoBalance.toString(),
      )} ${asset}.`;
    }

    return "";
  }, [
    amount,
    numericAmount,
    isBuy,
    formBalance,
    selectedCryptoBalance,
    asset,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadBalance() {
      setLoadingBalance(true);
      setBalanceLoadError("");

      try {
        const result = await getCryptoTradeFormBalance();

        if (cancelled) return;

        if (!result.success) {
          setBalanceLoadError(result.error);
          return;
        }

        setFormBalance({
          displayCurrency: result.displayCurrency,
          displayWalletBalance: result.displayWalletBalance,
          minimumBuyAmount: result.minimumBuyAmount,
        });
      } catch {
        if (!cancelled) {
          setBalanceLoadError("Unable to load your wallet balance.");
        }
      } finally {
        if (!cancelled) {
          setLoadingBalance(false);
        }
      }
    }

    void loadBalance();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const currentRequest = ++requestNumber.current;
    let cancelled = false;

    setQuote(null);
    setError("");
    setSecondsLeft(0);

    if (!amount.trim()) {
      setLoadingQuote(false);
      return;
    }

    if (loadingBalance && isBuy) {
      setLoadingQuote(false);
      return;
    }

    if (amountWarning) {
      setError(amountWarning);
      setLoadingQuote(false);
      return;
    }

    if (balanceLoadError && isBuy) {
      setError(balanceLoadError);
      setLoadingQuote(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoadingQuote(true);

      try {
        const result = await createCryptoTradeQuote({
          direction,
          asset,
          amount: unformatAmount(amount),
        });

        if (cancelled || currentRequest !== requestNumber.current) {
          return;
        }

        if (!result.success) {
          setQuote(null);
          setError(result.error);
          return;
        }

        setError("");
        setQuote(result.quote);
      } catch {
        if (!cancelled && currentRequest === requestNumber.current) {
          setError("Unable to calculate your trade. Please try again.");
        }
      } finally {
        if (!cancelled && currentRequest === requestNumber.current) {
          setLoadingQuote(false);
        }
      }
    }, 500);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    amount,
    asset,
    direction,
    amountWarning,
    loadingBalance,
    balanceLoadError,
    isBuy,
  ]);

  useEffect(() => {
    if (!quote) {
      setSecondsLeft(0);
      return;
    }

    const updateRemaining = () => {
      setSecondsLeft(
        Math.max(
          0,
          Math.ceil(
            (new Date(quote.expiresAt).getTime() - Date.now()) / 1000,
          ),
        ),
      );
    };

    updateRemaining();

    const timer = window.setInterval(updateRemaining, 1000);

    return () => window.clearInterval(timer);
  }, [quote]);

  function handleAmountChange(value: string) {
    const normalized = normalizeAmount(value, direction);

    setAmount(normalized);
    setReceipt(null);
    setError("");
    setQuote(null);
  }

  function handleAssetChange(value: string) {
    setAsset(value as TradeAssetCode);
    setReceipt(null);
    setError("");
    setQuote(null);
  }

  async function confirmTrade() {
    if (!quote || secondsLeft <= 0 || executing || loadingQuote) {
      return;
    }

    setError("");
    setReceipt(null);
    setExecuting(true);

    try {
      const result = await executeCryptoTrade(quote.token);

      if (!result.success) {
        setError(result.error);
        setQuote(null);
        return;
      }

      setReceipt({
        direction: result.direction,
        asset: result.asset,
        cryptoAmount: result.cryptoAmount,
        displayCurrency: result.displayCurrency,
        displayCashAmount: result.displayCashAmount,
        reference: result.reference,
        createdAt: result.createdAt,
      });

      setQuote(null);
      setAmount("");

      try {
        const refreshedBalance = await getCryptoTradeFormBalance();

        if (refreshedBalance.success) {
          setFormBalance({
            displayCurrency: refreshedBalance.displayCurrency,
            displayWalletBalance: refreshedBalance.displayWalletBalance,
            minimumBuyAmount: refreshedBalance.minimumBuyAmount,
          });
        }
      } catch (refreshError) {
        console.error(
          "Crypto trade completed, but balance refresh failed:",
          refreshError,
        );
      }

      router.refresh();
    } catch (tradeError) {
      console.error("Crypto trade execution request failed:", tradeError);
      setError(
        "We couldn't confirm the trade status. Check your crypto balance and transaction history before trying again.",
      );
      setQuote(null);
    } finally {
      setExecuting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">
              {isBuy ? "Cash wallet balance" : `Available ${asset}`}
            </p>

            <p className="mt-1 text-lg font-bold text-slate-950">
              {isBuy
                ? loadingBalance
                  ? "Loading..."
                  : formBalance
                    ? formatMoney(
                        formBalance.displayWalletBalance,
                        formBalance.displayCurrency,
                      )
                    : formatMoney(walletCashBalance, walletCurrency)
                : `${formatCrypto(selectedCryptoBalance.toString())} ${asset}`}
            </p>
          </div>


          {isBuy && (
            <Link
              href="/dashboard/deposit-method"
              className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700"
            >
              Add Fund
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="trade-asset"
            className="mb-2 block text-sm font-semibold text-slate-800"
          >
            Select cryptocurrency
          </label>

          <select
            id="trade-asset"
            value={asset}
            onChange={(event) => handleAssetChange(event.target.value)}
            disabled={executing}
            className="h-13 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
          >
            {ASSETS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 transition focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-50">
          <label
            htmlFor="trade-amount"
            className="block text-sm font-semibold text-slate-800"
          >
            Enter amount
          </label>

          <div className="mt-3 flex items-center gap-3">
            <input
              id="trade-amount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              onChange={(event) => handleAmountChange(event.target.value)}
              placeholder="0.00"
              disabled={executing}
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-2xl font-semibold tracking-tight text-slate-950 outline-none placeholder:text-slate-300 focus:ring-0 disabled:opacity-60"
            />

            <span className="shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">
              {isBuy
                ? formBalance?.displayCurrency ?? ""
                : asset}
            </span>
          </div>
        </div>
      </div>

      {(error || amountWarning || balanceLoadError) && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {amountWarning || error || balanceLoadError}
        </div>
      )}
{(loadingQuote || quote) && (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-800">
              You receive
            </h3>

            {loadingQuote ? (
              <span className="text-xs font-medium text-slate-500">
                Calculating...
              </span>
            ) : quote && secondsLeft > 0 ? (
              <span className="text-xs font-medium text-emerald-700">
                Quote valid for {secondsLeft}s
              </span>
            ) : (
              <span className="text-xs font-medium text-red-600">
                Quote expired
              </span>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            {quote ? (
              <>
                <p className="text-2xl font-bold tracking-tight text-slate-950">
                  {isBuy
                    ? `${formatCryptoTwoDecimals(quote.cryptoAmount)} ${quote.asset}`
                    : formatMoney(
                        quote.displayCashAmount,
                        quote.displayCurrency,
                      )}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {isBuy
                    ? `Estimated ${quote.asset} to be added to your balance`
                    : `Estimated payout in ${quote.displayCurrency}`}
                </p>

                <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-slate-500">
                      {isBuy ? "You pay" : "You sell"}
                    </span>
                    <strong className="text-right text-slate-950">
                      {isBuy
                        ? formatMoney(
                            quote.displayCashAmount,
                            quote.displayCurrency,
                          )
                        : `${formatCrypto(quote.cryptoAmount)} ${quote.asset}`}
                    </strong>
                  </div>

                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-slate-500">You receive</span>
                    <strong className="text-right text-slate-950">
                      {isBuy
                        ? `${formatCryptoTwoDecimals(quote.cryptoAmount)} ${quote.asset}`
                        : formatMoney(
                            quote.displayCashAmount,
                            quote.displayCurrency,
                          )}
                    </strong>
                  </div>

                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-slate-500">Network</span>
                    <strong className="text-right text-slate-950">
                      {quote.network}
                    </strong>
                  </div>
                </div>
              </>
            ) : (
              <div className="animate-pulse space-y-3">
                <div className="h-7 w-2/3 rounded bg-slate-100" />
                <div className="h-3 w-1/2 rounded bg-slate-100" />
              </div>
            )}
          </div>

          {quote && (
            <button
              type="button"
              onClick={confirmTrade}
              disabled={
                executing ||
                loadingQuote ||
                secondsLeft <= 0 ||
                Boolean(amountWarning)
              }
              className="flex h-12 w-full items-center justify-center rounded-xl bg-[#123D2B] px-4 text-sm font-semibold text-white transition hover:bg-[#19543B] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {executing
                ? "Processing..."
                : secondsLeft <= 0
                  ? "Quote expired"
                  : isBuy
                    ? "Buy Now"
                    : "Sell Now"}
            </button>
          )}

          {quote && secondsLeft <= 0 && (
            <p className="text-center text-xs text-slate-500">
              Change the amount slightly and enter it again to refresh the
              quote.
            </p>
          )}
        </section>
      )}

      {!amount.trim() && (
        <p className="text-center text-xs text-slate-500">
          Your estimated {isBuy ? "crypto amount" : "cash payout"} will appear
          here as you enter an amount.
        </p>
      )}

      {receipt && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setReceipt(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="crypto-trade-receipt-title"
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-700">
              ✓
            </div>

            <h2
              id="crypto-trade-receipt-title"
              className="mt-4 text-center text-xl font-bold text-slate-900"
            >
              {receipt.direction === "BUY"
                ? "Crypto successfully purchased"
                : "Crypto successfully sold"}
            </h2>

            <p className="mt-2 text-center text-sm text-slate-500">
              {receipt.direction === "BUY"
                ? "Your crypto has been added to your balance."
                : "Your sale proceeds have been added to your cash wallet."}
            </p>

            <div className="mt-6 space-y-4 rounded-xl bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <span className="text-sm text-slate-500">Asset</span>
                <span className="text-right text-sm font-semibold text-slate-900">
                  {receipt.asset}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4">
                <span className="text-sm text-slate-500">Crypto quantity</span>
                <span className="text-right text-sm font-semibold text-slate-900">
                  {formatCrypto(receipt.cryptoAmount)} {receipt.asset}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4">
                <span className="text-sm text-slate-500">
                  {receipt.direction === "BUY" ? "Amount paid" : "Cash received"}
                </span>
                <span className="text-right text-sm font-semibold text-slate-900">
                  {formatMoney(
                    receipt.displayCashAmount,
                    receipt.displayCurrency,
                  )}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4">
                <span className="text-sm text-slate-500">Date and time (UTC)</span>
                <span className="text-right text-sm font-medium text-slate-800">
                  {new Date(receipt.createdAt).toLocaleString("en-GB", {
                    timeZone: "UTC",
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <p className="text-xs text-slate-500">Transaction reference</p>
                <p className="mt-1 break-all text-sm font-semibold text-slate-900">
                  {receipt.reference}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setReceipt(null)}
              className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Done
            </button>
          </section>
        </div>
      )}
    </div>
  );
}