"use client";

import InstallAppButton from "@/components/pwa/install-app-button";
import PublicLanguageSelector from "@/components/home/public-language-selector";
import type { LanguageCode } from "@/lib/i18n/languages";
import Link from "next/link";
import {
ArrowDownLeft,
ArrowRight,
ArrowUpRight,
Check,
ChevronDown,
CircleDollarSign,
Gem,
LockKeyhole,
Menu,
ShieldCheck,
Smartphone,
Users,
WalletCards,
X,
} from "lucide-react";
import { useState } from "react";
import {
translate,
type TranslationKey,
} from "@/lib/i18n/translations";

const faqKeys = [
{ question: "faqQuestionOne", answer: "faqAnswerOne" },
{ question: "faqQuestionTwo", answer: "faqAnswerTwo" },
{ question: "faqQuestionThree", answer: "faqAnswerThree" },
{ question: "faqQuestionFour", answer: "faqAnswerFour" },
{ question: "faqQuestionFive", answer: "faqAnswerFive" },
{ question: "faqQuestionSix", answer: "faqAnswerSix" },
] as const satisfies ReadonlyArray<{
question: TranslationKey;
answer: TranslationKey;
}>;

const giftCardImages = {
apple:
"https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/apple-gift-cards-landing-202006?.v=U0EzaXNyc2ZlYWVYR0IxNTgwM2hBenVpVFFlVk9JRDNmTy85OE54VXNkUDdNdktaODg4Q2pUb3oxbHJXYnlHTUJ3b1EyanZvd0crOUVVd3ZSZWl3MldaWlg4SXd3WDRBclNoVm5RMFA5SWZXNm9oamhpbmdGcHIwa2hOU3lmQkw&fmt=jpeg&hei=1176&qlt=90&wid=2982",
amazon:
"https://images-na.ssl-images-amazon.com/images/G/01/gc/formation/assets/B01M1NQ1CED._CB277310599_.png",
playstation:
"https://gmedia.playstation.com/is/image/SIEPDC/gift-card-faceplate-gifting-image-block-en-01-07july23?%24100px%24=",
razer:
"https://assets2.razerzone.com/images/pnx.assets/cf7a13602feeed823d5dea43879ecb3a/gift-cards-hero-desktop.webp",
sephora:
"https://www.sephora.com/productimages/sku/s00540-main-zoom.jpg?imwidth=315",
};

const cryptoLogos = {
bitcoin: "https://cdn.simpleicons.org/bitcoin",
ethereum: "https://cdn.simpleicons.org/ethereum",
tether: "https://cdn.simpleicons.org/tether",
solana: "https://cdn.simpleicons.org/solana",
xrp: "https://cdn.simpleicons.org/xrp",
};

function AccountPreview({
language,
}: {
language: LanguageCode;
}) {
const t = (key: TranslationKey) => translate(language, key);

return ( <div className="relative mx-auto w-full max-w-[450px]"> <div className="absolute -right-5 top-14 h-44 w-44 rounded-full bg-[#138a5d]/8 blur-3xl" />

  <div className="relative">
    <div className="moogold-card-float relative z-10 rounded-[28px] bg-[#0c2b20] p-5 shadow-[0_30px_70px_rgba(17,55,42,.20)] sm:p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold text-white/45">MooGold</p>
          <p className="mt-1 text-sm font-medium text-white/80">
            {t("account")}
          </p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07]">
          <WalletCards className="h-4 w-4 text-[#9de3c2]" />
        </div>
      </div>

      <div className="mt-10">
        <p className="text-[11px] font-medium text-white/40">
          {t("availableBalance")}
        </p>
        <p className="mt-1 text-[34px] font-semibold tracking-[-0.055em] text-white sm:text-[38px]">
          {t("availableFundsIn")}
        </p>
      </div>

      <div className="mt-9 flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.13em] text-white/30">
            {t("account")}
          </p>
          <p className="mt-1 text-xs font-medium text-white/65">
            {t("personalWallet")}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-5 w-5 rounded-full bg-[#d7b45f]/85" />
          <span className="-ml-2 h-5 w-5 rounded-full bg-[#8fd9b8]/75" />
        </div>
      </div>
    </div>

    <div className="relative z-20 -mt-4 ml-7 mr-7 rounded-[22px] border border-[#dfe8e3] bg-white p-4 shadow-[0_18px_45px_rgba(25,55,42,.10)] sm:ml-10 sm:mr-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold text-[#8a9690]">
            {t("walletActivity")}
          </p>
          <p className="mt-0.5 text-xs font-medium text-[#26362f]">
            {t("latestWalletTransactions")}
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-[#138a5d]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#138a5d]" />
          {t("completed")}
        </span>
      </div>

      <div className="mt-4 space-y-2.5">
        {[
          {
            title: t("deposit"),
            detail: t("completed"),
            icon: ArrowDownLeft,
            bg: "bg-[#edf7f2]",
            color: "text-[#138a5d]",
            done: true,
          },
          {
            title: t("gold"),
            detail: t("goldHoldings"),
            icon: Gem,
            bg: "bg-[#f5f2e9]",
            color: "text-[#b18d3e]",
            done: false,
          },
          {
            title: t("crypto"),
            detail: t("crypto"),
            icon: CircleDollarSign,
            bg: "bg-[#eef1fa]",
            color: "text-[#647ce5]",
            done: false,
          },
          {
            title: t("giftCards"),
            detail: t("completed"),
            icon: WalletCards,
            bg: "bg-[#f2f6f3]",
            color: "text-[#138a5d]",
            done: true,
          },
          {
            title: t("referrals"),
            detail: t("referralReward"),
            icon: Users,
            bg: "bg-[#f5f0df]",
            color: "text-[#a7863c]",
            done: true,
          },
        ].map((item) => (
          <div key={item.title} className="flex items-center gap-3">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.bg} ${item.color}`}
            >
              <item.icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-[#26362f]">
                {item.title}
              </p>
              <p className="mt-0.5 text-[10px] text-[#9aa49f]">
                {item.detail}
              </p>
            </div>
            {item.done ? (
              <Check className="h-3.5 w-3.5 text-[#138a5d]" />
            ) : (
              <ArrowUpRight className="h-3.5 w-3.5 text-[#9aa49f]" />
            )}
          </div>
        ))}
      </div>
    </div>
  </div>
</div>

);
}

function WalletService({
language,
}: {
language: LanguageCode;
}) {
const t = (key: TranslationKey) => translate(language, key);

return ( <div className="group relative h-full min-h-[235px] overflow-hidden rounded-[24px] border border-[#d5e3dc] bg-[#0d2c21] p-5 text-white shadow-[0_12px_30px_rgba(13,44,33,.06)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_45px_rgba(13,44,33,.14)] sm:p-6"> <div className="absolute right-[-45px] top-[-55px] h-48 w-48 rounded-full bg-[#69d0a1]/10 blur-3xl" /> <div className="absolute bottom-[-80px] right-[22%] h-40 w-40 rounded-full bg-[#d5b563]/7 blur-3xl" /> <div className="relative z-10 flex h-full flex-col justify-between"> <div> <h3 className="text-xl font-semibold tracking-[-0.035em]">
{t("wallet")} </h3> <p className="mt-1.5 max-w-[300px] text-sm leading-5 text-white/50">
{t("exploreManageAssets")} </p> </div> <div className="mt-8 flex items-end justify-between border-t border-white/10 pt-4"> <div> <p className="text-[10px] uppercase tracking-[0.13em] text-white/30">
{t("availableBalance")} </p> <p className="mt-1 text-sm font-medium text-white/75">
{t("availableCash")} </p> </div> </div> </div> </div>
);
}

function GoldService({
language,
}: {
language: LanguageCode;
}) {
const t = (key: TranslationKey) => translate(language, key);

return ( <div className="group relative h-full min-h-[235px] overflow-hidden rounded-[24px] border border-[#e6dfca] bg-[#fcfaf5] p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_45px_rgba(102,82,31,.10)] sm:p-6"> <div className="absolute right-[-15px] top-[-30px] h-36 w-36 rounded-full bg-[#d7bb69]/15 blur-3xl" /> <div className="relative z-10 flex h-full flex-col"> <div className="mt-1"> <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#30291b]">
{t("buySellGold")} </h3> <p className="mt-1.5 text-sm leading-5 text-[#817966]">
{t("tradeManageGold")} </p> </div> <div className="mt-auto flex items-end justify-between pt-7"> <div className="relative flex h-[62px] w-[62px] items-center justify-center rounded-full border-[5px] border-[#d2b35d] bg-[radial-gradient(circle_at_35%_28%,#ffe99d,#d0aa4e_55%,#99752b)] shadow-[0_12px_25px_rgba(120,90,25,.16)] transition-transform duration-500 group-hover:-translate-y-1 group-hover:rotate-3"> <div className="absolute inset-2 rounded-full border border-white/25" /> <span className="relative text-xl font-black text-[#765719]">
M </span> </div> <div className="pb-1 text-right"> <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a59b86]">
{t("goldHoldings")} </p> <div className="mt-2 flex items-end gap-1"> <span className="h-2 w-2 rounded-full bg-[#c5a14a]" /> <span className="h-4 w-2 rounded-full bg-[#d3b15c]" /> <span className="h-6 w-2 rounded-full bg-[#e0c675]" /> <span className="h-8 w-2 rounded-full bg-[#c9a34b]" /> <span className="h-10 w-2 rounded-full bg-[#e4c978]" /> </div> </div> </div> </div> </div>
);
}

function CryptoCoin({
logo,
name,
}: {
logo: string;
name: string;
}) {
return ( <div
   className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-[#111b35] bg-white shadow-lg"
   title={name}
   aria-label={name}
 >
<div
className="h-5 w-5 bg-contain bg-center bg-no-repeat"
style={{ backgroundImage: `url(${logo})` }}
/> </div>
);
}

function CryptoService({
language,
}: {
language: LanguageCode;
}) {
const t = (key: TranslationKey) => translate(language, key);

return ( <div className="group relative h-full min-h-[235px] overflow-hidden rounded-[24px] border border-[#253455] bg-[#111b35] p-5 text-white transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_45px_rgba(17,27,53,.16)] sm:p-6"> <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#647ce5]/15 blur-3xl" /> <div className="relative z-10 flex h-full flex-col"> <div className="mt-1"> <h3 className="text-lg font-semibold tracking-[-0.03em]">
{t("crypto")} </h3> <p className="mt-1.5 max-w-[300px] text-sm leading-5 text-white/45">
{t("manageDigitalAssets")} </p> </div> <div className="mt-auto flex min-w-0 items-center justify-between gap-3 pt-7"> <div className="flex min-w-0 shrink-0 -space-x-2"> <CryptoCoin logo={cryptoLogos.bitcoin} name="Bitcoin" /> <CryptoCoin logo={cryptoLogos.ethereum} name="Ethereum" /> <CryptoCoin logo={cryptoLogos.tether} name="USDT" /> <CryptoCoin logo={cryptoLogos.solana} name="Solana" /> <CryptoCoin logo={cryptoLogos.xrp} name="XRP" /> </div> <div className="min-w-0 shrink-0 rounded-xl border border-white/10 bg-white/[0.06] px-2.5 py-2 sm:px-3"> <p className="whitespace-nowrap text-[9px] uppercase tracking-[0.12em] text-white/30">
{t("crypto")} </p> <p className="mt-0.5 whitespace-nowrap text-xs font-semibold text-white/70">
{t("completed")} </p> </div> </div> </div> </div>
);
}

function GiftCardImage({
src,
alt,
className,
}: {
src: string;
alt: string;
className?: string;
}) {
return (
<div
className={`aspect-[1.55/1] w-[58px] shrink-0 overflow-hidden rounded-[8px] border border-white/90 bg-white shadow-[0_7px_16px_rgba(30,55,45,.12)] sm:w-[66px] ${className ?? ""}`}
> <img
     src={src}
     alt={alt}
     className="h-full w-full object-cover"
     loading="lazy"
     referrerPolicy="no-referrer"
   /> </div>
);
}

function GiftCardService({
language,
}: {
language: LanguageCode;
}) {
const t = (key: TranslationKey) => translate(language, key);

return ( <div className="group relative h-full min-h-[235px] overflow-hidden rounded-[24px] border border-[#dce5e0] bg-[#f1f6f3] p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_45px_rgba(20,55,40,.09)] sm:p-6"> <div className="absolute right-[-30px] top-[-35px] h-36 w-36 rounded-full bg-[#c9dfd3]/55 blur-3xl" /> <div className="relative z-10 flex h-full flex-col"> <div> <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#1b2b24]">
{t("giftCards")} </h3> <p className="mt-1.5 max-w-[310px] text-sm leading-5 text-[#7b8982]">
{t("buyManageGiftCards")} </p> </div> <div className="mt-auto flex min-w-0 items-end gap-1 overflow-hidden pt-7 sm:gap-1.5"> <GiftCardImage
         src={giftCardImages.apple}
         alt="Apple Gift Card"
         className="-rotate-5 transition-transform duration-500 group-hover:-translate-y-1"
       /> <GiftCardImage
         src={giftCardImages.amazon}
         alt="Amazon Gift Card"
         className="-rotate-2 transition-transform duration-500 group-hover:-translate-y-1"
       /> <GiftCardImage
         src={giftCardImages.playstation}
         alt="PlayStation Gift Card"
         className="rotate-2 transition-transform duration-500 group-hover:-translate-y-1"
       /> <GiftCardImage
         src={giftCardImages.razer}
         alt="Razer Gift Card"
         className="-rotate-3 transition-transform duration-500 group-hover:-translate-y-1"
       /> <GiftCardImage
         src={giftCardImages.sephora}
         alt="Sephora Gift Card"
         className="rotate-3 transition-transform duration-500 group-hover:-translate-y-1"
       /> </div> </div> </div>
);
}

function ReferralService({
language,
}: {
language: LanguageCode;
}) {
const t = (key: TranslationKey) => translate(language, key);

return ( <div className="group relative h-full min-h-[235px] overflow-hidden rounded-[24px] border border-[#dfe5e1] bg-white p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_45px_rgba(20,55,40,.08)] sm:p-6"> <div className="absolute right-[-30px] bottom-[-40px] h-36 w-36 rounded-full bg-[#d5b663]/10 blur-3xl" /> <div className="relative z-10 flex h-full flex-col"> <div className="mt-1"> <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#1b2b24]">
{t("referrals")} </h3> <p className="mt-1.5 text-sm leading-5 text-[#7e8983]">
{t("trackReferralRewards")} </p> </div> <div className="mt-auto flex items-center justify-between pt-7"> <div className="flex -space-x-2"> <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#138a5d] text-[10px] font-bold text-white">
M </div> <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#d9eee4]"> <Users className="h-3.5 w-3.5 text-[#138a5d]" /> </div> <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#f0e8d2]"> <Users className="h-3.5 w-3.5 text-[#a7863c]" /> </div> </div> <div className="rounded-xl bg-[#f7faf8] px-3 py-2"> <p className="text-[9px] uppercase tracking-[0.12em] text-[#9aa49f]">
{t("referrals")} </p> <p className="mt-0.5 text-xs font-semibold text-[#52605a]">
{t("referralEarnings")} </p> </div> </div> </div> </div>
);
}

export default function MooGoldLanding({
initialLanguage = "en",
}: {
initialLanguage?: LanguageCode;
}) {
const [mobileOpen, setMobileOpen] = useState(false);
const [openFaq, setOpenFaq] = useState<number | null>(0);

const t = (key: TranslationKey) => translate(initialLanguage, key);

return ( <main className="min-h-screen overflow-x-hidden bg-[#f7faf8] text-[#17231e]"> <style jsx global>{`         @keyframes moogold-card-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .moogold-card-float { animation: moogold-card-float 6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .moogold-card-float { animation: none; }
        }
      `}</style>

  <div className="fixed inset-x-0 top-0 z-10 h-screen overflow-hidden">
    <header className="absolute inset-x-0 top-0 z-50 border-b border-[#e4ebe7]/90 bg-[#f7faf8]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-5 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="shrink-0 text-[21px] font-black tracking-[-0.065em]"
        >
          Moo<span className="text-[#138a5d]">Gold</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="#products"
            className="text-[13px] font-semibold text-[#64726b] transition hover:text-[#138a5d]"
          >
            {t("navProducts")}
          </a>
          <a
            href="#security"
            className="text-[13px] font-semibold text-[#64726b] transition hover:text-[#138a5d]"
          >
            {t("navSecurity")}
          </a>
          <a
            href="#faq"
            className="text-[13px] font-semibold text-[#64726b] transition hover:text-[#138a5d]"
          >
            {t("navFaq")}
          </a>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <PublicLanguageSelector initialLanguage={initialLanguage} />
          <InstallAppButton className="inline-flex items-center gap-2 rounded-xl border border-[#d8e2dc] bg-white px-4 py-2.5 text-[12px] font-bold text-[#17231e] transition hover:border-[#b9ccc2]" />
          <Link
            href="/login"
            className="rounded-xl px-4 py-2.5 text-[12px] font-bold text-[#52605a] transition hover:bg-white hover:text-[#17231e]"
          >
            {t("logIn")}
          </Link>
          <Link
            href="/register"
            className="rounded-xl bg-[#138a5d] px-4 py-2.5 text-[12px] font-bold text-white shadow-sm transition hover:bg-[#0f7b52]"
          >
            {t("createAccount")}
          </Link>
        </div>

        <button
          type="button"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((value) => !value)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#dce5e0] bg-white md:hidden"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-[#e5ece8] bg-white px-5 py-4 md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1">
            <div className="px-3 py-3">
              <PublicLanguageSelector initialLanguage={initialLanguage} />
            </div>
            <a
              href="#products"
              onClick={() => setMobileOpen(false)}
              className="rounded-xl px-3 py-3 text-sm font-semibold text-[#52605a] hover:bg-[#f4f8f5]"
            >
              {t("navProducts")}
            </a>
            <a
              href="#security"
              onClick={() => setMobileOpen(false)}
              className="rounded-xl px-3 py-3 text-sm font-semibold text-[#52605a] hover:bg-[#f4f8f5]"
            >
              {t("navSecurity")}
            </a>
            <a
              href="#faq"
              onClick={() => setMobileOpen(false)}
              className="rounded-xl px-3 py-3 text-sm font-semibold text-[#52605a] hover:bg-[#f4f8f5]"
            >
              {t("navFaq")}
            </a>
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-[#edf1ee] pt-3">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl border border-[#dce5e0] py-3 text-center text-sm font-bold"
              >
                {t("logIn")}
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl bg-[#138a5d] py-3 text-center text-sm font-bold text-white"
              >
                {t("createAccount")}
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>

    <section className="h-full border-b border-[#e4ebe7] bg-white pt-[68px]">
      <div className="mx-auto grid h-full max-w-6xl items-center gap-12 overflow-y-auto px-5 py-10 sm:px-6 sm:py-12 lg:grid-cols-[1fr_450px] lg:overflow-visible lg:px-8 lg:py-16">
        <div className="max-w-[560px]">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#138a5d]">
            {t("heroEyebrow")}
          </p>
          <h1 className="mt-4 text-[45px] font-semibold leading-[1.02] tracking-[-0.065em] text-[#10251d] sm:text-[58px]">
            {t("heroTitle")}
          </h1>
          <p className="mt-6 max-w-[500px] text-[16px] leading-7 text-[#69766f]">
            {t("heroDescription")}
          </p>
          <p className="mt-4 border-l-2 border-[#138a5d] pl-3 text-sm font-semibold tracking-[-0.01em] text-[#263a31]">
            {t("heroTagline")}
          </p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            <Link
              href="/register"
              className="group inline-flex h-11 items-center gap-2 rounded-xl bg-[#138a5d] px-5 text-[13px] font-bold text-white shadow-[0_8px_22px_rgba(19,138,93,.14)] transition hover:bg-[#0f7b52]"
            >
              {t("createAccount")}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <InstallAppButton className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#d7e1db] bg-white px-5 text-[13px] font-bold text-[#25352e] transition hover:border-[#b9cbc1]" />
          </div>
          <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-[12px] font-semibold text-[#7d8983]">
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-[#138a5d]" />
              {t("oneAccount")}
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-[#138a5d]" />
              {t("globalReady")}
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-[#138a5d]" />
              {t("builtForSecurity")}
            </span>
          </div>
        </div>
        <AccountPreview language={initialLanguage} />
      </div>
    </section>
  </div>

  <div className="h-screen" />

  <section
    id="products"
    className="relative z-20 scroll-mt-20 bg-[#f7faf8]"
  >
    <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6 lg:px-8 lg:py-20">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#138a5d]">
          {t("productsTitle")}
        </p>
        <h2 className="mt-2 whitespace-nowrap text-[32px] font-semibold tracking-[-0.05em] text-[#17231e] sm:text-[38px]">
          {t("productsHeading")}
        </h2>
        <p className="mt-3 max-w-[520px] text-sm leading-6 text-[#7d8983]">
          {t("productsDescription")}
        </p>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <WalletService language={initialLanguage} />
        <GoldService language={initialLanguage} />
        <CryptoService language={initialLanguage} />
        <GiftCardService language={initialLanguage} />
        <ReferralService language={initialLanguage} />
      </div>
    </div>
  </section>

  <section
    id="security"
    className="relative z-20 scroll-mt-20 border-y border-[#e4ebe7] bg-white"
  >
    <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6 lg:px-8 lg:py-16">
      <div className="rounded-[28px] border border-[#dfe8e3] bg-[#f7faf8] p-6 sm:p-8 lg:p-10">
        <div className="grid gap-9 lg:grid-cols-[.85fr_1.6fr] lg:items-center">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#138a5d]">
              {t("navSecurity")}
            </p>
            <h2 className="mt-2 text-[30px] font-semibold leading-tight tracking-[-0.045em] text-[#17231e] sm:text-[34px]">
              {t("securityTitle")}
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-[#7d8983]">
              {t("securityDescription")}
            </p>
          </div>
          <div className="divide-y divide-[#dfe8e3] rounded-2xl border border-[#dfe8e3] bg-white px-5">
            <div className="flex gap-4 py-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#edf7f2]">
                <ShieldCheck className="h-4 w-4 text-[#138a5d]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#24352d]">
                  {t("securityFeatureOneTitle")}
                </h3>
                <p className="mt-1 text-sm leading-5 text-[#89958f]">
                  {t("securityFeatureOneDescription")}
                </p>
              </div>
            </div>
            <div className="flex gap-4 py-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#edf7f2]">
                <LockKeyhole className="h-4 w-4 text-[#138a5d]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#24352d]">
                  {t("securityFeatureTwoTitle")}
                </h3>
                <p className="mt-1 text-sm leading-5 text-[#89958f]">
                  {t("securityFeatureTwoDescription")}
                </p>
              </div>
            </div>
            <div className="flex gap-4 py-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#edf7f2]">
                <Users className="h-4 w-4 text-[#138a5d]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#24352d]">
                  {t("securityFeatureThreeTitle")}
                </h3>
                <p className="mt-1 text-sm leading-5 text-[#89958f]">
                  {t("securityFeatureThreeDescription")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section className="relative z-20 border-b border-[#e4ebe7] bg-[#f7faf8]">
    <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6 lg:px-8 lg:py-16">
      <div className="grid items-center gap-10 overflow-hidden rounded-[28px] bg-[#0d2c21] px-6 py-9 text-white sm:px-9 lg:grid-cols-[1fr_300px] lg:px-12">
        <div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
            <Smartphone className="h-4 w-4 text-[#9de3c2]" />
          </div>
          <h2 className="mt-5 max-w-lg text-[29px] font-semibold leading-tight tracking-[-0.045em] sm:text-[34px]">
            {t("appSectionTitle")}
          </h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-white/50">
            {t("appSectionDescription")}
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <div className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5">
              <p className="text-[9px] uppercase tracking-[0.12em] text-white/35">
                {t("availableOn")}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-white/80">
                iPhone
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5">
              <p className="text-[9px] uppercase tracking-[0.12em] text-white/35">
                {t("availableOn")}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-white/80">
                Android
              </p>
            </div>
          </div>
        </div>
        <div className="hidden justify-end lg:flex">
          <div className="w-[230px] rounded-[26px] border border-white/10 bg-white/[0.06] p-2.5 shadow-2xl">
            <div className="rounded-[20px] bg-[#f7faf8] p-3.5 text-[#17231e]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black tracking-[-0.04em]">
                  Moo<span className="text-[#138a5d]">Gold</span>
                </span>
                <span className="h-2 w-2 rounded-full bg-[#138a5d]" />
              </div>
              <div className="mt-5 rounded-xl bg-[#0d2c21] p-3.5 text-white">
                <p className="text-[8px] uppercase tracking-[0.14em] text-white/40">
                  {t("availableBalance")}
                </p>
                <p className="mt-2 text-lg font-semibold">
                  {t("availableCash")}
                </p>
              </div>
              <div className="mt-2.5 flex gap-2">
                <div className="h-12 flex-1 rounded-xl bg-[#edf7f2]" />
                <div className="h-12 flex-1 rounded-xl bg-[#edf7f2]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section
    id="faq"
    className="relative z-20 scroll-mt-20 border-b border-[#e4ebe7] bg-[#f7faf8]"
  >
    <div className="mx-auto max-w-3xl px-5 py-14 sm:px-6 lg:py-18">
      <div className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#138a5d]">
          {t("navFaq")}
        </p>
        <h2 className="mt-2 text-[32px] font-semibold tracking-[-0.045em] text-[#17231e] sm:text-[36px]">
          {t("faqTitle")}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#7d8983]">
          {t("faqDescription")}
        </p>
      </div>
      <div className="mt-7 divide-y divide-[#e5ebe8] overflow-hidden rounded-2xl border border-[#dfe7e2] bg-white">
        {faqKeys.map((faq, index) => {
          const open = openFaq === index;

          return (
            <div key={faq.question}>
              <button
                type="button"
                onClick={() => setOpenFaq(open ? null : index)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-5 px-5 py-5 text-left transition hover:bg-[#fbfcfb]"
              >
                <span className="text-sm font-semibold text-[#25352e]">
                  {t(faq.question)}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-[#8d9892] transition-transform ${open ? "rotate-180" : ""}`}
                />
              </button>
              {open ? (
                <div className="px-5 pb-5">
                  <p className="max-w-2xl text-sm leading-6 text-[#7e8b84]">
                    {t(faq.answer)}
                  </p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  </section>

  <section className="relative z-20 bg-white">
    <div className="mx-auto max-w-6xl px-5 py-16 text-center sm:px-6 lg:px-8 lg:py-20">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#138a5d]">
        MooGold
      </p>
      <h2 className="mx-auto mt-3 max-w-xl text-[34px] font-semibold leading-tight tracking-[-0.055em] text-[#17231e] sm:text-[42px]">
        {t("finalCtaTitle")}
      </h2>
      <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#89958f]">
        {t("finalCtaDescription")}
      </p>
      <div className="mt-7 flex justify-center">
        <Link
          href="/register"
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#138a5d] px-5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#0f7b52]"
        >
          {t("getStarted")}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  </section>

  <footer className="relative z-20 border-t border-[#e4ebe7] bg-[#f7faf8]">
    <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
      <Link
        href="/"
        className="text-[15px] font-black tracking-[-0.06em]"
      >
        Moo<span className="text-[#138a5d]">Gold</span>
      </Link>
      <p className="text-[11px] font-medium text-[#9aa49f]">
        {t("footerServices")}
      </p>
    </div>
  </footer>
</main>

);
}
