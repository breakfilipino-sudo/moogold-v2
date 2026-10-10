"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Copy,
  Loader2,
  ShieldCheck,
  WalletCards,
  XCircle,
} from "lucide-react";

import { submitCryptoWithdrawal } from "../actions";

type Balance = {
  id: string;
  asset: string;
  network: string;
  balance: string;
};

type Withdrawal = {
  id: string;
  asset: string;
  network: string;
  amount: string;
  fee: string;
  totalAmount: string;
  destinationAddress: string;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
};

type Props = {
  balances: Balance[];
  withdrawalHistory: Withdrawal[];
  totalCryptoUsd: number;
};

const NETWORK_LABELS: Record<string, string> = {
  ETHEREUM: "Ethereum (ERC-20)",
  TRON: "Tron (TRC-20)",
  BITCOIN: "Bitcoin",
  SOLANA: "Solana",
  STELLAR: "Stellar",
};

function formatAmount(value: string) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return value;
  }

  return number.toLocaleString("en-US", {
    maximumFractionDigits: 8,
  });
}

function formatUsd(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function shortAddress(address: string) {
  if (address.length <= 18) {
    return address;
  }

  return `${address.slice(0, 9)}...${address.slice(-9)}`;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(date));
}

function getStatusClasses(status: string) {
  switch (status.toUpperCase()) {
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700";

    case "REJECTED":
      return "bg-red-50 text-red-700";

    case "CANCELLED":
      return "bg-slate-100 text-slate-600";

    case "PROCESSING":
      return "bg-blue-50 text-blue-700";

    default:
      return "bg-amber-50 text-amber-700";
  }
}

export default function CryptoWithdrawalForm({
  balances,
  withdrawalHistory,
  totalCryptoUsd,
}: Props) {
  const [asset, setAsset] = useState(balances[0]?.asset ?? "");
  const [amount, setAmount] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedBalance = useMemo(
    () => balances.find((balance) => balance.asset === asset) ?? null,
    [balances, asset],
  );

  const availableBalance = selectedBalance?.balance ?? "0";
  const numericAmount = Number(amount);
  const numericBalance = Number(availableBalance);

  const amountIsValid =
    amount.trim() !== "" &&
    Number.isFinite(numericAmount) &&
    numericAmount > 0;

  const amountExceedsBalance =
    amountIsValid &&
    Number.isFinite(numericBalance) &&
    numericAmount > numericBalance;

  const amountError = amountExceedsBalance
    ? `You only have ${formatAmount(availableBalance)} ${asset} available.`
    : "";

  function selectMax() {
    setAmount(availableBalance);
    setError("");
    setSuccess("");
  }

  function handleAmountChange(value: string) {
    setAmount(value);
    setError("");
    setSuccess("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setError("");
    setSuccess("");

    if (!asset) {
      setError("Please select a cryptocurrency.");
      return;
    }

    if (!amount.trim()) {
      setError("Please enter the amount you want to withdraw.");
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Please enter a valid withdrawal amount.");
      return;
    }

    if (amountExceedsBalance) {
      setError(amountError);
      return;
    }

    if (!destinationAddress.trim()) {
      setError("Please enter your destination wallet address.");
      return;
    }

    const confirmed = window.confirm(
      `Confirm withdrawal of ${amount} ${asset} to ${shortAddress(
        destinationAddress.trim(),
      )}?`,
    );

    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();

      formData.set("asset", asset);
      formData.set("amount", amount.trim());
      formData.set("destinationAddress", destinationAddress.trim());

      const result = await submitCryptoWithdrawal(formData);

      if (!result.success) {
        setError(result.error ?? "We could not submit your withdrawal.");
        return;
      }

      setSuccess(
        `Your withdrawal request for ${
          result.withdrawal?.amount ?? amount
        } ${asset} has been submitted.`,
      );

      setAmount("");
      setDestinationAddress("");

      window.location.reload();
    } catch (submitError) {
      console.error("Failed to submit crypto withdrawal:", submitError);

      setError("We could not submit your withdrawal. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyAddress(address: string) {
    try {
      await navigator.clipboard.writeText(address);
    } catch {
      // Clipboard access can be unavailable in some browsers.
    }
  }

  return (
    <div className="space-y-4">
      {/* Balance */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <p className="text-[11px] text-slate-500">
              Total crypto value
            </p>

            <p className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
              {formatUsd(totalCryptoUsd)}
            </p>

            <p className="mt-0.5 text-[10px] text-slate-400">
              Current market value of your holdings
            </p>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Secure withdrawal
          </div>
        </div>
      </section>

      {/* Withdrawal form */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold text-slate-900">
            Withdrawal details
          </h2>

          <p className="mt-0.5 text-[10px] text-slate-400">
            Select an asset, enter the amount and destination wallet.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-4 py-4 sm:px-5">
          {error && (
            <div className="flex gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-xs leading-5 text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs leading-5 text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}

          {/* Asset */}
          <div>
            <label className="text-xs font-medium text-slate-700">
              Cryptocurrency
            </label>

            <div className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
              {balances.map((balance) => {
                const selected = balance.asset === asset;

                return (
                  <button
                    key={balance.id}
                    type="button"
                    onClick={() => {
                      setAsset(balance.asset);
                      setAmount("");
                      setError("");
                      setSuccess("");
                    }}
                    disabled={isSubmitting}
                    className={[
                      "flex w-full items-center gap-3 px-3 py-3 text-left transition",
                      selected
                        ? "bg-emerald-50/70"
                        : "bg-white hover:bg-slate-50",
                      "first:rounded-t-lg last:rounded-b-lg",
                      "disabled:cursor-not-allowed disabled:opacity-60",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        selected
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-slate-100 text-slate-500",
                      ].join(" ")}
                    >
                      <CircleDollarSign className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-slate-900">
                          {balance.asset}
                        </p>

                        <span className="truncate text-[10px] text-slate-400">
                          {NETWORK_LABELS[balance.network] ??
                            balance.network}
                        </span>
                      </div>

                      <p className="mt-0.5 text-[10px] text-slate-500">
                        Available: {formatAmount(balance.balance)}{" "}
                        {balance.asset}
                      </p>
                    </div>

                    {selected && (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    )}
                  </button>
                );
              })}

              {balances.length === 0 && (
                <div className="px-4 py-5 text-center">
                  <p className="text-xs text-amber-700">
                    You do not currently have any crypto balances available
                    for withdrawal.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Amount */}
          <div>
            <div className="flex items-center justify-between gap-4">
              <label
                htmlFor="withdrawal-amount"
                className="text-xs font-medium text-slate-700"
              >
                Amount
              </label>

              <button
                type="button"
                onClick={selectMax}
                disabled={!selectedBalance || isSubmitting}
                className="text-[10px] font-semibold text-emerald-600 transition hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                MAX
              </button>
            </div>

            <div className="relative mt-2">
              <input
                id="withdrawal-amount"
                name="amount"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={amount}
                onChange={(event) => handleAmountChange(event.target.value)}
                placeholder="0.00000000"
                disabled={isSubmitting || !selectedBalance}
                aria-invalid={amountExceedsBalance}
                className={[
                  "w-full rounded-lg border bg-white px-3 py-3 pr-20 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-300 disabled:cursor-not-allowed disabled:opacity-60",
                  amountExceedsBalance
                    ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/10"
                    : "border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10",
                ].join(" ")}
              />

              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500">
                {asset || "CRYPTO"}
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-slate-400">
              <span>Available balance</span>

              <span
                className={
                  amountExceedsBalance
                    ? "font-semibold text-red-600"
                    : "font-medium text-slate-600"
                }
              >
                {formatAmount(availableBalance)} {asset}
              </span>
            </div>

            {amountExceedsBalance && (
              <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[10px] leading-4 text-red-700">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{amountError}</span>
              </div>
            )}
          </div>

          {/* Destination */}
          <div>
            <label
              htmlFor="destination-address"
              className="text-xs font-medium text-slate-700"
            >
              Destination wallet address
            </label>

            <textarea
              id="destination-address"
              name="destinationAddress"
              value={destinationAddress}
              onChange={(event) => {
                setDestinationAddress(event.target.value);
                setError("");
                setSuccess("");
              }}
              placeholder="Enter the wallet address you want to send your crypto to"
              rows={3}
              disabled={isSubmitting}
              className="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-3 text-xs leading-5 text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            />

            <p className="mt-1.5 text-[10px] leading-4 text-slate-400">
              Make sure the address supports the selected network.
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={
              isSubmitting ||
              !selectedBalance ||
              balances.length === 0 ||
              !amountIsValid ||
              amountExceedsBalance ||
              !destinationAddress.trim()
            }
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <ArrowUpRight className="h-4 w-4" />
                Submit Withdrawal
              </>
            )}
          </button>

          <div className="flex items-start gap-2 border-t border-slate-100 pt-4">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />

            <p className="text-[10px] leading-4 text-slate-400">
              Review the cryptocurrency, network, amount and destination
              address carefully before submitting. Your request will be
              reviewed before processing.
            </p>
          </div>
        </form>
      </section>

      {/* Withdrawal history */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
          <Clock3 className="h-4 w-4 text-slate-400" />

          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Withdrawal history
            </h2>

            <p className="text-[10px] text-slate-400">
              Your recent crypto withdrawal requests.
            </p>
          </div>
        </div>

        {withdrawalHistory.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <WalletCards className="mx-auto h-5 w-5 text-slate-300" />

            <p className="mt-2 text-xs font-medium text-slate-600">
              No crypto withdrawals yet.
            </p>

            <p className="mt-1 text-[10px] text-slate-400">
              Your withdrawal requests will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {withdrawalHistory.map((withdrawal) => {
              const status = withdrawal.status.toUpperCase();
              const completed = status === "COMPLETED";
              const rejected = status === "REJECTED";

              return (
                <div
                  key={withdrawal.id}
                  className="px-4 py-4 sm:px-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className={[
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                          completed
                            ? "bg-emerald-50 text-emerald-600"
                            : rejected
                              ? "bg-red-50 text-red-600"
                              : "bg-amber-50 text-amber-600",
                        ].join(" ")}
                      >
                        {completed ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : rejected ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          <Clock3 className="h-4 w-4" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-semibold text-slate-900">
                            {withdrawal.amount} {withdrawal.asset}
                          </p>

                          <span className="text-[10px] text-slate-400">
                            {NETWORK_LABELS[withdrawal.network] ??
                              withdrawal.network}
                          </span>
                        </div>

                        <p className="mt-0.5 text-[10px] text-slate-400">
                          {formatDate(withdrawal.createdAt)}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-medium ${getStatusClasses(
                        status,
                      )}`}
                    >
                      {status}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-3">
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400">
                        Destination
                      </p>

                      <div className="mt-1 flex min-w-0 items-center gap-1.5">
                        <p className="truncate text-[10px] font-medium text-slate-700">
                          {shortAddress(withdrawal.destinationAddress)}
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            copyAddress(withdrawal.destinationAddress)
                          }
                          className="shrink-0 text-slate-400 transition hover:text-slate-700"
                          title="Copy address"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] text-slate-400">
                        Network fee
                      </p>

                      <p className="mt-1 text-[10px] font-medium text-slate-700">
                        {formatAmount(withdrawal.fee)}{" "}
                        {withdrawal.asset}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-slate-400">
                        Total deducted
                      </p>

                      <p className="mt-1 text-[10px] font-medium text-slate-700">
                        {formatAmount(withdrawal.totalAmount)}{" "}
                        {withdrawal.asset}
                      </p>
                    </div>
                  </div>

                  {withdrawal.rejectionReason && (
                    <div className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-[10px] leading-4 text-red-700">
                      <span className="font-semibold">
                        Rejection reason:
                      </span>{" "}
                      {withdrawal.rejectionReason}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}