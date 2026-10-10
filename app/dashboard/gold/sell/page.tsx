import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Coins,
  WalletCards,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getGoldMarketData } from "@/lib/markets/gold";
import SellGoldForm from "@/components/dashboard/gold/sell/sell-gold-form";

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export default async function SellGoldPage() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const [user, gold] = await Promise.all([
    prisma.user.findUnique({
      where: {
        authUserId: authUser.id,
      },
      include: {
        wallet: true,
        goldHolding: true,
      },
    }),
    getGoldMarketData(),
  ]);

  if (!user) {
    redirect("/login");
  }

  const walletBalance = Number(user.wallet?.cashBalance ?? 0);
  const goldQuantity = Number(user.goldHolding?.quantity ?? 0);
  const goldValue = Number(user.goldHolding?.value ?? 0);
  const goldPrice = Number(gold?.price ?? 0);

  const goldBidPrice =
    gold && "bidPrice" in gold && typeof gold.bidPrice === "number"
      ? gold.bidPrice
      : null;

  const displayPrice =
    goldBidPrice && goldBidPrice > 0
      ? goldBidPrice
      : goldPrice;

  const changePercent = Number(gold?.changePercent ?? 0);

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/gold"
            aria-label="Back to Gold"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              Sell Gold
            </h1>
            <p className="text-xs text-slate-500">
              Sell part of your gold holdings into your wallet.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white px-3 py-2">
          <div>
            <p className="text-[10px] text-slate-400">Gold price</p>
            <p className="text-xs font-semibold text-slate-900">
              {displayPrice > 0
                ? `${money(displayPrice)} / oz`
                : "Unavailable"}
            </p>
          </div>

          <div className="h-7 w-px bg-slate-200" />

          <p
            className={[
              "text-xs font-medium",
              changePercent >= 0 ? "text-emerald-600" : "text-red-600",
            ].join(" ")}
          >
            {changePercent >= 0 ? "+" : ""}
            {changePercent.toFixed(2)}%
          </p>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <SellGoldForm
          goldQuantity={goldQuantity}
          goldPrice={goldPrice}
          goldBidPrice={goldBidPrice}
        />

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-slate-900">
                  Gold holdings
                </h2>
              </div>
            </div>

            <div className="px-4 py-3 sm:px-5">
              <SummaryRow
                label="Available gold"
                value={`${goldQuantity.toFixed(8)} oz`}
                strong
              />
              <SummaryRow
                label="Current value"
                value={money(goldValue)}
              />
              <SummaryRow
                label="Wallet balance"
                value={money(walletBalance)}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
            <div className="flex items-start gap-2.5">
              <WalletCards className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <p className="text-[11px] leading-5 text-slate-500">
                Sale proceeds are credited to your available wallet balance
                after you confirm the transaction.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-2.5 last:border-b-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span
        className={[
          "text-xs",
          strong
            ? "font-semibold text-slate-900"
            : "font-medium text-slate-700",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}