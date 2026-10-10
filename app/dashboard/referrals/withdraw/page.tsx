import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  getWithdrawalCountryConfig,
  isSupportedWithdrawalCountry,
} from "@/lib/withdrawal";

import ReferralWithdrawalForm from "./withdraw-form";

type ReferralWithdrawalPageProps = {
  searchParams: Promise<{
    success?: string;
  }>;
};

export default async function ReferralWithdrawalPage({
  searchParams,
}: ReferralWithdrawalPageProps) {
  const params = await searchParams;

  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: {
      authUserId: authUser.id,
    },
    include: {
      wallet: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  const referralBalance = Number(
    user.wallet?.referralBalance?.toString() ?? "0",
  );

  const countryCode = user.countryCode;

  const withdrawalConfig =
    isSupportedWithdrawalCountry(countryCode)
      ? getWithdrawalCountryConfig(countryCode)
      : null;

  const accountName =
    user.fullName?.trim() ||
    user.email?.split("@")[0] ||
    "MooGold User";

  const isEligible = referralBalance >= 100;

  if (!withdrawalConfig) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/dashboard/referrals"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Referrals
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black text-slate-900">
            Referral withdrawal unavailable
          </h1>

          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500">
            Your country is not currently configured for
            referral withdrawals.
          </p>
        </div>
      </main>
    );
  }

  if (!isEligible) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/dashboard/referrals"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Referrals
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <ShieldCheck className="h-7 w-7 text-slate-700" />
          </div>

          <p className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-400">
            Referral withdrawal
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
            $100 minimum balance required
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-500">
            Referral withdrawals become available when your
            referral balance reaches $100.00.
          </p>

          <div className="mt-8 rounded-2xl bg-slate-50 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500">
                Current referral balance
              </span>

              <span className="text-xl font-black text-slate-900">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(referralBalance)}
              </span>
            </div>
          </div>

          <Link
            href="/dashboard/referrals"
            className="mt-6 inline-flex items-center justify-center rounded-2xl bg-slate-950 px-6 py-4 text-sm font-black text-white transition hover:bg-slate-800"
          >
            Back to Referrals
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link
          href="/dashboard/referrals"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Referrals
        </Link>
      </div>

      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Referral earnings
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
          Withdraw referral earnings
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Withdraw your available referral balance directly
          to your bank account.
        </p>
      </div>

      <ReferralWithdrawalForm
        referralBalance={referralBalance}
        accountName={accountName}
        withdrawalConfig={withdrawalConfig}
        successReference={params.success}
      />
    </main>
  );
}