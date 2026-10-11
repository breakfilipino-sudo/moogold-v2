import {
  BriefcaseBusiness,
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
    <div className="space-y-8 pb-10">
      {approvalNotification ? (
        <ApprovalNotice
          notificationId={approvalNotification.id}
          title={approvalNotification.title}
          message={approvalNotification.message}
        />
      ) : null}

      <section>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <BriefcaseBusiness className="h-5 w-5" />
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700/55">
              MooGold
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#10201b] sm:text-[26px]">
              Wealth Box
            </h1>
            <p className="mt-1 whitespace-nowrap text-[11px] font-semibold leading-5 text-[#52655c] sm:text-sm">Grow your money. Earn more.</p>
          </div>
        </div>


      </section>

      <section className="overflow-hidden rounded-[26px] border border-[#d7e3dd] bg-white shadow-[0_12px_40px_rgba(16,32,27,0.05)]">
        <div className="bg-[#10201b] px-5 py-6 text-white sm:px-7 sm:py-7">
          <div className="flex items-center justify-between gap-3 sm:gap-5">
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-extrabold">
                Your active Investments
              </p>

              <p className="mt-2 min-w-0 text-[clamp(1.5rem,7vw,2.25rem)] font-extrabold leading-tight tracking-tight sm:text-[42px]">
                {formatLocalAmount(
                  currentBalance,
                  localCurrency,
                )}
              </p>

              {activeInvestment && activePlanDurationDays > 0 ? (
                <p className="mt-1 min-w-0 break-words [overflow-wrap:anywhere] text-[11px] font-semibold leading-4 text-emerald-200 sm:text-xs">
                  Earned +{formatLocalAmount(
                    activeInvestmentProfitLocal,
                    localCurrency,
                  )} for {activePlanDurationDays}-day plan
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-col items-end gap-3">


              {activeInvestment ? (
                <CashOutButton
                  maturityDate={
                    activeInvestment.maturityDate
                  }
                  isMatured={
                    activeInvestment.status === "MATURED"
                  }
                />
              ) : null}
            </div>
          </div>
        </div>

        {investments.length > 0 &&
        dailyEarnings.length > 0 ? (
          <div className="hidden divide-y divide-[#e7eeea]">
            {dailyEarnings.map((earning) => (
              <div
                key={earning.id}
                className="flex items-center justify-between gap-4 px-5 py-4 sm:px-7"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#10201b]">
                    {formatEarningDate(earning.date)}
                  </p>

                  <p className="mt-1 text-[11px] font-semibold text-[#52655c]">
                    Day {earning.dayNumber}
                  </p>
                </div>

                <p className="shrink-0 text-sm font-extrabold text-emerald-700">
                  +
                  {formatLocalAmount(
                    earning.amount,
                    localCurrency,
                  )}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {planData.length > 0 ? (
        <section>
          <WealthBoxForm
            plans={planData}
            currency={localCurrency}
            currencySymbol={localCurrencySymbol}
          />
        </section>
      ) : (
        <section className="rounded-[24px] border border-[#d7e3dd] bg-white px-6 py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <BriefcaseBusiness className="h-5 w-5" />
          </div>

          <h2 className="mt-5 text-base font-bold text-[#10201b]">
            Wealth Box plans are coming soon
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-[#52655c]">
            There are currently no active Wealth Box
            plans available for your registered country.
          </p>
        </section>
      )}
    </div>
  );
}