import Image from "next/image";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  ArrowLeft,
  ChevronRight,
  AlertCircle,
  Sparkles,
  Lock,
} from "lucide-react";

type PageProps = {
  searchParams: Promise<{
    planId?: string;
    amount?: string;
  }>;
};

function PaymentOption({
  href,
  logo,
  name,
  description,
  hoverBorder = "hover:border-emerald-300",
  hoverText = "group-hover:text-emerald-800",
  hoverArrow = "group-hover:bg-emerald-600",
}: {
  href: string;
  logo: string;
  name: string;
  description: string;
  hoverBorder?: string;
  hoverText?: string;
  hoverArrow?: string;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${hoverBorder} sm:p-5`}
    >
      <div className="flex h-14 w-16 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white p-2 shadow-sm">
        <Image
          src={logo}
          alt={`${name} logo`}
          width={52}
          height={44}
          unoptimized
          className="h-10 w-12 object-contain"
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className={`text-sm font-extrabold text-[#10201b] transition-colors ${hoverText}`}>
          {name}
        </p>
        <p className="mt-0.5 text-xs font-medium leading-relaxed text-slate-500">
          {description}
        </p>
      </div>

      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 transition-all group-hover:text-white ${hoverArrow}`}>
        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

export default async function WealthBoxFundingPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const planId = String(params.planId ?? "").trim();
  const amount = String(params.amount ?? "").trim();

  if (!planId || !amount) {
    return (
      <div className="mx-auto max-w-xl space-y-5 pb-12 pt-2">
        <Link
          href="/dashboard/wealth-box"
          className="group inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 transition-colors hover:text-emerald-700"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Wealth Box
        </Link>

        <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-b from-white via-slate-50/40 to-slate-100/50 p-6 text-center shadow-xl shadow-slate-200/50">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <AlertCircle className="h-6 w-6" />
          </div>

          <h1 className="mt-4 text-lg font-extrabold tracking-tight text-[#10201b]">
            Investment details are missing
          </h1>
          <p className="mx-auto mt-1.5 max-w-md text-xs font-medium leading-relaxed text-slate-500">
            Please return to Wealth Box and select your investment again.
          </p>

          <Link
            href="/dashboard/wealth-box"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl bg-emerald-600 px-5 text-xs font-extrabold text-white shadow-lg transition-all hover:bg-emerald-700 active:scale-[0.98]"
          >
            Back to Wealth Box
          </Link>
        </section>
      </div>
    );
  }

  const query = `planId=${encodeURIComponent(planId)}&amount=${encodeURIComponent(amount)}`;
  const { user } = await getCurrentUser();
  const registeredCountryCode = String(
    user.countryCode ?? "",
  ).toUpperCase();

  return (
    <div className="mx-auto max-w-xl space-y-5 pb-10 pt-2">
      <Link
        href="/dashboard/wealth-box"
        className="group inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 transition-colors hover:text-emerald-700"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Back to Wealth Box
      </Link>

      <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50/60 to-emerald-50/30 px-5 py-4 shadow-md shadow-slate-100/80">
        <div>
          <div className="inline-flex items-center gap-1 rounded-full bg-emerald-100/80 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-800">
            <Sparkles className="h-2.5 w-2.5 text-emerald-600" />
            Step 3
          </div>

          <h1 className="mt-1 text-lg font-extrabold tracking-tight text-[#10201b]">
            Fund your investment
          </h1>

          <p className="mt-0.5 text-xs font-medium text-slate-500">
            Choose your preferred payment method.
          </p>
        </div>
      </section>

      <section className="space-y-3.5">
        <PaymentOption
          href={`/dashboard/wealth-box/invest/special-card?${query}`}
          logo="/images/card.png"
          name="Credit or Debit Card"
          description="Deposit with your credit or debit card."
        />

<PaymentOption
          href={`/dashboard/wealth-box/invest/crypto?${query}`}
          logo="/images/bitcoin.svg"
          name="Crypto"
          description="Deposit using USDT, USDC, BTC, ETH, SOL, TRN or XLM."
        />

        {registeredCountryCode === "PH" && (
          <>
            <PaymentOption
              href={`/dashboard/wealth-box/invest/local-payment?method=GCASH&${query}`}
              logo="/images/gcash.svg"
              name="GCash"
              description="Fund your investment using GCash."
              hoverBorder="hover:border-blue-300"
              hoverText="group-hover:text-blue-800"
              hoverArrow="group-hover:bg-blue-600"
            />

            <PaymentOption
              href={`/dashboard/wealth-box/invest/local-payment?method=MAYA&${query}`}
              logo="/images/maya.jpg"
              name="Maya"
              description="Fund your investment using Maya."
              hoverBorder="hover:border-emerald-300"
              hoverText="group-hover:text-emerald-800"
              hoverArrow="group-hover:bg-emerald-600"
            />
          </>
        )}

        {registeredCountryCode === "MY" && (
          <PaymentOption
            href={`/dashboard/wealth-box/invest/local-payment?method=TOUCH_N_GO&${query}`}
            logo="/images/touch-n-go.svg"
            name="Touch ’n Go"
            description="Fund your investment using Touch ’n Go."
            hoverBorder="hover:border-blue-300"
            hoverText="group-hover:text-blue-800"
            hoverArrow="group-hover:bg-blue-600"
          />
        )}
      </section>

      <div className="flex items-center justify-center gap-1.5 pt-1 text-center text-xs font-semibold text-slate-400">
        <Lock className="h-3.5 w-3.5 text-emerald-600" />
        <span>Your investment starts after successful deposit</span>
      </div>
    </div>
  );
}