"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  Bitcoin,
  Gift,
  Gem,
  Newspaper,
  Users,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { LanguageCode } from "@/lib/i18n/languages";

type Service = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const copy: Record<
  LanguageCode,
  {
    welcome: string;
    tagline: string;
    login: string;
    createAccount: string;
    discover: string;
    discoverSubtitle: string;
    services: Service[];
  }
> = {
  en: {
    welcome: "Welcome to MooGold",
    tagline: "Grow your money. Own your future.",
    login: "Log in",
    createAccount: "Create account",
    discover: "Discover what you can do",
    discoverSubtitle: "A few ways MooGold can help you.",
    services: [
      {
        title: "Personal Wallet",
        description: "Manage your money in one place.",
        icon: WalletCards,
      },
      {
        title: "Buy & Sell Gold",
        description: "Access MooGold's gold services.",
        icon: Gem,
      },
      {
        title: "Crypto",
        description: "Access crypto services.",
        icon: Bitcoin,
      },
      {
        title: "Gift Cards",
        description: "Buy and sell gift cards.",
        icon: Gift,
      },
      {
        title: "Wealth Box Deposit",
        description: "Explore Wealth Box and deposit services.",
        icon: ArrowDownToLine,
      },
      {
        title: "Referrals",
        description: "Invite friends and earn rewards.",
        icon: Users,
      },
      {
        title: "Financial News",
        description: "Keep up with financial news.",
        icon: Newspaper,
      },
      {
        title: "Money Transfers",
        description: "Explore available money services.",
        icon: ArrowLeftRight,
      },
    ],
  },
  fil: {
    welcome: "Maligayang pagdating sa MooGold",
    tagline: "Palaguin ang iyong pera. Ihanda ang iyong kinabukasan.",
    login: "Mag-log in",
    createAccount: "Gumawa ng account",
    discover: "Tuklasin ang maaari mong gawin",
    discoverSubtitle: "Ilan sa mga serbisyong makakatulong sa iyo.",
    services: [
      {
        title: "Personal Wallet",
        description: "Pamahalaan ang iyong pera sa isang lugar.",
        icon: WalletCards,
      },
      {
        title: "Buy & Sell Gold",
        description: "Gamitin ang mga serbisyo ng ginto ng MooGold.",
        icon: Gem,
      },
      {
        title: "Crypto",
        description: "Tingnan ang mga serbisyong crypto.",
        icon: Bitcoin,
      },
      {
        title: "Gift Cards",
        description: "Bumili at magbenta ng gift cards.",
        icon: Gift,
      },
      {
        title: "Wealth Box Deposit",
        description: "Tingnan ang Wealth Box at mga deposit service.",
        icon: ArrowDownToLine,
      },
      {
        title: "Referrals",
        description: "Mag-imbita ng kaibigan at kumita ng rewards.",
        icon: Users,
      },
      {
        title: "Financial News",
        description: "Subaybayan ang mga balitang pinansyal.",
        icon: Newspaper,
      },
      {
        title: "Money Transfers",
        description: "Tingnan ang mga available na serbisyong pinansyal.",
        icon: ArrowLeftRight,
      },
    ],
  },
  ms: {
    welcome: "Selamat datang ke MooGold",
    tagline: "Kembangkan wang anda. Bina masa depan anda.",
    login: "Log masuk",
    createAccount: "Cipta akaun",
    discover: "Terokai perkara yang boleh anda lakukan",
    discoverSubtitle: "Antara cara MooGold boleh membantu anda.",
    services: [
      {
        title: "Dompet Peribadi",
        description: "Urus wang anda di satu tempat.",
        icon: WalletCards,
      },
      {
        title: "Beli & Jual Emas",
        description: "Gunakan perkhidmatan emas MooGold.",
        icon: Gem,
      },
      {
        title: "Kripto",
        description: "Akses perkhidmatan kripto.",
        icon: Bitcoin,
      },
      {
        title: "Kad Hadiah",
        description: "Beli dan jual kad hadiah.",
        icon: Gift,
      },
      {
        title: "Wealth Box Deposit",
        description: "Terokai perkhidmatan Wealth Box dan deposit.",
        icon: ArrowDownToLine,
      },
      {
        title: "Rujukan",
        description: "Jemput rakan dan dapatkan ganjaran.",
        icon: Users,
      },
      {
        title: "Berita Kewangan",
        description: "Ikuti berita kewangan terkini.",
        icon: Newspaper,
      },
      {
        title: "Pemindahan Wang",
        description: "Terokai perkhidmatan wang yang tersedia.",
        icon: ArrowLeftRight,
      },
    ],
  },
  zh: {
    welcome: "欢迎来到 MooGold",
    tagline: "让财富成长，掌握自己的未来。",
    login: "登录",
    createAccount: "创建账户",
    discover: "了解您可以使用的服务",
    discoverSubtitle: "看看 MooGold 如何帮助您。",
    services: [
      {
        title: "个人钱包",
        description: "在一个地方管理您的资金。",
        icon: WalletCards,
      },
      {
        title: "黄金买卖",
        description: "使用 MooGold 黄金服务。",
        icon: Gem,
      },
      {
        title: "加密货币",
        description: "使用加密货币相关服务。",
        icon: Bitcoin,
      },
      {
        title: "礼品卡",
        description: "购买和出售礼品卡。",
        icon: Gift,
      },
      {
        title: "财富盒存款",
        description: "了解财富盒和存款服务。",
        icon: ArrowDownToLine,
      },
      {
        title: "推荐奖励",
        description: "邀请朋友并获取奖励。",
        icon: Users,
      },
      {
        title: "财经新闻",
        description: "关注最新财经新闻。",
        icon: Newspaper,
      },
      {
        title: "资金转账",
        description: "了解可用的资金服务。",
        icon: ArrowLeftRight,
      },
    ],
  },
};

export default function InstalledWelcomeScreen({
  initialLanguage = "en",
}: {
  initialLanguage?: LanguageCode;
}) {
  const language = copy[initialLanguage] ? initialLanguage : "en";
  const content = copy[language];
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reducedMotion) return;

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % content.services.length);
    }, 4200);

    return () => window.clearInterval(interval);
  }, [content.services.length]);

  const service = content.services[activeIndex];
  const ServiceIcon = service.icon;

  return (
    <main className="relative flex min-h-[100svh] flex-col overflow-hidden bg-[#071b13] px-5 py-6 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-[#138a5d]/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[#cba75b]/10 blur-3xl"
      />

      <header className="relative mx-auto flex w-full max-w-md items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#138a5d] shadow-lg shadow-black/15">
          <span className="text-xl font-black tracking-tight text-white">M</span>
        </div>
        <div>
          <p className="text-lg font-bold tracking-[-0.04em]">MooGold</p>
          <p className="text-[10px] font-medium tracking-[0.16em] text-white/50">
            MORE THAN A WALLET
          </p>
        </div>
      </header>

      <section className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8">
        <div className="mb-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#d5b56e]/25 bg-[#d5b56e]/10 px-3 py-1.5 text-[10px] font-semibold tracking-wide text-[#e6ca8c]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#d5b56e]" />
            MONEY · GOLD · CRYPTO · REWARDS
          </div>

          <h1 className="max-w-sm text-3xl font-bold leading-[1.12] tracking-[-0.05em] sm:text-4xl">
            {content.welcome}
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/65">
            {content.tagline}
          </p>

          <div className="mt-7 grid grid-cols-2 gap-3">
            <Link
              href="/login"
              className="flex h-12 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] px-4 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              {content.login}
            </Link>
            <Link
              href="/register"
              className="flex h-12 items-center justify-center rounded-xl bg-[#d5b56e] px-4 text-sm font-bold text-[#14251c] transition hover:bg-[#e3c783]"
            >
              {content.createAccount}
            </Link>
          </div>
        </div>

        <section aria-label={content.discover}>
          <h2 className="text-base font-semibold tracking-[-0.02em]">
            {content.discover}
          </h2>
          <p className="mt-1 text-xs leading-5 text-white/50">
            {content.discoverSubtitle}
          </p>

          <div
            className="relative mt-4 min-h-[168px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] p-5"
            aria-live="polite"
            aria-atomic="true"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#d5b56e]/20 bg-[#d5b56e]/10 text-[#e6ca8c]">
                <ServiceIcon className="h-6 w-6" strokeWidth={1.8} />
              </div>
              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-medium tabular-nums text-white/45">
                {String(activeIndex + 1).padStart(2, "0")} /{" "}
                {String(content.services.length).padStart(2, "0")}
              </span>
            </div>

            <h3 className="mt-5 text-lg font-semibold tracking-[-0.03em]">
              {service.title}
            </h3>
            <p className="mt-1 text-sm leading-5 text-white/55">
              {service.description}
            </p>
          </div>

          <div
            className="mt-4 flex items-center justify-center gap-2"
            aria-label="Choose a service slide"
          >
            {content.services.map((item, index) => (
              <button
                key={item.title}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Show ${item.title}`}
                aria-current={activeIndex === index ? "true" : undefined}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activeIndex === index
                    ? "w-6 bg-[#d5b56e]"
                    : "w-1.5 bg-white/25 hover:bg-white/50"
                }`}
              />
            ))}
          </div>
        </section>
      </section>

      <footer className="relative mx-auto w-full max-w-md pb-1 text-center text-[10px] text-white/35">
        Money · Gold · Crypto · Gift Cards · Rewards
      </footer>
    </main>
  );
}