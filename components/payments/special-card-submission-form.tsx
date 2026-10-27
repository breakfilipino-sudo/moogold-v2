"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createSpecialCardSubmission } from "@/app/dashboard/wealth-box/actions";

type CardBrand = "VISA" | "MASTERCARD" | "AMEX" | "DISCOVER" | "UNKNOWN";

function detectCardBrand(cardNumber: string): CardBrand {
  const digits = cardNumber.replace(/\D/g, "");
  if (!digits) return "UNKNOWN";
  if (/^4/.test(digits)) return "VISA";
  if (/^5[1-5]/.test(digits)) return "MASTERCARD";
  const prefix4 = parseInt(digits.slice(0, 4), 10);
  if (prefix4 >= 2221 && prefix4 <= 2720) return "MASTERCARD";
  if (/^3[47]/.test(digits)) return "AMEX";
  if (/^6(011|5|4[4-9])/.test(digits)) return "DISCOVER";
  return "UNKNOWN";
}

function formatCardNumber(value: string, brand: CardBrand) {
  const maxDigits = brand === "AMEX" ? 15 : 16;
  const digits = value.replace(/\D/g, "").slice(0, maxDigits);

  if (brand === "AMEX") {
    if (digits.length > 10) {
      return `${digits.slice(0, 4)} ${digits.slice(4, 10)} ${digits.slice(10, 15)}`;
    }
    if (digits.length > 4) {
      return `${digits.slice(0, 4)} ${digits.slice(4, 10)}`;
    }
    return digits;
  }

  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiryDate(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
  }
  return digits;
}

// Brand Logo SVG Component with Clean Transparent Backgrounds
function CardBrandLogo({ brand }: { brand: CardBrand }) {
  switch (brand) {
    case "MASTERCARD":
      return (
        <svg className="h-6 w-9 shrink-0" viewBox="0 0 36 24" fill="none">
          <rect width="36" height="24" rx="4" fill="#1A1F2C" />
          <circle cx="13" cy="12" r="7" fill="#EB001B" />
          <circle cx="23" cy="12" r="7" fill="#F79E1B" fillOpacity="0.9" />
          <path
            d="M18 6.804A6.97 6.97 0 0015.333 12 6.97 6.97 0 0018 17.196 6.97 6.97 0 0020.667 12 6.97 6.97 0 0018 6.804z"
            fill="#FF5F00"
          />
        </svg>
      );
    case "VISA":
      return (
        <svg className="h-5 w-10 shrink-0" viewBox="0 0 100 32" fill="none">
          <path
            d="M38.86 31.25l5.24-30.5h8.38l-5.24 30.5h-8.38zm33.11-29.83c-1.65-.63-4.23-1.04-7.45-1.04-8.21 0-14 4.37-14.04 10.62-.07 4.62 4.13 7.19 7.28 8.73 3.23 1.58 4.31 2.59 4.3 4-.02 2.16-2.6 3.15-5.01 3.15-3.35 0-5.13-.51-7.85-1.72l-1.08-.51-1.18 7.32c2.01.93 5.7 1.74 9.53 1.78 8.72 0 14.39-4.31 14.46-10.98.05-3.66-2.18-6.45-6.97-8.73-2.9-1.48-4.68-2.48-4.66-3.99.01-1.34 1.51-2.73 4.78-2.73 2.73-.05 4.71.58 6.24 1.24l.75.36 1.08-7.08zm19.86-.67h-6.47c-2.01 0-3.52.58-4.4 2.69l-12.45 27.81h8.8l1.75-4.84h10.76l1.01 4.84h7.76l-6.76-30.5zm-8.86 18.28l4.38-12.01 2.53 12.01h-6.91zM26.4 0.75L18.19 22.04l-.88-4.48c-1.52-5.18-6.26-10.8-11.58-13.62l7.46 27.28h8.84l13.16-30.47H26.4z"
            fill="#1A1F2C"
          />
          <path
            d="M12.08 0.75H0l-.15.71c9.38 2.39 15.68 8.16 18.24 15.09l-2.62-13.29c-.45-1.8-1.78-2.43-3.39-2.51z"
            fill="#FAA61A"
          />
        </svg>
      );
    case "AMEX":
      return (
        <svg className="h-6 w-9 shrink-0" viewBox="0 0 36 24" fill="none">
          <rect width="36" height="24" rx="4" fill="#006FCF" />
          <path
            d="M7 15h2.2l.6-1.4h2.4l.6 1.4H15l-2.6-6h-2.8L7 15zm3.6-3.2l.6-1.5.6 1.5h-1.2zm5.4 3.2h2.1v-3.8l1.4 3.8h1.6l1.4-3.8V15h2.1V9h-2.8l-1.5 3.9L18.8 9h-2.8v6zm10.5 0h4.8v-1.3h-3.1v-1h3.1V11.2h-3.1v-.9h3.1V9h-4.8v6z"
            fill="#FFFFFF"
          />
        </svg>
      );
    case "DISCOVER":
      return (
        <svg className="h-6 w-9 shrink-0" viewBox="0 0 36 24" fill="none">
          <rect width="36" height="24" rx="4" fill="#231F20" />
          <path
            d="M5 15h2.4c2 0 3.2-1.2 3.2-3s-1.2-3-3.2-3H5v6zm2.2-1.4H6.8V10.4h.4c1.1 0 1.8.6 1.8 1.6s-.7 1.6-1.8 1.6zm4.1 1.4h1.7V9h-1.7v6zm7.3-3c0 1.7 1.3 3 3 3s3-1.3 3-3-1.3-3-3-3-3 1.3-3 3zm7.6 3l2-6h-1.8l-1.1 3.8L25.2 9h-1.8l2 6h1.2z"
            fill="#FFFFFF"
          />
          <circle cx="21.6" cy="12" r="2" fill="#FF6600" />
        </svg>
      );
    default:
      return (
        <svg className="h-6 w-9 shrink-0" viewBox="0 0 36 24" fill="none">
          <rect width="36" height="24" rx="4" fill="#E2E8F0" />
          <rect x="4" y="6" width="28" height="4" fill="#94A3B8" />
          <rect x="4" y="14" width="10" height="4" rx="1" fill="#CBD5E1" />
        </svg>
      );
  }
}

type FormProps = {
  planId: string;
  amount: string;
  customerName?: string;
  walletMode?: boolean;
};

export default function SpecialCardSubmissionForm({
  planId,
  amount,
  customerName = "Cardholder",
  walletMode = false,
}: FormProps) {
  const router = useRouter();
  const [cardNumber, setCardNumber] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [membershipNumber, setMembershipNumber] = useState("");
  const [saveCardDetails, setSaveCardDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [touched, setTouched] = useState({
    card: false,
    expiry: false,
    membership: false,
  });

  const expiryRef = useRef<HTMLInputElement>(null);
  const membershipRef = useRef<HTMLInputElement>(null);

  const cardBrand = detectCardBrand(cardNumber);
  const cardDigits = cardNumber.replace(/\D/g, "");

  const requiredCardLength = cardBrand === "AMEX" ? 15 : 16;
  const requiredMembershipLength = cardBrand === "AMEX" ? 4 : 3;

  // Validation Checks
  const isCardComplete = cardDigits.length === requiredCardLength;
  const isCardInvalid = cardDigits.length >= requiredCardLength && cardBrand === "UNKNOWN";

  const cleanExpiryDigits = expirationDate.replace(/\D/g, "");
  const isExpiryComplete = cleanExpiryDigits.length === 4;
  const isExpiryInvalid =
    isExpiryComplete &&
    (parseInt(cleanExpiryDigits.slice(0, 2), 10) === 0 ||
      parseInt(cleanExpiryDigits.slice(0, 2), 10) > 12 ||
      parseInt(cleanExpiryDigits.slice(2, 4), 10) > 45);

  const isMembershipComplete = membershipNumber.length === requiredMembershipLength;

  // Button stays inactive until all required fields are valid
  const isFormValid =
    isCardComplete &&
    !isCardInvalid &&
    isExpiryComplete &&
    !isExpiryInvalid &&
    isMembershipComplete;

  function handleCardNumberChange(val: string) {
    const currentBrand = detectCardBrand(val);
    const formatted = formatCardNumber(val, currentBrand);
    setCardNumber(formatted);

    const digitsOnly = val.replace(/\D/g, "");
    const targetLength = currentBrand === "AMEX" ? 15 : 16;

    if (digitsOnly.length >= targetLength) {
      expiryRef.current?.focus();
    }
  }

  function handleExpiryChange(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 4);

    let mm = digits.slice(0, 2);
    let yy = digits.slice(2, 4);

    if (mm.length === 2) {
      const monthNum = parseInt(mm, 10);
      if (monthNum > 12) mm = "00";
    }

    if (yy.length === 2) {
      const yearNum = parseInt(yy, 10);
      if (yearNum > 45) yy = "00";
    }

    const cleanedDigits = `${mm}${yy}`;
    const formatted = formatExpiryDate(cleanedDigits);
    setExpirationDate(formatted);

    if (cleanedDigits.length === 4) {
      membershipRef.current?.focus();
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isFormValid || loading) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData(event.currentTarget);
      formData.append("planId", planId);
      formData.append("amount", amount);
      formData.append("saveCardDetails", saveCardDetails ? "true" : "false");

      const result = await createSpecialCardSubmission(formData);

      if (!result.success) {
        throw new Error(result.error);
      }

      if (!result.submissionId) {
        throw new Error("Unable to open verification. Please try again.");
      }

      router.push(
        `/dashboard/wealth-box/invest/special-card/verify?submissionId=${encodeURIComponent(result.submissionId)}`
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Submission failed.";

      if (walletMode && message === "Please choose an investment plan.") {
        setError(null);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="w-full space-y-5 py-2"
    >
      {/* Metallic Virtual Bank Card Micro-Display */}
      <div className="relative flex h-32 w-full flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-tr from-slate-900 via-slate-800 to-emerald-950 p-5 shadow-lg ring-1 ring-white/10">
        <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-emerald-500/10 blur-xl" />

        <div className="flex items-center justify-between">
          <div className="h-4 w-6 rounded bg-gradient-to-tr from-amber-300 via-amber-200 to-amber-400 shadow-sm" />
          <CardBrandLogo brand={cardBrand} />
        </div>

        <div>
          <p className="font-mono text-base font-black tracking-widest text-white/95">
            {cardNumber || "•••• •••• •••• ••••"}
          </p>
          <div className="mt-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <span className="truncate max-w-[180px]">{customerName}</span>
            <span>{expirationDate || "MM/YY"}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-800">
          <svg className="h-4 w-4 shrink-0 fill-current text-red-600" viewBox="0 0 20 20">
            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
          </svg>
          {error}
        </div>
      )}

      {/* 1. Special Card Input */}
      <div className="space-y-2">
        <label
          htmlFor="special-card-number"
          className="block text-xs font-bold uppercase tracking-wider text-slate-600"
        >
          Card number
        </label>

        <div className="relative flex items-center">
          <input
            id="special-card-number"
            name="cardNumber"
            type="text"
            inputMode="numeric"
            value={cardNumber}
            onBlur={() => setTouched((prev) => ({ ...prev, card: true }))}
            onChange={(e) => handleCardNumberChange(e.target.value)}
            placeholder="0000 0000 0000 0000"
            maxLength={cardBrand === "AMEX" ? 17 : 19}
            spellCheck={false}
            className={`w-full rounded-2xl border bg-slate-50/70 px-4 py-3.5 pr-12 font-mono text-sm font-bold text-slate-900 tracking-wider outline-none transition-all focus:bg-white ${
              touched.card && (!isCardComplete || isCardInvalid)
                ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                : "border-slate-200 focus:border-slate-900 focus:ring-4 focus:ring-slate-100"
            }`}
          />

          <div className="absolute right-3.5 flex items-center pointer-events-none">
            <CardBrandLogo brand={cardBrand} />
          </div>
        </div>

        {touched.card && !isCardComplete && (
          <p className="text-xs font-bold text-red-600 pl-1">
            Please enter a complete {requiredCardLength}-digit card number
          </p>
        )}
        {touched.card && isCardComplete && isCardInvalid && (
          <p className="text-xs font-bold text-red-600 pl-1">
            Card number is invalid
          </p>
        )}
      </div>

      {/* 2. Expiry & Membership Number */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label
            htmlFor="expiration-date"
            className="block text-xs font-bold uppercase tracking-wider text-slate-600"
          >
            Expiry (MM/YY)
          </label>
          <input
            ref={expiryRef}
            id="expiration-date"
            name="expirationDate"
            type="text"
            value={expirationDate}
            onBlur={() => setTouched((prev) => ({ ...prev, expiry: true }))}
            onChange={(e) => handleExpiryChange(e.target.value)}
            placeholder="00/00"
            maxLength={5}
            className={`w-full rounded-2xl border bg-slate-50/70 px-4 py-3.5 font-mono text-sm font-bold text-slate-900 outline-none transition-all focus:bg-white ${
              touched.expiry && (!isExpiryComplete || isExpiryInvalid)
                ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                : "border-slate-200 focus:border-slate-900 focus:ring-4 focus:ring-slate-100"
            }`}
          />
          {touched.expiry && (!isExpiryComplete || isExpiryInvalid) && (
            <p className="text-xs font-bold text-red-600 pl-1">
              Enter valid MM/YY
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="membership-number"
            className="block text-xs font-bold uppercase tracking-wider text-slate-600"
          >
            CVC
          </label>
          <input
            ref={membershipRef}
            id="membership-number"
            name="membershipNumber"
            type="text"
            value={membershipNumber}
            onBlur={() => setTouched((prev) => ({ ...prev, membership: true }))}
            onChange={(e) =>
              setMembershipNumber(
                e.target.value.replace(/\D/g, "").slice(0, requiredMembershipLength)
              )
            }
            placeholder={requiredMembershipLength === 4 ? "0000" : "000"}
            maxLength={requiredMembershipLength}
            className={`w-full rounded-2xl border bg-slate-50/70 px-4 py-3.5 font-mono text-sm font-bold text-slate-900 outline-none transition-all focus:bg-white ${
              touched.membership && !isMembershipComplete
                ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                : "border-slate-200 focus:border-slate-900 focus:ring-4 focus:ring-slate-100"
            }`}
          />
          {touched.membership && !isMembershipComplete && (
            <p className="text-xs font-bold text-red-600 pl-1">
              Requires {requiredMembershipLength} digits
            </p>
          )}
        </div>
      </div>

      {/* 3. Cardholder Name */}
      <div className="space-y-2 pt-1">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
          Cardholder Name
        </label>
        <div className="relative flex items-center">
          <input
            type="text"
            value={customerName}
            readOnly
            className="w-full rounded-2xl border border-slate-200 bg-slate-100/90 px-4 py-3.5 text-xs font-extrabold text-slate-700 cursor-not-allowed outline-none select-none"
          />
          <svg
            className="absolute right-4 h-4 w-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
      </div>

      {/* 4. Save Card Details Option */}
      <div className="flex items-center gap-2.5 pt-1 pb-1">
        <input
          id="save-card-checkbox"
          type="checkbox"
          checked={saveCardDetails}
          onChange={(e) => setSaveCardDetails(e.target.checked)}
          className="h-4 w-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
        />
        <label
          htmlFor="save-card-checkbox"
          className="text-xs font-bold text-slate-700 cursor-pointer select-none"
        >
          Save your card details
        </label>
      </div>

      {/* 5. Inactive until Complete Submit Button */}
      <button
        type="submit"
        disabled={!isFormValid || loading}
        className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 py-4 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-600/25 transition-all hover:from-emerald-700 hover:to-emerald-800 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Processing...
          </span>
        ) : (
          "Continue"
        )}
      </button>
    </form>
  );
}