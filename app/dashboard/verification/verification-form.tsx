"use client";

import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  FileCheck2,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { submitVerification } from "./actions";

type ActionResult =
  | { success: true; message: string }
  | { success: false; error: string };

type VerificationDocument = {
  id: string;
  type:
    | "NATIONAL_ID"
    | "PASSPORT"
    | "DRIVERS_LICENSE"
    | "RESIDENCE_PERMIT"
    | "SELFIE"
    | "OTHER";
  status: "PENDING" | "APPROVED" | "REJECTED";
};

type VerificationFormProps = {
  fullName: string;
  phone: string;
  registeredCountry: string;
  currentTier: string;
  dateOfBirth: Date | null;
  countryCode: string | null;
  documents: VerificationDocument[];
  isAlreadyVerified: boolean;
  isUnderReview: boolean;
};

const initialState: ActionResult = {
  success: false,
  error: "",
};

function getCountryName(code: string) {
  if (!code) return "Not provided";

  try {
    return (
      new Intl.DisplayNames(["en"], {
        type: "region",
      }).of(code.toUpperCase()) || code.toUpperCase()
    );
  } catch {
    return code.toUpperCase();
  }
}

function getInitialDate(date: Date | null) {
  if (!date) {
    return {
      day: "",
      month: "",
      year: "",
    };
  }

  return {
    day: String(date.getUTCDate()),
    month: String(date.getUTCMonth() + 1),
    year: String(date.getUTCFullYear()),
  };
}

const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const CURRENT_YEAR = new Date().getFullYear();

const YEARS = Array.from(
  { length: 101 },
  (_, index) => CURRENT_YEAR - index,
);

const DAYS = Array.from({ length: 31 }, (_, index) => index + 1);

export default function VerificationForm({
  fullName,
  phone,
  registeredCountry,
  currentTier,
  dateOfBirth,
  countryCode,
  documents,
  isAlreadyVerified,
  isUnderReview,
}: VerificationFormProps) {
  const router = useRouter();

  const idVideoRef = useRef<HTMLVideoElement>(null);
  const selfieVideoRef = useRef<HTMLVideoElement>(null);

  const idStreamRef = useRef<MediaStream | null>(null);
  const selfieStreamRef = useRef<MediaStream | null>(null);

  const initialDate = getInitialDate(dateOfBirth);

  const [idCameraOpen, setIdCameraOpen] = useState(false);
  const [identityFile, setIdentityFile] = useState<File | null>(null);
  const [idCameraError, setIdCameraError] = useState("");

  const [selfieCameraOpen, setSelfieCameraOpen] = useState(false);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfieCameraError, setSelfieCameraError] = useState("");

  const [day, setDay] = useState(initialDate.day);
  const [month, setMonth] = useState(initialDate.month);
  const [year, setYear] = useState(initialDate.year);

  const [state, action, pending] = useActionState(
    submitVerification,
    initialState,
  );

  const displayCountry =
    countryCode || registeredCountry || "";

  useEffect(() => {
    return () => {
      idStreamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });

      selfieStreamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
    };
  }, []);

  function getCameraErrorMessage() {
    return "Camera access is required to capture your document.";
  }

  async function startIdCamera() {
    setIdCameraError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setIdCameraError(
        "Live camera verification is not supported by this browser.",
      );
      return;
    }

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

      idStreamRef.current = stream;
      setIdCameraOpen(true);

      requestAnimationFrame(() => {
        if (idVideoRef.current) {
          idVideoRef.current.srcObject = stream;
          void idVideoRef.current.play();
        }
      });
    } catch {
      try {
        const fallbackStream =
          await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "user",
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });

        idStreamRef.current = fallbackStream;
        setIdCameraOpen(true);

        requestAnimationFrame(() => {
          if (idVideoRef.current) {
            idVideoRef.current.srcObject = fallbackStream;
            void idVideoRef.current.play();
          }
        });
      } catch {
        setIdCameraError(getCameraErrorMessage());
      }
    }
  }

  function stopIdCamera() {
    idStreamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    idStreamRef.current = null;
    setIdCameraOpen(false);
  }

  function captureIdentityDocument() {
    const video = idVideoRef.current;

    if (!video || video.videoWidth === 0) {
      setIdCameraError("The camera is not ready yet.");
      return;
    }

    const canvas = document.createElement("canvas");

    const maxWidth = 1600;
    const scale = Math.min(
      1,
      maxWidth / video.videoWidth,
    );

    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);

    const context = canvas.getContext("2d");

    if (!context) {
      setIdCameraError("Unable to capture the document.");
      return;
    }

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setIdCameraError("Unable to capture the document.");
          return;
        }

        const file = new File(
          [blob],
          `live-id-${Date.now()}.jpg`,
          {
            type: "image/jpeg",
          },
        );

        setIdentityFile(file);
        stopIdCamera();
        setIdCameraError("");
      },
      "image/jpeg",
      0.92,
    );
  }

  function retakeIdentityDocument() {
    setIdentityFile(null);
    setIdCameraError("");
    void startIdCamera();
  }

  async function startSelfieCamera() {
    setSelfieCameraError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setSelfieCameraError(
        "Live camera verification is not supported by this browser.",
      );
      return;
    }

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 720 },
            height: { ideal: 720 },
          },
          audio: false,
        });

      selfieStreamRef.current = stream;
      setSelfieCameraOpen(true);

      requestAnimationFrame(() => {
        if (selfieVideoRef.current) {
          selfieVideoRef.current.srcObject = stream;
          void selfieVideoRef.current.play();
        }
      });
    } catch {
      setSelfieCameraError(
        "Camera access is required to take your live selfie.",
      );
    }
  }

  function stopSelfieCamera() {
    selfieStreamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    selfieStreamRef.current = null;
    setSelfieCameraOpen(false);
  }

  function captureSelfie() {
    const video = selfieVideoRef.current;

    if (!video || video.videoWidth === 0) {
      setSelfieCameraError("The camera is not ready yet.");
      return;
    }

    const canvas = document.createElement("canvas");
    const size = Math.min(
      video.videoWidth,
      video.videoHeight,
    );

    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext("2d");

    if (!context) {
      setSelfieCameraError("Unable to capture the selfie.");
      return;
    }

    const sourceX = (video.videoWidth - size) / 2;
    const sourceY = (video.videoHeight - size) / 2;

    context.drawImage(
      video,
      sourceX,
      sourceY,
      size,
      size,
      0,
      0,
      size,
      size,
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setSelfieCameraError("Unable to capture the selfie.");
          return;
        }

        const file = new File(
          [blob],
          `live-selfie-${Date.now()}.jpg`,
          {
            type: "image/jpeg",
          },
        );

        setSelfieFile(file);
        stopSelfieCamera();
        setSelfieCameraError("");
      },
      "image/jpeg",
      0.9,
    );
  }

  function retakeSelfie() {
    setSelfieFile(null);
    setSelfieCameraError("");
    void startSelfieCamera();
  }

  function handleSubmit(formData: FormData) {
    if (!day || !month || !year) {
      return;
    }

    if (!identityFile) {
      setIdCameraError(
        "Please capture your government ID first.",
      );
      return;
    }

    if (!selfieFile) {
      setSelfieCameraError(
        "Please take your live selfie first.",
      );
      return;
    }

    formData.set(
      "dateOfBirth",
      `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
    );

    formData.delete("identityDocument");
    formData.append("identityDocument", identityFile);

    formData.delete("selfie");
    formData.append("selfie", selfieFile);

    startTransition(() => {
      action(formData);
    });
  }

  if (isAlreadyVerified) {
    return (
      <section className="rounded-[24px] border border-[#dfe8e3] bg-white p-6 shadow-[0_14px_40px_rgba(16,32,27,0.05)] sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf8f2] text-[#28704f]">
          <Check className="h-6 w-6" />
        </div>

        <h2 className="mt-5 text-xl font-black text-[#10201b]">
          Account already upgraded
        </h2>

        <p className="mt-2 text-sm text-[#708078]">
          Your current account level is{" "}
          <strong className="text-[#294238]">
            {currentTier.replace("TIER_", "Tier ")}
          </strong>
          .
        </p>

        <button
          type="button"
          onClick={() => router.push("/dashboard/profile")}
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-[#163b2d] px-5 text-sm font-bold text-white"
        >
          Back to profile
          <ArrowRight className="h-4 w-4" />
        </button>
      </section>
    );
  }

  if (isUnderReview) {
    return (
      <section className="rounded-[24px] border border-[#dfe8e3] bg-white p-6 shadow-[0_14px_40px_rgba(16,32,27,0.05)] sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f1f5f3] text-[#376e57]">
          <FileCheck2 className="h-6 w-6" />
        </div>

        <h2 className="mt-5 text-xl font-black text-[#10201b]">
          Verification in progress
        </h2>

        <p className="mt-2 text-sm leading-6 text-[#708078]">
          Your information has been submitted. We&apos;ll update
          your account when the review is complete.
        </p>

        <div className="mt-6 rounded-2xl border border-[#e1e9e4] bg-[#f8faf9] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#687870]">
              Current account
            </span>

            <span className="text-sm font-black text-[#10201b]">
              Tier 1
            </span>
          </div>

          <div className="my-3 h-px bg-[#e6ece8]" />

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#687870]">
              Status
            </span>

            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8a6a2c]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#c99b43]" />
              Under review
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push("/dashboard/profile")}
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl border border-[#d8e2dd] bg-white px-5 text-sm font-bold text-[#294238]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to profile
        </button>
      </section>
    );
  }

  return (
    <form action={handleSubmit}>
      <section className="overflow-hidden rounded-[24px] border border-[#dfe8e3] bg-white shadow-[0_14px_40px_rgba(16,32,27,0.05)]">
        <div className="border-b border-[#e7ede9] px-6 py-5 sm:px-7">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf5f0] text-[#376e57]">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-black tracking-tight text-[#10201b]">
                  Upgrade account
                </h2>

                <p className="text-xs text-[#708078]">
                  Tier 1&nbsp; → &nbsp;Tier 2
                </p>
              </div>
            </div>

            <div className="hidden rounded-full bg-[#edf7f1] px-3 py-1.5 text-[10px] font-black text-[#376e57] sm:block">
              Higher limits
            </div>
          </div>
        </div>

        <div className="px-6 py-6 sm:px-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-bold text-[#41554c]">
                Full Name
              </label>

              <input
                value={fullName}
                readOnly
                className="h-11 w-full rounded-xl border border-[#e0e8e4] bg-[#f7f9f8] px-4 text-sm font-semibold text-[#687870] outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold text-[#41554c]">
                Country
              </label>

              <div className="flex h-11 items-center rounded-xl border border-[#e0e8e4] bg-[#f7f9f8] px-4">
                <span className="text-sm font-semibold text-[#687870]">
                  {getCountryName(displayCountry)}
                </span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold text-[#41554c]">
                Mobile Number
              </label>

              <input
                value={phone || "Not provided"}
                readOnly
                className="h-11 w-full rounded-xl border border-[#e0e8e4] bg-[#f7f9f8] px-4 text-sm font-semibold text-[#687870] outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold text-[#41554c]">
                Date of Birth
              </label>

              <div className="grid grid-cols-[0.8fr_1.4fr_1fr] gap-2">
                <select
                  value={day}
                  onChange={(event) => setDay(event.target.value)}
                  required
                  aria-label="Day"
                  className="h-11 rounded-xl border border-[#d9e3de] bg-white px-3 text-sm font-semibold text-[#10201b] outline-none focus:border-[#5c9478] focus:ring-4 focus:ring-[#5c9478]/10"
                >
                  <option value="" disabled>
                    Day
                  </option>

                  {DAYS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>

                <select
                  value={month}
                  onChange={(event) =>
                    setMonth(event.target.value)
                  }
                  required
                  aria-label="Month"
                  className="h-11 rounded-xl border border-[#d9e3de] bg-white px-3 text-sm font-semibold text-[#10201b] outline-none focus:border-[#5c9478] focus:ring-4 focus:ring-[#5c9478]/10"
                >
                  <option value="" disabled>
                    Month
                  </option>

                  {MONTHS.map((item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                    </option>
                  ))}
                </select>

                <select
                  value={year}
                  onChange={(event) =>
                    setYear(event.target.value)
                  }
                  required
                  aria-label="Year"
                  className="h-11 rounded-xl border border-[#d9e3de] bg-white px-3 text-sm font-semibold text-[#10201b] outline-none focus:border-[#5c9478] focus:ring-4 focus:ring-[#5c9478]/10"
                >
                  <option value="" disabled>
                    Year
                  </option>

                  {YEARS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-[#e7ede9] pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Government ID */}
              <div className="rounded-2xl border border-[#dfe8e3] bg-[#fafcfb] p-4">
                <p className="text-xs font-bold text-[#41554c]">
                  Government ID
                </p>

                <select
                  name="documentType"
                  required
                  defaultValue=""
                  className="mt-3 h-10 w-full rounded-xl border border-[#d9e3de] bg-white px-3 text-xs font-semibold text-[#10201b] outline-none focus:border-[#5c9478]"
                >
                  <option value="" disabled>
                    Select ID type
                  </option>

                  <option value="NATIONAL_ID">
                    National ID
                  </option>

                  <option value="PASSPORT">
                    Passport
                  </option>

                  <option value="DRIVERS_LICENSE">
                    Driver&apos;s License
                  </option>

                  <option value="RESIDENCE_PERMIT">
                    Residence Permit
                  </option>
                </select>

                {!idCameraOpen && !identityFile ? (
                  <button
                    type="button"
                    onClick={() => void startIdCamera()}
                    className="mt-3 flex h-[122px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-[#cbd8d1] bg-white transition hover:border-[#6d9b83]"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#edf5f0] text-[#376e57]">
                      <Camera className="h-4 w-4" />
                    </span>

                    <span className="mt-2 text-xs font-bold text-[#294238]">
                      Capture ID with camera
                    </span>

                    <span className="mt-0.5 text-[10px] text-[#8a9891]">
                      Camera required
                    </span>
                  </button>
                ) : null}

                {idCameraOpen ? (
                  <div className="mt-3 overflow-hidden rounded-xl bg-[#10201b]">
                    <video
                      ref={idVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="aspect-video w-full object-cover"
                    />

                    <div className="flex gap-2 p-2">
                      <button
                        type="button"
                        onClick={captureIdentityDocument}
                        className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-white text-xs font-black text-[#163b2d]"
                      >
                        <Camera className="h-4 w-4" />
                        Capture document
                      </button>

                      <button
                        type="button"
                        onClick={stopIdCamera}
                        className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white"
                        aria-label="Close camera"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : null}

                {identityFile ? (
                  <div className="mt-3 rounded-xl border border-[#cfe1d7] bg-[#edf7f1] p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#28704f]">
                        <Check className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#294238]">
                          Government ID captured
                        </p>

                        <p className="text-[10px] text-[#708078]">
                          Ready for verification
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={retakeIdentityDocument}
                        className="text-[10px] font-black text-[#376e57]"
                      >
                        Retake
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Live selfie */}
              <div className="rounded-2xl border border-[#dfe8e3] bg-[#fafcfb] p-4">
                <p className="text-xs font-bold text-[#41554c]">
                  Live selfie
                </p>

                {!selfieCameraOpen && !selfieFile ? (
                  <button
                    type="button"
                    onClick={() => void startSelfieCamera()}
                    className="mt-3 flex h-[122px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-[#cbd8d1] bg-white transition hover:border-[#6d9b83]"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#edf5f0] text-[#376e57]">
                      <Camera className="h-4 w-4" />
                    </span>

                    <span className="mt-2 text-xs font-bold text-[#294238]">
                      Take live selfie
                    </span>

                    <span className="mt-0.5 text-[10px] text-[#8a9891]">
                      Camera required
                    </span>
                  </button>
                ) : null}

                {selfieCameraOpen ? (
                  <div className="mt-3 overflow-hidden rounded-xl bg-[#10201b]">
                    <video
                      ref={selfieVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="aspect-square w-full object-cover"
                    />

                    <div className="flex gap-2 p-2">
                      <button
                        type="button"
                        onClick={captureSelfie}
                        className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-white text-xs font-black text-[#163b2d]"
                      >
                        <Camera className="h-4 w-4" />
                        Take photo
                      </button>

                      <button
                        type="button"
                        onClick={stopSelfieCamera}
                        className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white"
                        aria-label="Close camera"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : null}

                {selfieFile ? (
                  <div className="mt-3 rounded-xl border border-[#cfe1d7] bg-[#edf7f1] p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#28704f]">
                        <Check className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#294238]">
                          Live selfie captured
                        </p>

                        <p className="text-[10px] text-[#708078]">
                          Ready for verification
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={retakeSelfie}
                        className="text-[10px] font-black text-[#376e57]"
                      >
                        Retake
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {idCameraError ? (
            <div className="mt-4 rounded-xl bg-[#fff4f4] px-4 py-3 text-xs font-semibold text-[#a34d4d]">
              {idCameraError}
            </div>
          ) : null}

          {selfieCameraError ? (
            <div className="mt-4 rounded-xl bg-[#fff4f4] px-4 py-3 text-xs font-semibold text-[#a34d4d]">
              {selfieCameraError}
            </div>
          ) : null}

          {"error" in state && state.error ? (
  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
    {state.error}
  </div>
) : null}

          {state.success ? (
            <div className="mt-4 rounded-xl bg-[#eef8f2] px-4 py-3 text-xs font-semibold text-[#28704f]">
              {state.message}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#e7ede9] pt-5 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={() => router.push("/dashboard/profile")}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#d8e2dd] bg-white px-5 text-sm font-bold text-[#294238] transition hover:bg-[#f6f9f7]"
            >
              <ArrowLeft className="h-4 w-4" />
              Cancel
            </button>

            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#163b2d] px-6 text-sm font-bold text-white shadow-[0_8px_20px_rgba(22,59,45,0.16)] transition hover:bg-[#245744] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit for verification
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {documents.length > 0 ? (
        <p className="mt-3 text-center text-[10px] text-[#89978f]">
          Previous documents are already on file.
        </p>
      ) : null}
    </form>
  );
}