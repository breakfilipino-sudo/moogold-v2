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
    asset: "USDT",
    network: "TRON",
    networkLabel: "Tron (TRC-20)",
    address: "TKrbT8qikYzZd8tBwPQ2teaLZCV4aJ5NKg",
  },
  {
    asset: "USDC",
    network: "ETHEREUM",
    networkLabel: "Ethereum (ERC-20)",
    address: "0x12C844aeA5FFe9271fb6f2F1e1fd1811512B4ad1",
  },
  {
    asset: "BTC",
    network: "BITCOIN",
    networkLabel: "Bitcoin",
    address: "33a54tDd51n13TMYi6KqZ3WUdo2LpQcnqC",
  },
  {
    asset: "ETH",
    network: "ETHEREUM",
    networkLabel: "Ethereum (ERC-20)",
    address: "0xae70A129dfd37186C70697494B08c4151C408717",
  },
  {
    asset: "SOL",
    network: "SOLANA",
    networkLabel: "Solana",
    address: "GFenbSRhcZwPg7KE85AJS4AB7khUeVdBkUSQjuJj2xDj",
  },
  {
    asset: "TRN",
    network: "TRON",
    networkLabel: "Tron",
    address: "TLGGvkFbJWtT3jvxx8uss14Mshmrz7Kenx",
  },
  {
    asset: "XLM",
    network: "STELLAR",
    networkLabel: "Stellar",
    address:
      "GD5LP2XKZV2QJBY3VIJTTC6ECN3LGJQMCJXSAYPPXZHWGVTJOQM5H3MP",
  },
] as const;

export default function CryptoDepositForm() {
  const [selectedAsset, setSelectedAsset] =
    useState("USDT");
  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selected = useMemo(
    () =>
      CRYPTO_OPTIONS.find(
        (item) => item.asset === selectedAsset,
      ) ?? CRYPTO_OPTIONS[0],
    [selectedAsset],
  );

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
      <div className="rounded-2xl bg-slate-50 p-5 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <Check className="h-6 w-6" />
        </div>

        <h3 className="mt-4 text-lg font-bold text-slate-900">
          Deposit submitted
        </h3>

        <p className="mt-2 text-sm leading-5 text-slate-600">
          Your crypto deposit has been submitted.
          Crypto arrives in your wallet within seconds,
          depending on the network.
        </p>

        <div className="mt-4 rounded-xl bg-white p-4 text-left">
          <div className="flex justify-between gap-4">
            <span className="text-sm text-slate-500">
              Asset
            </span>

            <span className="text-sm font-semibold text-slate-900">
              {selected.asset}
            </span>
          </div>

          <div className="mt-2 flex justify-between gap-4">
            <span className="text-sm text-slate-500">
              Network
            </span>

            <span className="text-sm font-semibold text-slate-900">
              {selected.networkLabel}
            </span>
          </div>

          <div className="mt-2 flex justify-between gap-4">
            <span className="text-sm text-slate-500">
              Status
            </span>

            <span className="text-sm font-semibold text-amber-600">
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
          className="mt-5 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
        >
          Make another deposit
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* How to deposit */}
      <div className="rounded-xl bg-slate-50 p-4">
        <p className="text-sm font-bold text-slate-900">
          How to deposit
        </p>

        <ol className="mt-3 space-y-2.5">
          <li className="flex gap-3 text-xs leading-5 text-slate-600">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-bold text-slate-700">
              1
            </span>

            <span>
              Select the crypto you want to receive/deposit.
            </span>
          </li>

          <li className="flex gap-3 text-xs leading-5 text-slate-600">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-bold text-slate-700">
              2
            </span>

            <span>
              Copy your MooGold funding address and send
              the crypto from an external wallet or exchange.
            </span>
          </li>
        </ol>

        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
          <p className="text-xs font-semibold leading-5 text-amber-900">
            Make sure the network matches exactly. Sending
            on the wrong network may result in permanent
            loss of funds.
          </p>
        </div>
      </div>

      {/* Asset / Network */}
      <div className="mt-5">
        <label
          htmlFor="crypto-asset"
          className="text-sm font-semibold text-slate-700"
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
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
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
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Your MooGold {selected.asset} funding address
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {selected.networkLabel}
            </p>
          </div>

          <button
            type="button"
            onClick={copyAddress}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
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

        <div className="mt-3 rounded-xl bg-slate-50 p-4">
          <code className="block break-all text-xs leading-5 text-slate-700">
            {selected.address}
          </code>
        </div>
      </div>

      {/* Network speed */}
      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <p className="text-sm font-semibold leading-5 text-emerald-900">
          Crypto arrives in your wallet within seconds,
          depending on the network.
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium leading-5 text-red-600">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
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