import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/current-user";
import { getCountryFinancialConfig } from "@/lib/countries";

import LocalWealthFundingForm from "./local-wealth-funding-form";

type PageProps = {
  searchParams: Promise<{
    method?: string;
    planId?: string;
    amount?: string;
  }>;
};

const METHOD_DETAILS = {
  GCASH: {
    label: "GCash",
    logo: "/images/gcash-symbol.svg",
    country: "PH",
  },
  MAYA: {
    label: "Maya",
    logo: "/images/maya.jpg",
    country: "PH",
  },
  TOUCH_N_GO: {
    label: "Touch ’n Go",
    logo: "/images/touch-n-go.svg",
    country: "MY",
  },
} as const;

export default async function LocalWealthPaymentPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const method = String(params.method ?? "").toUpperCase();
  const planId = String(params.planId ?? "").trim();
  const amount = String(params.amount ?? "").trim();

  if (
    !Object.prototype.hasOwnProperty.call(METHOD_DETAILS, method) ||
    !planId ||
    !amount ||
    !Number.isFinite(Number(amount.replace(/,/g, ""))) ||
    Number(amount.replace(/,/g, "")) <= 0
  ) {
    redirect("/dashboard/wealth-box");
  }

  const typedMethod = method as keyof typeof METHOD_DETAILS;
  const payment = METHOD_DETAILS[typedMethod];

  const { user } = await getCurrentUser();
  const country = getCountryFinancialConfig(user.countryCode);

  if (!country) {
    redirect("/dashboard/profile");
  }

  if (country.code.toUpperCase() !== payment.country) {
    redirect("/dashboard/wealth-box");
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-4 pb-8 pt-2">
      <Link
        href={`/dashboard/wealth-box/invest?planId=${encodeURIComponent(planId)}&amount=${encodeURIComponent(amount)}`}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-slate-100 px-3.5 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </Link>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <LocalWealthFundingForm
          method={typedMethod}
          planId={planId}
          amount={amount}
          currency={country.currency}
        />
      </section>
    </div>
  );
}