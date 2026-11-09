"use client";

import { useEffect, useMemo, useState } from "react";
import {
ArrowRight,
Check,
ChevronDown,
Copy,
} from "lucide-react";
import { useRouter } from "next/navigation";

import {
  createCryptoWealthFunding,
  createCryptoWealthFundingQuote,
} from "@/app/dashboard/wealth-box/actions";

const CRYPTO_OPTIONS = [
  {
    asset: "USDT",
    network: "TRON",
    networkLabel: "Tron (TRC20)",
    address: "TJKxnXkwhH8fC9qY9g8YXvCoHSqyZ1oR12",
    memo: undefined,
    decimals: 6,
  },
  {
    asset: "USDC",
    network: "ETHEREUM",
    networkLabel: "Ethereum (ERC20)",
    address: "0x4f8179631d4af8e05ae09b1182813ee65d421918",
    memo: undefined,
    decimals: 6,
  },
  {
    asset: "BTC",
    network: "BITCOIN",
    networkLabel: "Bitcoin",
    address: "16GZmP9ybu1m1wYvzG5D4Q6aCrxn3ebYgU",
    memo: undefined,
    decimals: 8,
  },
  {
    asset: "BNB",
    network: "BNB_SMART_CHAIN",
    networkLabel: "BNB Smart Chain (BEP20)",
    address: "0x4f8179631d4af8e05ae09b1182813ee65d421918",
    memo: undefined,
    decimals: 18,
  },
  {
    asset: "ETH",
    network: "ETHEREUM",
    networkLabel: "Ethereum (ERC20)",
    address: "0x4f8179631d4af8e05ae09b1182813ee65d421918",
    memo: undefined,
    decimals: 18,
  },
  {
    asset: "SOL",
    network: "SOLANA",
    networkLabel: "Solana",
    address: "orwuXMAC81ivmAKR5X4oB4hpvRzmfE7jSUXdrjQYgkv",
    memo: undefined,
    decimals: 9,
  },
  {
    asset: "XLM",
    network: "STELLAR",
    networkLabel: "Stellar",
    address: "GABFQIK63R2NETJM7T673EAMZN4RJLLGP3OFUEJU5SZVTGWUKULZJNL6",
    memo: "401607474",
    decimals: 7,
  },
  {
    asset: "TRX",
    network: "TRON",
    networkLabel: "Tron (TRC20)",
    address: "TJKxnXkwhH8fC9qY9g8YXvCoHSqyZ1oR12",
    memo: undefined,
    decimals: 6,
  },
  {
    asset: "SUI",
    network: "SUI",
    networkLabel: "Sui",
    address: "0xfe65cba4a2b4f67b13e68c548460d129fa0b0b9cae6f6e2d5d8ce0adaa94c8ab",
    memo: undefined,
    decimals: 9,
  },
] as const;

type CryptoWealthFundingFormProps = {
planId: string;
amount: string;
currency: string;
localAmount: number;

};

type CryptoWealthQuote = Extract<
  Awaited<ReturnType<typeof createCryptoWealthFundingQuote>>,
  { success: true }
>;
function formatLocal(
value: number,
currency: string,
) {
try {
return new Intl.NumberFormat("en-US", {
style: "currency",
currency,
minimumFractionDigits: 2,
maximumFractionDigits: 2,
}).format(value);
} catch {
return `${currency} ${value.toFixed(2)}`;
}
}

function formatCryptoAmount(
value: number,
decimals: number,
) {
if (!Number.isFinite(value) || value <= 0) {
return "0";
}

return value.toLocaleString("en-US", {
minimumFractionDigits: Math.min(2, decimals),
maximumFractionDigits: decimals,
useGrouping: false,
});
}

export default function CryptoWealthFundingForm({
planId,
amount,
currency,
localAmount,

}: CryptoWealthFundingFormProps) {
const router = useRouter();

const [selectedAsset, setSelectedAsset] =
useState("USDT");

const [quote, setQuote] =
  useState<CryptoWealthQuote | null>(null);

const [quoteLoading, setQuoteLoading] =
  useState(true);

const [quoteError, setQuoteError] =
  useState("");

const [quoteRefreshKey, setQuoteRefreshKey] =
  useState(0);

const [copied, setCopied] = useState(false);

const [memoCopied, setMemoCopied] = useState(false);

const [loading, setLoading] =
  useState(false);

const [submitted, setSubmitted] =
  useState(false);

const [error, setError] =
  useState("");

const selected = useMemo(
  () =>
    CRYPTO_OPTIONS.find(
      (item) => item.asset === selectedAsset,
    ) ?? CRYPTO_OPTIONS[0],
  [selectedAsset],
);

useEffect(() => {
  let cancelled = false;

  async function loadQuote() {
    setQuoteLoading(true);
    setQuoteError("");
    setQuote(null);

    try {
      const result = await createCryptoWealthFundingQuote(
        planId,
        amount,
        selected.asset,
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      if (!cancelled) {
        setQuote(result);
      }
    } catch (quoteError) {
      if (!cancelled) {
        setQuoteError(
          quoteError instanceof Error
            ? quoteError.message
            : "Unable to calculate the crypto payment amount. Please try again.",
        );
      }
    } finally {
      if (!cancelled) {
        setQuoteLoading(false);
      }
    }
  }

  void loadQuote();

  return () => {
    cancelled = true;
  };
}, [planId, amount, selected.asset, quoteRefreshKey]);

const cryptoAmount = quote
  ? Number(quote.cryptoAmount)
  : 0;

const canSubmit =
  !quoteLoading &&
  !quoteError &&
  quote !== null &&
  Boolean(quote.token) &&
  cryptoAmount > 0 &&
  !loading;
async function copyAddress() {
setError("");

try {
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    window.isSecureContext
  ) {
    await navigator.clipboard.writeText(
      selected.address,
    );
  } else {
    const textArea =
      document.createElement("textarea");

    textArea.value =
      selected.address;

    textArea.setAttribute(
      "readonly",
      "",
    );

    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";

    document.body.appendChild(
      textArea,
    );

    textArea.focus();
    textArea.select();

    const copiedSuccessfully =
      document.execCommand("copy");

    document.body.removeChild(
      textArea,
    );

    if (!copiedSuccessfully) {
      throw new Error("Copy failed");
    }
  }

  setCopied(true);

  window.setTimeout(() => {
    setCopied(false);
  }, 2000);
} catch {
  setError(
    "Unable to copy the address. Please copy it manually.",
  );
}

}

async function copyMemo() {
  if (!selected.memo) return;

  setError("");

  try {
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      window.isSecureContext
    ) {
      await navigator.clipboard.writeText(selected.memo);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = selected.memo;
      textArea.setAttribute("readonly", "");
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const copiedSuccessfully = document.execCommand("copy");
      document.body.removeChild(textArea);

      if (!copiedSuccessfully) {
        throw new Error("Copy failed");
      }
    }

    setMemoCopied(true);
    window.setTimeout(() => setMemoCopied(false), 2000);
  } catch {
    setError("Unable to copy the Stellar memo. Please copy it manually.");
  }
}
async function handleSubmit() {
  setError("");

  if (!quote || !cryptoAmount) {
    setError(
      "Please wait for the current crypto payment quote to load.",
    );
    return;
  }

  setLoading(true);

  try {
    const result = await createCryptoWealthFunding(
      planId,
      amount,
      selectedAsset,
      quote.token,
    );

    if (!result.success) {
      setError(result.error);

      if (result.error.toLowerCase().includes("expired")) {
        setQuoteRefreshKey((current) => current + 1);
      }

      return;
    }

    setSubmitted(true);
  } catch {
    setError(
      "We could not submit your crypto payment. Please try again.",
    );
  } finally {
    setLoading(false);
  }
}
if (submitted) {
return ( <div className="mt-5"> <section className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-6 sm:p-7"> <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white"> <Check className="h-6 w-6" /> </div>

      <p className="mt-5 text-xs font-bold uppercase tracking-[0.15em] text-emerald-800">
        Crypto payment submitted
      </p>

      <p className="mt-3 text-sm leading-6 text-[#42554d]">
        Your payment is being processed. Your Wealth Box updates automatically as soon as payment is confirmed.
      </p>
    </section>

    <section className="mt-4 rounded-[24px] border border-black/10 bg-white p-5 sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#53665e]">
        Payment details
      </p>

      <div className="mt-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-[#53665e]">
            Cryptocurrency
          </span>

          <span className="text-sm font-bold text-[#10201b]">
            {selected.asset}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-[#53665e]">
            Network
          </span>

          <span className="text-right text-sm font-bold text-[#10201b]">
            {selected.networkLabel}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-[#53665e]">
            Amount sent
          </span>

          <span className="text-right text-sm font-bold text-[#10201b]">
            {formatCryptoAmount(
              cryptoAmount,
              selected.decimals,
            )}{" "}
            {selected.asset}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-black/10 pt-4">
          <span className="text-sm font-medium text-[#53665e]">
            Status
          </span>

          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
            Under review
          </span>
        </div>
      </div>
    </section>

    <button
      type="button"
      onClick={() =>
        router.push(
          "/dashboard/wealth-box",
        )
      }
      className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-[#173b2f] px-4 text-sm font-bold text-white transition hover:bg-[#245343]"
    >
      Back to Wealth Box
    </button>
  </div>
);

}

return ( <div className="mt-5"> <section className="rounded-[24px] border border-black/10 bg-white p-5 sm:p-6"> <div className="flex items-start justify-between gap-5"> <div> <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#53665e]">
Investment amount </p>

        <p className="mt-2 text-2xl font-bold tracking-tight text-[#10201b]">
          {formatLocal(
            localAmount,
            currency,
          )}
        </p>

        <p className="mt-1 text-xs font-medium text-[#53665e]">
          Amount you entered.
        </p>
      </div>

      <div className="rounded-xl bg-emerald-50 px-3 py-2 text-right">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-800">
          Payment
        </p>

        <p className="mt-1 text-xs font-bold text-emerald-800">
          Crypto
        </p>
      </div>
    </div>
  </section>

  <section className="mt-4 rounded-[24px] border border-black/10 bg-white p-5 sm:p-6">
    <label
      htmlFor="wealth-crypto-asset"
      className="text-xs font-bold uppercase tracking-[0.14em] text-[#53665e]"
    >
      Choose cryptocurrency
    </label>

    <div className="relative mt-2">
      <select
        id="wealth-crypto-asset"
        value={selectedAsset}
        onChange={(event) => {
          setSelectedAsset(
            event.target.value,
          );
          setCopied(false);
          setError("");
        }}
        className="w-full appearance-none rounded-2xl border border-black/10 bg-[#f7faf8] px-4 py-3.5 pr-11 text-sm font-bold text-[#10201b] outline-none transition focus:border-emerald-300 focus:bg-white"
      >
        {CRYPTO_OPTIONS.map(
          (crypto) => (
            <option
              key={crypto.asset}
              value={crypto.asset}
            >
              {crypto.asset} —{" "}
              {crypto.networkLabel}
            </option>
          ),
        )}
      </select>

      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#53665e]" />
    </div>

    <div className="mt-5 overflow-hidden rounded-[22px] bg-[#10201b] text-white">
      <div className="p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-200">
          Amount to send
        </p>

        <div className="mt-4">
          {quoteLoading ? (
            <div>
              <div className="h-9 w-40 animate-pulse rounded-lg bg-white/15" />

              <p className="mt-2 text-xs font-medium text-white/65">
                Calculating the current payment amount...
              </p>
            </div>
          ) : quoteError ? (
            <div>
              <p className="text-sm font-bold text-red-200">
                Unable to calculate the payment amount.
              </p>

              <p className="mt-1 text-xs font-medium leading-5 text-white/65">
                {quoteError}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-3xl font-bold tracking-tight sm:text-4xl">
                {formatCryptoAmount(
                  cryptoAmount,
                  selected.decimals,
                )}{" "}
                <span className="text-lg text-white/70">
                  {selected.asset}
                </span>
              </p>

              <p className="mt-2 text-xs font-medium text-white/65">
                Send exactly this amount.
              </p>


            </div>
          )}
        </div>
      </div>
    </div>
  </section>

  <section className="mt-4 rounded-[24px] border border-black/10 bg-white p-5 sm:p-6">
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#53665e]">
          MooGold receiving address
        </p>

        <p className="mt-1 text-xs font-semibold text-emerald-700">
          {selected.networkLabel}
        </p>
      </div>

      <button
        type="button"
        onClick={copyAddress}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#eef4f1] px-3 py-2 text-xs font-bold text-[#173b2f] transition hover:bg-emerald-50"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-700" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" />
            Copy address
          </>
        )}
      </button>
    </div>

    <div className="mt-3 rounded-2xl bg-[#f4f8f6] p-4">
      <code className="block break-all text-xs font-medium leading-5 text-[#42554d]">
        {selected.address}
      </code>
    </div>
  </section>

  {selected.memo ? (
    <section className="mt-4 rounded-[24px] border border-amber-300 bg-amber-50 p-5 sm:p-6">
      <p className="text-sm font-black text-amber-950">
        Stellar memo — required
      </p>
      <p className="mt-1 text-xs leading-5 text-amber-800">
        Include this memo when sending XLM. Omitting it may result in lost funds.
      </p>
      <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-white p-4 sm:flex-row sm:items-center">
        <code className="min-w-0 flex-1 break-all text-sm font-bold text-[#10201b]">
          {selected.memo}
        </code>
        <button
          type="button"
          onClick={copyMemo}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#10201b] px-4 py-3 text-xs font-bold text-white"
        >
          {memoCopied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy memo
            </>
          )}
        </button>
      </div>
    </section>
  ) : null}

  <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3">
    <p className="text-xs font-bold leading-5 text-amber-950">
      Send only through the{" "}
      {selected.networkLabel} network. A payment
      sent through another network may be permanently
      lost.
    </p>
  </div>

  {error ? (
    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold leading-5 text-red-700">
      {error}
    </div>
  ) : null}

  <button
    type="button"
    onClick={handleSubmit}
    disabled={!canSubmit}
    className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-black/10 disabled:text-black/30"
  >
    {loading ? (
      <>
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        Submitting payment...
      </>
    ) : (
      <>
        I&apos;ve Sent the Crypto
        <ArrowRight className="h-4 w-4" />
      </>
    )}
  </button>
</div>

);
}
