import {
  BriefcaseBusiness,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";

import { getCurrentUser } from "@/lib/auth/current-user";
import { getCountryFinancialConfig } from "@/lib/countries";
import { prisma } from "@/lib/prisma";

import ApprovalNotice from "./approval-notice";
import CashOutButton from "./cash-out-button";
import WealthBoxForm from "./wealth-box-form";

export const dynamic = "force-dynamic";

function formatLocalAmount(
  value: number,
  currency: string,
) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatEarningDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export default async function WealthBoxPage() {
  const { user } = await getCurrentUser();

  const financialConfig =
    getCountryFinancialConfig(user.countryCode);

  const localCurrency =
    financialConfig?.currency ?? "USD";

  const localCurrencySymbol =
    financialConfig?.currencySymbol ?? "$";

  const countryCode =
    financialConfig?.code ?? "US";

  const [plans, investments, approvalNotification] =
    await Promise.all([
      prisma.wealthPlan.findMany({
        where: {
          active: true,
          wealthPlanCountries: {
            some: {
              countryCode,
              active: true,
            },
          },
        },
        orderBy: [
          {
            displayOrder: "asc",
          },
          {
            durationDays: "asc",
          },
        ],
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          durationDays: true,
          returnPercentage: true,
          minimumUsd: true,
          maximumUsd: true,
          wealthPlanCountries: {
            where: {
              countryCode,
              active: true,
            },
            select: {
              currency: true,
              currencySymbol: true,
              minimumLocalAmount: true,
              maximumLocalAmount: true,
            },
            take: 1,
          },
        },
      }),

      prisma.wealthInvestment.findMany({
        where: {
          userId: user.id,
          status: {
            in: ["ACTIVE", "MATURED"],
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          principalUsd: true,
          principalLocal: true,
          accumulatedProfitUsd: true,
          maturityDate: true,
          status: true,
          plan: {
            select: {
              name: true,
              durationDays: true,
            },
          },
          earnings: {
            orderBy: {
              earningDate: "desc",
            },
            select: {
              id: true,
              earningDate: true,
              dayNumber: true,
              localAmount: true,
              amountUsd: true,
            },
          },
        },
      }),

      prisma.notification.findFirst({
        where: {
          userId: user.id,
          type: "SYSTEM",
          title: "Your Wealth Box investment is approved",
          href: "/dashboard/wealth-box",
          readAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          title: true,
          message: true,
        },
      }),
    ]);

  const totalInvestedLocal =
    investments.reduce(
      (total, investment) =>
        total + Number(investment.principalLocal),
      0,
    );

  const totalProfitLocal =
    investments.reduce(
      (total, investment) => {
        const principalUsd = Number(
          investment.principalUsd,
        );

        const principalLocal = Number(
          investment.principalLocal,
        );

        const accumulatedProfitUsd = Number(
          investment.accumulatedProfitUsd,
        );

        if (
          principalUsd <= 0 ||
          accumulatedProfitUsd <= 0
        ) {
          return total;
        }

        return (
          total +
          accumulatedProfitUsd *
            (principalLocal / principalUsd)
        );
      },
      0,
    );

  const currentBalance =
    totalInvestedLocal + totalProfitLocal;

  const dailyEarnings = investments
    .flatMap((investment) =>
      investment.earnings.map((earning) => ({
        id: earning.id,
        date: earning.earningDate,
        dayNumber: earning.dayNumber,
        amount:
          earning.localAmount !== null
            ? Number(earning.localAmount)
            : Number(earning.amountUsd),
      })),
    )
    .sort(
      (a, b) =>
        b.date.getTime() - a.date.getTime(),
    );

  const activeInvestment = investments[0] ?? null;

  const activeInvestmentProfitLocal =
    activeInvestment && Number(activeInvestment.principalUsd) > 0
      ? Number(activeInvestment.accumulatedProfitUsd) *
        (Number(activeInvestment.principalLocal) /
          Number(activeInvestment.principalUsd))
      : 0;

  const activePlanDurationDays =
    activeInvestment?.plan.durationDays ?? 0;

  const planData = plans.map((plan) => {
    const countryConfig =
      plan.wealthPlanCountries[0];

    return {
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      description: plan.description,
      durationDays: plan.durationDays,
      returnPercentage: Number(
        plan.returnPercentage,
      ),
      minimumUsd: Number(plan.minimumUsd),
      maximumUsd:
        plan.maximumUsd === null
          ? null
          : Number(plan.maximumUsd),
      currency:
        countryConfig?.currency ??
        localCurrency,
      currencySymbol:
        countryConfig?.currencySymbol ??
        localCurrencySymbol,
      minimumLocalAmount: Number(
        countryConfig?.minimumLocalAmount ?? 0,
      ),
      maximumLocalAmount:
        countryConfig?.maximumLocalAmount === null ||
        countryConfig?.maximumLocalAmount === undefined
          ? null
          : Number(
              countryConfig.maximumLocalAmount,
            ),
    };
  });

  return (
    <div className="space-y-6 pb-12">
      {approvalNotification ? (
        <ApprovalNotice
          notificationId={approvalNotification.id}
          title={approvalNotification.title}
          message={approvalNotification.message}
        />
      ) : null}

      {/* Header section */}
      <section className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md shadow-emerald-600/20">
            <BriefcaseBusiness className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600">
                MooGold Earn
              </span>
              <Sparkles className="h-3 w-3 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Wealth Box
            </h1>
            <p className="text-xs font-medium text-slate-500">
              Grow your money. Earn daily profits seamlessly.
            </p>
          </div>
        </div>
      </section>

      {/* Hero Balance Card (Styled cleanly like your modern screenshot) */}
      <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-slate-950 via-[#10201b] to-emerald-950 p-6 text-white shadow-xl shadow-slate-950/15 sm:p-8">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 h-48 w-48 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold tracking-wide text-emerald-300 backdrop-blur-md">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Active Portfolio Balance</span>
            </div>

            <p className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
              {formatLocalAmount(
                currentBalance,
                localCurrency,
              )}
            </p>

            {activeInvestment && activePlanDurationDays > 0 ? (
              <div className="mt-2.5 flex items-center gap-2 text-xs font-semibold text-emerald-200/90">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  Earned +{formatLocalAmount(
                    activeInvestmentProfitLocal,
                    localCurrency,
                  )} ({activePlanDurationDays}-day growth plan)
                </span>
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-400">
                No active earnings locked yet. Select a plan below to begin.
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center">
          <CashOutButton
            maturityDate={activeInvestment?.maturityDate ?? null}
            isMatured={activeInvestment?.status === "MATURED"}
          />
        </div>
        </div>

        {/* Earnings breakdown strip inside the hero card if available */}
        {investments.length > 0 && dailyEarnings.length > 0 ? (
          <div className="mt-6 border-t border-white/10 pt-5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-3">
              <span>Recent Daily Yields</span>
              <span className="text-emerald-400 font-bold">{dailyEarnings.length} Total Payouts</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {dailyEarnings.slice(0, 6).map((earning) => (
                <div
                  key={earning.id}
                  className="flex items-center justify-between rounded-2xl bg-white/[0.06] px-4 py-3 border border-white/5 backdrop-blur-sm transition hover:bg-white/[0.09]"
                >
                  <div>
                    <p className="text-xs font-bold text-white">
                      {formatEarningDate(earning.date)}
                    </p>
                    <p className="text-[10px] font-medium text-emerald-400/80">
                      Day {earning.dayNumber} earnings
                    </p>
                  </div>
                  <span className="text-xs font-black text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-xl">
                    +{formatLocalAmount(
                      earning.amount,
                      localCurrency,
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {/* Plans Section */}
      {planData.length > 0 ? (
        <section className="space-y-4 pt-2">


          <WealthBoxForm
            plans={planData}
            currency={localCurrency}
            currencySymbol={localCurrencySymbol}
          />
        </section>
      ) : (
        <section className="rounded-[30px] border border-slate-200/80 bg-white px-6 py-16 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-inner">
            <ArrowUpRight className="h-6 w-6" />
          </div>

          <h2 className="mt-4 text-lg font-bold text-slate-900">
            Wealth Box plans coming soon
          </h2>

          <p className="mx-auto mt-1.5 max-w-md text-sm font-medium text-slate-500 leading-relaxed">
            There are currently no active Wealth Box
            plans available for your registered country. Please check back later.
          </p>
        </section>
      )}
    </div>
  );
}