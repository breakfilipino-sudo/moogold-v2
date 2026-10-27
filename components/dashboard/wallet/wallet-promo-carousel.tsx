"use client";

import { useEffect, useState } from "react";
import {
  HandCoins,
  PiggyBank,
  UsersRound,
} from "lucide-react";
import type { LanguageCode } from "@/lib/i18n/languages";

type Promo = {
  eyebrow: string;
  title: string;
  description: string;
  action?: string;
  href?: string;
  icon: typeof PiggyBank;
  accent: string;
  comingSoon?: boolean;
};

const promotions: Record<LanguageCode, Promo[]> = {
  en: [
    {
      eyebrow: "COMING SOON",
      title: "Loan services are on the way",
      description:
        "We're preparing loan services for MooGold. More details will be shared when they're ready.",
      action: "Coming soon",
      icon: HandCoins,
      accent: "from-[#254e3c] to-[#10201b]",
      comingSoon: true,
    },
    {
      eyebrow: "BUILD YOUR WEALTH",
      title: "Grow and Multiply Your Money",
      description:
        "Explore Wealth Box and discover another way to work toward your financial goals.",
      icon: PiggyBank,
      accent: "from-[#164e3a] to-[#10201b]",
    },
    {
      eyebrow: "GROW TOGETHER",
      title: "Invite friends to use MooGold",
      description:
        "Share MooGold with friends and let them discover the services available on the platform.",
      icon: UsersRound,
      accent: "from-[#454025] to-[#10201b]",
    },
  ],
  fil: [
    {
      eyebrow: "MALAPIT NA",
      title: "Malapit na ang mga serbisyo sa pautang",
      description:
        "Inihahanda namin ang mga serbisyo sa pautang ng MooGold. Magbabahagi kami ng detalye kapag handa na.",
      action: "Malapit na",
      icon: HandCoins,
      accent: "from-[#254e3c] to-[#10201b]",
      comingSoon: true,
    },
    {
      eyebrow: "PALAGUIN ANG YAMAN",
      title: "Palaguin at Paramihin ang Iyong Pera",
      description:
        "Tuklasin ang Wealth Box at ang iba pang paraan para maabot ang iyong mga layuning pinansyal.",
      icon: PiggyBank,
      accent: "from-[#164e3a] to-[#10201b]",
    },
    {
      eyebrow: "SAMA-SAMANG UMUNLAD",
      title: "Imbitahan ang mga kaibigan na gamitin ang MooGold",
      description:
        "Ibahagi ang MooGold sa iyong mga kaibigan upang matuklasan nila ang mga serbisyo nito.",
      icon: UsersRound,
      accent: "from-[#454025] to-[#10201b]",
    },
  ],
  ms: [
    {
      eyebrow: "AKAN DATANG",
      title: "Perkhidmatan pinjaman bakal tiba",
      description:
        "Kami sedang menyediakan perkhidmatan pinjaman MooGold. Maklumat lanjut akan dikongsi apabila tersedia.",
      action: "Akan datang",
      icon: HandCoins,
      accent: "from-[#254e3c] to-[#10201b]",
      comingSoon: true,
    },
    {
      eyebrow: "BINA KEKAYAAN",
      title: "Kembangkan dan Gandakan Wang Anda",
      description:
        "Terokai Wealth Box dan cara lain untuk mencapai matlamat kewangan anda.",
      icon: PiggyBank,
      accent: "from-[#164e3a] to-[#10201b]",
    },
    {
      eyebrow: "MAJU BERSAMA",
      title: "Jemput rakan menggunakan MooGold",
      description:
        "Kongsikan MooGold dengan rakan anda supaya mereka dapat meneroka perkhidmatan yang tersedia.",
      icon: UsersRound,
      accent: "from-[#454025] to-[#10201b]",
    },
  ],
  zh: [
    {
      eyebrow: "\u5373\u5C06\u63A8\u51FA",
      title: "\u8D37\u6B3E\u670D\u52A1\u5373\u5C06\u4E0A\u7EBF",
      description:
        "\u6211\u4EEC\u6B63\u5728\u51C6\u5907 MooGold \u8D37\u6B3E\u670D\u52A1\uFF0C\u5C31\u7EEA\u540E\u5C06\u516C\u5E03\u66F4\u591A\u8BE6\u60C5\u3002",
      action: "\u5373\u5C06\u63A8\u51FA",
      icon: HandCoins,
      accent: "from-[#254e3c] to-[#10201b]",
      comingSoon: true,
    },
    {
      eyebrow: "\u79EF\u7D2F\u8D22\u5BCC",
      title: "\u8BA9\u60A8\u7684\u8D22\u5BCC\u589E\u957F",
      description:
        "\u4E86\u89E3 Wealth Box\uFF0C\u63A2\u7D22\u5B9E\u73B0\u8D22\u52A1\u76EE\u6807\u7684\u5176\u4ED6\u65B9\u5F0F\u3002",
      icon: PiggyBank,
      accent: "from-[#164e3a] to-[#10201b]",
    },
    {
      eyebrow: "\u5171\u540C\u6210\u957F",
      title: "\u9080\u8BF7\u670B\u53CB\u4F7F\u7528 MooGold",
      description:
        "\u4E0E\u670B\u53CB\u5206\u4EAB MooGold\uFF0C\u8BA9\u4ED6\u4EEC\u4E86\u89E3\u5E73\u53F0\u4E0A\u53EF\u7528\u7684\u670D\u52A1\u3002",
      icon: UsersRound,
      accent: "from-[#454025] to-[#10201b]",
    },
  ],
};

export default function WalletPromoCarousel({
  language,
  countryCode,
}: {
  language: LanguageCode;
  countryCode: string | null;
}) {
  const baseSlides = promotions[language] ?? promotions.en;
  const isPhilippines = countryCode?.trim().toUpperCase() === "PH";

  const slides = baseSlides.map((slide) => {
    if (slide.icon !== UsersRound || !isPhilippines) {
      return slide;
    }

    return {
      ...slide,
      description:
        language === "fil"
          ? "Ibahagi ang MooGold sa iyong mga kaibigan. Halimbawa, ang ₱1,000 ay katumbas ng halagang ito sa piso."
          : "Invite friends to use MooGold. For example, ₱1,000 is an amount shown in Philippine pesos.",
    };
  });

  const [activeIndex, setActiveIndex] = useState(0);


  // Autoplay temporarily disabled to diagnose the Android dashboard flicker.
  // Manual promotion controls remain available.

  const promo = slides[activeIndex] ?? slides[0];
  const Icon = promo.icon;

  return (
    <section
      aria-label="MooGold promotions"
      className="overflow-hidden rounded-[24px] border border-black/5 bg-white shadow-[0_12px_35px_rgba(16,32,27,0.06)]"
    >
      <div
        className={`relative isolate min-h-[230px] overflow-hidden bg-gradient-to-br ${promo.accent} p-6 text-white transition-colors duration-500 sm:min-h-[245px] sm:p-8`}
      >
        <div className="pointer-events-none absolute -right-12 -top-16 -z-10 h-56 w-56 rounded-full border border-white/[0.07]" />
        <div className="pointer-events-none absolute -right-4 -top-8 -z-10 h-40 w-40 rounded-full border border-white/[0.06]" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-emerald-300/[0.08] blur-2xl" />

        <div className="relative flex min-h-[182px] flex-col justify-between gap-6 sm:min-h-[181px] sm:flex-row sm:items-center">
          <div className="max-w-xl">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-emerald-300">
              {promo.eyebrow}
            </p>

            <h2 className="mt-3 max-w-lg text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
              {promo.title}
            </h2>

            <p className="mt-2 max-w-lg text-xs leading-5 text-white/75 sm:text-sm sm:leading-6">
              {promo.description}
            </p>

            {promo.comingSoon && promo.action && (
              <span className="mt-5 inline-flex min-h-9 items-center rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-xs font-bold text-white/75">
                {promo.action}
              </span>
            )}
          </div>

          <div className="hidden shrink-0 sm:flex">
            <div className="flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/10 bg-white/[0.06] shadow-inner">
              <Icon
                className="h-11 w-11 text-emerald-200"
                strokeWidth={1.4}
              />
            </div>
          </div>
        </div>

        <div className="relative mt-5 flex items-center justify-between border-t border-white/10 pt-4">
          <p className="text-[10px] font-medium text-white/50">
            {String(activeIndex + 1).padStart(2, "0")} /{" "}
            {String(slides.length).padStart(2, "0")}
          </p>

          <div className="flex items-center gap-2">
            {slides.map((slide, index) => (
              <button
                key={slide.eyebrow}
                type="button"
                aria-label={`Show promotion ${index + 1}`}
                aria-current={activeIndex === index ? "true" : undefined}
                onClick={() => setActiveIndex(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activeIndex === index
                    ? "w-7 bg-emerald-300"
                    : "w-1.5 bg-white/30 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}