-- CreateEnum
CREATE TYPE "BalanceType" AS ENUM ('CASH', 'REFERRAL', 'PORTFOLIO');

-- CreateEnum
CREATE TYPE "AdjustmentDirection" AS ENUM ('CREDIT', 'DEBIT');

-- CreateTable
CREATE TABLE "BalanceAdjustment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "balanceType" "BalanceType" NOT NULL,
    "direction" "AdjustmentDirection" NOT NULL,
    "amount" DECIMAL(20,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "reason" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BalanceAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BalanceAdjustment_reference_key" ON "BalanceAdjustment"("reference");

-- CreateIndex
CREATE INDEX "BalanceAdjustment_userId_idx" ON "BalanceAdjustment"("userId");

-- CreateIndex
CREATE INDEX "BalanceAdjustment_adminId_idx" ON "BalanceAdjustment"("adminId");

-- CreateIndex
CREATE INDEX "BalanceAdjustment_balanceType_idx" ON "BalanceAdjustment"("balanceType");

-- CreateIndex
CREATE INDEX "BalanceAdjustment_createdAt_idx" ON "BalanceAdjustment"("createdAt");

-- AddForeignKey
ALTER TABLE "BalanceAdjustment" ADD CONSTRAINT "BalanceAdjustment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceAdjustment" ADD CONSTRAINT "BalanceAdjustment_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
