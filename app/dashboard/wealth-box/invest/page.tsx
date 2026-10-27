import Link from "next/link";
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

        <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-b from-white via-slate-50/40 to-slate-100/50 p-6 text-center shadow-xl shadow-slate-200/50 backdrop-blur-xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-4 ring-amber-50/50">
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
            className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl bg-emerald-600 px-5 text-xs font-extrabold text-white shadow-lg shadow-emerald-600/25 transition-all hover:bg-emerald-700 hover:shadow-emerald-600/35 active:scale-[0.98]"
          >
            Back to Wealth Box
          </Link>
        </section>
      </div>
    );
  }

  const query = `planId=${encodeURIComponent(planId)}&amount=${encodeURIComponent(amount)}`;

  return (
    <div className="mx-auto max-w-xl space-y-5 pb-10 pt-2">
      {/* Top Navigation */}
      <Link
        href="/dashboard/wealth-box"
        className="group inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 transition-colors hover:text-emerald-700"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Back to Wealth Box
      </Link>

      {/* Compact Header Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50/60 to-emerald-50/30 px-5 py-4 shadow-md shadow-slate-100/80">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1 rounded-full bg-emerald-100/80 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-800">
              <Sparkles className="h-2.5 w-2.5 text-emerald-600" />
              Step 3
            </div>

            <h1 className="mt-1 text-lg font-extrabold tracking-tight text-[#10201b]">
              Fund your investment
            </h1>

            <p className="mt-0.5 text-xs font-medium text-slate-500">
              Choose how you want to fund your Wealth Box investment.
            </p>
          </div>
        </div>
      </section>

      {/* Payment Options Grid */}
      <section className="space-y-3.5">
        {/* Option 1: Crypto */}
        <Link
          href={`/dashboard/wealth-box/invest/crypto?${query}`}
          className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-900/5 sm:p-5"
        >
          {/* Real Crypto Visual Illustration */}
          <div className="relative flex h-14 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 p-2 shadow-inner ring-1 ring-white/10">
            <div className="absolute -left-2 -top-2 h-8 w-8 rounded-full bg-emerald-500/30 blur-md" />

            <div className="relative flex items-center justify-center">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 font-mono text-[9px] font-black text-slate-950 shadow-md shadow-emerald-500/40 ring-2 ring-slate-900">
                â‚®
              </div>
              <div className="-ml-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 font-mono text-[10px] font-black text-slate-950 shadow-md shadow-amber-500/40 ring-2 ring-slate-900">
                â‚¿
              </div>
              <div className="-ml-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 font-mono text-[9px] font-black text-white shadow-md shadow-blue-500/40 ring-2 ring-slate-900">
                Îž
              </div>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-base font-extrabold text-[#10201b] transition-colors group-hover:text-emerald-900">
              Crypto
            </p>
            <p className="mt-0.5 text-xs font-medium leading-relaxed text-slate-500">
              Deposit using USDT, USDC, BTC, ETH, SOL, TRN or XLM.
            </p>
          </div>

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 transition-all duration-300 group-hover:bg-emerald-600 group-hover:text-white group-hover:shadow-md group-hover:shadow-emerald-600/30">
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>

        {/* Option 2: Card */}
        <Link
          href={`/dashboard/wealth-box/invest/special-card?${query}`}
          className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-900/5 sm:p-5"
        >
          {/* Realistic Bank Card Visual */}
          <div className="relative flex h-14 w-16 shrink-0 flex-col justify-between overflow-hidden rounded-xl bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 p-2 shadow-sm ring-1 ring-white/10">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

            <div className="flex items-center justify-between">
              <div className="h-2.5 w-3.5 rounded-sm bg-gradient-to-tr from-amber-300 via-amber-200 to-amber-400 shadow-sm" />
              <div className="text-[7px] font-mono font-bold tracking-widest text-slate-400">
                â€¢â€¢ 88
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[6px] font-extrabold uppercase tracking-widest text-slate-300">
                CARD
              </span>
              <div className="flex -space-x-1">
                <div className="h-3 w-3 rounded-full bg-red-500 opacity-90" />
                <div className="h-3 w-3 rounded-full bg-amber-400 opacity-90" />
              </div>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-base font-extrabold text-[#10201b] transition-colors group-hover:text-emerald-900">
              Credit or Debit Card
            </p>
            <p className="mt-0.5 text-xs font-medium leading-relaxed text-slate-500">
              Deposit with your credit or debit card.
            </p>
          </div>

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 transition-all duration-300 group-hover:bg-emerald-600 group-hover:text-white group-hover:shadow-md group-hover:shadow-emerald-600/30">
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>
      </section>

      {/* Footer Security Note */}
      <div className="flex items-center justify-center gap-1.5 pt-1 text-center text-xs font-semibold text-slate-400">
        <Lock className="h-3.5 w-3.5 text-emerald-600" />
        <span>Your investment starts after successful deposit</span>
      </div>
    </div>
  );
}
