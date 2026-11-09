"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Copy,
  Info,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";

import {
  WALLET_CRYPTO_OPTIONS,
} from "@/lib/wallet-crypto-deposits";

import {
  startWalletCryptoDeposit,
  type WalletCryptoRequest,
} from "./actions";

type Props = {
  initialRequest: WalletCryptoRequest | null;
};

export default function WalletCryptoDepositForm({
  initialRequest,
}: Props) {
  const router = useRouter();

  const [asset, setAsset] = useState(
    initialRequest?.asset ?? "USDT",
  );
  const [request, setRequest] = useState<WalletCryptoRequest | null>(
    initialRequest,
  );
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    initialRequest
      ? Math.max(
          0,
          Math.ceil(
            (new Date(initialRequest.expiresAt).getTime() - Date.now()) /
              1000,
          ),
        )
      : 0,
  );
  const [copied, setCopied] = useState("");
  const [message, setMessage] = useState<{
    success: boolean;
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const selected = WALLET_CRYPTO_OPTIONS.find(
    (option) => option.asset === (request && remainingSeconds > 0 ? request.asset : asset),
  ) ?? WALLET_CRYPTO_OPTIONS[0];

  const expired = Boolean(request) && remainingSeconds <= 0;

  useEffect(() => {
    if (!request) {
      setRemainingSeconds(0);
      return;
    }

    const updateCountdown = () => {
      const difference =
        new Date(request.expiresAt).getTime() - Date.now();

      setRemainingSeconds(
        Math.max(0, Math.ceil(difference / 1000)),
      );
    };

    updateCountdown();

    const interval = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(interval);
  }, [request?.expiresAt]);

  function copyValue(value: string, label: string) {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1800);
    }).catch(() => {
      setMessage({
        success: false,
        text: "Copy was unavailable. Please copy the address manually.",
      });
    });
  }

  function goBack() {
    if (
      window.history.length > 1 &&
      document.referrer.startsWith(window.location.origin)
    ) {
      router.back();
    } else {
      router.push("/dashboard/deposit-method");
    }
  }

  function handleStartDeposit() {
    setMessage(null);

    startTransition(async () => {
      const response = await startWalletCryptoDeposit(asset);

      if (response.success && response.request) {
        setRequest(response.request);
        setAsset(response.request.asset);
        setRemainingSeconds(
          Math.max(
            0,
            Math.ceil(
              (new Date(response.request.expiresAt).getTime() -
                Date.now()) /
                1000,
            ),
          ),
        );
        setMessage({
          success: true,
          text: response.message,
        });
        router.refresh();
        return;
      }

      setMessage({
        success: false,
        text: response.message,
      });
    });
  }

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const countdown = `${String(minutes).padStart(2, "0")}:${String(
    seconds,
  ).padStart(2, "0")}`;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 pb-8">
      <button
        type="button"
        onClick={goBack}
        className="inline-flex items-center gap-2 rounded-lg text-sm font-medium text-slate-600 transition hover:text-slate-950"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div>
        <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          Fund your main wallet with Crypto
        </h1>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        {!request || expired ? (
          <div className="space-y-5">
            {expired && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-semibold text-red-800">
                  Deposit window expired
                </p>
                <p className="mt-1 text-xs text-red-700">
                  Start a new request to receive a fresh deposit address window.
                </p>
              </div>
            )}

            <div>
              <label
                htmlFor="wallet-crypto-asset"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Cryptocurrency
              </label>
              <select
                id="wallet-crypto-asset"
                value={asset}
                onChange={(event) => {
                  setAsset(event.target.value);
                  setMessage(null);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                {WALLET_CRYPTO_OPTIONS.map((option) => (
                  <option key={option.asset} value={option.asset}>
                    {option.asset} - {option.networkLabel}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <div className="flex gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <p className="text-xs leading-5 text-amber-900">
                  Send only {selected.asset} using the{" "}
                  {selected.networkLabel} network. Sending another asset or
                  using a different network may result in permanent loss.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleStartDeposit}
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending && (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              )}
              {isPending ? "Starting..." : "Start deposit"}
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {request.asset}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {selected.networkLabel}
                </p>
              </div>

              <div className="rounded-xl bg-emerald-50 px-3 py-2 text-right">
                <p className="text-xs font-medium text-emerald-700">
                  Time remaining
                </p>
                <p className="font-mono text-xl font-bold tabular-nums text-emerald-800">
                  {countdown}
                </p>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">
                Receiving address
              </label>
              <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="min-w-0 flex-1 break-all font-mono text-xs leading-6 text-slate-800">
                  {request.receivingAddress}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    copyValue(request.receivingAddress, "address")
                  }
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  {copied === "address" ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied === "address" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            {request.memo && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Required Stellar memo
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="min-w-0 flex-1 break-all font-mono text-sm font-semibold tracking-wider text-slate-900">
                    {request.memo}
                  </p>
                  <button
                    type="button"
                    onClick={() => copyValue(request.memo!, "memo")}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    {copied === "memo" ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copied === "memo" ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold text-emerald-700">
                Status: Waiting for deposit
              </p>
              <p className="mt-1 text-xs font-medium text-slate-700">
                Request: {request.reference}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Main wallet credit follows blockchain verification and admin approval.
              </p>
            </div>
          </div>
        )}

        {message && (
          <div
            className={[
              "mt-4 rounded-xl border p-3 text-sm",
              message.success
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700",
            ].join(" ")}
            role="status"
          >
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}