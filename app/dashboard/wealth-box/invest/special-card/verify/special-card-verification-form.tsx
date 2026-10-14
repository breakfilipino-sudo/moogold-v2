
"use client";

import {
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { verifySpecialCardSubmission } from "@/app/dashboard/wealth-box/actions";

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

  const code = digits.join("");

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

    if (isSubmitting || submittedForReview) return;

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

  if (submittedForReview) {
    return (
      <div
        role="status"
        className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center"
      >
        <CheckCircle2 className="mx-auto mb-3 h-9 w-9 text-emerald-700" />

        <h2 className="text-base font-semibold text-[#173b2f]">
          Verification submitted
        </h2>

        <p className="mt-2 text-sm leading-6 text-[#53665e]">
          Your verification attempt has been submitted for manual review.
          Please check back for the outcome. Your funding will not be created
          until an authorized admin approves your verification.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-3 block text-sm font-medium text-[#53665e]">
          Six-digit code
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
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#176b4d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#12583f] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Submitting..." : "Submit for review"}
        {!isSubmitting ? <ArrowRight className="h-4 w-4" /> : null}
      </button>
    </form>
  );
}
