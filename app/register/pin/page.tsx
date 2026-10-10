"use client";

import { Suspense, useRef, useState } from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";

import {
  createPin,
  finishRegistration,
} from "@/app/auth/actions";

import AuthShell from "@/components/auth/auth-shell";
import { translate } from "@/lib/i18n/translations";

export default function CreatePinPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#06100d]">
          <div className="text-center">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-white/10 border-t-emerald-400" />

            <p className="mt-3 text-xs font-semibold text-white/40">
              Loading...
            </p>
          </div>
        </div>
      }
    >
      <CreatePinContent />
    </Suspense>
  );
}

function CreatePinContent() {
  const router = useRouter();
  const params = useSearchParams();

  const phone = params.get("phone") ?? "";

  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const pinRefs = useRef<Array<HTMLInputElement | null>>([]);
  const confirmRefs = useRef<Array<HTMLInputElement | null>>([]);

  const t = (key: Parameters<typeof translate>[1]) => translate("en", key);


  function setDigit(
    which: "pin" | "confirm",
    index: number,
    value: string,
  ) {
    const digit = value.replace(/\D/g, "").slice(-1);

    const current = (
      which === "pin" ? pin : confirm
    ).split("");

    current[index] = digit;

    const next = current.join("").slice(0, 4);

    if (which === "pin") {
      setPin(next);
    } else {
      setConfirm(next);
    }

    setError("");

    if (digit && index < 3) {
      (
        which === "pin" ? pinRefs : confirmRefs
      ).current[index + 1]?.focus();
    }
  }

  function handleKeyDown(
    which: "pin" | "confirm",
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    const value = which === "pin" ? pin : confirm;
    const refs = which === "pin" ? pinRefs : confirmRefs;

    if (
      event.key === "Backspace" &&
      !value[index] &&
      index > 0
    ) {
      refs.current[index - 1]?.focus();
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      refs.current[index - 1]?.focus();
      return;
    }

    if (event.key === "ArrowRight" && index < 3) {
      event.preventDefault();
      refs.current[index + 1]?.focus();
    }
  }

  async function submit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (loading || success) {
      return;
    }

    setError("");

    if (pin.length !== 4 || confirm.length !== 4) {
      setError(t("enterCompletePin"));
      return;
    }

    if (pin !== confirm) {
      setError(t("pinMismatch"));
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.set("pin", pin);
      formData.set("confirmPin", confirm);

      const result = await createPin(formData);

      if (result?.error) {
        setError(result.error);
        return;
      }

      const registration = await finishRegistration();

      if (
        registration?.success &&
        registration.profile
      ) {
        try {
          localStorage.setItem(
            "moogold-login-account",
            JSON.stringify(registration.profile),
          );
        } catch {
          // Local storage is optional.
        }
      }

      if (!registration?.success) {
        setError(t("registrationRequestError"));
        return;
      }

      setSuccess(true);

      window.setTimeout(() => {
        router.replace("/dashboard");
      }, 1800);
    } catch (submitError) {
      console.error(
        "Registration PIN completion error:",
        submitError,
      );

      setError(t("registrationRequestError"));
    } finally {
      setLoading(false);
    }
  }

  if (!phone) {
    return null;
  }

  if (success) {
    return (
      <AuthShell
        step={3}
        eyebrow={t("welcomeBack")}
        title={t("pinCreated")}
        description={t("completingRegistration")}
      >
        <div className="rounded-2xl border border-emerald-400/15 bg-white/[.045] p-6 text-center shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/10">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>

          <h2 className="mt-5 text-lg font-black text-white">
            {t("pinCreated")}
          </h2>

          <p className="mt-2 text-sm leading-6 text-white/40">
            {t("verificationDescription")}
          </p>

          <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-full origin-left animate-[pulse_1.8s_ease-in-out]" />
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      step={3}
      eyebrow={t("finishSetup")}
      title={t("createYourPin")}
      description={t("createPinDescription")}
    >
      <form
        onSubmit={submit}
        className="rounded-2xl border border-white/10 bg-white/[.045] p-4 shadow-2xl backdrop-blur-xl sm:p-5"
      >
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 px-3.5 py-3 text-center text-xs font-semibold leading-5 text-red-200"
          >
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 rounded-xl border border-emerald-400/10 bg-emerald-400/[.035] px-3.5 py-3">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />

          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
              {t("verifyYourPhone")}
            </p>

            <p className="mt-0.5 truncate text-xs font-bold text-white/55">
              {phone}
            </p>
          </div>
        </div>

        <PinRow
          label={t("newPin")}
          value={pin}
          refs={pinRefs}
          show={show}
          onChange={(index, value) =>
            setDigit("pin", index, value)
          }
          onKey={(index, event) =>
            handleKeyDown("pin", index, event)
          }
        />

        <PinRow
          label={t("confirmPin")}
          value={confirm}
          refs={confirmRefs}
          show={show}
          onChange={(index, value) =>
            setDigit("confirm", index, value)
          }
          onKey={(index, event) =>
            handleKeyDown("confirm", index, event)
          }
        />

        <button
          type="button"
          onClick={() => setShow((current) => !current)}
          className="mx-auto mt-3 flex items-center gap-1.5 text-[11px] font-bold text-white/30 transition hover:text-white/60"
        >
          {show ? (
            <EyeOff className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}

          {show ? "Hide PIN" : "Show PIN"}
        </button>

        <div className="mt-5 grid grid-cols-2 gap-2 border-t border-white/8 pt-4">
          <p className="text-[11px] leading-4 text-white/30">
            <span className="font-bold text-white/45">
              Avoid
            </span>{" "}
            simple sequences like 1234.
          </p>

          <p className="text-[11px] leading-4 text-white/30">
            <span className="font-bold text-white/45">
              Avoid
            </span>{" "}
            repeated digits like 0000.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-5 h-12 w-full rounded-xl bg-emerald-400 text-sm font-black text-[#06100d] shadow-lg shadow-emerald-500/10 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? t("completingRegistration")
            : t("finishSetup")}
        </button>
      </form>
    </AuthShell>
  );
}

function PinRow({
  label,
  value,
  refs,
  show,
  onChange,
  onKey,
}: {
  label: string;
  value: string;
  refs: React.MutableRefObject<Array<HTMLInputElement | null>>;
  show: boolean;
  onChange: (index: number, value: string) => void;
  onKey: (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => void;
}) {
  return (
    <div className="mt-6">
      <p className="mb-2.5 text-center text-[10px] font-black uppercase tracking-widest text-white/30">
        {label}
      </p>

      <div className="flex justify-center gap-2.5">
        {Array.from({ length: 4 }).map((_, index) => (
          <input
            key={index}
            ref={(element) => {
              refs.current[index] = element;
            }}
            value={value[index] ?? ""}
            type={show ? "text" : "password"}
            maxLength={1}
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            onChange={(event) =>
              onChange(index, event.target.value)
            }
            onKeyDown={(event) =>
              onKey(index, event)
            }
            aria-label={`${label} digit ${index + 1}`}
            className="h-14 w-12 rounded-xl border border-white/10 bg-black/20 text-center text-xl font-black text-white outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 sm:h-15 sm:w-14"
          />
        ))}
      </div>
    </div>
  );
}