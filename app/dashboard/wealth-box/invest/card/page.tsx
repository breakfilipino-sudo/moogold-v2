import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/current-user";
import { getCountryFinancialConfig } from "@/lib/countries";
import { prisma } from "@/lib/prisma";

import CardWealthFundingForm from "./card-wealth-funding-form";

export const dynamic = "force-dynamic";

type SearchParams = {
planId?: string;
amount?: string;
};

export default async function CardWealthFundingPage({
searchParams,
}: {
searchParams: Promise<SearchParams>;
}) {
const params = await searchParams;

const planId = params.planId?.trim();
const amount = params.amount?.trim();

if (!planId || !amount) {
return ( <main className="min-h-full bg-[#f7faf8]"> <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8"> <Link
         href="/dashboard/wealth-box"
         className="inline-flex items-center gap-2 text-sm font-semibold text-[#53665e] transition hover:text-[#173b2f]"
       > <ArrowLeft className="h-4 w-4" />
Back to Wealth Box </Link>

      <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h1 className="text-xl font-bold text-[#173b2f]">
          Investment details missing
        </h1>

        <p className="mt-2 text-sm leading-6 text-[#71827b]">
          Please go back and choose your plan again.
        </p>

        <Link
          href="/dashboard/wealth-box"
          className="mt-6 inline-flex rounded-xl bg-[#173b2f] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#245343]"
        >
          Back to Wealth Box
        </Link>
      </div>
    </div>
  </main>
);

}

const numericAmount = Number(
amount.replace(/[^0-9.]/g, ""),
);

if (
!Number.isFinite(numericAmount) ||
numericAmount <= 0
) {
return ( <main className="min-h-full bg-[#f7faf8]"> <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8"> <Link
         href="/dashboard/wealth-box"
         className="inline-flex items-center gap-2 text-sm font-semibold text-[#53665e] transition hover:text-[#173b2f]"
       > <ArrowLeft className="h-4 w-4" />
Back to Wealth Box </Link>

      <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h1 className="text-xl font-bold text-[#173b2f]">
          Invalid investment amount
        </h1>

        <p className="mt-2 text-sm leading-6 text-[#71827b]">
          Please go back and enter your investment
          amount again.
        </p>

        <Link
          href="/dashboard/wealth-box"
          className="mt-6 inline-flex rounded-xl bg-[#173b2f] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#245343]"
        >
          Back to Wealth Box
        </Link>
      </div>
    </div>
  </main>
);

}

const currentUser = await getCurrentUser();
const user = currentUser.user;

if (!user.countryCode) {
return ( <main className="min-h-full bg-[#f7faf8]"> <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8"> <Link
         href="/dashboard/wealth-box"
         className="inline-flex items-center gap-2 text-sm font-semibold text-[#53665e] transition hover:text-[#173b2f]"
       > <ArrowLeft className="h-4 w-4" />
Back to Wealth Box </Link>

      <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h1 className="text-xl font-bold text-[#173b2f]">
          Country details required
        </h1>

        <p className="mt-2 text-sm leading-6 text-[#71827b]">
          Please update your account country before
          making an investment.
        </p>

        <Link
          href="/dashboard/settings"
          className="mt-6 inline-flex rounded-xl bg-[#173b2f] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#245343]"
        >
          Go to settings
        </Link>
      </div>
    </div>
  </main>
);

}

const countryConfig =
getCountryFinancialConfig(user.countryCode);

if (!countryConfig) {
return ( <main className="min-h-full bg-[#f7faf8]"> <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8"> <Link
         href="/dashboard/wealth-box"
         className="inline-flex items-center gap-2 text-sm font-semibold text-[#53665e] transition hover:text-[#173b2f]"
       > <ArrowLeft className="h-4 w-4" />
Back to Wealth Box </Link>

      <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h1 className="text-xl font-bold text-[#173b2f]">
          Country not supported
        </h1>

        <p className="mt-2 text-sm leading-6 text-[#71827b]">
          Your registered country is not currently
          available for Wealth Box.
        </p>

        <Link
          href="/dashboard/wealth-box"
          className="mt-6 inline-flex rounded-xl bg-[#173b2f] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#245343]"
        >
          Back to Wealth Box
        </Link>
      </div>
    </div>
  </main>
);

}

const plan = await prisma.wealthPlan.findFirst({
where: {
id: planId,
active: true,
},
});

if (!plan) {
return ( <main className="min-h-full bg-[#f7faf8]"> <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8"> <Link
         href="/dashboard/wealth-box"
         className="inline-flex items-center gap-2 text-sm font-semibold text-[#53665e] transition hover:text-[#173b2f]"
       > <ArrowLeft className="h-4 w-4" />
Back to Wealth Box </Link>

      <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h1 className="text-xl font-bold text-[#173b2f]">
          Plan not found
        </h1>

        <p className="mt-2 text-sm leading-6 text-[#71827b]">
          This Wealth Box plan is no longer available.
        </p>

        <Link
          href="/dashboard/wealth-box"
          className="mt-6 inline-flex rounded-xl bg-[#173b2f] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#245343]"
        >
          Back to Wealth Box
        </Link>
      </div>
    </div>
  </main>
);

}

const countryPlan =
await prisma.wealthPlanCountry.findFirst({
where: {
planId: plan.id,
countryCode: countryConfig.code,
active: true,
},
});

if (!countryPlan) {
return ( <main className="min-h-full bg-[#f7faf8]"> <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8"> <Link
         href="/dashboard/wealth-box"
         className="inline-flex items-center gap-2 text-sm font-semibold text-[#53665e] transition hover:text-[#173b2f]"
       > <ArrowLeft className="h-4 w-4" />
Back to Wealth Box </Link>

      <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h1 className="text-xl font-bold text-[#173b2f]">
          Plan unavailable
        </h1>

        <p className="mt-2 text-sm leading-6 text-[#71827b]">
          This plan is not currently available in
          your country.
        </p>

        <Link
          href="/dashboard/wealth-box"
          className="mt-6 inline-flex rounded-xl bg-[#173b2f] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#245343]"
        >
          Back to Wealth Box
        </Link>
      </div>
    </div>
  </main>
);

}

const minimumLocalAmount = Number(
countryPlan.minimumLocalAmount,
);

const maximumLocalAmount =
countryPlan.maximumLocalAmount === null
? null
: Number(countryPlan.maximumLocalAmount);

const amountIsValid =
numericAmount >= minimumLocalAmount &&
(maximumLocalAmount === null ||
numericAmount <= maximumLocalAmount);

if (!amountIsValid) {
return ( <main className="min-h-full bg-[#f7faf8]"> <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
<Link
href={`/dashboard/wealth-box/invest?planId=${encodeURIComponent(
              plan.id,
            )}&amount=${encodeURIComponent(
              numericAmount.toString(),
            )}`}
className="inline-flex items-center gap-2 text-sm font-semibold text-[#53665e] transition hover:text-[#173b2f]"
> <ArrowLeft className="h-4 w-4" />
Back </Link>

      <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h1 className="text-xl font-bold text-[#173b2f]">
          Investment amount is not valid
        </h1>

        <p className="mt-2 text-sm leading-6 text-red-600">
          Please go back and choose a valid
          investment amount.
        </p>

        <Link
          href="/dashboard/wealth-box"
          className="mt-6 inline-flex rounded-xl bg-[#173b2f] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#245343]"
        >
          Back to Wealth Box
        </Link>
      </div>
    </div>
  </main>
);

}

const localToUsdPreviewRate =
minimumLocalAmount > 0
? Number(plan.minimumUsd) /
minimumLocalAmount
: 0;

const estimatedUsd =
localToUsdPreviewRate > 0
? numericAmount * localToUsdPreviewRate
: 0;

return ( <main className="min-h-full bg-[#f7faf8]"> <div className="mx-auto max-w-2xl px-4 py-6 pb-10 sm:px-6 lg:px-8">
<Link
href={`/dashboard/wealth-box/invest?planId=${encodeURIComponent(
            plan.id,
          )}&amount=${encodeURIComponent(
            numericAmount.toString(),
          )}`}
className="inline-flex items-center gap-2 text-sm font-semibold text-[#53665e] transition hover:text-[#173b2f]"
> <ArrowLeft className="h-4 w-4" />
Back </Link>

    <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-6">
      <CardWealthFundingForm
        planId={plan.id}
        amount={numericAmount.toString()}
        currency={countryConfig.currency}
        currencySymbol={countryConfig.currencySymbol}
        localAmount={numericAmount}
        usdAmount={estimatedUsd}
      />
    </section>
  </div>
</main>

);
}
