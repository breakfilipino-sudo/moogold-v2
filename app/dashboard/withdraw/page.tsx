import { redirect } from "next/navigation";

import { getCountryFinancialConfig } from "@/lib/countries";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  getWithdrawalCountryConfig,
  isSupportedWithdrawalCountry,
} from "@/lib/withdrawal";

import WithdrawForm from "./withdraw-form";

interface WithdrawPageProps {
  searchParams: Promise<{
    success?: string;
  }>;
}

export default async function WithdrawPage({
  searchParams,
}: WithdrawPageProps) {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  let user = await prisma.user.findUnique({
    where: {
      authUserId: authUser.id,
    },
    include: {
      wallet: true,
    },
  });

  if (!user) {
    const { provisionUser } = await import(
      "@/lib/auth/provision-user"
    );

    await provisionUser({
      authUserId: authUser.id,
      email: authUser.email,
      phone: authUser.phone,
    });

    user = await prisma.user.findUnique({
      where: {
        authUserId: authUser.id,
      },
      include: {
        wallet: true,
      },
    });
  }

  if (!user) {
    redirect("/login");
  }

  const countryCode = user.countryCode;

  if (!isSupportedWithdrawalCountry(countryCode)) {
    return (
      <div className="mx-auto w-full max-w-2xl pb-10">
        <div className="rounded-3xl border border-black/6 bg-white p-6 shadow-[0_16px_45px_rgba(16,32,27,0.05)] sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700/60">
            Withdraw
          </p>

          <h1 className="mt-2 text-2xl font-black tracking-tight text-[#10201b]">
            Withdrawal unavailable
          </h1>

          <p className="mt-2 max-w-lg text-sm leading-6 text-black/45">
            We could not determine the supported banking
            configuration for your account. Please update your
            account country before requesting a withdrawal.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a
              href="/dashboard/wallet"
              className="flex h-12 items-center justify-center rounded-xl bg-[#10201b] px-5 text-sm font-black text-white transition hover:bg-[#18352d] sm:flex-1"
            >
              Back to Wallet
            </a>

            <a
              href="/dashboard/settings"
              className="flex h-12 items-center justify-center rounded-xl border border-black/10 bg-white px-5 text-sm font-bold text-[#10201b] transition hover:bg-black/5 sm:flex-1"
            >
              Account Settings
            </a>
          </div>
        </div>
      </div>
    );
  }

  const withdrawalConfig =
    getWithdrawalCountryConfig(countryCode);

  if (!withdrawalConfig) {
    redirect("/dashboard/withdraw");
  }

  const financialConfig =
    getCountryFinancialConfig(countryCode);

  if (!financialConfig) {
    redirect("/dashboard/profile");
  }

  const cashBalance = Number(
    user.wallet?.cashBalance ?? 0,
  );

  const accountHolder =
    user.fullName?.trim() ||
    user.email?.split("@")[0] ||
    "MooGold User";

  const params = await searchParams;

  const successReference =
    typeof params.success === "string" &&
    params.success.trim()
      ? params.success.trim()
      : undefined;

  return (
    <WithdrawForm
      cashBalance={cashBalance}
      accountHolder={accountHolder}
      withdrawalConfig={withdrawalConfig}
      currency={financialConfig.currency}
      currencySymbol={financialConfig.currencySymbol}
      successReference={successReference}
    />
  );
}