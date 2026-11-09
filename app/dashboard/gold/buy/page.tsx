import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getGoldMarketData } from "@/lib/markets/gold";
import { getCountryFinancialConfig } from "@/lib/countries";
import { getUsdToLocalRate } from "@/lib/currency";
import BuyGoldForm from "@/components/dashboard/gold/buy-gold-form";

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export default async function BuyGoldPage() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const [user, gold] = await Promise.all([
    prisma.user.findUnique({
      where: { authUserId: authUser.id },
      include: { wallet: true },
    }),
    getGoldMarketData(),
  ]);

  if (!user) {
    redirect("/login");
  }

  const walletBalance = Number(user.wallet?.cashBalance ?? 0);
  const financialConfig = getCountryFinancialConfig(user.countryCode);
  const localCurrency = financialConfig?.currency ?? "USD";
  const localRate = await getUsdToLocalRate(localCurrency);
  const localWalletBalance =
    localRate === null ? null : walletBalance * localRate;

  const goldPrice = Number(gold?.price ?? 0);
  const changePercent = Number(gold?.changePercent ?? 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <div className="flex flex-col gap-4 rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/gold"
            aria-label="Back to Gold"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Buy Gold
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Purchase gold using your available wallet balance.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl bg-[#f5f8f6] px-4 py-3 sm:min-w-[190px]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Gold price
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {goldPrice > 0 ? `${money(goldPrice)} / oz` : "Unavailable"}
            </p>
          </div>
          <p
            className={[
              "rounded-lg px-2.5 py-1 text-xs font-bold",
              changePercent >= 0
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-600",
            ].join(" ")}
          >
            {changePercent >= 0 ? "+" : ""}
            {changePercent.toFixed(2)}%
          </p>
        </div>
      </div>

      <BuyGoldForm
        walletBalance={walletBalance}
        localCurrency={localCurrency}
        localWalletBalance={localWalletBalance}
        goldPrice={goldPrice}
        goldAskPrice={null}
      />
    </div>
  );
}
