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
const GOLD_DECIMAL_PLACES = 8;

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);

const goldAmount = (value: number) =>
  `${value.toFixed(GOLD_DECIMAL_PLACES)} oz`;

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
  const exceedsHolding = hasQuantity && numericQuantity > goldQuantity;
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

    if (
      !new RegExp(
        `^\\d*\\.?\\d{0,${GOLD_DECIMAL_PLACES}}$`,
      ).test(value)
    ) {
      return;
    }

    setQuantity(value);
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

    formData.set(
      "quantity",
      numericQuantity.toFixed(GOLD_DECIMAL_PLACES),
    );

    startTransition(async () => {
      const response = await sellGold(formData);

      setResult(response);

      if (response.success) {
        setShowConfirmation(false);
        setQuantity("");
      }
    });
  }

  const remainingGold = Math.max(
    0,
    goldQuantity - numericQuantity,
  );

  return (
    <>
      <div className="rounded-2xl border border-black/5 bg-white shadow-sm">
        {/* Header */}
        <div className="border-b border-black/5 px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/30">
                Gold
              </p>

              <h2 className="mt-1 text-lg font-black tracking-tight text-[#10201b]">
                Sell Gold
              </h2>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <ArrowUpFromLine className="h-4 w-4" />
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {/* Quantity */}
          <div>
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="gold-sale-quantity"
                className="text-xs font-black text-[#10201b]"
              >
                Gold quantity
              </label>

              <span className="text-[10px] font-bold text-black/30">
                Available: {goldAmount(goldQuantity)}
              </span>
            </div>

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
                disabled={isPending || goldQuantity <= 0}
                className="h-14 w-full rounded-xl border border-black/10 bg-black/[0.02] px-4 pr-14 text-xl font-black text-[#10201b] outline-none transition placeholder:text-black/15 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-60"
              />

              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-black/25">
                oz
              </span>
            </div>
          </div>

          {/* No holdings */}
          {goldQuantity <= 0 && (
            <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
              <p className="text-xs font-bold leading-5 text-amber-900">
                You do not currently have any gold available to sell.
              </p>
            </div>
          )}

          {/* Validation */}
          {hasQuantity &&
            (exceedsHolding || belowMinimum || exceedsMaximum) && (
              <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                <p className="text-xs font-bold leading-5 text-red-800">
                  {exceedsHolding
                    ? `You only have ${goldAmount(goldQuantity)} available to sell.`
                    : belowMinimum
                      ? `The minimum gold sale is ${money(
                          MIN_TRADE_USD,
                        )} in proceeds.`
                      : `The maximum gold sale is ${money(
                          MAX_TRADE_USD,
                        )} in proceeds.`}
                </p>
              </div>
            )}

          {/* Sale summary */}
          <div className="mt-5 rounded-xl bg-[#f7faf8] px-4 py-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-black/25">
                Sale summary
              </p>
            </div>

            <div className="mt-3 space-y-2.5">
              <CalculationRow
                label="Gold quantity"
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

              <div className="my-1 h-px bg-black/5" />

              <CalculationRow
                label="Estimated wallet credit"
                value={money(estimatedProceeds)}
                strong
              />
            </div>
          </div>

          {/* Result */}
          {result && (
            <div
              className={[
                "mt-4 rounded-xl border px-4 py-3",
                result.success
                  ? "border-emerald-100 bg-emerald-50"
                  : "border-red-100 bg-red-50",
              ].join(" ")}
            >
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                )}

                <div className="min-w-0">
                  <p
                    className={[
                      "text-xs font-black",
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
                      "mt-1 text-[11px] leading-5",
                      result.success
                        ? "text-emerald-900/60"
                        : "text-red-900/60",
                    ].join(" ")}
                  >
                    {result.message}
                  </p>

                  {result.success && result.reference && (
                    <p className="mt-1 break-all text-[9px] font-black uppercase tracking-wider text-emerald-800/50">
                      Reference: {result.reference}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Continue */}
          <button
            type="button"
            disabled={!validQuantity || isPending}
            onClick={handleContinue}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0a1713] text-xs font-black text-white transition hover:bg-[#10251e] disabled:cursor-not-allowed disabled:bg-[#0a1713]/30"
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

          <p className="mt-2 text-center text-[9px] font-semibold text-black/25">
            You will review the transaction before any gold is sold.
          </p>
        </div>
      </div>

      {/* Confirmation modal */}
      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="bg-[#0a1713] px-5 py-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                    <ShieldCheck className="h-4 w-4" />
                  </div>

                  <h2 className="text-xl font-black">
                    Confirm sale
                  </h2>

                  <p className="mt-1 text-[11px] text-white/40">
                    Review the transaction before confirming.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowConfirmation(false)}
                  className="rounded-xl p-2 text-white/40 transition hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-5">
              <div className="rounded-xl bg-[#f7faf8] px-4 py-4">
                <div className="space-y-3">
                  <ConfirmationRow
                    label="Gold quantity"
                    value={goldAmount(numericQuantity)}
                  />

                  <ConfirmationRow
                    label="Execution price"
                    value={`${money(executionPrice)} / oz`}
                  />

                  <ConfirmationRow
                    label="Estimated wallet credit"
                    value={money(estimatedProceeds)}
                    strong
                  />

                  <div className="h-px bg-black/5" />

                  <ConfirmationRow
                    label="Gold remaining"
                    value={goldAmount(remainingGold)}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />

                <p className="text-[11px] font-medium leading-5 text-amber-900/70">
                  By confirming, you authorize MooGold to sell the
                  selected gold quantity and credit the proceeds to
                  your available wallet balance.
                </p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setShowConfirmation(false)}
                  className="h-11 rounded-xl border border-black/10 px-4 text-xs font-black text-black/50 transition hover:bg-black/[0.03] disabled:opacity-40"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleSale}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-xs font-black text-[#06100d] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
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
          "text-[11px]",
          strong
            ? "font-black text-[#10201b]"
            : "font-semibold text-black/35",
        ].join(" ")}
      >
        {label}
      </span>

      <span
        className={[
          "text-right text-[11px]",
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
      <span className="text-[11px] font-semibold text-black/35">
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