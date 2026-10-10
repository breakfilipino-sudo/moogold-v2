import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/current-user";
import { getCountryFinancialConfig } from "@/lib/countries";
import { prisma } from "@/lib/prisma";

import CryptoWealthFundingForm from "./crypto-wealth-funding-form";

export const dynamic = "force-dynamic";

type CryptoFundingPageProps = {
searchParams: Promise<{
planId?: string;
amount?: string;
}>;
};

export default async function CryptoFundingPage({
searchParams,
}: CryptoFundingPageProps) {
const currentUser = await getCurrentUser();
const user = currentUser.user;

const params = await searchParams;

const planId = params.planId;

const amountValue = Number(
params.amount?.replace(/[^0-9.]/g, "") ?? 0,
);

const financialConfig =
getCountryFinancialConfig(user.countryCode);

const currency =
financialConfig?.currency ?? "USD";

if (
!planId ||
!Number.isFinite(amountValue) ||
amountValue <= 0 ||
!user.countryCode
) {
return ( <main className="min-h-full bg-[#f7faf8]"> <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8"> <Link
         href="/dashboard/wealth-box"
         className="inline-flex items-center gap-2 text-sm font-semibold text-[#53665e] hover:text-[#173b2f]"
       > <ArrowLeft className="h-4 w-4" />
Back to Wealth Box </Link>

      <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h1 className="text-xl font-bold text-[#173b2f]">
          Investment not found
        </h1>

        <p className="mt-2 text-sm leading-6 text-[#71827b]">
          We could not find the investment details.
          Please go back and choose your plan again.
        </p>

        <Link
          href="/dashboard/wealth-box"
          className="mt-6 inline-flex rounded-xl bg-[#173b2f] px-5 py-3 text-sm font-bold text-white hover:bg-[#245343]"
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
         className="inline-flex items-center gap-2 text-sm font-semibold text-[#53665e] hover:text-[#173b2f]"
       > <ArrowLeft className="h-4 w-4" />
Back to Wealth Box </Link>

      <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h1 className="text-xl font-bold text-[#173b2f]">
          Plan not available
        </h1>

        <p className="mt-2 text-sm leading-6 text-[#71827b]">
          This investment plan is no longer available.
        </p>
      </div>
    </div>
  </main>
);

}

const countryConfig =
await prisma.wealthPlanCountry.findFirst({
where: {
planId: plan.id,
countryCode: user.countryCode,
active: true,
},
});

if (!countryConfig) {
return ( <main className="min-h-full bg-[#f7faf8]"> <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8"> <Link
         href="/dashboard/wealth-box"
         className="inline-flex items-center gap-2 text-sm font-semibold text-[#53665e] hover:text-[#173b2f]"
       > <ArrowLeft className="h-4 w-4" />
Back to Wealth Box </Link>

      <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h1 className="text-xl font-bold text-[#173b2f]">
          Plan not available
        </h1>

        <p className="mt-2 text-sm leading-6 text-[#71827b]">
          This investment plan is not available
          for your registered country.
        </p>
      </div>
    </div>
  </main>
);

}

const minimumLocalAmount = Number(
countryConfig.minimumLocalAmount,
);

const maximumLocalAmount =
countryConfig.maximumLocalAmount !== null
? Number(countryConfig.maximumLocalAmount)
: null;

const amountIsValid =
Number.isFinite(minimumLocalAmount) &&
minimumLocalAmount > 0 &&
amountValue >= minimumLocalAmount &&
(maximumLocalAmount === null ||
amountValue <= maximumLocalAmount);

if (!amountIsValid) {
return ( <main className="min-h-full bg-[#f7faf8]"> <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
<Link
href={`/dashboard/wealth-box/invest?planId=${encodeURIComponent(
              plan.id,
            )}&amount=${encodeURIComponent(
              amountValue.toString(),
            )}`}
className="inline-flex items-center gap-2 text-sm font-semibold text-[#53665e] hover:text-[#173b2f]"
> <ArrowLeft className="h-4 w-4" />
Back </Link>

      <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h1 className="text-xl font-bold text-[#173b2f]">
          Check your amount
        </h1>

        <p className="mt-2 text-sm leading-6 text-red-600">
          Please go back and enter a valid investment
          amount.
        </p>

        <Link
          href="/dashboard/wealth-box"
          className="mt-6 inline-flex rounded-xl bg-[#173b2f] px-5 py-3 text-sm font-bold text-white hover:bg-[#245343]"
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
? amountValue * localToUsdPreviewRate
: 0;

const commonParams = new URLSearchParams({
planId: plan.id,
amount: amountValue.toString(),
});

return ( <main className="min-h-full bg-[#f7faf8]"> <div className="mx-auto max-w-2xl px-4 py-6 pb-10 sm:px-6 lg:px-8">
<Link
href={`/dashboard/wealth-box/invest?${commonParams.toString()}`}
className="inline-flex items-center gap-2 text-sm font-semibold text-[#53665e] hover:text-[#173b2f]"
> <ArrowLeft className="h-4 w-4" />
Back </Link>

    <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <CryptoWealthFundingForm
        planId={plan.id}
        amount={amountValue.toString()}
        currency={currency}
        localAmount={amountValue}
        usdAmount={estimatedUsd}
      />
    </section>
  </div>
</main>

);
}
