"use client";

import Link from "next/link";
import {
  ChevronRight,
  KeyRound,
  LockKeyhole,
  Mail,
  Moon,
  Palette,
  Phone,
  ShieldCheck,
  Sun,
  UserRound,
  UserRoundCog,
} from "lucide-react";
import {
  useEffect,
  useSyncExternalStore,
} from "react";

type Theme = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "moogold-theme";

type SettingsFormProps = {
  fullName: string;
  email: string;
  phone: string;
  countryName: string;
};

function getSavedTheme(): Theme {
  try {
    const saved = window.localStorage.getItem(
      THEME_STORAGE_KEY,
    );

    if (
      saved === "light" ||
      saved === "dark" ||
      saved === "system"
    ) {
      return saved;
    }
  } catch {
    // Ignore storage errors.
  }

  return "system";
}

function subscribeToThemeChanges(
  onStoreChange: () => void,
) {
  const handleChange = () => {
    onStoreChange();
  };

  window.addEventListener(
    "storage",
    handleChange,
  );

  window.addEventListener(
    "moogold-theme-change",
    handleChange,
  );

  return () => {
    window.removeEventListener(
      "storage",
      handleChange,
    );

    window.removeEventListener(
      "moogold-theme-change",
      handleChange,
    );
  };
}

function getServerThemeSnapshot(): Theme {
  return "system";
}

function applyDocumentTheme(theme: Theme) {
  const root = document.documentElement;

  let isDark = false;

  if (theme === "dark") {
    isDark = true;
  } else if (theme === "system") {
    isDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
  }

  root.classList.toggle("dark", isDark);
  root.style.colorScheme = isDark
    ? "dark"
    : "light";
}

function getThemeSnapshot(): Theme {
  return getSavedTheme();
}

function setSavedTheme(theme: Theme) {
  try {
    window.localStorage.setItem(
      THEME_STORAGE_KEY,
      theme,
    );
  } catch {
    // Ignore storage errors.
  }

  applyDocumentTheme(theme);

  window.dispatchEvent(
    new Event("moogold-theme-change"),
  );
}

function maskPhone(phone: string) {
  if (!phone) {
    return "Not available";
  }

  if (phone.length <= 6) {
    return phone;
  }

  return `${phone.slice(0, 4)} •••• ${phone.slice(-3)}`;
}

function SettingRow({
  icon,
  title,
  description,
  href,
  actionLabel,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
  actionLabel?: string;
}) {
  const content = (
    <>
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
            {title}
          </p>

          <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>

      {href ? (
        <div className="flex shrink-0 items-center gap-1.5">
          {actionLabel && (
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              {actionLabel}
            </span>
          )}

          <ChevronRight className="h-4 w-4 text-slate-400" />
        </div>
      ) : null}
    </>
  );

  if (!href) {
    return (
      <div className="flex min-h-14 items-center justify-between gap-4 px-4 py-3">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="flex min-h-14 items-center justify-between gap-4 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
    >
      {content}
    </Link>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {title}
        </p>
      </div>

      {children}
    </section>
  );
}

export default function SettingsForm({
  fullName,
  email,
  phone,
  countryName,
}: SettingsFormProps) {
  const theme = useSyncExternalStore(
    subscribeToThemeChanges,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );

  useEffect(() => {
    applyDocumentTheme(theme);
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      "(prefers-color-scheme: dark)",
    );

    const handleSystemThemeChange = () => {
      if (getSavedTheme() === "system") {
        applyDocumentTheme("system");
        window.dispatchEvent(
          new Event("moogold-theme-change"),
        );
      }
    };

    mediaQuery.addEventListener(
      "change",
      handleSystemThemeChange,
    );

    return () => {
      mediaQuery.removeEventListener(
        "change",
        handleSystemThemeChange,
      );
    };
  }, []);

  const emailAction = email
    ? "Change"
    : "Add email";

  return (
    <div>
      {/* Profile */}
      <Section title="Profile">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          <div className="flex min-h-14 items-center justify-between gap-4 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <UserRound className="h-4 w-4" />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  Full name
                </p>

                <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
                  Registered account name
                </p>
              </div>
            </div>

            <p className="max-w-[55%] truncate text-right text-sm font-bold text-slate-700 dark:text-slate-200">
              {fullName || "Not available"}
            </p>
          </div>

          <div className="flex min-h-14 items-center justify-between gap-4 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <UserRoundCog className="h-4 w-4" />
              </div>

              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  Country / region
                </p>

                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  Registered country
                </p>
              </div>
            </div>

            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              {countryName}
            </p>
          </div>

          <SettingRow
            icon={<Phone className="h-4 w-4" />}
            title="Mobile number"
            description={maskPhone(phone)}
            href="/dashboard/settings/phone"
            actionLabel="Change"
          />

          <SettingRow
            icon={<Mail className="h-4 w-4" />}
            title="Email address"
            description={
              email || "No email address added"
            }
            href="/dashboard/settings/email"
            actionLabel={emailAction}
          />
        </div>
      </Section>

      {/* Login & Security */}
      <Section title="Login & Security">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          <SettingRow
            icon={<KeyRound className="h-4 w-4" />}
            title="Change PIN"
            description="Update your 4-digit security PIN"
            href="/dashboard/settings/pin"
          />

          <SettingRow
            icon={<LockKeyhole className="h-4 w-4" />}
            title="Forgot PIN"
            description="Recover your PIN using your registered number"
            href="/forgot-pin"
          />

          <div className="flex min-h-14 items-center justify-between gap-4 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <ShieldCheck className="h-4 w-4" />
              </div>

              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  Sign-in method
                </p>

                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  Mobile number + 4-digit PIN
                </p>
              </div>
            </div>

            <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              Active
            </span>
          </div>
        </div>
      </Section>

      {/* Appearance */}
      <Section title="Appearance">
        <div className="p-2">
          <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setSavedTheme("light")}
              aria-pressed={theme === "light"}
              className={`flex min-h-11 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-bold transition ${
                theme === "light"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Sun className="h-3.5 w-3.5" />
              Light
            </button>

            <button
              type="button"
              onClick={() => setSavedTheme("dark")}
              aria-pressed={theme === "dark"}
              className={`flex min-h-11 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-bold transition ${
                theme === "dark"
                  ? "bg-slate-900 text-white shadow-sm dark:bg-slate-700"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Moon className="h-3.5 w-3.5" />
              Dark
            </button>

            <button
              type="button"
              onClick={() => setSavedTheme("system")}
              aria-pressed={theme === "system"}
              className={`flex min-h-11 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-bold transition ${
                theme === "system"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Palette className="h-3.5 w-3.5" />
              System
            </button>
          </div>

          <p className="px-2 pb-1 pt-2 text-[10px] text-slate-400 dark:text-slate-500">
            Your appearance preference is saved on this device.
          </p>
        </div>
      </Section>

      {/* Account */}
      <Section title="Account">
        <SettingRow
          icon={<LockKeyhole className="h-4 w-4" />}
          title="Close account"
          description="Permanently close your MooGold account"
          href="/dashboard/settings/close-account"
        />
      </Section>
    </div>
  );
}