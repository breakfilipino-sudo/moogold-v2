import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronRight,
  Coins,
  TrendingUp,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getGoldMarketData } from "@/lib/markets/gold";

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export default async function GoldPage() {
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

  const changePercent =
    typeof gold?.changePercent === "number"
      ? gold.changePercent
      : null;

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <Coins className="h-4 w-4" />
          </div>

          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              Gold
            </h1>

            <p className="text-sm text-slate-500">
              Buy, sell and manage your gold holdings.
            </p>
          </div>
        </div>
      </div>

      {/* Mobile: Your gold + trading come first */}
      <section className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        {/* Your gold */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <SectionHeader title="Your gold" />

          <div className="px-4 py-4 sm:px-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500">
                  Current holdings
                </p>

                <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                  {goldQuantity.toFixed(8)}
                  <span className="ml-1 text-sm font-normal text-slate-400">
                    oz
                  </span>
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-slate-500">
                  Current value
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {money(goldValue)}
                </p>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3">
              <InfoRow
                label="Gold price"
                value={
                  goldPrice > 0
                    ? `${money(goldPrice)} / oz`
                    : "Unavailable"
                }
              />

              <InfoRow
                label="Wallet balance"
                value={money(walletBalance)}
              />
            </div>
          </div>
        </div>

        {/* Gold trading */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <SectionHeader title="Gold trading" />

          <div className="divide-y divide-slate-100">
            <TradeRow
              href="/dashboard/gold/buy"
              icon={<ArrowDownToLine className="h-4 w-4" />}
              title="Buy Gold"
              description="Use your wallet balance to buy gold."
            />

            <TradeRow
              href="/dashboard/gold/sell"
              icon={<ArrowUpFromLine className="h-4 w-4" />}
              title="Sell Gold"
              description="Sell part of your holdings into your wallet."
              sell
            />
          </div>
        </div>
      </section>

      {/* Gold price / market summary */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col divide-y divide-slate-100 sm:flex-row sm:divide-x sm:divide-y-0">
          <MarketItem
            label="Gold price"
            value={goldPrice > 0 ? money(goldPrice) : "Unavailable"}
            note="per oz"
          />

          <MarketItem
            label="24h change"
            value={
              changePercent === null
                ? "—"
                : `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%`
            }
            valueClassName={
              changePercent === null
                ? "text-slate-500"
                : changePercent >= 0
                  ? "text-emerald-600"
                  : "text-red-600"
            }
            icon={<TrendingUp className="h-3.5 w-3.5" />}
          />

          <MarketItem
            label="Your holdings"
            value={`${goldQuantity.toFixed(8)} oz`}
            note={goldValue > 0 ? money(goldValue) : "Current value"}
          />

          <MarketItem
            label="Available balance"
            value={money(walletBalance)}
            note="Wallet balance"
          />
        </div>
      </section>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-xs leading-5 text-slate-500">
          Gold transactions use the current MooGold market price. You will
          review the transaction details before confirming a purchase or sale.
        </p>
      </div>
    </div>
  );
}

function MarketItem({
  label,
  value,
  note,
  valueClassName,
  icon,
}: {
  label: string;
  value: string;
  note?: string;
  valueClassName?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex-1 px-4 py-3.5 sm:px-5">
      <p className="text-xs text-slate-500">{label}</p>

      <div className="mt-1 flex items-center gap-1.5">
        {icon}

        <p
          className={[
            "text-sm font-semibold",
            valueClassName ?? "text-slate-900",
          ].join(" ")}
        >
          {value}
        </p>
      </div>

      {note && (
        <p className="mt-0.5 text-xs text-slate-400">
          {note}
        </p>
      )}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
      <h2 className="text-sm font-semibold text-slate-900">
        {title}
      </h2>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-xs text-slate-500">
        {label}
      </span>

      <span className="text-xs font-medium text-slate-800">
        {value}
      </span>
    </div>
  );
}

function TradeRow({
  href,
  icon,
  title,
  description,
  sell = false,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  sell?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 px-4 py-3.5 transition hover:bg-slate-50 sm:px-5"
    >
      <div
        className={[
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          sell
            ? "bg-slate-100 text-slate-600"
            : "bg-emerald-50 text-emerald-600",
        ].join(" ")}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">
          {title}
        </p>

        <p className="mt-0.5 text-xs text-slate-500">
          {description}
        </p>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
    </Link>
  );
}