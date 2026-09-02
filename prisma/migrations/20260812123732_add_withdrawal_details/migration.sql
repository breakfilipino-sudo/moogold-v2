-- CreateEnum
CREATE TYPE "WithdrawalMethod" AS ENUM ('BANK_TRANSFER', 'E_WALLET');

-- CreateTable
CREATE TABLE "WithdrawalDetails" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "method" "WithdrawalMethod" NOT NULL,
    "bankName" TEXT,
    "bankAccountName" TEXT,
    "bankAccountNumber" TEXT,
    "walletProvider" TEXT,
    "walletAccountName" TEXT,
    "walletAccountNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WithdrawalDetails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WithdrawalDetails_transactionId_key" ON "WithdrawalDetails"("transactionId");

-- CreateIndex
CREATE INDEX "WithdrawalDetails_method_idx" ON "WithdrawalDetails"("method");

-- AddForeignKey
ALTER TABLE "WithdrawalDetails" ADD CONSTRAINT "WithdrawalDetails_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
