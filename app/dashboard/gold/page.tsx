import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronRight,
  Coins,
  TrendingUp,
} from "lucide-react";

import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { getGoldMarketData } from "@/lib/markets/gold";
import { getCountryFinancialConfig } from "@/lib/countries";
import { formatCurrencyAmount, getUsdToLocalRate } from "@/lib/currency";

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export default async function GoldPage() {
  const { user: currentUser } = await getCurrentUser();

  const [user, gold] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: currentUser.id,
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
  const financialConfig = getCountryFinancialConfig(user.countryCode);
  const localCurrency = financialConfig?.currency ?? "USD";
  const localRate = await getUsdToLocalRate(localCurrency);
  const localWalletBalance =
    localRate === null ? null : walletBalance * localRate;
  const walletBalanceDisplay =
    localCurrency !== "USD" && localWalletBalance !== null
      ? `${money(walletBalance)} (${formatCurrencyAmount(localWalletBalance, localCurrency)})`
      : money(walletBalance);

  const goldQuantity = Number(user.goldHolding?.quantity ?? 0);
  const goldValue = Number(user.goldHolding?.value ?? 0);
  const goldPrice = Number(gold?.price ?? 0);

  const changePercent =
    typeof gold?.changePercent === "number"
      ? gold.changePercent
      : null;

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center gap-3 border-b border-slate-200/80 pb-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f8e8bd] to-[#e8c778] text-[#735018] shadow-sm">
          <Coins className="h-5 w-5" />
        </div>

        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-950">
            Gold
          </h1>

          <p className="mt-0.5 text-sm text-slate-500">
            Buy, sell and manage your gold holdings.
          </p>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="relative overflow-hidden rounded-2xl border border-[#d9c18c]/50 bg-gradient-to-br from-[#fffdf7] via-white to-[#f8f1df] shadow-[0_8px_28px_rgba(36,45,35,0.06)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-[#e9c878]/20 blur-3xl"
          />

          <SectionHeader title="Your gold" />

          <div className="relative px-4 py-5 sm:px-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Current holdings
                </p>

                <p className="mt-2 text-2xl font-bold tracking-tight text-[#183b2c] sm:text-3xl">
                  {goldQuantity.toFixed(8)}
                  <span className="ml-1.5 text-sm font-medium text-slate-400">
                    oz
                  </span>
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs font-medium text-slate-500">
                  Current value
                </p>

                <p className="mt-2 text-base font-bold tracking-tight text-[#183b2c]">
                  {money(goldValue)}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-[#e9dfc8] bg-white/75 px-3 py-1.5">
              <InfoRow
                label="Gold price"
                value={
                  goldPrice > 0
                    ? `${money(goldPrice)} / oz`
                    : "Unavailable"
                }
              />

              <div className="border-t border-slate-100">
                <InfoRow
                  label="Wallet balance"
                  value={walletBalanceDisplay}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_28px_rgba(36,45,35,0.05)]">
          <SectionHeader title="Gold trading" />

          <div className="divide-y divide-slate-100">
            <TradeRow
              href="/dashboard/gold/buy"
              icon={<ArrowDownToLine className="h-5 w-5" />}
              title="Buy Gold"
              description="Use your wallet balance to buy gold."
            />

            <TradeRow
              href="/dashboard/gold/sell"
              icon={<ArrowUpFromLine className="h-5 w-5" />}
              title="Sell Gold"
              description="Sell part of your holdings into your wallet."
              sell
            />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_28px_rgba(36,45,35,0.045)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 sm:px-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Gold market
            </h2>
          </div>

          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f8f1df] text-[#a77b29]">
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-4 sm:divide-y-0">
          <MarketItem
            label="Gold price"
            value={goldPrice > 0 ? money(goldPrice) : "Unavailable"}
            note="per oz"
          />

          <MarketItem
            label="24h change"
            value={
              changePercent === null
                ? "â€”"
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
            value={walletBalanceDisplay}
            note="Wallet balance"
          />
        </div>
      </section>

      <div className="flex gap-3 rounded-2xl border border-[#eadfca] bg-[#fbf8f0] px-4 py-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#f1e5c8] text-[#96702b]">
          <Coins className="h-4 w-4" />
        </div>

        <p className="text-xs leading-5 text-slate-600">
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
    <div className="min-w-0 px-3 py-4 sm:px-5 sm:py-5">
      <p className="text-xs font-medium text-slate-500">{label}</p>

      <div className="mt-2 flex min-w-0 items-center gap-1.5">
        {icon}

        <p
          className={[
            "break-words text-sm font-bold tracking-tight sm:text-base",
            valueClassName ?? "text-slate-900",
          ].join(" ")}
        >
          {value}
        </p>
      </div>

      {note && (
        <p className="mt-1 text-xs text-slate-400">
          {note}
        </p>
      )}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="border-b border-slate-100/90 px-4 py-3.5 sm:px-5">
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
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-xs text-slate-500">{label}</span>

      <span className="text-xs font-semibold text-slate-800">
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
      className="group flex items-center gap-3.5 px-4 py-5 transition-colors hover:bg-[#f8faf8] sm:px-5"
    >
      <div
        className={[
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-colors",
          sell
            ? "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
            : "bg-[#f5edda] text-[#9a742e] group-hover:bg-[#eee1c1]",
        ].join(" ")}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">
          {title}
        </p>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>

      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition group-hover:translate-x-0.5 group-hover:bg-[#f5edda] group-hover:text-[#9a742e]">
        <ChevronRight className="h-4 w-4" />
      </div>
    </Link>
  );
}
