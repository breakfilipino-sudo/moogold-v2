"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  WalletCards,
  Bitcoin,
  Coins,
  UsersRound,
  Gift,
  Settings,
  LogOut,
  ChevronRight,
  Loader2,
  BriefcaseBusiness,
} from "lucide-react";
import { useState } from "react";

import { useDashboard } from "./dashboard-provider";
import { signOut } from "@/app/auth/actions";
import { translate } from "@/lib/i18n/translations";
import type { LanguageCode } from "@/lib/i18n/languages";

const items = [
  ["wallet", "/dashboard/wallet", WalletCards],
  ["wealthBox", "/dashboard/wealth-box", BriefcaseBusiness],
  ["buySellGold", "/dashboard/gold", Coins],
  ["crypto", "/dashboard/crypto", Bitcoin],
  ["giftCards", "/dashboard/gift-cards", Gift],
  ["referrals", "/dashboard/referrals", UsersRound],
] as const;

const secondaryItems = [
  ["settings", "/dashboard/settings", Settings],
] as const;

type MobileSidebarProps = {
  displayName: string;
  profilePhotoUrl: string | null;
  language: LanguageCode;
};

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "MG";

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function MobileSidebar({
  displayName,
  profilePhotoUrl,
  language,
}: MobileSidebarProps) {
  const pathname = usePathname();
  const { sidebarOpen, closeSidebar } = useDashboard();
  const [loggingOut, setLoggingOut] = useState(false);

  if (!sidebarOpen) return null;

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const initials = getInitials(displayName);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      localStorage.removeItem("moogold-login-account");
    } catch {
      // Ignore localStorage errors.
    }

    await signOut();
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation"
        onClick={closeSidebar}
        className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] lg:hidden"
      />

      <aside className="fixed inset-y-0 left-0 z-50 flex h-dvh w-[280px] max-w-[84vw] flex-col bg-[#0a1713] text-white shadow-2xl lg:hidden">
        <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-white/5 px-4">
          <Link
            href="/dashboard/wallet"
            onClick={closeSidebar}
            className="flex items-center gap-2.5"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400 text-sm font-black text-[#06100d]">
              M
            </div>

            <div>
              <p className="text-[15px] font-black tracking-tight">
                MooGold
              </p>

              <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-white/30">
                More than a wallet.
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={closeSidebar}
            aria-label="Close navigation"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white/45 transition hover:bg-white/5 hover:text-white"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-5">
          <Link
            href="/dashboard/profile"
            onClick={closeSidebar}
            className="mb-6 flex items-center gap-3 rounded-2xl bg-white/[0.035] px-3.5 py-3 transition hover:bg-white/[0.06]"
          >
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-[10px] font-bold">
              {profilePhotoUrl ? (
                <div
                  role="img"
                  aria-label={`${displayName} profile photo`}
                  className="h-full w-full bg-cover bg-center"
                  style={{
                    backgroundImage: `url("${profilePhotoUrl}")`,
                  }}
                />
              ) : (
                initials
              )}

              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0a1713] bg-emerald-400" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold">
                {translate(language, "myProfile")}
              </p>

              <p className="mt-0.5 truncate text-[10px] text-white/30">
                {displayName}
              </p>
            </div>

            <ChevronRight className="h-4 w-4 shrink-0 text-white/20" />
          </Link>

          <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-white/25">
            {translate(language, "mainMenu")}
          </p>

          <nav className="space-y-1">
            {items.map(([key, href, Icon]) => {
              const active = isActive(href);

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={closeSidebar}
                  className={[
                    "flex min-h-11 items-center gap-3 rounded-xl px-3",
                    "text-sm font-semibold transition",
                    active
                      ? "bg-emerald-400 text-[#06100d]"
                      : "text-white/55 hover:bg-white/5 hover:text-white",
                  ].join(" ")}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />

                  <span className="min-w-0 flex-1 truncate">
                    {translate(language, key)}
                  </span>

                  {active && (
                    <ChevronRight className="h-4 w-4 shrink-0 opacity-45" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="my-5 h-px bg-white/5" />

          <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-white/25">
            {translate(language, "account")}
          </p>

          <nav className="space-y-1">
            {secondaryItems.map(([key, href, Icon]) => {
              const active = isActive(href);

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={closeSidebar}
                  className={[
                    "flex min-h-11 items-center gap-3 rounded-xl px-3",
                    "text-sm font-semibold transition",
                    active
                      ? "bg-emerald-400 text-[#06100d]"
                      : "text-white/55 hover:bg-white/5 hover:text-white",
                  ].join(" ")}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />

                  <span className="min-w-0 flex-1 truncate">
                    {translate(language, key)}
                  </span>

                  {active && (
                    <ChevronRight className="h-4 w-4 shrink-0 opacity-45" />
                  )}
                </Link>
              );
            })}

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className={[
                "flex min-h-11 w-full items-center gap-3 rounded-xl px-3",
                "text-sm font-semibold transition",
                loggingOut
                  ? "cursor-not-allowed text-white/25"
                  : "text-white/50 hover:bg-red-400/10 hover:text-red-300",
              ].join(" ")}
            >
              {loggingOut ? (
                <Loader2 className="h-[18px] w-[18px] animate-spin" />
              ) : (
                <LogOut className="h-[18px] w-[18px]" />
              )}

              <span>
                {translate(
                  language,
                  loggingOut ? "loggingOut" : "logOut",
                )}
              </span>
            </button>
          </nav>
        </div>
      </aside>
    </>
  );
}