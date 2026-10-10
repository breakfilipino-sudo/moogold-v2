"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ArrowUpFromLine,
  CheckCircle2,
  Info,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  X,
} from "lucide-react";

import { sellGold } from "@/app/dashboard/gold/actions";

type SellGoldFormProps = {
  goldQuantity: number;
  goldPrice: number;
  goldBidPrice: number | null;
};

type TradeResult = {
  success: boolean;
  message: string;
  reference?: string;
  quantity?: number;
  amount?: number;
  price?: number;
};

const MIN_TRADE_USD = 1;
const MAX_TRADE_USD = 1_000_000;
const GOLD_EPSILON = 0.00000001;

const goldAmount = (value: number) => `${value.toFixed(8)} oz`;

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);

export default function SellGoldForm({
  goldQuantity,
  goldPrice,
  goldBidPrice,
}: SellGoldFormProps) {
  const [quantity, setQuantity] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [result, setResult] = useState<TradeResult | null>(null);

  const [isPending, startTransition] = useTransition();

  const numericQuantity = useMemo(() => {
    const parsed = Number(quantity);

    return Number.isFinite(parsed) ? parsed : 0;
  }, [quantity]);

  const executionPrice =
    goldBidPrice && goldBidPrice > 0 ? goldBidPrice : goldPrice;

  const estimatedProceeds =
    executionPrice > 0 && numericQuantity > 0
      ? numericQuantity * executionPrice
      : 0;

  const hasQuantity = numericQuantity > 0;

  const exceedsHolding =
    hasQuantity &&
    numericQuantity > goldQuantity + GOLD_EPSILON;

  const belowMinimum =
    hasQuantity && estimatedProceeds < MIN_TRADE_USD;

  const exceedsMaximum =
    hasQuantity && estimatedProceeds > MAX_TRADE_USD;

  const validQuantity =
    hasQuantity &&
    !exceedsHolding &&
    !belowMinimum &&
    !exceedsMaximum &&
    executionPrice > 0;

  function handleQuantityChange(value: string) {
    if (value === "") {
      setQuantity("");
      setResult(null);
      return;
    }

    if (!/^\d*\.?\d{0,8}$/.test(value)) {
      return;
    }

    setQuantity(value);
    setResult(null);
  }

  function handleMaxQuantity() {
    if (goldQuantity <= 0) {
      return;
    }

    setQuantity(goldQuantity.toFixed(8));
    setResult(null);
  }

  function handleContinue() {
    if (!validQuantity) {
      return;
    }

    setResult(null);
    setShowConfirmation(true);
  }

  function handleSale() {
    if (!validQuantity || isPending) {
      return;
    }

    const formData = new FormData();

    formData.set("quantity", numericQuantity.toFixed(8));

    startTransition(async () => {
      const response = await sellGold(formData);

      setResult(response);

      if (response.success) {
        setShowConfirmation(false);
        setQuantity("");
      }
    });
  }

  const remainingQuantity = Math.max(
    0,
    goldQuantity - numericQuantity,
  );

  return (
    <>
      <div className="rounded-[28px] border border-black/5 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/30">
              Order details
            </p>

            <h2 className="mt-1 text-2xl font-black tracking-tight text-[#10201b]">
              Sell gold
            </h2>

            <p className="mt-2 text-sm leading-6 text-black/40">
              Enter the amount of gold you would like to sell from your
              current holdings.
            </p>
          </div>

          <div className="hidden rounded-2xl bg-amber-50 p-3 text-amber-600 sm:block">
            <ArrowUpFromLine className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-7">
          <label
            htmlFor="gold-sale-quantity"
            className="text-xs font-black text-[#10201b]"
          >
            Gold quantity
          </label>

          <div className="relative mt-2">
            <input
              id="gold-sale-quantity"
              name="quantity"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={quantity}
              onChange={(event) =>
                handleQuantityChange(event.target.value)
              }
              placeholder="0.00000000"
              disabled={isPending}
              className="h-16 w-full rounded-2xl border border-black/10 bg-black/2 px-4 pr-16 text-2xl font-black text-[#10201b] outline-none transition placeholder:text-black/15 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-400/10 disabled:cursor-not-allowed disabled:opacity-60"
            />

            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-black/25">
              oz
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPending || goldQuantity <= 0}
              onClick={handleMaxQuantity}
              className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-2 text-xs font-black text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Sell all
            </button>

            {goldQuantity > 0 && (
              <span className="flex items-center rounded-xl bg-black/2 px-4 py-2 text-xs font-bold text-black/35">
                Available: {goldAmount(goldQuantity)}
              </span>
            )}
          </div>
        </div>

        {hasQuantity &&
          (exceedsHolding || belowMinimum || exceedsMaximum) && (
            <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4">
              <p className="text-xs font-bold leading-5 text-red-800">
                {exceedsHolding
                  ? `You only have ${goldAmount(goldQuantity)} available in your gold holdings.`
                  : belowMinimum
                    ? `The minimum gold sale value is ${money(
                        MIN_TRADE_USD,
                      )}.`
                    : `The maximum gold sale value is ${money(
                        MAX_TRADE_USD,
                      )}.`}
              </p>
            </div>
          )}

        {goldQuantity <= 0 && (
          <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-xs font-bold leading-5 text-amber-900/70">
              You do not currently have any gold available to sell.
            </p>
          </div>
        )}

        <div className="mt-7 rounded-3xl bg-[#f7faf8] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/25">
            Estimated sale
          </p>

          <div className="mt-4 space-y-3">
            <CalculationRow
              label="Gold to sell"
              value={goldAmount(
                numericQuantity > 0 ? numericQuantity : 0,
              )}
            />

            <CalculationRow
              label="Gold price"
              value={
                executionPrice > 0
                  ? `${money(executionPrice)} / oz`
                  : "Unavailable"
              }
            />

            <CalculationRow
              label="Estimated proceeds"
              value={money(estimatedProceeds)}
            />

            <div className="my-2 h-px bg-black/5" />

            <CalculationRow
              label="Estimated total"
              value={money(estimatedProceeds)}
              strong
            />
          </div>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200/70 bg-amber-50 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />

          <p className="text-xs font-medium leading-5 text-amber-900/70">
            The displayed proceeds are an estimate. Your final payout is
            calculated using the execution price when the transaction is
            confirmed.
          </p>
        </div>

        {result && (
          <div
            className={[
              "mt-5 rounded-2xl border p-4",
              result.success
                ? "border-emerald-100 bg-emerald-50"
                : "border-red-100 bg-red-50",
            ].join(" ")}
          >
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              )}

              <div className="min-w-0">
                <p
                  className={[
                    "text-sm font-black",
                    result.success
                      ? "text-emerald-900"
                      : "text-red-900",
                  ].join(" ")}
                >
                  {result.success
                    ? "Sale successful"
                    : "Sale could not be completed"}
                </p>

                <p
                  className={[
                    "mt-1 text-xs leading-5",
                    result.success
                      ? "text-emerald-900/60"
                      : "text-red-900/60",
                  ].join(" ")}
                >
                  {result.message}
                </p>

                {result.success && result.reference && (
                  <p className="mt-2 break-all text-[10px] font-black uppercase tracking-wider text-emerald-800/50">
                    Reference: {result.reference}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={!validQuantity || isPending}
          onClick={handleContinue}
          className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#0a1713] text-sm font-black text-white transition hover:bg-[#10251e] disabled:cursor-not-allowed disabled:bg-[#0a1713]/30"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing sale...
            </>
          ) : (
            <>
              <LockKeyhole className="h-4 w-4" />
              Continue to review
            </>
          )}
        </button>

        <p className="mt-3 text-center text-[10px] font-semibold text-black/25">
          You will review the transaction before any gold is sold.
        </p>
      </div>

      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="bg-[#0a1713] p-6 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-3 inline-flex rounded-xl bg-amber-400/10 p-2.5 text-amber-300">
                    <ShieldCheck className="h-5 w-5" />
                  </div>

                  <h2 className="text-2xl font-black">
                    Confirm sale
                  </h2>

                  <p className="mt-1 text-xs text-white/40">
                    Please review the details carefully.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowConfirmation(false)}
                  className="rounded-xl p-2 text-white/40 transition hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="rounded-2xl bg-[#f7faf8] p-5">
                <div className="space-y-4">
                  <ConfirmationRow
                    label="Gold sold"
                    value={goldAmount(numericQuantity)}
                  />

                  <ConfirmationRow
                    label="Execution price"
                    value={`${money(executionPrice)} / oz`}
                  />

                  <ConfirmationRow
                    label="Estimated proceeds"
                    value={money(estimatedProceeds)}
                  />

                  <div className="h-px bg-black/5" />

                  <ConfirmationRow
                    label="Gold remaining"
                    value={goldAmount(remainingQuantity)}
                    strong
                  />
                </div>
              </div>

              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />

                <p className="text-xs font-medium leading-5 text-amber-900/70">
                  By confirming, you authorize MooGold to sell the selected
                  gold quantity and credit the corresponding proceeds to your
                  available wallet balance.
                </p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setShowConfirmation(false)}
                  className="h-13 rounded-2xl border border-black/10 px-4 text-sm font-black text-black/50 transition hover:bg-black/3 disabled:opacity-40"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleSale}
                  className="flex h-13 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 text-sm font-black text-[#06100d] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Confirm sale
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CalculationRow({
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
      <span
        className={[
          "text-xs",
          strong
            ? "font-black text-[#10201b]"
            : "font-semibold text-black/35",
        ].join(" ")}
      >
        {label}
      </span>

      <span
        className={[
          "text-right text-xs",
          strong
            ? "font-black text-[#10201b]"
            : "font-bold text-black/60",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

function ConfirmationRow({
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
      <span className="text-xs font-semibold text-black/35">
        {label}
      </span>

      <span
        className={[
          "text-right text-sm",
          strong
            ? "font-black text-[#10201b]"
            : "font-bold text-black/60",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}