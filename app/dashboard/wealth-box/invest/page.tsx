import Link from "next/link";
import {
ArrowLeft,
CreditCard,
WalletCards,
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

const planId =
String(params.planId ?? "").trim();

const amount =
String(params.amount ?? "").trim();

if (!planId || !amount) {
return ( <div className="space-y-6 pb-10"> <Link
       href="/dashboard/wealth-box"
       className="inline-flex items-center gap-2 text-sm font-semibold text-black/45 transition hover:text-[#10201b]"
     > <ArrowLeft className="h-4 w-4" />
Back to Wealth Box </Link>

    <section className="rounded-[24px] border border-black/5 bg-white px-6 py-12 text-center">
      <h1 className="text-lg font-bold text-[#10201b]">
        Investment details are missing
      </h1>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/40">
        Please return to Wealth Box and select
        your investment again.
      </p>

      <Link
        href="/dashboard/wealth-box"
        className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700"
      >
        Back to Wealth Box
      </Link>
    </section>
  </div>
);

}

return ( <div className="space-y-6 pb-10"> <Link
     href="/dashboard/wealth-box"
     className="inline-flex items-center gap-2 text-sm font-semibold text-black/45 transition hover:text-[#10201b]"
   > <ArrowLeft className="h-4 w-4" />
Back to Wealth Box </Link>

  <section>
    <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700/55">
      Step 3
    </p>

    <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#10201b]">
      Fund your investment
    </h1>

    <p className="mt-2 max-w-xl text-sm leading-6 text-black/45">
      Choose how you want to fund your Wealth Box
      investment.
    </p>
  </section>

  <section className="space-y-3">
    <Link
      href={`/dashboard/wealth-box/invest/crypto?planId=${encodeURIComponent(
        planId,
      )}&amount=${encodeURIComponent(
        amount,
      )}`}
      className="group flex items-center gap-4 rounded-[24px] border border-black/5 bg-white p-5 text-left transition hover:border-emerald-200 hover:bg-emerald-50/30 sm:p-6"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-100">
        <WalletCards className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-base font-bold text-[#10201b]">
          Pay with crypto
        </p>

        <p className="mt-1 text-sm leading-5 text-black/40">
          Pay using USDT, USDC, BTC, ETH, SOL,
          TRN or XLM.
        </p>
      </div>

      <span className="text-sm font-bold text-emerald-700">
        Choose
      </span>
    </Link>

    <Link
      href={`/dashboard/wealth-box/invest/card?planId=${encodeURIComponent(
        planId,
      )}&amount=${encodeURIComponent(
        amount,
      )}`}
      className="group flex items-center gap-4 rounded-[24px] border border-black/5 bg-white p-5 text-left transition hover:border-emerald-200 hover:bg-emerald-50/30 sm:p-6"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-100">
        <CreditCard className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-base font-bold text-[#10201b]">
          Pay with card
        </p>

        <p className="mt-1 text-sm leading-5 text-black/40">
          Pay with your credit or debit card.
        </p>
      </div>

      <span className="text-sm font-bold text-emerald-700">
        Choose
      </span>
    </Link>
  </section>

  <p className="text-center text-xs leading-5 text-black/35">
    Your investment will start after your payment
    is received and confirmed.
  </p>
</div>

);
}
