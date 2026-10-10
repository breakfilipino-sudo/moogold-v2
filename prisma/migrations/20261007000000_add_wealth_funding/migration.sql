-- CreateEnum
CREATE TYPE "WealthPaymentMethod" AS ENUM ('CRYPTO', 'CARD');

-- CreateEnum
CREATE TYPE "WealthFundingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "WealthFunding" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "paymentMethod" "WealthPaymentMethod" NOT NULL,
    "status" "WealthFundingStatus" NOT NULL DEFAULT 'PENDING',
    "principalLocal" DECIMAL(20,2) NOT NULL,
    "principalUsd" DECIMAL(20,2) NOT NULL,
    "localCurrency" TEXT NOT NULL,
    "exchangeRate" DECIMAL(20,8) NOT NULL,
    "returnPercentage" DECIMAL(10,4) NOT NULL,
    "projectedProfitUsd" DECIMAL(20,2) NOT NULL,
    "maturityAmountUsd" DECIMAL(20,2) NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "payoutDate" TIMESTAMP(3) NOT NULL,
    "cryptoDepositId" TEXT,
    "externalReference" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "investmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WealthFunding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WealthFunding_cryptoDepositId_key" ON "WealthFunding"("cryptoDepositId");

-- CreateIndex
CREATE UNIQUE INDEX "WealthFunding_investmentId_key" ON "WealthFunding"("investmentId");

-- CreateIndex
CREATE INDEX "WealthFunding_userId_idx" ON "WealthFunding"("userId");

-- CreateIndex
CREATE INDEX "WealthFunding_planId_idx" ON "WealthFunding"("planId");

-- CreateIndex
CREATE INDEX "WealthFunding_status_idx" ON "WealthFunding"("status");

-- CreateIndex
CREATE INDEX "WealthFunding_paymentMethod_idx" ON "WealthFunding"("paymentMethod");

-- CreateIndex
CREATE INDEX "WealthFunding_createdAt_idx" ON "WealthFunding"("createdAt");

-- CreateIndex
CREATE INDEX "WealthFunding_reviewedById_idx" ON "WealthFunding"("reviewedById");

-- AddForeignKey
ALTER TABLE "WealthFunding" ADD CONSTRAINT "WealthFunding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WealthFunding" ADD CONSTRAINT "WealthFunding_planId_fkey" FOREIGN KEY ("planId") REFERENCES "WealthPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WealthFunding" ADD CONSTRAINT "WealthFunding_cryptoDepositId_fkey" FOREIGN KEY ("cryptoDepositId") REFERENCES "CryptoDeposit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WealthFunding" ADD CONSTRAINT "WealthFunding_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WealthFunding" ADD CONSTRAINT "WealthFunding_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "WealthInvestment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
