"use client";

import { ArrowRight, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type WealthPlan = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  durationDays: number;
  returnPercentage: number;
  minimumUsd: number;
  maximumUsd: number | null;
  currency: string;
  currencySymbol: string;
  minimumLocalAmount: number;
  maximumLocalAmount: number | null;
};

type WealthBoxFormProps = {
  plans: WealthPlan[];
  currency: string;
  currencySymbol: string;
};

const ABSOLUTE_MAX_AMOUNT = 50000000;

function formatLocal(
  value: number,
  currency: string,
) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatInputAmount(value: string) {
  const cleaned = value
    .replace(/,/g, "")
    .replace(/[^0-9.]/g, "");

  if (!cleaned) {
    return "";
  }

  const decimalIndex =
    cleaned.indexOf(".");

  const whole =
    decimalIndex === -1
      ? cleaned
      : cleaned.slice(0, decimalIndex);

  const decimal =
    decimalIndex === -1
      ? ""
      : cleaned
          .slice(decimalIndex + 1)
          .replace(/\./g, "")
          .slice(0, 2);

  const formattedWhole =
    new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(Number(whole || "0"));

  if (decimalIndex === -1) {
    return formattedWhole;
  }

  return `${formattedWhole}.${decimal}`;
}

function getPayoutDate(days: number) {
  const date = new Date();

  date.setDate(
    date.getDate() + days,
  );

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  ).format(date);
}

function getDurationLabel(days: number) {
  if (days === 30) {
    return "1 month";
  }

  return `${days} days`;
}

export default function WealthBoxForm({
  plans,
  currency,
  currencySymbol,
}: WealthBoxFormProps) {
  const router = useRouter();

  const [selectedPlanId, setSelectedPlanId] =
    useState(plans[0]?.id ?? "");

  const [amount, setAmount] = useState("");

  const selectedPlan = useMemo(
    () =>
      plans.find(
        (plan) =>
          plan.id === selectedPlanId,
      ) ?? plans[0],
    [plans, selectedPlanId],
  );

  const numericAmount =
    Number(
      amount.replace(/,/g, ""),
    ) || 0;

  const minimum =
    selectedPlan?.minimumLocalAmount ?? 0;

  const amountBelowMinimum =
    numericAmount > 0 &&
    numericAmount < minimum;

  const amountAboveMaximum =
    numericAmount > ABSOLUTE_MAX_AMOUNT;

  const amountValid =
    numericAmount > 0 &&
    !amountBelowMinimum &&
    !amountAboveMaximum;

  if (!selectedPlan) {
    return null;
  }

    function getPlanProfit(
    plan: WealthPlan,
  ) {
    if (numericAmount <= 0) {
      return 0;
    }

    const payoutScaleFactor = 3.6 / 1.7;
    const planTotalMultiplier =
      (1 + plan.returnPercentage / 100) *
      payoutScaleFactor;

    return numericAmount * (planTotalMultiplier - 1);
  }

  function continueToFunding() {
    if (!amountValid) {
      return;
    }

    const cleanAmount =
      amount.replace(/,/g, "");

    router.push(
      `/dashboard/wealth-box/invest?planId=${encodeURIComponent(
        selectedPlan.id,
      )}&amount=${encodeURIComponent(
        cleanAmount,
      )}`,
    );
  }

  return (
    <div className="space-y-6">
      {/* Amount Input Section */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-900">
            Enter amount you want to invest
          </span>
        </div>

        <div className="mt-4 flex items-center gap-2 border-b border-slate-200 pb-3">
          <span className="text-3xl font-black text-slate-300 sm:text-4xl">
            {currencySymbol}
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(event) =>
              setAmount(
                formatInputAmount(
                  event.target.value,
                ),
              )
            }
            placeholder="0.00"
            className="w-full bg-transparent text-3xl font-black tracking-tight text-slate-900 outline-none placeholder:text-slate-200 sm:text-4xl"
            aria-label={`Investment amount in ${currency}`}
          />
        </div>

        {amountBelowMinimum ? (
          <p className="mt-3 text-xs font-bold text-red-600">
            Please enter at least {formatLocal(minimum, currency)}.
          </p>
        ) : null}

        {amountAboveMaximum ? (
          <p className="mt-3 text-xs font-bold text-red-600">
            The maximum amount is 50,000,000.
          </p>
        ) : null}
      </div>

      {/* Plan Selection Stack */}
      <div className="space-y-3">
        <h2 className="px-1 text-base font-extrabold text-slate-900">
          Choose your investment plan
        </h2>

        <div className="space-y-3">
          {plans.map((plan) => {
            const selected =
              plan.id === selectedPlan.id;

            const planProfit =
              getPlanProfit(plan);

            const planAmountValid = numericAmount > 0 && numericAmount >= plan.minimumLocalAmount && !amountAboveMaximum;

            return (
              <button
                key={plan.id}
                type="button"
                onClick={() =>
                  setSelectedPlanId(
                    plan.id,
                  )
                }
                className={`w-full text-left transition-all rounded-2xl border p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
                  selected
                    ? "border-slate-900 bg-slate-900 text-white shadow-md"
                    : "border-slate-200 bg-white hover:border-slate-300 text-slate-900"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2.5">
                    <p className={`text-base font-bold ${selected ? "text-white" : "text-slate-900"}`}>
                      {getDurationLabel(plan.durationDays)}
                    </p>
                  </div>
                  <p className={`text-xs sm:text-sm mt-1 font-medium ${selected ? "text-slate-300" : "text-slate-600"}`}>
                    Cash out on {getPayoutDate(plan.durationDays)}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-white/10">
                  <div className="text-left sm:text-right">
                    <p className={`text-xs font-bold uppercase tracking-wider ${selected ? "text-slate-300" : "text-slate-500"}`}>
                      You will earn
                    </p>
                    <p className={`text-lg sm:text-xl font-black ${selected ? "text-emerald-400" : "text-emerald-700"}`}>
                      {planAmountValid
                        ? formatLocal(numericAmount + planProfit, currency)
                        : `${currencySymbol}0.00`}
                    </p>
                  </div>

                  <div className={`flex h-7 w-7 items-center justify-center rounded-full border transition ${
                    selected
                      ? "border-emerald-400 bg-emerald-400 text-slate-950 font-black"
                      : "border-slate-300 bg-transparent"
                  }`}>
                    {selected && <Check className="h-4 w-4 stroke-[3]" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action CTA */}
      <button
        type="button"
        disabled={!amountValid}
        onClick={continueToFunding}
        className="w-full flex h-14 items-center justify-center gap-2 rounded-2xl bg-slate-900 text-white text-base font-bold shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
      >
        <span>Continue</span>
        <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
}