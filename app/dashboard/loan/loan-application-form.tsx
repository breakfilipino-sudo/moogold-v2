"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  submitRegularLoan,
  type LoanActionState,
} from "./actions";

const initialState: LoanActionState = {
  success: false,
  message: "",
};

type Props = {
  currency: string;
  currencySymbol: string;
  countryCode: string;
};

type LoanType = "PERSONAL" | "BUSINESS";
type IdOption = { value: string; label: string };

const idOptionsByCountry: Record<string, IdOption[]> = {
  NG: [
    { value: "NATIONAL_ID", label: "National Identification Number (NIN)" },
    { value: "PASSPORT", label: "International Passport" },
    { value: "DRIVERS_LICENSE", label: "Driver's Licence" },
    { value: "RESIDENCE_PERMIT", label: "Residence Permit" },
  ],
  PH: [
    { value: "NATIONAL_ID", label: "Philippine National ID (PhilSys)" },
    { value: "PASSPORT", label: "Philippine Passport" },
    { value: "DRIVERS_LICENSE", label: "Driver's Licence" },
    { value: "RESIDENCE_PERMIT", label: "Residence Permit" },
  ],
  SG: [
    { value: "NATIONAL_ID", label: "NRIC / FIN" },
    { value: "PASSPORT", label: "Passport" },
    { value: "DRIVERS_LICENSE", label: "Driving Licence" },
    { value: "RESIDENCE_PERMIT", label: "Residence Permit" },
  ],
  MY: [
    { value: "NATIONAL_ID", label: "MyKad / MyPR" },
    { value: "PASSPORT", label: "Passport" },
    { value: "DRIVERS_LICENSE", label: "Driving Licence" },
    { value: "RESIDENCE_PERMIT", label: "Residence Permit" },
  ],
  KE: [
    { value: "NATIONAL_ID", label: "Kenyan National ID" },
    { value: "PASSPORT", label: "Passport" },
    { value: "DRIVERS_LICENSE", label: "Driving Licence" },
    { value: "RESIDENCE_PERMIT", label: "Residence Permit / Alien ID" },
  ],
  GH: [
    { value: "NATIONAL_ID", label: "Ghana Card" },
    { value: "PASSPORT", label: "Passport" },
    { value: "DRIVERS_LICENSE", label: "Driver's Licence" },
    { value: "RESIDENCE_PERMIT", label: "Residence Permit" },
  ],
  ZA: [
    { value: "NATIONAL_ID", label: "South African ID" },
    { value: "PASSPORT", label: "Passport" },
    { value: "DRIVERS_LICENSE", label: "Driving Licence" },
    { value: "RESIDENCE_PERMIT", label: "Residence Permit" },
  ],
  GB: [
    { value: "PASSPORT", label: "Passport" },
    { value: "DRIVERS_LICENSE", label: "UK Driving Licence" },
    { value: "RESIDENCE_PERMIT", label: "Biometric Residence Permit" },
  ],
  US: [
    { value: "STATE_ID", label: "State-issued ID" },
    { value: "PASSPORT", label: "Passport" },
    { value: "DRIVERS_LICENSE", label: "Driver's Licence" },
    { value: "PERMANENT_RESIDENT_CARD", label: "Permanent Resident Card" },
  ],
  CA: [
    { value: "PROVINCIAL_ID", label: "Provincial / Territorial ID" },
    { value: "PASSPORT", label: "Passport" },
    { value: "DRIVERS_LICENSE", label: "Driver's Licence" },
    { value: "PERMANENT_RESIDENT_CARD", label: "Permanent Resident Card" },
  ],
  IN: [
    { value: "NATIONAL_ID", label: "Aadhaar Card" },
    { value: "PASSPORT", label: "Passport" },
    { value: "DRIVERS_LICENSE", label: "Driving Licence" },
    { value: "RESIDENCE_PERMIT", label: "Residence Permit" },
  ],
  CN: [
    { value: "NATIONAL_ID", label: "Resident Identity Card" },
    { value: "PASSPORT", label: "Passport" },
    { value: "RESIDENCE_PERMIT", label: "Residence Permit" },
  ],
  AE: [
    { value: "EMIRATES_ID", label: "Emirates ID" },
    { value: "PASSPORT", label: "Passport" },
    { value: "DRIVERS_LICENSE", label: "Driving Licence" },
    { value: "RESIDENCE_PERMIT", label: "Residence Visa / Permit" },
  ],
  BR: [
    { value: "NATIONAL_ID", label: "Brazilian Identity Card (RG)" },
    { value: "PASSPORT", label: "Passport" },
    { value: "DRIVERS_LICENSE", label: "CNH Driving Licence" },
    { value: "RESIDENCE_PERMIT", label: "Residence Permit" },
  ],
  VN: [
    { value: "NATIONAL_ID", label: "Citizen Identity Card" },
    { value: "PASSPORT", label: "Passport" },
    { value: "DRIVERS_LICENSE", label: "Driving Licence" },
    { value: "RESIDENCE_PERMIT", label: "Residence Card" },
  ],
  TR: [
    { value: "NATIONAL_ID", label: "Turkish Identity Card" },
    { value: "PASSPORT", label: "Passport" },
    { value: "DRIVERS_LICENSE", label: "Driving Licence" },
    { value: "RESIDENCE_PERMIT", label: "Residence Permit" },
  ],
};

const loanLimits: Record<LoanType, { minimum: number; maximum: number }> = {
  PERSONAL: { minimum: 1000, maximum: 10_000_000 },
  BUSINESS: { minimum: 50_000, maximum: 150_000_000 },
};

const interestRates: Record<number, number> = {
  3: 1,
  6: 4,
  12: 5,
};

function formatAmount(value: number, currency: string) {
  return `${currency} ${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDueDate(baseDate: Date, months: number) {
  const dueDate = new Date(baseDate);
  const originalDay = dueDate.getDate();

  dueDate.setDate(1);
  dueDate.setMonth(dueDate.getMonth() + months);

  const lastDay = new Date(
    dueDate.getFullYear(),
    dueDate.getMonth() + 1,
    0,
  ).getDate();

  dueDate.setDate(Math.min(originalDay, lastDay));

  return dueDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
function formatAmountInput(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  const normalized = dot < 0
    ? cleaned
    : cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, "").slice(0, 2);
  const [integerPart = "", decimalPart] = normalized.split(".");
  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decimalPart === undefined ? grouped : `${grouped}.${decimalPart}`;
}

export default function LoanApplicationForm({
  currency,
  currencySymbol,
  countryCode,
}: Props) {
  const [state, action, pending] = useActionState(
    submitRegularLoan,
    initialState,
  );
  const [progressSeconds, setProgressSeconds] = useState(0);

  useEffect(() => {
    if (!pending) return;

    const interval = window.setInterval(() => {
      setProgressSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [pending]);
  const [loanType, setLoanType] = useState<LoanType>("PERSONAL");
  const [amountText, setAmountText] = useState("");
  const idOptions = idOptionsByCountry[countryCode.toUpperCase()] ?? [
    { value: "PASSPORT", label: "Passport" },
    { value: "DRIVERS_LICENSE", label: "Driver's Licence" },
    { value: "RESIDENCE_PERMIT", label: "Residence Permit" },
  ];
  const [documentType, setDocumentType] = useState("");
  const [termMonths, setTermMonths] = useState(3);
  const [today] = useState(() => new Date());
  const [amountTouched, setAmountTouched] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const selfieInputRef = useRef<HTMLInputElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState("");

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      void videoRef.current.play().catch(() => {
        setCameraError("Please allow camera access and try again.");
      });
    }

    return () => {
      cameraStream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      if (selfiePreview) URL.revokeObjectURL(selfiePreview);
    };
  }, [selfiePreview]);

  async function startSelfieCamera() {
    setCameraError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera capture is not available in this browser. Please use a supported browser on a secure connection.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      setCameraStream(stream);
    } catch {
      setCameraError("We could not access your camera. Allow camera permission in your browser settings and try again.");
    }
  }

  function captureSelfie() {
    const video = videoRef.current;

    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError("Your camera is not ready yet. Please wait a moment and try again.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("We could not capture your selfie. Please try again.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError("We could not capture your selfie. Please try again.");
        return;
      }

      const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
      const transfer = new DataTransfer();
      transfer.items.add(file);

      if (selfieInputRef.current) {
        selfieInputRef.current.files = transfer.files;
      }

      setSelfieFile(file);
      setSelfiePreview(URL.createObjectURL(blob));
      setCameraError("");
      setCameraStream(null);
    }, "image/jpeg", 0.9);
  }

  function retakeSelfie() {
    if (selfiePreview) URL.revokeObjectURL(selfiePreview);
    setSelfiePreview(null);
    setSelfieFile(null);
    setCameraError("");

    if (selfieInputRef.current) {
      selfieInputRef.current.value = "";
    }
  }

  const amount = Number(amountText.replace(/,/g, ""));
  const limits = loanLimits[loanType];
  const hasAmount = amountText.trim() !== "";
  const amountIsNumeric = hasAmount && Number.isFinite(amount);
  const amountIsValid =
    amountIsNumeric && amount >= limits.minimum && amount <= limits.maximum;

  const amountError = !amountTouched || !hasAmount
    ? ""
    : !amountIsNumeric
      ? "Enter a valid numeric amount."
      : amount < limits.minimum
        ? `The minimum ${loanType === "PERSONAL" ? "personal" : "business"} loan is ${formatAmount(limits.minimum, currency)}.`
        : amount > limits.maximum
          ? `The maximum ${loanType === "PERSONAL" ? "personal" : "business"} loan is ${formatAmount(limits.maximum, currency)}.`
          : "";

  const rate = interestRates[termMonths];
  const estimatedRepayment = amountIsValid
    ? Math.round(amount * (1 + rate / 100) * 100) / 100
    : null;

  return (
    <>
      <form
        action={action}
        onSubmit={() => setProgressSeconds(0)}
        className="space-y-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
      >
        <div>
          <p className="mb-2 block text-sm font-semibold text-slate-900">
            Choose loan type
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              aria-pressed={loanType === "PERSONAL"}
              onClick={() => {
                setLoanType("PERSONAL");
                setAmountTouched(amountText.trim() !== "");
              }}
              className={`rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 ${
                loanType === "PERSONAL"
                  ? "border-emerald-800 bg-emerald-50 ring-1 ring-emerald-800"
                  : "border-slate-200 bg-white hover:border-emerald-300"
              }`}
            >
              <span className="block font-semibold text-slate-900">
                Personal Loan
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-600">
                {formatAmount(1000, currency)} - {formatAmount(10_000_000, currency)}
              </span>
            </button>

            <button
              type="button"
              aria-pressed={loanType === "BUSINESS"}
              onClick={() => {
                setLoanType("BUSINESS");
                setAmountTouched(amountText.trim() !== "");
              }}
              className={`rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 ${
                loanType === "BUSINESS"
                  ? "border-emerald-800 bg-emerald-50 ring-1 ring-emerald-800"
                  : "border-slate-200 bg-white hover:border-emerald-300"
              }`}
            >
              <span className="block font-semibold text-slate-900">
                Business Loan
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-600">
                {formatAmount(50_000, currency)} - {formatAmount(150_000_000, currency)}
              </span>
            </button>
          </div>
          <input type="hidden" name="loanType" value={loanType} />
        </div>

        <div>
          <label
            htmlFor="amount"
            className="mb-2 block text-sm font-semibold text-slate-900"
          >
            Loan amount ({currency})
          </label>
          <div className={`flex h-12 items-center rounded-xl border bg-slate-50 transition focus-within:ring-2 ${
            amountError
              ? "border-red-400 focus-within:border-red-500 focus-within:ring-red-500/15"
              : "border-slate-200 focus-within:border-emerald-700 focus-within:ring-emerald-700/15"
          }`}>
            <span className="pl-3 text-slate-600">{currencySymbol}</span>
            <input
              id="amount"
              name="amount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              required
              value={amountText}
              onChange={(event) => {
                setAmountText(formatAmountInput(event.target.value));
                setAmountTouched(true);
              }}
              onBlur={() => setAmountTouched(true)}
              placeholder="Enter amount"
              aria-invalid={Boolean(amountError)}
              aria-describedby={amountError ? "amount-error" : "amount-help"}
              className="h-full w-full min-w-0 bg-transparent px-3 text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
          {amountError ? (
            <p id="amount-error" role="alert" className="mt-2 text-sm text-red-600">
              {amountError}
            </p>
          ) : (
            <p id="amount-help" className="mt-2 text-xs leading-5 text-slate-500">
              Enter an amount between {formatAmount(limits.minimum, currency)} and {formatAmount(limits.maximum, currency)}.
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="termMonths"
            className="mb-2 block text-sm font-semibold text-slate-900"
          >
            Repayment term
          </label>
          <select
            id="termMonths"
            name="termMonths"
            required
            value={String(termMonths)}
            onChange={(event) => setTermMonths(Number(event.target.value))}
            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
          >
            <option value="3">3 months</option>
            <option value="6">6 months</option>
            <option value="12">1 year</option>
          </select>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-900">
            Total repayment
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-emerald-950">
            {estimatedRepayment === null ? "—" : formatAmount(estimatedRepayment, currency)}
          </p>
          <p className="mt-2 text-sm text-emerald-900">
            <span className="font-medium">Estimated due date: </span>
            {formatDueDate(today, termMonths)}
          </p>
        </div>

        <div>
          {loanType === "PERSONAL" ? (
            <>
              <label
                htmlFor="documentType"
                className="mb-2 block text-sm font-semibold text-slate-900"
              >
                ID type
              </label>
              <select
                id="documentType"
                name="documentType"
                required
                value={documentType}
                onChange={(event) => setDocumentType(event.target.value)}
                className="mb-3 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
              >
                <option value="">Select your ID type</option>
                {idOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </>
          ) : (
            <input type="hidden" name="documentType" value="BUSINESS_REGISTRATION" />
          )}
          <label
            htmlFor="document"
            className="mb-2 block text-sm font-semibold text-slate-900"
          >
            {loanType === "PERSONAL"
              ? `Upload ${idOptions.find((option) => option.value === documentType)?.label ?? "ID"}`
              : "Business registration certificate"}
          </label>
          <input
            id="document"
            name="document"
            type="file"
            required
            disabled={loanType === "PERSONAL" && !documentType}
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
            className="block w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 transition file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-900 file:px-3 file:py-2 file:font-semibold file:text-white hover:file:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <p className="mt-2 text-xs leading-5 text-slate-500">
            PDF, JPEG, PNG, or WEBP; maximum 10 MB. Your document is stored privately.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-900">Take a selfie</h3>
          <p className="mt-1 text-sm leading-5 text-slate-600">
            Use your device camera to take a clear selfie. You can preview it and retake it before submitting your application.
          </p>

          <input
            ref={selfieInputRef}
            type="file"
            name="selfie"
            accept="image/jpeg"
            required
            tabIndex={-1}
            aria-hidden="true"
            className="hidden"
          />

          {selfiePreview ? (
            <div className="mt-4">
              <img
                src={selfiePreview}
                alt="Preview of your captured selfie"
                className="mx-auto max-h-72 rounded-xl border border-slate-200 object-contain"
              />
              <p className="mt-2 text-center text-sm font-medium text-emerald-800">
                Selfie captured
              </p>
              <button
                type="button"
                onClick={() => {
                  retakeSelfie();
                  void startSelfieCamera();
                }}
                className="mt-3 w-full rounded-xl border border-emerald-800 px-4 py-2.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-50"
              >
                Retake selfie
              </button>
            </div>
          ) : cameraStream ? (
            <div className="mt-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="mx-auto max-h-72 w-full rounded-xl bg-slate-950 object-contain"
              />
              <button
                type="button"
                onClick={captureSelfie}
                className="mt-3 w-full rounded-xl bg-emerald-800 px-4 py-3 font-semibold text-white hover:bg-emerald-900"
              >
                Capture selfie
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void startSelfieCamera()}
              className="mt-4 w-full rounded-xl border border-emerald-800 px-4 py-3 font-semibold text-emerald-900 hover:bg-emerald-50"
            >
              Open camera
            </button>
          )}

          {cameraError && (
            <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {cameraError}
            </p>
          )}
        </div>

        {state.message && (
          <p
            role="status"
            className={`rounded-xl p-3 text-sm ${
              state.success
                ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || !amountIsValid || (loanType === "PERSONAL" && !documentType) || !selfieFile}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-900 px-4 font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Submitting application...
            </>
          ) : (
            "Get Loan"
          )}
        </button>
      </form>

      {pending && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="loan-progress-title"
          aria-describedby="loan-progress-description"
        >
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-emerald-200 border-t-emerald-800" />
            </div>
            <h2 id="loan-progress-title" className="mt-5 text-lg font-semibold text-slate-950">
              Your application is in progress
            </h2>
            <p id="loan-progress-description" aria-live="polite" className="mt-2 text-sm leading-6 text-slate-600">
              {progressSeconds < 30
                ? "Calculating your qualified loan..."
                : "We are reviewing your loan application. Please wait..."}
            </p>
            {progressSeconds >= 30 && (
              <p className="mt-3 text-sm font-semibold text-emerald-800">
                Review check {Math.min(progressSeconds - 29, 10)} of 10
              </p>
            )}
            <p className="mt-3 text-xs text-slate-500">
              Please keep this page open while we process your request.
            </p>
          </div>
        </div>
      )}
    </>
  );
}