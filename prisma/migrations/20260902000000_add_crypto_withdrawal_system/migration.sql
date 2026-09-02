-- ============================================================
-- CRYPTO WITHDRAWAL SYSTEM
-- ============================================================

-- CreateEnum
CREATE TYPE "CryptoWithdrawalStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'REJECTED',
  'CANCELLED'
);

-- CreateTable
CREATE TABLE "CryptoWithdrawal" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "cryptoBalanceId" TEXT NOT NULL,

  "asset" "CryptoAsset" NOT NULL,
  "network" "CryptoNetwork" NOT NULL,

  "amount" DECIMAL(30,18) NOT NULL,
  "fee" DECIMAL(30,18) NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(30,18) NOT NULL,

  "usdAmount" DECIMAL(20,2),
  "exchangeRate" DECIMAL(20,8),

  "destinationAddress" TEXT NOT NULL,

  "transactionHash" TEXT,
  "blockNumber" TEXT,
  "confirmations" INTEGER,

  "status" "CryptoWithdrawalStatus" NOT NULL DEFAULT 'PENDING',

  "description" TEXT,
  "rejectionReason" TEXT,

  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),

  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CryptoWithdrawal_pkey"
    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CryptoWithdrawal_userId_idx"
ON "CryptoWithdrawal"("userId");

-- CreateIndex
CREATE INDEX "CryptoWithdrawal_cryptoBalanceId_idx"
ON "CryptoWithdrawal"("cryptoBalanceId");

-- CreateIndex
CREATE INDEX "CryptoWithdrawal_asset_idx"
ON "CryptoWithdrawal"("asset");

-- CreateIndex
CREATE INDEX "CryptoWithdrawal_network_idx"
ON "CryptoWithdrawal"("network");

-- CreateIndex
CREATE INDEX "CryptoWithdrawal_status_idx"
ON "CryptoWithdrawal"("status");

-- CreateIndex
CREATE INDEX "CryptoWithdrawal_createdAt_idx"
ON "CryptoWithdrawal"("createdAt");

-- CreateIndex
CREATE INDEX "CryptoWithdrawal_transactionHash_idx"
ON "CryptoWithdrawal"("transactionHash");

-- AddForeignKey
ALTER TABLE "CryptoWithdrawal"
ADD CONSTRAINT "CryptoWithdrawal_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CryptoWithdrawal"
ADD CONSTRAINT "CryptoWithdrawal_cryptoBalanceId_fkey"
FOREIGN KEY ("cryptoBalanceId")
REFERENCES "CryptoBalance"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- AddColumn
ALTER TABLE "CryptoLedgerEntry"
ADD COLUMN "withdrawalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CryptoLedgerEntry_withdrawalId_key"
ON "CryptoLedgerEntry"("withdrawalId");

-- AddForeignKey
ALTER TABLE "CryptoLedgerEntry"
ADD CONSTRAINT "CryptoLedgerEntry_withdrawalId_fkey"
FOREIGN KEY ("withdrawalId")
REFERENCES "CryptoWithdrawal"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;