"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";

import { signInWithPin } from "@/app/auth/actions";
import AuthShell from "@/components/auth/auth-shell";
import { translate } from "@/lib/i18n/translations";

type Account = {
  firstName: string;
  phone: string;
  countryCode: string;
};

const KEY = "moogold-login-account";
const EVENT = "moogold-login-account-changed";

let snapshot: Account | null | undefined;

function readAccount(): Account | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const value = JSON.parse(
      localStorage.getItem(KEY) || "null",
    );

    if (
      value &&
      typeof value.firstName === "string" &&
      typeof value.phone === "string" &&
      typeof value.countryCode === "string"
    ) {
      return value;
    }

    return null;
  } catch {
    return null;
  }
}

function getSnapshot(): Account | null {
  if (snapshot === undefined) {
    snapshot = readAccount();
  }

  return snapshot;
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleChange = () => {
    snapshot = readAccount();
    callback();
  };

  window.addEventListener("storage", handleChange);
  window.addEventListener(EVENT, handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(EVENT, handleChange);
  };
}

function getServerSnapshot(): Account | null {
  return null;
}

function formatPhone(value: string) {
  if (value.length <= 7) {
    return value;
  }

  return `${value.slice(0, 3)} •••• ${value.slice(-4)}`;
}

export default function LoginPage() {
  const router = useRouter();

  const remembered = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [another, setAnother] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const pinRefs = useRef<Array<HTMLInputElement | null>>([]);

  const t = (key: Parameters<typeof translate>[1]) => translate("en", key);

  const active =
    remembered && !another
      ? remembered
      : null;


  useEffect(() => {
    if (active) {
      const timer = window.setTimeout(() => {
        pinRefs.current[0]?.focus();
      }, 100);

      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [active]);

  function syncPinValues() {
    const values = pinRefs.current.map(
      (input) => input?.value.replace(/\D/g, "") || "",
    );

    setPin(values);
    setError("");
  }

  function handlePinInput(
    index: number,
    event: React.FormEvent<HTMLInputElement>,
  ) {
    const input = event.currentTarget;
    const value = input.value.replace(/\D/g, "");

    if (!value) {
      input.value = "";
      syncPinValues();
      return;
    }

    input.value = value.slice(-1);
    syncPinValues();

    if (index < 3) {
      const nextInput = pinRefs.current[index + 1];
      nextInput?.focus();
      nextInput?.select();
    }
  }

  function handlePinKeyDown(
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key !== "Backspace") {
      if (event.key === "ArrowLeft" && index > 0) {
        event.preventDefault();
        pinRefs.current[index - 1]?.focus();
        return;
      }

      if (event.key === "ArrowRight" && index < 3) {
        event.preventDefault();
        pinRefs.current[index + 1]?.focus();
        return;
      }

      return;
    }

    const input = event.currentTarget;

    if (input.value) {
      input.value = "";
      syncPinValues();
      return;
    }

    if (index > 0) {
      event.preventDefault();

      const previousInput = pinRefs.current[index - 1];

      if (previousInput) {
        previousInput.value = "";
        previousInput.focus();
        syncPinValues();
      }
    }
  }

  function handlePinPaste(
    index: number,
    event: React.ClipboardEvent<HTMLInputElement>,
  ) {
    event.preventDefault();

    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 4);

    if (!pasted) {
      return;
    }

    for (
      let offset = 0;
      offset < pasted.length && index + offset < 4;
      offset++
    ) {
      const input = pinRefs.current[index + offset];

      if (input) {
        input.value = pasted[offset];
      }
    }

    syncPinValues();

    const nextIndex = Math.min(index + pasted.length, 3);

    pinRefs.current[nextIndex]?.focus();
    pinRefs.current[nextIndex]?.select();
  }

  async function submit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");

    if (!active && !phone.trim()) {
      setError(t("registrationPhoneError"));
      return;
    }

    const pinString = pinRefs.current
      .map((input) => input?.value.replace(/\D/g, "") || "")
      .join("");

    if (pinString.length !== 4) {
      setError(t("enterCompletePin"));

      const firstEmpty = pinRefs.current.findIndex(
        (input) => !input?.value,
      );

      pinRefs.current[
        firstEmpty >= 0 ? firstEmpty : 3
      ]?.focus();

      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.set("phone", active?.phone || phone.trim());
      formData.set("pin", pinString);

      const result = await signInWithPin(formData);

      if (result?.error) {
        setError(result.error);
        return;
      }

      if (result?.success) {
        router.replace(result.redirectTo || "/dashboard");
        return;
      }

      setError(t("loginError"));
    } catch (submitError) {
      console.error("Login error:", submitError);
      setError(t("loginError"));
    } finally {
      setLoading(false);
    }
  }

  function switchAccount() {
    setAnother(true);
    setPhone("");
    setPin(["", "", "", ""]);
    setError("");
    setShowPin(false);

    pinRefs.current.forEach((input) => {
      if (input) {
        input.value = "";
      }
    });

    window.setTimeout(() => {
      document.getElementById("phone")?.focus();
    }, 0);
  }

  const pinString = pin.join("");

  return (
    <AuthShell
      step={1}
      title={
        active
          ? `${t("welcomeBack")}, ${active.firstName}`
          : t("logIn")
      }
      description={
        active
          ? t("enterPin")
          : t("loginDescription")
      }
    >
      <form onSubmit={submit} className="relative">
        {active ? (
          <div className="mb-5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#87938d]">
                {t("accountNumber")}
              </span>

              <button
                type="button"
                onClick={switchAccount}
                className="min-h-8 text-[11px] font-bold text-[#138a5d] transition hover:text-[#0d704c]"
              >
                {t("switchAccount")}
              </button>
            </div>

            <div className="border-b border-[#dce5df] pb-2.5">
              <p className="text-[15px] font-semibold tracking-[-0.02em] text-[#17231e]">
                {formatPhone(active.phone)}
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-5">
            <label
              htmlFor="phone"
              className="mb-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-[#52605a]"
            >
              {t("accountNumber")}
            </label>

            <input
              id="phone"
              name="phone"
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value);
                setError("");
              }}
              type="tel"
              required
              inputMode="tel"
              autoComplete="tel"
              placeholder={t("accountNumberPlaceholder")}
              className="h-12 w-full border-0 border-b border-[#cfd9d3] bg-transparent px-0 text-[15px] font-medium text-[#17231e] outline-none transition placeholder:text-[#a4ada8] focus:border-[#138a5d]"
            />
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#52605a]">
              {t("pin")} (4 digits)
            </label>

            <button
              type="button"
              onClick={() => setShowPin((value) => !value)}
              aria-label={showPin ? "Hide PIN" : "Show PIN"}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#74817a] transition hover:bg-[#eaf1ed] hover:text-[#138a5d]"
            >
              {showPin ? (
                <EyeOff className="h-[15px] w-[15px]" />
              ) : (
                <Eye className="h-[15px] w-[15px]" />
              )}
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((index) => (
              <input
                key={index}
                ref={(element) => {
                  pinRefs.current[index] = element;
                }}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={1}
                pattern="[0-9]*"
                defaultValue=""
                onInput={(event) => handlePinInput(index, event)}
                onKeyDown={(event) => handlePinKeyDown(index, event)}
                onPaste={(event) => handlePinPaste(index, event)}
                aria-label={`PIN digit ${index + 1}`}
                className={`h-12 w-full rounded-xl border border-[#d3ddd7] bg-white text-center text-[18px] font-bold text-[#17231e] shadow-[0_3px_10px_rgba(20,45,35,0.04)] outline-none transition focus:border-[#138a5d] focus:shadow-[0_3px_14px_rgba(19,138,93,0.10)] ${
                  showPin ? "" : "[&]:[-webkit-text-security:disc]"
                }`}
              />
            ))}
          </div>

          <div className="mt-2.5">
            <Link
              href="/forgot-pin"
              className="text-[11px] font-semibold text-[#138a5d] transition hover:text-[#0d704c]"
            >
              {t("forgotPin")}
            </Link>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[11px] font-medium leading-4 text-red-600"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={
            loading ||
            pinString.length !== 4 ||
            (!active && !phone.trim())
          }
          className="group mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#138a5d] text-[13px] font-bold text-white shadow-[0_7px_17px_rgba(19,138,93,0.17)] transition hover:bg-[#0f7b52] hover:shadow-[0_9px_21px_rgba(19,138,93,0.21)] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              {t("loggingIn")}
            </>
          ) : (
            <>
              {t("loginContinue")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>

        {!remembered && (
          <div className="mt-5 text-center">
            <span className="text-[11px] text-[#89958f]">
              {t("newToMooGold")}
            </span>{" "}
            <Link
              href="/register"
              className="text-[11px] font-bold text-[#138a5d] transition hover:text-[#0d704c]"
            >
              {t("createAccount")}
            </Link>
          </div>
        )}
      </form>
    </AuthShell>
  );
}