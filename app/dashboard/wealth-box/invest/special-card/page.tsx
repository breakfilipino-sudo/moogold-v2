import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/current-user";
import { getCountryFinancialConfig } from "@/lib/countries";
import { prisma } from "@/lib/prisma";

import SpecialCardSubmissionForm from "./special-card-submission-form";

export const dynamic = "force-dynamic";

type SearchParams = {
  planId?: string;
  amount?: string;
};

function ErrorPanel({
  title,
  message,
  href = "/dashboard/wealth-box",
  linkLabel = "Back to Wealth Box",
}: {
  title: string;
  message: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
      <h1 className="text-xl font-bold text-[#173b2f]">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-[#71827b]">{message}</p>
      <Link
        href={href}
        className="mt-6 inline-flex rounded-xl bg-[#173b2f] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#245343]"
      >
        {linkLabel}
      </Link>
    </div>
  );
}

export default async function SpecialCardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const planId = String(params.planId ?? "").trim();
  const amountText = String(params.amount ?? "").trim();
  const numericAmount = Number(amountText.replace(/[^0-9.]/g, ""));

  return (
    <main className="min-h-full bg-[#f7faf8]">
      <div className="mx-auto max-w-2xl px-4 py-6 pb-10 sm:px-6 lg:px-8">
        <Link
          href={
            planId && amountText
              ? `/dashboard/wealth-box/invest?planId=${encodeURIComponent(planId)}&amount=${encodeURIComponent(amountText)}`
              : "/dashboard/wealth-box"
          }
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#53665e] transition hover:text-[#173b2f]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        {!planId || !amountText ? (
          <ErrorPanel
            title="Investment details missing"
            message="Return to Wealth Box and choose your investment plan and amount again."
          />
        ) : !Number.isFinite(numericAmount) || numericAmount <= 0 ? (
          <ErrorPanel
            title="Invalid investment amount"
            message="Return to Wealth Box and enter a valid amount."
          />
        ) : (
          await renderValidatedForm(planId, numericAmount)
        )}
      </div>
    </main>
  );
}

async function renderValidatedForm(planId: string, numericAmount: number) {
  const currentUser = await getCurrentUser();
  const user = currentUser.user;

  if (!user.countryCode) {
    return (
      <ErrorPanel
        title="Country details required"
        message="Please update your registered country before funding a Wealth Box investment."
        href="/dashboard/settings"
        linkLabel="Go to settings"
      />
    );
  }

  const countryConfig = getCountryFinancialConfig(user.countryCode);

  if (!countryConfig) {
    return (
      <ErrorPanel
        title="Country not supported"
        message="Your registered country is not currently available for Wealth Box."
      />
    );
  }

  const plan = await prisma.wealthPlan.findFirst({
    where: { id: planId, active: true },
  });

  if (!plan) {
    return (
      <ErrorPanel
        title="Plan not found"
        message="This Wealth Box plan is no longer available."
      />
    );
  }

  const countryPlan = await prisma.wealthPlanCountry.findFirst({
    where: {
      planId: plan.id,
      countryCode: countryConfig.code,
      active: true,
    },
  });

  if (!countryPlan) {
    return (
      <ErrorPanel
        title="Plan unavailable"
        message="This plan is not currently available in your registered country."
      />
    );
  }

  const minimumLocalAmount = Number(countryPlan.minimumLocalAmount);
  const maximumLocalAmount =
    countryPlan.maximumLocalAmount === null
      ? null
      : Number(countryPlan.maximumLocalAmount);

  if (
    numericAmount < minimumLocalAmount ||
    (maximumLocalAmount !== null && numericAmount > maximumLocalAmount)
  ) {
    return (
      <ErrorPanel
        title="Investment amount is not valid"
        message="Please return to Wealth Box and choose an amount within the permitted range."
      />
    );
  }

  const previewRate =
    minimumLocalAmount > 0 ? Number(plan.minimumUsd) / minimumLocalAmount : 0;

  const estimatedUsd = previewRate > 0 ? numericAmount * previewRate : 0;
  const registeredName =
    String(user.fullName ?? "").trim() ||
    String(user.email ?? "").trim() ||
    "Registered account holder";

  return (
    <section className="mx-auto mt-6 w-full max-w-sm rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-6">
      <SpecialCardSubmissionForm
        planId={plan.id}
        amount={numericAmount.toString()}
        registeredName={registeredName}
        registeredPhone={String(user.phone ?? "")}
        currency={countryConfig.currency}
        currencySymbol={countryConfig.currencySymbol}
        localAmount={numericAmount}
        usdAmount={estimatedUsd}
      />
    </section>
  );
}