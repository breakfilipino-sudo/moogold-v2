-- CreateEnum
CREATE TYPE "WealthInvestmentStatus" AS ENUM ('ACTIVE', 'MATURED', 'CANCELLED', 'COMPLETED');

-- CreateTable
CREATE TABLE "WealthPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "durationDays" INTEGER NOT NULL,
    "returnPercentage" DECIMAL(10,4) NOT NULL,
    "minimumUsd" DECIMAL(20,2) NOT NULL,
    "maximumUsd" DECIMAL(20,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WealthPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WealthPlanCountry" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "currencySymbol" TEXT NOT NULL,
    "minimumLocalAmount" DECIMAL(20,2) NOT NULL,
    "maximumLocalAmount" DECIMAL(20,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WealthPlanCountry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WealthInvestment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "principalUsd" DECIMAL(20,2) NOT NULL,
    "principalLocal" DECIMAL(20,2) NOT NULL,
    "localCurrency" TEXT NOT NULL,
    "exchangeRate" DECIMAL(20,8) NOT NULL,
    "returnPercentage" DECIMAL(10,4) NOT NULL,
    "dailyProfitUsd" DECIMAL(20,2) NOT NULL,
    "projectedProfitUsd" DECIMAL(20,2) NOT NULL,
    "maturityAmountUsd" DECIMAL(20,2) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "maturityDate" TIMESTAMP(3) NOT NULL,
    "accumulatedProfitUsd" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "daysCompleted" INTEGER NOT NULL DEFAULT 0,
    "status" "WealthInvestmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WealthInvestment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WealthEarning" (
    "id" TEXT NOT NULL,
    "investmentId" TEXT NOT NULL,
    "earningDate" TIMESTAMP(3) NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "amountUsd" DECIMAL(20,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "exchangeRate" DECIMAL(20,8),
    "localAmount" DECIMAL(20,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WealthEarning_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WealthPlan_slug_key" ON "WealthPlan"("slug");

CREATE INDEX "WealthPlan_active_idx" ON "WealthPlan"("active");

CREATE INDEX "WealthPlan_displayOrder_idx" ON "WealthPlan"("displayOrder");

CREATE INDEX "WealthPlanCountry_planId_idx" ON "WealthPlanCountry"("planId");

CREATE INDEX "WealthPlanCountry_countryCode_idx" ON "WealthPlanCountry"("countryCode");

CREATE INDEX "WealthPlanCountry_active_idx" ON "WealthPlanCountry"("active");

CREATE UNIQUE INDEX "WealthPlanCountry_planId_countryCode_key"
ON "WealthPlanCountry"("planId", "countryCode");

CREATE INDEX "WealthInvestment_userId_idx" ON "WealthInvestment"("userId");

CREATE INDEX "WealthInvestment_planId_idx" ON "WealthInvestment"("planId");

CREATE INDEX "WealthInvestment_status_idx" ON "WealthInvestment"("status");

CREATE INDEX "WealthInvestment_startDate_idx" ON "WealthInvestment"("startDate");

CREATE INDEX "WealthInvestment_maturityDate_idx" ON "WealthInvestment"("maturityDate");

CREATE INDEX "WealthInvestment_userId_status_idx"
ON "WealthInvestment"("userId", "status");

CREATE INDEX "WealthEarning_investmentId_idx"
ON "WealthEarning"("investmentId");

CREATE INDEX "WealthEarning_earningDate_idx"
ON "WealthEarning"("earningDate");

CREATE UNIQUE INDEX "WealthEarning_investmentId_dayNumber_key"
ON "WealthEarning"("investmentId", "dayNumber");

-- AddForeignKey
ALTER TABLE "WealthPlanCountry"
ADD CONSTRAINT "WealthPlanCountry_planId_fkey"
FOREIGN KEY ("planId") REFERENCES "WealthPlan"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WealthInvestment"
ADD CONSTRAINT "WealthInvestment_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WealthInvestment"
ADD CONSTRAINT "WealthInvestment_planId_fkey"
FOREIGN KEY ("planId") REFERENCES "WealthPlan"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WealthEarning"
ADD CONSTRAINT "WealthEarning_investmentId_fkey"
FOREIGN KEY ("investmentId") REFERENCES "WealthInvestment"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
