"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Wallet,
  CircleDollarSign,
  Coins,
  Gift,
  UserRound,
} from "lucide-react";

import { translate } from "@/lib/i18n/translations";
import type { LanguageCode } from "@/lib/i18n/languages";

const navigation = [
  {
    key: "giftCards",
    href: "/dashboard/gift-cards",
    icon: Gift,
  },
  {
    key: "wallet",
    href: "/dashboard/wallet",
    icon: Wallet,
  },
  {
    key: "gold",
    href: "/dashboard/gold",
    icon: CircleDollarSign,
  },
  {
    key: "crypto",
    href: "/dashboard/crypto",
    icon: Coins,
  },
  {
    key: "profile",
    href: "/dashboard/profile",
    icon: UserRound,
  },
] as const;

type MobileBottomNavProps = {
  language: LanguageCode;
};

export default function MobileBottomNav({
  language,
}: MobileBottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/80 bg-white/95 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95 md:hidden"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="mx-auto flex h-[68px] max-w-md items-center justify-around px-2">
        {navigation.map((item) => {
          const Icon = item.icon;

          const isActive =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-[58px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 transition-all ${
                isActive
                  ? "text-[#138a5d]"
                  : "text-slate-400 dark:text-slate-500"
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
                  isActive
                    ? "bg-[#e7f6ef]"
                    : "bg-transparent dark:bg-transparent"
                }`}
              >
                <Icon
                  className={`h-[19px] w-[19px] ${
                    isActive ? "stroke-[2.4]" : "stroke-[1.8]"
                  }`}
                />
              </span>

              <span
                className={`text-[10px] font-semibold leading-none ${
                  isActive
                    ? "text-[#138a5d]"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {translate(language, item.key)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}