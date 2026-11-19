"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  Info,
} from "lucide-react";

import { submitCryptoDeposit } from "@/app/dashboard/crypto/actions";

const CRYPTO_OPTIONS = [
  {
    asset: "USDT",
    network: "Tron (TRC20)",
    networkKey: "TRON",
    address: "TJKxnXkwhH8fC9qY9g8YXvCoHSqyZ1oR12",
    memo: undefined,
  },
  {
    asset: "USDC",
    network: "Ethereum (ERC20)",
    networkKey: "ETHEREUM",
    address: "0x4f8179631d4af8e05ae09b1182813ee65d421918",
    memo: undefined,
  },
  {
    asset: "BTC",
    network: "Bitcoin",
    networkKey: "BITCOIN",
    address: "16GZmP9ybu1m1wYvzG5D4Q6aCrxn3ebYgU",
    memo: undefined,
  },
  {
    asset: "BNB",
    network: "BNB Smart Chain (BEP20)",
    networkKey: "BNB_SMART_CHAIN",
    address: "0x4f8179631d4af8e05ae09b1182813ee65d421918",
    memo: undefined,
  },
  {
    asset: "ETH",
    network: "Ethereum (ERC20)",
    networkKey: "ETHEREUM",
    address: "0x4f8179631d4af8e05ae09b1182813ee65d421918",
    memo: undefined,
  },
  {
    asset: "SOL",
    network: "Solana",
    networkKey: "SOLANA",
    address: "orwuXMAC81ivmAKR5X4oB4hpvRzmfE7jSUXdrjQYgkv",
    memo: undefined,
  },
  {
    asset: "XLM",
    network: "Stellar",
    networkKey: "STELLAR",
    address: "GABFQIK63R2NETJM7T673EAMZN4RJLLGP3OFUEJU5SZVTGWUKULZJNL6",
    memo: "401607474",
  },
  {
    asset: "TRX",
    network: "Tron (TRC20)",
    networkKey: "TRON",
    address: "TJKxnXkwhH8fC9qY9g8YXvCoHSqyZ1oR12",
    memo: undefined,
  },
  {
    asset: "SUI",
    network: "Sui",
    networkKey: "SUI",
    address: "0xfe65cba4a2b4f67b13e68c548460d129fa0b0b9cae6f6e2d5d8ce0adaa94c8ab",
    memo: undefined,
  },
] as const;

const DEPOSIT_WINDOW_SECONDS = 15 * 60;

export default function CryptoDepositForm() {
  const [selectedAsset, setSelectedAsset] = useState("USDT");
  const [copied, setCopied] = useState(false);
  const [memoCopied, setMemoCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [depositCreatedAt, setDepositCreatedAt] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(
    DEPOSIT_WINDOW_SECONDS,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selected = useMemo(
    () =>
      CRYPTO_OPTIONS.find((crypto) => crypto.asset === selectedAsset) ??
      CRYPTO_OPTIONS[0],
    [selectedAsset],
  );

  useEffect(() => {
    if (!submitted || !depositCreatedAt) return;

    const updateCountdown = () => {
      const expiresAt =
        new Date(depositCreatedAt).getTime() +
        DEPOSIT_WINDOW_SECONDS * 1000;

      setRemainingSeconds(
        Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)),
      );
    };

    updateCountdown();

    const interval = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(interval);
  }, [submitted, depositCreatedAt]);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(selected.address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Unable to copy the wallet address. Please copy it manually.");
    }
  }

  async function copyMemo() {
    if (!selected.memo) return;

    try {
      await navigator.clipboard.writeText(selected.memo);
      setMemoCopied(true);
      window.setTimeout(() => setMemoCopied(false), 2000);
    } catch {
      setError("Unable to copy the Stellar memo. Please copy it manually.");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.set("asset", selected.asset);
      formData.set("memo", selected.memo ?? "");

      const result = await submitCryptoDeposit(formData);

      if (!result.success || !result.deposit) {
        setError(
          result.error ?? "We could not start your crypto deposit.",
        );
        return;
      }

      setDepositCreatedAt(result.deposit.createdAt);
      setRemainingSeconds(DEPOSIT_WINDOW_SECONDS);
      setSubmitted(true);
    } catch (error) {
      console.error("Crypto deposit submission error:", error);
      setError("We could not start your crypto deposit. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function startAnotherDeposit() {
    setSubmitted(false);
    setDepositCreatedAt(null);
    setRemainingSeconds(DEPOSIT_WINDOW_SECONDS);
    setCopied(false);
    setMemoCopied(false);
    setError("");
  }

  if (submitted) {
    const minutes = Math.floor(remainingSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (remainingSeconds % 60)
      .toString()
      .padStart(2, "0");

    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-9">
          <div className="text-center">


            <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-900">
              Deposit window started
            </h2>


            <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
              <p className="text-sm font-semibold text-slate-600">
                Time remaining
              </p>
              <p className="mt-1 font-mono text-4xl font-black tabular-nums text-emerald-800">
                {minutes}:{seconds}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                15-minute transfer window
              </p>
            </div>
          </div>

          <div className="mt-7 space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-500">Asset</span>
              <span className="font-bold text-slate-900">
                {selected.asset}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-500">Network</span>
              <span className="text-right text-sm font-bold text-slate-900">
                {selected.network}
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-800">
                  Your MooGold wallet address
                </p>
                <button
                  type="button"
                  onClick={copyAddress}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy address
                    </>
                  )}
                </button>
              </div>

              <code className="mt-3 block break-all rounded-xl bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-800">
                {selected.address}
              </code>
            </div>

            {selected.memo && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-amber-950">
                    Stellar memo Ã¢â‚¬â€ required
                  </p>
                  <button
                    type="button"
                    onClick={copyMemo}
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-amber-950"
                  >
                    {memoCopied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy memo
                      </>
                    )}
                  </button>
                </div>
                <code className="mt-3 block rounded-lg bg-white p-3 text-center text-lg font-bold tracking-wider text-slate-900">
                  {selected.memo}
                </code>
                <p className="mt-2 text-xs leading-5 text-amber-900">
                  Include this exact memo when sending XLM. Omitting it may
                  result in lost funds.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
              <span className="text-sm text-slate-500">Request status</span>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                PENDING
              </span>
            </div>
          </div>

          {remainingSeconds === 0 && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              Your 15-minute transfer window has ended. This does not cancel
              any transaction already sent. If you have already sent crypto,
              do not create another request for the same transfer. Contact
              support if you need assistance.
            </div>
          )}

          {remainingSeconds === 0 && (
            <button
              type="button"
              onClick={startAnotherDeposit}
              className="mt-6 w-full rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Start another deposit
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div>
        <h2 className="text-xl font-black text-slate-900">
          Receive cryptocurrency
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Choose the crypto asset and network you want to deposit.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-7">
        <div>
          <label className="text-sm font-bold text-slate-700">
            Asset
          </label>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {CRYPTO_OPTIONS.map((crypto) => {
              const active = crypto.asset === selectedAsset;

              return (
                <button
                  key={crypto.asset}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setSelectedAsset(crypto.asset);
                    setCopied(false);
                    setMemoCopied(false);
                    setError("");
                  }}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    active
                      ? "border-emerald-500 bg-emerald-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <p
                    className={`font-black ${
                      active ? "text-emerald-700" : "text-slate-900"
                    }`}
                  >
                    {crypto.asset}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {crypto.network}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-bold text-amber-950">
                Verify the asset and network
              </p>
              <p className="mt-1 text-sm leading-6 text-amber-800">
                Only send {selected.asset} using the{" "}
                <strong>{selected.network}</strong> network. Using the wrong
                asset or network can result in permanent loss of funds.
              </p>
            </div>
          </div>
        </div>

        {selected.memo && (
          <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4">
            <p className="text-sm font-black text-amber-950">
              Stellar memo required
            </p>
            <p className="mt-1 text-sm leading-5 text-amber-800">
              You must include the exact memo displayed after starting your
              deposit window. Omitting it may result in lost funds.
            </p>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold leading-6 text-red-700"
          >
            {error}
          </div>
        )}

        <div className="mt-8 border-t border-slate-100 pt-7">
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
          >
            {loading ? (
              <>
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Starting deposit...
              </>
            ) : (
              <>
                Start deposit
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </div>
      </form>


    </div>
  );
}
