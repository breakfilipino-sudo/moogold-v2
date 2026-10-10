"use client";

import {
  Camera,
  Check,
  ImagePlus,
  Loader2,
  ShieldCheck,
  Trash2,
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

import {
  removeProfilePhoto,
  uploadProfilePhoto,
} from "./actions";

type ActionResult =
  | {
      success: true;
      message: string;
    }
  | {
      success: false;
      error: string;
    };

type ProfileFormProps = {
  fullName: string;
  phone: string;
  email: string;
  country: string;
  accountTier: string;
  verificationTier: string;
  verificationState: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  profilePhotoUrl: string | null;
};

const initialState: ActionResult = {
  success: false,
  error: "",
};

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "M";
  }

  return parts
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function validatePhoto(file: File) {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  const maxSize = 5 * 1024 * 1024;

  if (!allowedTypes.includes(file.type)) {
    return "Please select a JPEG, PNG, or WebP image.";
  }

  if (file.size > maxSize) {
    return "Profile photos must be 5 MB or smaller.";
  }

  return null;
}

function getVerificationLabel(
  verificationTier: string,
  verificationState: string,
) {
  if (verificationState === "VERIFIED") {
    if (verificationTier === "TIER_3") {
      return "Enhanced verified";
    }

    if (verificationTier === "TIER_2") {
      return "Verified";
    }

    return "Basic";
  }

  switch (verificationState) {
    case "UNDER_REVIEW":
      return "Under review";

    case "IN_PROGRESS":
      return "In progress";

    case "MORE_INFORMATION_REQUIRED":
      return "Information required";

    case "REJECTED":
      return "Needs attention";

    case "NOT_STARTED":
    default:
      return "Basic";
  }
}

export default function ProfileForm({
  fullName,
  phone,
  email,
  country,
  accountTier,
  verificationTier,
  verificationState,
  phoneVerified,
  emailVerified,
  profilePhotoUrl,
}: ProfileFormProps) {
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [selectedPreviewUrl, setSelectedPreviewUrl] =
    useState<string | null>(null);

  const [photoClientError, setPhotoClientError] =
    useState("");

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const [photoState, photoAction, photoPending] =
    useActionState(uploadProfilePhoto, initialState);

  const [removeState, removeAction, removePending] =
    useActionState(removeProfilePhoto, initialState);

  const previewUrl =
    selectedPreviewUrl ?? profilePhotoUrl;

  const isVerified = verificationState === "VERIFIED";
  const isTierOne = verificationTier === "TIER_1";

  const verificationLabel = getVerificationLabel(
    verificationTier,
    verificationState,
  );

  const initials = getInitials(fullName);

  useEffect(() => {
    return () => {
      if (selectedPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(selectedPreviewUrl);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });

        streamRef.current = null;
      }
    };
  }, [selectedPreviewUrl]);

  useEffect(() => {
    if (
  photoState.success ||
  removeState.success
) {
  if (selectedPreviewUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(selectedPreviewUrl);
  }

  router.refresh();
}
  }, [
    photoState.success,
    removeState.success,
    router,
    selectedPreviewUrl,
  ]);

  useEffect(() => {
    if (
      !cameraOpen ||
      !videoRef.current ||
      !streamRef.current
    ) {
      return;
    }

    videoRef.current.srcObject = streamRef.current;

    void videoRef.current.play().catch(() => {
      // Some browsers may block autoplay.
    });
  }, [cameraOpen]);

  const photoError =
    !photoState.success ? photoState.error : null;

  const removeError =
    !removeState.success ? removeState.error : null;

  const photoSuccessMessage =
    photoState.success ? photoState.message : null;

  const removeSuccessMessage =
    removeState.success ? removeState.message : null;

  const photoMessage =
    photoClientError ||
    photoError ||
    removeError ||
    photoSuccessMessage ||
    removeSuccessMessage;

  const photoHasError = Boolean(
    photoClientError ||
      photoError ||
      removeError,
  );

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraOpen(false);
    setCameraLoading(false);
  }

  function uploadPhotoFile(file: File) {
    setPhotoClientError("");

    const validationError = validatePhoto(file);

    if (validationError) {
      setPhotoClientError(validationError);
      return;
    }

    if (selectedPreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(selectedPreviewUrl);
    }

    setSelectedPreviewUrl(
      URL.createObjectURL(file),
    );

    const formData = new FormData();

    formData.append("photo", file);

    startTransition(() => {
      photoAction(formData);
    });
  }

  async function openCamera() {
    setCameraError("");

    /*
     * getUserMedia requires a secure context.
     *
     * localhost is considered secure, but the LAN address
     * used during phone testing is not. In that situation,
     * use the phone's native camera capture instead.
     */
    if (
      !window.isSecureContext ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      cameraInputRef.current?.click();
      return;
    }

    setCameraLoading(true);
    setCameraOpen(true);

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });

        streamRef.current = null;
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: {
              ideal: 1280,
            },
            height: {
              ideal: 1280,
            },
          },
          audio: false,
        });

      streamRef.current = stream;

      setCameraOpen(true);
    } catch (error) {
      console.error("Profile camera error:", error);

      setCameraError(
        "Camera access was unavailable. Please allow camera access and try again.",
      );

      stopCamera();
    } finally {
      setCameraLoading(false);
    }
  }

  function handleCameraFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    uploadPhotoFile(file);

    event.target.value = "";
  }

  function capturePhoto() {
    const video = videoRef.current;

    if (
      !video ||
      !video.videoWidth ||
      !video.videoHeight
    ) {
      setCameraError(
        "The camera is not ready yet. Please try again.",
      );
      return;
    }

    const canvas = document.createElement("canvas");

    const maxDimension = 1200;

    let width = video.videoWidth;
    let height = video.videoHeight;

    if (
      width > maxDimension ||
      height > maxDimension
    ) {
      const scale = Math.min(
        maxDimension / width,
        maxDimension / height,
      );

      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      setCameraError(
        "Unable to capture the photo. Please try again.",
      );
      return;
    }

    context.drawImage(
      video,
      0,
      0,
      width,
      height,
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError(
            "Unable to capture the photo. Please try again.",
          );
          return;
        }

        const file = new File(
          [blob],
          `profile-camera-${Date.now()}.jpg`,
          {
            type: "image/jpeg",
          },
        );

        stopCamera();
        uploadPhotoFile(file);
      },
      "image/jpeg",
      0.9,
    );
  }

  function handleChooseUpload() {
    fileInputRef.current?.click();
  }

  function handlePhotoChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    uploadPhotoFile(file);

    event.target.value = "";
  }

  function handleUpgrade() {
    router.push("/dashboard/verification");
  }

  return (
    <div className="space-y-5">
      {/* Profile summary */}
      <section className="overflow-hidden rounded-[22px] border border-[#dfe8e3] bg-white shadow-[0_10px_30px_rgba(16,32,27,0.045)]">
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="relative shrink-0">
                <div className="flex h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-full border border-[#d9e4de] bg-[#edf4f0] text-lg font-black text-[#2f7658]">
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt={`${fullName} profile`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={openCamera}
                  disabled={
                    cameraLoading ||
                    photoPending ||
                    removePending
                  }
                  aria-label="Take profile photo"
                  className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#163b2d] text-white shadow-sm transition hover:bg-[#245744] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-black tracking-tight text-[#10201b] sm:text-xl">
                    {fullName}
                  </h2>

                  {isVerified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#edf8f2] px-2 py-0.5 text-[9px] font-bold text-[#28704f]">
                      <Check className="h-2.5 w-2.5" />
                      Verified
                    </span>
                  ) : null}
                </div>

                <p className="mt-1 truncate text-xs text-[#718078]">
                  {phone || "Mobile number not provided"}
                </p>

                <p className="mt-0.5 truncate text-xs text-[#8a9891]">
                  {email || "Email not provided"}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={openCamera}
                disabled={
                  cameraLoading ||
                  photoPending ||
                  removePending
                }
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#d8e2dd] bg-white px-3 text-[11px] font-bold text-[#294238] transition hover:bg-[#f6f9f7] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Camera className="h-3.5 w-3.5" />
                Take photo
              </button>

              <button
                type="button"
                onClick={handleChooseUpload}
                disabled={
                  photoPending ||
                  removePending
                }
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#d8e2dd] bg-white px-3 text-[11px] font-bold text-[#294238] transition hover:bg-[#f6f9f7] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ImagePlus className="h-3.5 w-3.5" />
                Upload
              </button>

              {profilePhotoUrl || selectedPreviewUrl ? (
                <form action={removeAction}>
                  <button
                    type="submit"
                    disabled={
                      removePending ||
                      photoPending
                    }
                    aria-label="Remove profile photo"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#eadada] bg-white text-[#a34d4d] transition hover:bg-[#fff5f5] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {removePending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </form>
              ) : null}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoChange}
            className="hidden"
          />

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="user"
            onChange={handleCameraFileChange}
            className="hidden"
          />

          {photoPending ? (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#eef8f2] px-3.5 py-2.5 text-[11px] font-semibold text-[#28704f]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Updating profile photo...
            </div>
          ) : null}

          <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-[#edf1ee] pt-4 sm:grid-cols-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#8a9891]">
                Country
              </p>

              <p className="mt-1 text-xs font-bold text-[#243c32]">
                {country}
              </p>
            </div>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#8a9891]">
                Account tier
              </p>

              <p className="mt-1 text-xs font-bold text-[#243c32]">
                {accountTier}
              </p>
            </div>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#8a9891]">
                Verification
              </p>

              <p
                className={`mt-1 text-xs font-bold ${
                  isVerified
                    ? "text-[#28704f]"
                    : "text-[#53655d]"
                }`}
              >
                {verificationLabel}
              </p>
            </div>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#8a9891]">
                Status
              </p>

              <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-[#28704f]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#36a36f]" />
                Active
              </p>
            </div>
          </div>

          {photoMessage && !photoPending ? (
            <div
              className={`mt-4 rounded-lg px-3.5 py-2.5 text-[11px] font-semibold ${
                photoHasError
                  ? "bg-[#fff4f4] text-[#a34d4d]"
                  : "bg-[#eef8f2] text-[#28704f]"
              }`}
            >
              {photoMessage}
            </div>
          ) : null}
        </div>
      </section>

      {/* Upgrade account */}
      {isTierOne ? (
        <section className="flex flex-col gap-3 rounded-[18px] border border-[#e2ebe6] bg-[#f8faf9] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eaf3ee] text-[#376e57]">
              <ShieldCheck className="h-4 w-4" />
            </div>

            <div>
              <p className="text-xs font-bold text-[#243c32]">
                Upgrade Account
              </p>

              <p className="mt-0.5 text-[11px] leading-5 text-[#718078]">
                Complete verification to access higher account limits.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleUpgrade}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#163b2d] px-4 text-[11px] font-bold text-white transition hover:bg-[#245744]"
          >
            Upgrade Account
            <ShieldCheck className="h-3.5 w-3.5" />
          </button>
        </section>
      ) : null}

      {/* Personal information */}
      <section className="rounded-[22px] border border-[#dfe8e3] bg-white p-5 shadow-[0_10px_30px_rgba(16,32,27,0.04)] sm:p-6">
        <div className="mb-5">
          <h3 className="text-base font-black tracking-tight text-[#10201b]">
            Personal information
          </h3>

          <p className="mt-1 text-xs text-[#708078]">
            Your registered account details.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="fullName"
              className="mb-1.5 block text-[11px] font-bold text-[#41554c]"
            >
              Full Name
            </label>

            <input
              id="fullName"
              value={fullName}
              readOnly
              className="h-11 w-full rounded-lg border border-[#e0e8e4] bg-[#f7f9f8] px-3.5 text-xs font-semibold text-[#687870] outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="country"
              className="mb-1.5 block text-[11px] font-bold text-[#41554c]"
            >
              Country / Region
            </label>

            <input
              id="country"
              value={country}
              readOnly
              className="h-11 w-full rounded-lg border border-[#e0e8e4] bg-[#f7f9f8] px-3.5 text-xs font-semibold text-[#687870] outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="mb-1.5 block text-[11px] font-bold text-[#41554c]"
            >
              Mobile Number
            </label>

            <div className="relative">
              <input
                id="phone"
                value={phone || "Not provided"}
                readOnly
                className="h-11 w-full rounded-lg border border-[#e0e8e4] bg-[#f7f9f8] px-3.5 pr-24 text-xs font-semibold text-[#687870] outline-none"
              />

              {phone && phoneVerified ? (
                <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-[9px] font-bold uppercase tracking-[0.06em] text-[#2c7a57]">
                  <Check className="h-3 w-3" />
                  Verified
                </span>
              ) : null}
            </div>
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-[11px] font-bold text-[#41554c]"
            >
              Email Address
            </label>

            <div className="relative">
              <input
                id="email"
                value={email || "Not provided"}
                readOnly
                className="h-11 w-full rounded-lg border border-[#e0e8e4] bg-[#f7f9f8] px-3.5 pr-24 text-xs font-semibold text-[#687870] outline-none"
              />

              {email && emailVerified ? (
                <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-[9px] font-bold uppercase tracking-[0.06em] text-[#2c7a57]">
                  <Check className="h-3 w-3" />
                  Verified
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Live camera */}
      {cameraOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#07150f]/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[420px] overflow-hidden rounded-[24px] border border-white/10 bg-white shadow-[0_25px_80px_rgba(0,0,0,0.3)]">
            <div className="flex items-center justify-between border-b border-[#edf1ee] px-5 py-4">
              <div>
                <h3 className="text-sm font-black text-[#10201b]">
                  Take profile photo
                </h3>

                <p className="mt-0.5 text-[10px] text-[#718078]">
                  Position your face inside the frame.
                </p>
              </div>

              <button
                type="button"
                onClick={stopCamera}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e0e8e4] text-[#607069] transition hover:bg-[#f6f9f7]"
                aria-label="Close camera"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative aspect-square overflow-hidden bg-[#091710]">
              {cameraLoading ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-white">
                  <Loader2 className="h-7 w-7 animate-spin" />

                  <p className="mt-3 text-xs font-semibold">
                    Starting camera...
                  </p>
                </div>
              ) : null}

              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />

              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-[58%] w-[58%] rounded-full border-2 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.22)]" />
              </div>
            </div>

            {cameraError ? (
              <div className="mx-5 mt-4 rounded-lg bg-[#fff4f4] px-3.5 py-2.5 text-[11px] font-semibold text-[#a34d4d]">
                {cameraError}
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-3 p-5">
              <button
                type="button"
                onClick={stopCamera}
                className="h-10 rounded-lg border border-[#d8e2dd] px-4 text-xs font-bold text-[#41554c] transition hover:bg-[#f6f9f7]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={capturePhoto}
                disabled={
                  cameraLoading ||
                  Boolean(cameraError) ||
                  photoPending
                }
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#163b2d] px-5 text-xs font-bold text-white transition hover:bg-[#245744] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Camera className="h-4 w-4" />
                Capture photo
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}