"use client";

import { useMemo, useState } from "react";
import {
ArrowRight,
Check,
Copy,
Info,
ShieldCheck,
} from "lucide-react";

import { submitCryptoDeposit } from "@/app/dashboard/crypto/actions";

const CRYPTO_OPTIONS = [
{
asset: "USDC",
network: "Ethereum (ERC-20)",
networkKey: "ETHEREUM",
address: "0x12C844aeA5FFe9271fb6f2F1e1fd1811512B4ad1",
},
{
asset: "USDT",
network: "Tron (TRC-20)",
networkKey: "TRON",
address: "TKrbT8qikYzZd8tBwPQ2teaLZCV4aJ5NKg",
},
{
asset: "BTC",
network: "Bitcoin",
networkKey: "BITCOIN",
address: "33a54tDd51n13TMYi6KqZ3WUdo2LpQcnqC",
},
{
asset: "ETH",
network: "Ethereum (ERC-20)",
networkKey: "ETHEREUM",
address: "0xae70A129dfd37186C70697494B08c4151C408717",
},
{
asset: "SOL",
network: "Solana",
networkKey: "SOLANA",
address: "GFenbSRhcZwPg7KE85AJS4AB7khUeVdBkUSQjuJj2xDj",
},
{
asset: "TRN",
network: "Tron",
networkKey: "TRON",
address: "TLGGvkFbJWtT3jvxx8uss14Mshmrz7Kenx",
},
{
asset: "XLM",
network: "Stellar",
networkKey: "STELLAR",
address:
"GD5LP2XKZV2QJBY3VIJTTC6ECN3LGJQMCJXSAYPPXZHWGVTJOQM5H3MP",
},
] as const;

export default function CryptoDepositForm() {
const [selectedAsset, setSelectedAsset] = useState("USDT");
const [amount, setAmount] = useState("");
const [copied, setCopied] = useState(false);
const [submitted, setSubmitted] = useState(false);
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

const selected = useMemo(
() =>
CRYPTO_OPTIONS.find(
(crypto) => crypto.asset === selectedAsset,
) ?? CRYPTO_OPTIONS[0],
[selectedAsset],
);

async function copyAddress() {
try {
await navigator.clipboard.writeText(selected.address);

  setCopied(true);

  window.setTimeout(() => {
    setCopied(false);
  }, 2000);
} catch {
  setError(
    "Unable to copy the wallet address. Please copy it manually.",
  );
}

}

async function handleSubmit(
event: React.FormEvent<HTMLFormElement>,
) {
event.preventDefault();

setError("");

const trimmedAmount = amount.trim();
const numericAmount = Number(trimmedAmount);

if (
  !trimmedAmount ||
  !Number.isFinite(numericAmount) ||
  numericAmount <= 0
) {
  setError("Please enter the amount you sent.");
  return;
}

setLoading(true);

try {
  const formData = new FormData();

  formData.set("asset", selected.asset);
  formData.set("amount", trimmedAmount);

  const result = await submitCryptoDeposit(formData);

  if (!result.success) {
    setError(
      result.error ??
        "We could not submit your crypto deposit.",
    );
    return;
  }

  setSubmitted(true);
} catch (error) {
  console.error(
    "Crypto deposit submission error:",
    error,
  );

  setError(
    "We could not submit your crypto deposit. Please try again.",
  );
} finally {
  setLoading(false);
}

}

if (submitted) {
return ( <div className="mx-auto max-w-3xl"> <div className="rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-sm sm:p-12"> <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"> <Check className="h-8 w-8" /> </div>

      <h2 className="mt-6 text-3xl font-black tracking-tight text-slate-900">
        Crypto Deposit Submitted
      </h2>

      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
        Your deposit report has been submitted successfully
        and is awaiting confirmation.
      </p>

      <div className="mx-auto mt-7 max-w-sm rounded-2xl bg-slate-50 p-5 text-left">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-slate-500">
            Asset
          </span>

          <span className="font-bold text-slate-900">
            {selected.asset}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-4">
          <span className="text-sm text-slate-500">
            Amount
          </span>

          <span className="font-bold text-slate-900">
            {amount} {selected.asset}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-4">
          <span className="text-sm text-slate-500">
            Network
          </span>

          <span className="text-right text-sm font-bold text-slate-900">
            {selected.network}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-4">
          <span className="text-sm text-slate-500">
            Status
          </span>

          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
            PENDING
          </span>
        </div>
      </div>

      <p className="mt-7 text-xs leading-5 text-slate-400">
        Your crypto balance will update after the deposit
        has been confirmed by MooGold.
      </p>

      <button
        type="button"
        onClick={() => {
          setSubmitted(false);
          setAmount("");
          setError("");
        }}
        className="mt-7 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
      >
        Make Another Deposit
      </button>
    </div>
  </div>
);

}

return ( <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"> <div> <h2 className="text-xl font-black text-slate-900">
Send cryptocurrency </h2>

    <p className="mt-1 text-sm text-slate-500">
      Choose the asset you want to deposit.
    </p>
  </div>

  <form onSubmit={handleSubmit} className="mt-7">
    <div>
      <label className="text-sm font-bold text-slate-700">
        Asset
      </label>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CRYPTO_OPTIONS.map((crypto) => {
          const active =
            crypto.asset === selectedAsset;

          return (
            <button
              key={crypto.asset}
              type="button"
              onClick={() => {
                setSelectedAsset(crypto.asset);
                setCopied(false);
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
                  active
                    ? "text-emerald-700"
                    : "text-slate-900"
                }`}
              >
                {crypto.asset}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {crypto.network}
              </p>
            </button>
          );
        })}
      </div>
    </div>

    <div className="mt-7">
      <label
        htmlFor="crypto-amount"
        className="text-sm font-bold text-slate-700"
      >
        Amount
      </label>

      <div className="relative mt-3">
        <input
          id="crypto-amount"
          name="amount"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={amount}
          onChange={(event) => {
            setAmount(event.target.value);
            setSubmitted(false);
            setError("");
          }}
          placeholder="0.00"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 pr-20 text-lg font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
        />

        <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500">
          {selected.asset}
        </span>
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
            <strong>{selected.network}</strong> network.
            Using the wrong asset or network can result in
            permanent loss of funds.
          </p>
        </div>
      </div>
    </div>

    <div className="mt-7">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-bold text-slate-700">
          MooGold wallet address
        </label>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
          {selected.network}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
        <code className="min-w-0 flex-1 break-all text-sm font-semibold leading-6 text-slate-800">
          {selected.address}
        </code>

        <button
          type="button"
          onClick={copyAddress}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy Address
            </>
          )}
        </button>
      </div>
    </div>

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
        disabled={
          loading ||
          !amount.trim() ||
          !Number.isFinite(Number(amount)) ||
          Number(amount) <= 0
        }
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
      >
        {loading ? (
          <>
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Submitting...
          </>
        ) : (
          <>
            I&apos;ve Sent the Crypto
            <ArrowRight className="h-5 w-5" />
          </>
        )}
      </button>
    </div>
  </form>

  <div className="mt-5 flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

    <p className="text-xs leading-5 text-slate-500">
      Your balance is only credited after MooGold confirms
      the deposit. Submitting this form does not
      automatically add funds to your account.
    </p>
  </div>
</div>

);
}
