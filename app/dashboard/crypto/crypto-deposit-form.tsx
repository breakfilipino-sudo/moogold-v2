"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  Copy,
} from "lucide-react";

import { submitCryptoDeposit } from "@/app/dashboard/crypto/actions";

const CRYPTO_OPTIONS = [
  {
    asset: "BTC",
    network: "BITCOIN",
    networkLabel: "Bitcoin",
    address: "16GZmP9ybu1m1wYvzG5D4Q6aCrxn3ebYgU",
  },
  {
    asset: "USDT",
    network: "TRON",
    networkLabel: "Tron (TRC-20)",
    address: "TJKxnXkwhH8fC9qY9g8YXvCoHSqyZ1oR12",
  },
  {
    asset: "BNB",
    network: "BNB_SMART_CHAIN",
    networkLabel: "BNB Smart Chain (BEP-20)",
    address: "0x4f8179631d4af8e05ae09b1182813ee65d421918",
  },
  {
    asset: "ETH",
    network: "ETHEREUM",
    networkLabel: "Ethereum (ERC-20)",
    address: "0x4f8179631d4af8e05ae09b1182813ee65d421918",
  },
  {
    asset: "USDC",
    network: "ETHEREUM",
    networkLabel: "Ethereum (ERC-20)",
    address: "0x4f8179631d4af8e05ae09b1182813ee65d421918",
  },
  {
    asset: "SOL",
    network: "SOLANA",
    networkLabel: "Solana",
    address: "orwuXMAC81ivmAKR5X4oB4hpvRzmfE7jSUXdrjQYgkv",
  },
  {
    asset: "XLM",
    network: "STELLAR",
    networkLabel: "Stellar",
    address: "GABFQIK63R2NETJM7T673EAMZN4RJLLGP3OFUEJU5SZVTGWUKULZJNL6",
    memo: "401607474",
  },
  {
    asset: "TRX",
    network: "TRON",
    networkLabel: "Tron (TRC-20)",
    address: "TJKxnXkwhH8fC9qY9g8YXvCoHSqyZ1oR12",
  },
  {
    asset: "SUI",
    network: "SUI",
    networkLabel: "Sui",
    address: "0xfe65cba4a2b4f67b13e68c548460d129fa0b0b9cae6f6e2d5d8ce0adaa94c8ab",
  },
] as const;

export default function CryptoDepositForm() {
  const [selectedAsset, setSelectedAsset] =
    useState("USDT");
  const [copied, setCopied] = useState(false);
  const [memoCopied, setMemoCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);

  const selected = useMemo(
    () =>
      CRYPTO_OPTIONS.find(
        (item) => item.asset === selectedAsset,
      ) ?? CRYPTO_OPTIONS[0],
    [selectedAsset],
  );

  const selectedMemo = "memo" in selected ? selected.memo : null;

  async function copyMemo() {
    if (!selectedMemo) return;

    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        window.isSecureContext
      ) {
        await navigator.clipboard.writeText(selectedMemo);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = selectedMemo;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const copiedSuccessfully = document.execCommand("copy");
        document.body.removeChild(textArea);

        if (!copiedSuccessfully) {
          throw new Error("Copy command failed");
        }
      }

      setError("");
      setMemoCopied(true);
      window.setTimeout(() => setMemoCopied(false), 2000);
    } catch {
      setError("Unable to copy memo. Please copy it manually.");
    }
  }

  async function copyAddress() {
    const address = selected.address;

    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        window.isSecureContext
      ) {
        await navigator.clipboard.writeText(address);
      } else {
        const textArea =
          document.createElement("textarea");

        textArea.value = address;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";

        document.body.appendChild(textArea);

        textArea.focus();
        textArea.select();

        const copiedSuccessfully =
          document.execCommand("copy");

        document.body.removeChild(textArea);

        if (!copiedSuccessfully) {
          throw new Error("Copy command failed");
        }
      }

      setError("");
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setError(
        "Unable to copy address. Please copy it manually.",
      );
    }
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const formData = new FormData();

      formData.set("asset", selected.asset);
      if (selectedMemo) formData.set("memo", selectedMemo);

      const result =
        await submitCryptoDeposit(formData);

      if (!result.success) {
        setError(
          result.error ?? "Unable to submit deposit.",
        );
        return;
      }

      setSubmitted(true);
    } catch {
      setError(
        "Unable to submit deposit. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-3xl border border-emerald-100 bg-gradient-to-b from-emerald-50/80 via-white to-white p-5 text-center shadow-[0_18px_48px_-32px_rgba(6,95,70,0.45)] sm:p-7">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-500 text-white shadow-lg shadow-emerald-900/15">
          <Check className="h-6 w-6" />
        </div>

        <h3 className="mt-4 text-lg font-bold text-slate-900">
          Deposit submitted
        </h3>

        <p className="mt-2 text-base leading-5 text-slate-600">
          Your deposit report has been submitted. MooGold will review and verify the incoming transaction before crediting your crypto balance.
        </p>

        <div className="mt-5 space-y-3 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm sm:p-5">
          <div className="flex justify-between gap-4">
            <span className="text-base text-slate-500">
              Asset
            </span>

            <span className="text-base font-semibold text-slate-900">
              {selected.asset}
            </span>
          </div>

          <div className="mt-2 flex justify-between gap-4">
            <span className="text-base text-slate-500">
              Network
            </span>

            <span className="text-base font-semibold text-slate-900">
              {selected.networkLabel}
            </span>
          </div>

          <div className="mt-2 flex justify-between gap-4">
            <span className="text-base text-slate-500">
              Status
            </span>

            <span className="text-base font-semibold text-amber-600">
              Processing
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setSubmitted(false);
            setCopied(false);
            setError("");
          }}
          className="mt-5 text-base font-semibold text-emerald-600 hover:text-emerald-700"
        >
          Make another deposit
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Deposit instructions are available on demand. */}
      <button
        type="button"
        onClick={() => setHelpOpen(true)}
        className="flex w-full items-center justify-between rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50/80 via-white to-amber-50/50 px-4 py-4 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:px-5"
        aria-haspopup="dialog"
        aria-label="How to deposit"
      >
        <span className="flex items-center gap-3">

          <span>
            <span className="block text-base font-semibold text-slate-900">
              How to deposit
            </span>
            <span className="mt-0.5 block text-sm text-slate-500">
              View deposit steps and network safety tips
            </span>
          </span>
        </span>

      </button>

      {helpOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-md sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setHelpOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="crypto-deposit-help-title"
            className="w-full max-w-lg overflow-hidden rounded-t-[28px] border border-white/70 bg-[#FCFDFC] shadow-[0_24px_90px_-24px_rgba(0,0,0,0.45)] sm:rounded-[24px]"
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">
                  Crypto deposits
                </p>
                <h3
                  id="crypto-deposit-help-title"
                  className="mt-1 text-xl font-semibold tracking-tight text-slate-950"
                >
                  How to deposit
                </h3>
                <p className="mt-1 text-base leading-5 text-slate-500">
                  Follow these steps before sending funds.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                aria-label="Close deposit instructions"
              >
                <span aria-hidden="true" className="text-2xl leading-none">×</span>
              </button>
            </div>

            <div className="space-y-5 px-5 py-5 sm:px-6">
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-base font-bold text-emerald-800">
                    1
                  </span>
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      Select your crypto
                    </p>
                    <p className="mt-1 text-base leading-6 text-slate-600">
                      Select the crypto asset and network you want to deposit.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-base font-bold text-emerald-800">
                    2
                  </span>
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      Send to your MooGold address
                    </p>
                    <p className="mt-1 text-base leading-6 text-slate-600">
                      Copy the funding address shown in the form and send crypto from your external wallet or exchange.
                    </p>
                  </div>
                </li>
              </ol>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-base font-semibold text-amber-950">
                  Check the network carefully
                </p>
                <p className="mt-1 text-base leading-6 text-amber-900">
                  Make sure the sending network matches the selected network exactly. Sending on the wrong network may result in permanent loss of funds.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="w-full rounded-xl bg-emerald-700 px-4 py-3 text-base font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              >
                Got it
              </button>
            </div>
          </section>
        </div>
      )}
      {/* Asset / Network */}
      <div className="mt-5">
        <label
          htmlFor="crypto-asset"
          className="text-base font-semibold text-slate-700"
        >
          Asset / Network
        </label>

        <select
          id="crypto-asset"
          value={selectedAsset}
          onChange={(event) => {
            setSelectedAsset(event.target.value);
            setCopied(false);
            setError("");
          }}
          className="mt-2.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base font-semibold text-slate-900 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
        >
          {CRYPTO_OPTIONS.map((crypto) => (
            <option
              key={crypto.asset}
              value={crypto.asset}
            >
              {crypto.asset} — {crypto.networkLabel}
            </option>
          ))}
        </select>
      </div>

      {/* Address */}
      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="break-words text-sm font-semibold leading-5 text-slate-900 sm:text-base">
              Your MooGold {selected.asset} funding address
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {selected.networkLabel}
            </p>
          </div>

          <button
            type="button"
            onClick={copyAddress}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3.5 py-2.5 text-sm font-bold text-emerald-800 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy
              </>
            )}
          </button>
        </div>

        <div className="mt-3 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 via-white to-amber-50/40 p-4 shadow-inner sm:p-5">
          <code className="block break-all font-mono text-sm leading-6 text-slate-800 sm:text-base sm:leading-7">
            {selected.address}
          </code>
        </div>
      </div>

      {selectedMemo && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Stellar memo (required)
              </p>
              <p className="mt-1 text-xs leading-5 text-amber-800">
                Include this exact memo when sending XLM. Deposits without it may not be identifiable.
              </p>
            </div>
            <button
              type="button"
              onClick={copyMemo}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-bold text-amber-900 shadow-sm"
            >
              {memoCopied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </button>
          </div>
          <code className="mt-3 block rounded-xl bg-white px-3 py-3 text-center font-mono text-lg font-bold tracking-wider text-slate-900">
            {selectedMemo}
          </code>
        </div>
      )}
      {/* Network speed */}
      <div className="mt-4 flex gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white px-4 py-4 shadow-sm">
        <p className="text-base font-semibold leading-5 text-emerald-900">
          Send only using the selected network. Crypto arrives in seconds depending on network.
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-base font-medium leading-5 text-red-600">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-600 px-5 py-4 text-base font-bold text-white shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-900/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/20 disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
      >
        {loading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Checking...
          </>
        ) : (
          <>
            I&apos;ve Sent the Crypto
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
}