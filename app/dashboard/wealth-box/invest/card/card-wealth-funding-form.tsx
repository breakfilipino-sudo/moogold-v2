"use client";

import { useState } from "react";
import { ArrowRight, CreditCard } from "lucide-react";

import { createCardWealthFunding } from "@/app/dashboard/wealth-box/actions";

type CardWealthFundingFormProps = {
planId: string;
amount: string;
currency: string;
currencySymbol: string;
localAmount: number;
usdAmount: number;
};

function formatLocalAmount(
value: number,
currencySymbol: string,
) {
return `${currencySymbol}${new Intl.NumberFormat(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(value)}`;
}

export default function CardWealthFundingForm({
planId,
amount,
currency,
currencySymbol,
localAmount,
usdAmount,
}: CardWealthFundingFormProps) {
const [error, setError] = useState("");
const [isSubmitting, setIsSubmitting] =
useState(false);

async function handleSubmit() {
if (isSubmitting) return;

setError("");
setIsSubmitting(true);

try {
  const result =
    await createCardWealthFunding(
      planId,
      amount,
    );

  if (!result.success) {
    setError(result.error);
    setIsSubmitting(false);
    return;
  }

  window.location.href =
    "https://elderlycarepays.wordpress.com/";
} catch {
  setError(
    "We could not start your card payment. Please try again.",
  );
  setIsSubmitting(false);
}

}

return ( <div className="space-y-5"> <section> <div className="flex items-start gap-3"> <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"> <CreditCard className="h-5 w-5" /> </div>

      <div>
        <h1 className="text-base font-bold text-[#10201b]">
          Credit or debit card
        </h1>

        <p className="mt-1 text-sm leading-5 text-[#64756e]">
          Pay securely with your credit or debit
          card on our payment page.
        </p>
      </div>
    </div>

    <div className="mt-5 rounded-2xl bg-[#f7faf8] p-4">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-[#64756e]">
          Amount to pay
        </span>

        <span className="text-right text-lg font-bold text-[#10201b]">
          {formatLocalAmount(
            localAmount,
            currencySymbol,
          )}
        </span>
      </div>
    </div>
  </section>

  {error ? (
    <p className="text-sm font-semibold text-red-600">
      {error}
    </p>
  ) : null}

  <button
    type="button"
    onClick={handleSubmit}
    disabled={isSubmitting}
    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-4 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
  >
    {isSubmitting
      ? "Preparing payment..."
      : "Continue to card payment"}

    {!isSubmitting ? (
      <ArrowRight className="h-4 w-4" />
    ) : null}
  </button>

  <p className="text-center text-sm leading-5 text-[#64756e]">
    Your investment starts after your payment is
    completed and confirmed.
  </p>

  <span className="hidden">
    {currency}
    {usdAmount}
  </span>
</div>

);
}
