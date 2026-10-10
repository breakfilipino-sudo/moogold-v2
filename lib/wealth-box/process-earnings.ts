import { prisma } from "@/lib/prisma";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

type ProcessResult = {
  investmentsChecked: number;
  earningsCreated: number;
  investmentsMatured: number;
  totalProfitUsd: number;
};

type PendingEarning = {
  investmentId: string;
  earningDate: Date;
  dayNumber: number;
  amountUsd: number;
  currency: string;
  exchangeRate: number | null;
  localAmount: number | null;
};

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export async function processDailyWealthEarnings(
  now = new Date(),
): Promise<ProcessResult> {
  const investments =
    await prisma.wealthInvestment.findMany({
      where: {
        status: "ACTIVE",
        startDate: {
          lte: now,
        },
      },
      select: {
        id: true,
        startDate: true,
        maturityDate: true,
        dailyProfitUsd: true,
        projectedProfitUsd: true,
        localCurrency: true,
        exchangeRate: true,
        daysCompleted: true,
        accumulatedProfitUsd: true,
        plan: {
          select: {
            durationDays: true,
          },
        },
      },
      orderBy: {
        startDate: "asc",
      },
    });

  let earningsCreated = 0;
  let investmentsMatured = 0;
  let totalProfitUsd = 0;

  for (const investment of investments) {
    const durationDays =
      investment.plan.durationDays;

    if (durationDays <= 0) {
      continue;
    }

    const elapsedDays = Math.floor(
      (now.getTime() -
        investment.startDate.getTime()) /
        DAY_IN_MS,
    );

    const dueDays = Math.min(
      durationDays,
      Math.max(0, elapsedDays),
    );

    if (dueDays <= 0) {
      continue;
    }

    const dailyProfitUsd = Number(
      investment.dailyProfitUsd,
    );

    const projectedProfitUsd = Number(
      investment.projectedProfitUsd,
    );

    const exchangeRate = Number(
      investment.exchangeRate,
    );

    const pendingEarnings: PendingEarning[] = [];

    for (
      let dayNumber = 1;
      dayNumber <= dueDays;
      dayNumber += 1
    ) {
      let amountUsd = dailyProfitUsd;

      /*
       * Adjust the final day's history entry so all
       * daily entries sum to the projected profit.
       */
      if (dayNumber === durationDays) {
        const previousProfit = roundMoney(
          dailyProfitUsd *
            Math.max(0, durationDays - 1),
        );

        amountUsd = roundMoney(
          projectedProfitUsd -
            previousProfit,
        );
      }

      amountUsd = Math.max(
        0,
        roundMoney(amountUsd),
      );

      const earningDate = addDays(
        investment.startDate,
        dayNumber,
      );

      const localAmount =
        exchangeRate > 0
          ? roundMoney(
              amountUsd * exchangeRate,
            )
          : null;

      pendingEarnings.push({
        investmentId: investment.id,
        earningDate,
        dayNumber,
        amountUsd,
        currency: investment.localCurrency,
        exchangeRate:
          exchangeRate > 0
            ? exchangeRate
            : null,
        localAmount,
      });
    }

    if (pendingEarnings.length === 0) {
      continue;
    }

    await prisma.$transaction(async (tx) => {
      const result =
        await tx.wealthEarning.createMany({
          data: pendingEarnings,
          skipDuplicates: true,
        });

      earningsCreated += result.count;

      /*
       * Count existing unique day records to track
       * progress. Do not sum them into accumulated
       * profit: the full projected profit was already
       * credited on approval.
       */
      const aggregate =
        await tx.wealthEarning.aggregate({
          where: {
            investmentId: investment.id,
          },
          _count: {
            _all: true,
          },
        });

      const completedDays = Math.min(
        durationDays,
        aggregate._count._all,
      );

      const matured =
        completedDays >= durationDays;

      await tx.wealthInvestment.update({
        where: {
          id: investment.id,
        },
        data: {
          /*
           * Deliberately do not update
           * accumulatedProfitUsd here.
           */
          daysCompleted: completedDays,
          status: matured
            ? "MATURED"
            : "ACTIVE",
        },
      });

      /*
       * Report only the new history rows created by
       * this run, not the full already-credited profit.
       */
      if (result.count > 0) {
        const newlyCreatedDayNumbers =
          pendingEarnings
            .slice(0, result.count)
            .map((earning) => earning.dayNumber);

        const newlyCreatedEarnings =
          await tx.wealthEarning.findMany({
            where: {
              investmentId: investment.id,
              dayNumber: {
                in: newlyCreatedDayNumbers,
              },
            },
            select: {
              amountUsd: true,
            },
          });

        totalProfitUsd += roundMoney(
          newlyCreatedEarnings.reduce(
            (total, earning) =>
              total + Number(earning.amountUsd),
            0,
          ),
        );
      }

      if (matured) {
        investmentsMatured += 1;
      }
    });
  }

  return {
    investmentsChecked: investments.length,
    earningsCreated,
    investmentsMatured,
    totalProfitUsd: roundMoney(totalProfitUsd),
  };
}