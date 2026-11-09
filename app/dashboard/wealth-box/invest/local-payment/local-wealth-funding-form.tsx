"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import {
  createLocalWealthFunding,
  getLocalWealthFundingGatewayUrl,
} from "../../actions";

type LocalMethod = "GCASH" | "MAYA" | "TOUCH_N_GO";

type Props = {
  method: LocalMethod;
  planId: string;
  amount: string;
  currency: string;
};

type CachedRequest = {
  fundingId: string;
  reference: string;
  localAmount: number;
};

const METHOD_DETAILS = {
  GCASH: {
    label: "GCash",
    logo: "/images/gcash-symbol.svg",
    heading: "Connecting to GCash",
    description: "Preparing your secure cash-in.",
    footer: "Secure payment connection",
  },
  MAYA: {
    label: "Maya",
    logo: "/images/maya.jpg",
    heading: "Preparing your Maya payment",
    description: "Preparing your payment request for admin review.",
    footer: "Secure payment request",
  },
  TOUCH_N_GO: {
    label: "Touch ’n Go",
    logo: "/images/touch-n-go.svg",
    heading: "Connecting to Touch ’n Go",
    description: "Preparing your secure cash-in.",
    footer: "Secure payment connection",
  },
} as const;

function formatLocalAmount(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function LocalWealthFundingForm({
  method,
  planId,
  amount,
  currency,
}: Props) {
  const [fundingId, setFundingId] = useState<string | null>(null);
  const [reference, setReference] = useState("");
  const [localAmount, setLocalAmount] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(true);

  const startedRef = useRef(false);
  const payment = METHOD_DETAILS[method];

  const storageKey = [
    "moogold-wealth-local-funding",
    method,
    planId,
    amount.replace(/,/g, ""),
  ].join(":");

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let active = true;

    async function preparePayment() {
      setError("");
      setCreating(true);

      try {
        let cached: CachedRequest | null = null;

        try {
          const stored = window.sessionStorage.getItem(storageKey);
          if (stored) {
            const parsed = JSON.parse(stored) as CachedRequest;

            if (
              typeof parsed.fundingId === "string" &&
              typeof parsed.reference === "string" &&
              Number.isFinite(parsed.localAmount)
            ) {
              cached = parsed;
            } else {
              window.sessionStorage.removeItem(storageKey);
            }
          }
        } catch {
          cached = null;
        }

        if (cached) {
          if (!active) return;

          setFundingId(cached.fundingId);
          setReference(cached.reference);
          setLocalAmount(cached.localAmount);
          setCreating(false);
          return;
        }

        const result = await createLocalWealthFunding(
          planId,
          amount,
          method,
        );

        if (!active) return;

        if (!result.success) {
          setError(result.error);
          setCreating(false);
          return;
        }

        const request: CachedRequest = {
          fundingId: result.fundingId,
          reference: result.reference,
          localAmount: result.localAmount,
        };

        try {
          window.sessionStorage.setItem(
            storageKey,
            JSON.stringify(request),
          );
        } catch {
          // The active page can continue even if browser storage is unavailable.
        }

        setFundingId(result.fundingId);
        setReference(result.reference);
        setLocalAmount(result.localAmount);
        setCreating(false);
      } catch {
        if (active) {
          setError("Unable to prepare your payment. Please try again.");
          setCreating(false);
        }
      }
    }

    void preparePayment();

    return () => {
      active = false;
    };
  }, [amount, method, planId, storageKey]);

  useEffect(() => {
    if (
      !fundingId ||
      (method !== "GCASH" && method !== "TOUCH_N_GO")
    ) {
      return;
    }

    let active = true;
    let redirecting = false;

    const checkGateway = async () => {
      try {
        const url = await getLocalWealthFundingGatewayUrl(fundingId);

        if (active && url && !redirecting) {
          redirecting = true;
          window.location.assign(url);
        }
      } catch {
        // Retry on the next polling interval.
      }
    };

    void checkGateway();

    const interval = window.setInterval(
      () => void checkGateway(),
      3000,
    );

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [fundingId, method]);

  return (
    <div className="mx-auto w-full max-w-sm space-y-6 px-4 py-8">
      <div className="space-y-2 rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center shadow-sm">
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
          Deposit amount
        </p>

        <p className="text-3xl font-black tracking-tight text-slate-950">
          {currency}{" "}
          {formatLocalAmount(
            localAmount ??
              Number(amount.replace(/,/g, "")),
          )}
        </p>
      </div>

      <div className="flex flex-col items-center px-3 py-2 text-center">
        <div className="flex h-20 w-24 items-center justify-center rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
          <Image
            src={payment.logo}
            alt={`${payment.label} symbol`}
            width={88}
            height={64}
            unoptimized
            priority
            className="h-14 w-20 object-contain"
          />
        </div>

        <h1 className="mt-5 text-base font-extrabold text-slate-900">
          {payment.heading}
        </h1>

        <p className="mt-1 text-sm font-medium text-slate-500">
          {payment.description}
        </p>

        <div className="mt-6 flex flex-col items-center gap-3">
          <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-600">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            {creating ? "Please wait" : "Please wait"}
          </span>

          <div
            className="h-1.5 w-36 overflow-hidden rounded-full bg-slate-100"
            aria-label="Preparing secure payment"
          >
            <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-600" />
          </div>

          <p className="text-xs font-semibold text-slate-400">
            {payment.footer}
          </p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 text-center"
        >
          <p className="text-sm font-bold text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-red-700 px-4 py-2.5 text-xs font-bold text-white"
          >
            Try again
          </button>
        </div>
      )}

      {fundingId && (
        <p className="text-center text-[10px] font-medium text-slate-400">
          Reference: {reference}
        </p>
      )}
    </div>
  );
}