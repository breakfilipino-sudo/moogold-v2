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

  const maximum =
    selectedPlan?.maximumLocalAmount ?? null;

  const amountBelowMinimum =
    numericAmount > 0 &&
    numericAmount < minimum;

  const amountAboveMaximum =
    maximum !== null &&
    numericAmount > maximum;

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

    return (
      numericAmount *
      (plan.returnPercentage / 100)
    );
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
    <div className="space-y-5">
      <section className="rounded-[24px] border border-[#d7e3dd] bg-white p-5 shadow-[0_8px_30px_rgba(16,32,27,0.04)] sm:p-6">
        <div>
          <h3 className="text-lg font-extrabold tracking-tight text-[#10201b]">
            Enter the amount you want to
            invest.
          </h3>
        </div>

        <div className="mt-5 rounded-2xl border border-[#cbdad3] bg-[#f7faf8] px-4 py-4 transition focus-within:border-emerald-400 focus-within:bg-white">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#52655c]">
            {currency}
          </p>

          <div className="mt-1 flex items-center gap-2">
            <span className="text-xl font-extrabold text-[#10201b]">
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
              className="min-w-0 flex-1 bg-transparent text-2xl font-extrabold tracking-tight text-[#10201b] outline-none placeholder:text-[#aab9b2]"
              aria-label={`Investment amount in ${currency}`}
            />
          </div>

          <p className="mt-3 text-xs font-bold text-[#52655c]">
            Minimum{" "}
            {formatLocal(
              minimum,
              currency,
            )}
          </p>
        </div>

        {amountBelowMinimum ? (
          <p className="mt-3 text-sm font-bold text-red-600">
            Please enter at least{" "}
            {formatLocal(
              minimum,
              currency,
            )}
            .
          </p>
        ) : null}

        {amountAboveMaximum ? (
          <p className="mt-3 text-sm font-bold text-red-600">
            This amount is above the
            allowed investment limit.
          </p>
        ) : null}
      </section>

      <section>
        <div className="mb-4">
          <h2 className="mt-1 text-xl font-extrabold tracking-tight text-[#10201b]">
            Choose your investment plan
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {plans.map((plan) => {
            const selected =
              plan.id === selectedPlan.id;

            const planProfit =
              getPlanProfit(plan);

            const planAmountValid =
              numericAmount > 0 &&
              numericAmount >=
                plan.minimumLocalAmount &&
              (plan.maximumLocalAmount ===
                null ||
                numericAmount <=
                  plan.maximumLocalAmount);

            return (
              <button
                key={plan.id}
                type="button"
                onClick={() =>
                  setSelectedPlanId(
                    plan.id,
                  )
                }
                className={`rounded-[20px] border p-4 text-left transition ${
                  selected
                    ? "border-emerald-600 bg-emerald-50 shadow-[0_8px_24px_rgba(5,150,105,0.08)]"
                    : "border-[#d7e3dd] bg-white hover:border-emerald-300 hover:bg-emerald-50/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={`text-sm font-extrabold ${
                      selected
                        ? "text-emerald-800"
                        : "text-[#10201b]"
                    }`}
                  >
                    {getDurationLabel(
                      plan.durationDays,
                    )}
                  </p>

                  {selected ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-700 text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  ) : null}
                </div>

                <div className="mt-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#52655c]">
                    Amount you will earn
                  </p>

                  <p className="mt-1 text-2xl font-extrabold tracking-tight text-emerald-700">
                    {planAmountValid
                      ? formatLocal(
                          planProfit,
                          currency,
                        )
                      : "0.00"}
                  </p>
                </div>

                <div className="mt-5 border-t border-black/5 pt-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#52655c]">
                    Cashout date
                  </p>

                  <p className="mt-1 text-sm font-extrabold text-[#10201b]">
                    {getPayoutDate(
                      plan.durationDays,
                    )}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <button
        type="button"
        disabled={!amountValid}
        onClick={continueToFunding}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-black/10 disabled:text-black/25"
      >
        Continue
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}