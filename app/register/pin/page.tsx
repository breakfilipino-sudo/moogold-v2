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

import { createPin } from "@/app/auth/actions";


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
  const email = (params.get("email") ?? "").trim().toLowerCase();

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

      if (!result?.success || !result.profile) {
        setError(t("registrationRequestError"));
        return;
      }

      try {
        localStorage.setItem(
          "moogold-login-account",
          JSON.stringify(result.profile),
        );
      } catch {
        // Local storage is optional.
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
      <main className="flex h-[80dvh] min-h-0 items-center justify-center bg-[#eef3f0] px-4 py-8 text-[#17231e] sm:h-auto sm:min-h-screen sm:px-6 registration-page-offwhite">
        <section className="w-full max-w-md">
        <div className="rounded-2xl border border-[#e1e9e4] bg-white p-6 text-center shadow-[0_12px_36px_rgba(20,45,35,0.06)] sm:p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-8 w-8 text-[#138a5d]" />
          </div>

          <h2 className="mt-5 text-lg font-black text-[#17231e]">
            {t("pinCreated")}
          </h2>


          <div className="mt-5 h-1 overflow-hidden rounded-full bg-[#e8efeb]">
            <div className="h-full w-full origin-left animate-[pulse_1.8s_ease-in-out]" />
          </div>
        </div>
      </section>
    </main>
    );
  }

  return (
    <main className="flex h-[80dvh] min-h-0 items-center justify-center bg-[#eef3f0] px-4 py-8 text-[#17231e] sm:h-auto sm:min-h-screen sm:px-6 registration-page-offwhite">
      <section className="w-full max-w-md rounded-[28px] border border-[#e1e9e4] bg-white p-5 shadow-[0_24px_80px_rgba(20,45,35,0.12)] sm:p-8">
      <form
        onSubmit={submit}
        className="rounded-2xl bg-white p-0"
      >
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-center text-sm font-semibold leading-5 text-red-700"
          >
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 rounded-2xl border border-[#dcebe3] bg-[#f5faf7] px-4 py-3.5">
          <ShieldCheck className="h-5 w-5 shrink-0 text-[#138a5d]" />
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#138a5d]">
              Verified email
            </p>
            <p className="mt-1 truncate text-sm font-bold text-[#263b30]">
              {email || "Your email has been verified"}
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
          className="mx-auto mt-3 flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-[#52675c] transition hover:bg-[#f1f6f3] hover:text-[#138a5d]"
        >
          {show ? (
            <EyeOff className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}

          {show ? "Hide PIN" : "Show PIN"}
        </button>

        {pin.length > 0 && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm leading-5 text-amber-900">
              Choose a PIN that is hard to guess. Avoid simple sequences like 1234 or repeated digits like 0000.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 h-12 w-full rounded-xl bg-[#138a5d] text-sm font-black text-white shadow-lg shadow-emerald-900/10 transition hover:bg-[#0f754e] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? t("completingRegistration")
            : t("finishSetup")}
        </button>
      </form>
    </section>
    </main>
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
      <p className="mb-3 text-center text-xs font-black uppercase tracking-[0.16em] text-[#65736c]">
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
            className="h-14 w-12 rounded-xl border border-[#d7e3dc] bg-[#f8fbf9] text-center text-2xl font-bold text-[#17231e] outline-none transition focus:border-[#138a5d] focus:ring-4 focus:ring-emerald-700/10 sm:h-15 sm:w-14"
          />
        ))}
      </div>
    </div>
  );
}