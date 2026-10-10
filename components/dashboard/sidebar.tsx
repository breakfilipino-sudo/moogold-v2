"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  WalletCards,
  Coins,
  Bitcoin,
  UsersRound,
  Gift,
  Settings,
  LogOut,
  ChevronRight,
  Loader2,
  MessageCircle,
  BriefcaseBusiness,
} from "lucide-react";

import { signOut } from "@/app/auth/actions";
import { translate } from "@/lib/i18n/translations";
import type { LanguageCode } from "@/lib/i18n/languages";

const navigation = [
  { key: "wallet", href: "/dashboard/wallet", icon: WalletCards },
  {
    key: "wealthBox",
    href: "/dashboard/wealth-box",
    icon: BriefcaseBusiness,
  },
  {
    key: "buySellGold",
    href: "/dashboard/gold",
    icon: Coins,
  },
  {
    key: "crypto",
    href: "/dashboard/crypto",
    icon: Bitcoin,
  },
  {
    key: "giftCards",
    href: "/dashboard/gift-cards",
    icon: Gift,
  },
  {
    key: "referrals",
    href: "/dashboard/referrals",
    icon: UsersRound,
  },
] as const;

const secondaryNavigation = [
  {
    key: "customerService",
    href: "/dashboard/support",
    icon: MessageCircle,
  },
  {
    key: "settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
] as const;

type SidebarProps = {
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

export default function Sidebar({
  displayName,
  profilePhotoUrl,
  language,
}: SidebarProps) {
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

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
    <aside className="hidden min-h-screen w-64 shrink-0 flex-col border-r border-white/5 bg-[#0a1713] text-white lg:flex">
      <div className="flex h-20 shrink-0 items-center border-b border-white/5 px-5">
        <Link
          href="/dashboard/wallet"
          className="flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 text-base font-black text-[#06100d]">
            M
          </div>

          <div>
            <p className="text-base font-black tracking-tight">
              MooGold
            </p>

            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/30">
              More than a wallet.
            </p>
          </div>
        </Link>
      </div>

      <div className="shrink-0 px-4 pt-4">
        <Link
          href="/dashboard/profile"
          className="flex items-center gap-3 rounded-2xl bg-white/[0.035] px-3.5 py-3 transition hover:bg-white/[0.06]"
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
      </div>

      <div className="px-4 pt-8">
        <p className="mb-3 px-2 text-[9px] font-bold uppercase tracking-[0.2em] text-white/25">
          {translate(language, "mainMenu")}
        </p>

        <nav className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex h-11 items-center gap-3 rounded-xl px-3",
                  "text-sm font-semibold transition",
                  active
                    ? "bg-emerald-400 text-[#06100d]"
                    : "text-white/55 hover:bg-white/5 hover:text-white",
                ].join(" ")}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />

                <span className="min-w-0 flex-1 truncate">
                  {translate(language, item.key)}
                </span>

                {active && (
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="my-5 h-px bg-white/5" />

        <p className="mb-3 px-2 text-[9px] font-bold uppercase tracking-[0.2em] text-white/25">
          {translate(language, "account")}
        </p>

        <nav className="space-y-1">
          {secondaryNavigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex h-11 items-center gap-3 rounded-xl px-3",
                  "text-sm font-semibold transition",
                  active
                    ? "bg-emerald-400 text-[#06100d]"
                    : "text-white/55 hover:bg-white/5 hover:text-white",
                ].join(" ")}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />

                <span className="min-w-0 flex-1 truncate">
                  {translate(language, item.key)}
                </span>

                {active && (
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-6 shrink-0 border-t border-white/5 px-4 py-4">
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className={[
            "flex h-11 w-full items-center gap-3 rounded-xl px-3",
            "text-sm font-semibold transition",
            loggingOut
              ? "cursor-not-allowed text-white/25"
              : "text-white/50 hover:bg-red-400/10 hover:text-red-300",
          ].join(" ")}
        >
          {loggingOut ? (
            <Loader2 className="h-4.5 w-4.5 animate-spin" />
          ) : (
            <LogOut className="h-4.5 w-4.5" />
          )}

          <span>
            {translate(
              language,
              loggingOut ? "loggingOut" : "logOut",
            )}
          </span>
        </button>
      </div>
    </aside>
  );
}