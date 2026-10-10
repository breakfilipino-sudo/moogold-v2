"use client";

import { useState, useTransition } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  Coins,
  Loader2,
  WalletCards,
} from "lucide-react";

import { buyGold, sellGold } from "@/app/dashboard/gold/actions";

type TradeMode = "buy" | "sell";

type Props = {
  price: number;
  cashBalance: number;
  goldQuantity: number;
};

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);

export default function GoldTradePanel({
  price,
  cashBalance,
  goldQuantity,
}: Props) {
  const [mode, setMode] = useState<TradeMode>("buy");
  const [amount, setAmount] = useState("");

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
    reference?: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();

  const numericAmount = Number(amount) || 0;

  const buyQuantity = price > 0 ? numericAmount / price : 0;
  const sellValue = price > 0 ? numericAmount * price : 0;

  const exceedsCash = mode === "buy" && numericAmount > cashBalance;
  const exceedsGold = mode === "sell" && numericAmount > goldQuantity;

  function submit() {
    setMessage(null);

    if (mode === "buy") {
      if (!numericAmount || numericAmount <= 0) {
        setMessage({
          type: "error",
          text: "Enter the amount of gold you want to purchase.",
        });
        return;
      }

      if (exceedsCash) {
        setMessage({
          type: "error",
          text: "You do not have enough available balance.",
        });
        return;
      }

      const formData = new FormData();
      formData.set("amount", amount);

      startTransition(async () => {
        const result = await buyGold(formData);

        if (!result.success) {
          setMessage({
            type: "error",
            text: result.message,
          });
          return;
        }

        setMessage({
          type: "success",
          text: result.message,
          reference: result.reference,
        });

        setAmount("");
      });

      return;
    }

    if (!numericAmount || numericAmount <= 0) {
      setMessage({
        type: "error",
        text: "Enter the amount of gold you want to sell.",
      });
      return;
    }

    if (exceedsGold) {
      setMessage({
        type: "error",
        text: "You do not have enough gold available.",
      });
      return;
    }

    const formData = new FormData();
    formData.set("quantity", amount);

    startTransition(async () => {
      const result = await sellGold(formData);

      if (!result.success) {
        setMessage({
          type: "error",
          text: result.message,
        });
        return;
      }

      setMessage({
        type: "success",
        text: result.message,
        reference: result.reference,
      });

      setAmount("");
    });
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-sm">
      {/* Tabs */}
      <div className="grid grid-cols-2 border-b border-black/5">
        <button
          type="button"
          onClick={() => {
            setMode("buy");
            setAmount("");
            setMessage(null);
          }}
          className={`flex items-center justify-center gap-2 px-5 py-4 text-sm font-black transition ${
            mode === "buy"
              ? "bg-[#10201b] text-white"
              : "text-black/35 hover:bg-black/[0.02]"
          }`}
        >
          <ArrowDownToLine className="h-4 w-4" />
          Buy Gold
        </button>

        <button
          type="button"
          onClick={() => {
            setMode("sell");
            setAmount("");
            setMessage(null);
          }}
          className={`flex items-center justify-center gap-2 px-5 py-4 text-sm font-black transition ${
            mode === "sell"
              ? "bg-[#10201b] text-white"
              : "text-black/35 hover:bg-black/[0.02]"
          }`}
        >
          <ArrowUpFromLine className="h-4 w-4" />
          Sell Gold
        </button>
      </div>

      <div className="p-6 sm:p-7">
        {/* Current price */}
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#f6f9f7] p-4">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-white p-2.5 text-amber-500 shadow-sm">
              <Coins className="h-5 w-5" />
            </span>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/30">
                Live gold price
              </p>

              <p className="mt-1 text-lg font-black text-[#10201b]">
                {price > 0 ? `${money(price)} / oz` : "Unavailable"}
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Live
          </span>
        </div>

        {/* Input */}
        <div className="mt-6">
          <label
            htmlFor="gold-trade-amount"
            className="text-xs font-black text-black/45"
          >
            {mode === "buy"
              ? "USD amount to invest in gold"
              : "Gold quantity to sell"}
          </label>

          <div className="relative mt-2">
            <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
              <span className="text-sm font-black text-black/30">
                {mode === "buy" ? "$" : "oz"}
              </span>
            </div>

            <input
              id="gold-trade-amount"
              type="number"
              min="0"
              step={mode === "buy" ? "0.01" : "0.00000001"}
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setMessage(null);
              }}
              placeholder={mode === "buy" ? "0.00" : "0.00000000"}
              disabled={isPending || price <= 0}
              className="w-full rounded-2xl border border-black/10 bg-white py-4 pl-12 pr-4 text-lg font-black text-[#10201b] outline-none transition placeholder:text-black/15 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 disabled:cursor-not-allowed disabled:bg-black/[0.02]"
            />
          </div>

          <div className="mt-2 flex justify-between text-[11px] font-semibold text-black/30">
            <span>
              {mode === "buy"
                ? `Available: ${money(cashBalance)}`
                : `Available: ${goldQuantity.toFixed(8)} oz`}
            </span>

            {mode === "buy" && cashBalance > 0 && (
              <button
                type="button"
                onClick={() => setAmount(cashBalance.toFixed(2))}
                className="font-black text-emerald-700 hover:text-emerald-800"
              >
                Use max
              </button>
            )}

            {mode === "sell" && goldQuantity > 0 && (
              <button
                type="button"
                onClick={() => setAmount(goldQuantity.toFixed(8))}
                className="font-black text-emerald-700 hover:text-emerald-800"
              >
                Sell all
              </button>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="mt-6 rounded-2xl border border-black/5 bg-[#fafcfb] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/25">
            Trade preview
          </p>

          <div className="mt-4 space-y-3">
            <PreviewRow
              label="Gold price"
              value={price > 0 ? `${money(price)} / oz` : "—"}
            />

            <PreviewRow
              label={mode === "buy" ? "Gold received" : "Gold sold"}
              value={
                mode === "buy"
                  ? `${buyQuantity.toFixed(8)} oz`
                  : `${numericAmount.toFixed(8)} oz`
              }
            />

            <div className="h-px bg-black/5" />

            <PreviewRow
              label={mode === "buy" ? "Total cost" : "Estimated proceeds"}
              value={money(mode === "buy" ? numericAmount : sellValue)}
              strong
            />
          </div>
        </div>

        {/* Error */}
        {message?.type === "error" && (
          <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700">
            {message.text}
          </div>
        )}

        {/* Success */}
        {message?.type === "success" && (
          <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

              <div>
                <p className="text-sm font-black text-emerald-800">
                  {message.text}
                </p>

                {message.reference && (
                  <p className="mt-1 break-all text-[11px] font-semibold text-emerald-700/60">
                    Reference: {message.reference}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="button"
          onClick={submit}
          disabled={
            isPending ||
            price <= 0 ||
            !amount ||
            exceedsCash ||
            exceedsGold
          }
          className={`mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${
            mode === "buy"
              ? "bg-emerald-400 text-[#06100d] hover:bg-emerald-300"
              : "bg-[#10201b] text-white hover:bg-[#172b24]"
          }`}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing secure trade...
            </>
          ) : mode === "buy" ? (
            <>
              <ArrowDownToLine className="h-4 w-4" />
              Buy Gold
            </>
          ) : (
            <>
              <ArrowUpFromLine className="h-4 w-4" />
              Sell Gold
            </>
          )}
        </button>

        <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-bold text-black/25">
          <WalletCards className="h-3.5 w-3.5" />
          {mode === "buy"
            ? "Funds are deducted from your available USD balance."
            : "Sale proceeds are credited to your USD balance."}
        </div>
      </div>
    </section>
  );
}

function PreviewRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs font-semibold text-black/35">{label}</span>

      <span
        className={
          strong
            ? "text-sm font-black text-[#10201b]"
            : "text-xs font-bold text-black/55"
        }
      >
        {value}
      </span>
    </div>
  );
}