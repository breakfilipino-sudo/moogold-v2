"use client";

import { useEffect, useMemo, useState } from "react";
import {
ArrowRight,
Check,
ChevronDown,
Copy,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { createCryptoWealthFunding } from "@/app/dashboard/wealth-box/actions";

const CRYPTO_OPTIONS = [
{
asset: "USDT",
network: "TRON",
networkLabel: "Tron (TRC-20)",
address:
"TKrbT8qikYzZd8tBwPQ2teaLZCV4aJ5NKg",
decimals: 6,
},
{
asset: "USDC",
network: "ETHEREUM",
networkLabel: "Ethereum (ERC-20)",
address:
"0x12C844aeA5FFe9271fb6f2F1e1fd1811512B4ad1",
decimals: 6,
},
{
asset: "BTC",
network: "BITCOIN",
networkLabel: "Bitcoin",
address:
"33a54tDd51n13TMYi6KqZ3WUdo2LpQcnqC",
decimals: 8,
},
{
asset: "ETH",
network: "ETHEREUM",
networkLabel: "Ethereum (ERC-20)",
address:
"0xae70A129dfd37186C70697494B08c4151C408717",
decimals: 8,
},
{
asset: "SOL",
network: "SOLANA",
networkLabel: "Solana",
address:
"GFenbSRhcZwPg7KE85AJS4AB7khUeVdBkUSQjuJj2xDj",
decimals: 6,
},
{
asset: "TRN",
network: "TRON",
networkLabel: "Tron",
address:
"TLGGvkFbJWtT3jvxx8uss14Mshmrz7Kenx",
decimals: 6,
},
{
asset: "XLM",
network: "STELLAR",
networkLabel: "Stellar",
address:
"GD5LP2XKZV2QJBY3VIJTTC6ECN3LGJQMCJXSAYPPXZHWGVTJOQM5H3MP",
decimals: 7,
},
] as const;

type CryptoWealthFundingFormProps = {
planId: string;
amount: string;
currency: string;
localAmount: number;
usdAmount: number;
};

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

function roundUpToDecimals(
value: number,
decimals: number,
) {
const multiplier = 10 ** decimals;

return (
Math.ceil(value * multiplier) /
multiplier
);
}

export default function CryptoWealthFundingForm({
planId,
amount,
currency,
localAmount,
usdAmount,
}: CryptoWealthFundingFormProps) {
const router = useRouter();

const [selectedAsset, setSelectedAsset] =
useState("USDT");

const [cryptoPrice, setCryptoPrice] =
useState<number | null>(null);

const [quoteLoading, setQuoteLoading] =
useState(true);

const [quoteError, setQuoteError] =
useState("");

const [copied, setCopied] =
useState(false);

const [loading, setLoading] =
useState(false);

const [submitted, setSubmitted] =
useState(false);

const [error, setError] =
useState("");

const selected = useMemo(
() =>
CRYPTO_OPTIONS.find(
(item) =>
item.asset === selectedAsset,
) ?? CRYPTO_OPTIONS[0],
[selectedAsset],
);

useEffect(() => {
let cancelled = false;

async function loadQuote() {
  setQuoteLoading(true);
  setQuoteError("");
  setCryptoPrice(null);

  try {
    const response = await fetch(
      `/api/crypto/quote?asset=${encodeURIComponent(
        selected.asset,
      )}`,
      {
        method: "GET",
        cache: "no-store",
      },
    );

    const data =
      (await response.json()) as {
        usdPrice?: number;
        error?: string;
      };

    if (!response.ok) {
      throw new Error(
        data.error ??
          "Crypto price is temporarily unavailable.",
      );
    }

    if (
      typeof data.usdPrice !== "number" ||
      !Number.isFinite(data.usdPrice) ||
      data.usdPrice <= 0
    ) {
      throw new Error(
        "Crypto price is temporarily unavailable.",
      );
    }

    if (!cancelled) {
      setCryptoPrice(data.usdPrice);
    }
  } catch (quoteError) {
    if (!cancelled) {
      setQuoteError(
        quoteError instanceof Error
          ? quoteError.message
          : "Crypto price is temporarily unavailable.",
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

}, [selected.asset]);

const cryptoAmount = useMemo(() => {
if (
!cryptoPrice ||
!Number.isFinite(cryptoPrice) ||
cryptoPrice <= 0 ||
usdAmount <= 0
) {
return 0;
}

const rawAmount =
  usdAmount / cryptoPrice;

return roundUpToDecimals(
  rawAmount,
  selected.decimals,
);

}, [
cryptoPrice,
usdAmount,
selected.decimals,
]);

const canSubmit =
!quoteLoading &&
!quoteError &&
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

async function handleSubmit() {
setError("");

if (!cryptoAmount) {
  setError(
    "Please wait for the current crypto payment amount to load.",
  );
  return;
}

setLoading(true);

try {
  const result =
    await createCryptoWealthFunding(
      planId,
      amount,
      selectedAsset,
    );

  if (!result.success) {
    setError(result.error);
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
