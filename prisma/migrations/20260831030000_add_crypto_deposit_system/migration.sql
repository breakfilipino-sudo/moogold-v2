-- CreateEnum
CREATE TYPE "CryptoAsset" AS ENUM (
  'USDC',
  'USDT',
  'BTC',
  'ETH',
  'SOL',
  'TRN',
  'XLM'
);

-- CreateEnum
CREATE TYPE "CryptoNetwork" AS ENUM (
  'ETHEREUM',
  'TRON',
  'BITCOIN',
  'SOLANA',
  'STELLAR'
);

-- CreateEnum
CREATE TYPE "CryptoDepositStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'REJECTED',
  'CANCELLED'
);

-- CreateEnum
CREATE TYPE "LedgerDirection" AS ENUM ('CREDIT', 'DEBIT');

-- CreateTable
CREATE TABLE "CryptoBalance" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "asset" "CryptoAsset" NOT NULL,
  "network" "CryptoNetwork" NOT NULL,
  "balance" DECIMAL(30,18) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CryptoBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CryptoDeposit" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "cryptoBalanceId" TEXT NOT NULL,
  "asset" "CryptoAsset" NOT NULL,
  "network" "CryptoNetwork" NOT NULL,
  "amount" DECIMAL(30,18) NOT NULL,
  "usdAmount" DECIMAL(20,2),
  "exchangeRate" DECIMAL(20,8),
  "receivingAddress" TEXT NOT NULL,
  "transactionHash" TEXT,
  "senderAddress" TEXT,
  "blockNumber" TEXT,
  "confirmations" INTEGER,
  "status" "CryptoDepositStatus" NOT NULL DEFAULT 'PENDING',
  "description" TEXT,
  "rejectionReason" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CryptoDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CryptoLedgerEntry" (
  "id" TEXT NOT NULL,
  "cryptoBalanceId" TEXT NOT NULL,
  "depositId" TEXT,
  "asset" "CryptoAsset" NOT NULL,
  "network" "CryptoNetwork" NOT NULL,
  "direction" "LedgerDirection" NOT NULL,
  "amount" DECIMAL(30,18) NOT NULL,
  "balanceBefore" DECIMAL(30,18) NOT NULL,
  "balanceAfter" DECIMAL(30,18) NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CryptoLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CryptoBalance_userId_idx"
ON "CryptoBalance"("userId");

-- CreateIndex
CREATE INDEX "CryptoBalance_asset_idx"
ON "CryptoBalance"("asset");

-- CreateIndex
CREATE INDEX "CryptoBalance_network_idx"
ON "CryptoBalance"("network");

-- CreateIndex
CREATE UNIQUE INDEX "CryptoBalance_userId_asset_network_key"
ON "CryptoBalance"("userId", "asset", "network");

-- CreateIndex
CREATE INDEX "CryptoDeposit_userId_idx"
ON "CryptoDeposit"("userId");

-- CreateIndex
CREATE INDEX "CryptoDeposit_cryptoBalanceId_idx"
ON "CryptoDeposit"("cryptoBalanceId");

-- CreateIndex
CREATE INDEX "CryptoDeposit_status_idx"
ON "CryptoDeposit"("status");

-- CreateIndex
CREATE INDEX "CryptoDeposit_asset_idx"
ON "CryptoDeposit"("asset");

-- CreateIndex
CREATE INDEX "CryptoDeposit_network_idx"
ON "CryptoDeposit"("network");

-- CreateIndex
CREATE INDEX "CryptoDeposit_transactionHash_idx"
ON "CryptoDeposit"("transactionHash");

-- CreateIndex
CREATE INDEX "CryptoDeposit_createdAt_idx"
ON "CryptoDeposit"("createdAt");

-- CreateIndex
CREATE INDEX "CryptoLedgerEntry_cryptoBalanceId_idx"
ON "CryptoLedgerEntry"("cryptoBalanceId");

-- CreateIndex
CREATE INDEX "CryptoLedgerEntry_asset_idx"
ON "CryptoLedgerEntry"("asset");

-- CreateIndex
CREATE INDEX "CryptoLedgerEntry_network_idx"
ON "CryptoLedgerEntry"("network");

-- CreateIndex
CREATE INDEX "CryptoLedgerEntry_direction_idx"
ON "CryptoLedgerEntry"("direction");

-- CreateIndex
CREATE INDEX "CryptoLedgerEntry_createdAt_idx"
ON "CryptoLedgerEntry"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CryptoLedgerEntry_depositId_key"
ON "CryptoLedgerEntry"("depositId");

-- AddForeignKey
ALTER TABLE "CryptoBalance"
ADD CONSTRAINT "CryptoBalance_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CryptoDeposit"
ADD CONSTRAINT "CryptoDeposit_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CryptoDeposit"
ADD CONSTRAINT "CryptoDeposit_cryptoBalanceId_fkey"
FOREIGN KEY ("cryptoBalanceId")
REFERENCES "CryptoBalance"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CryptoLedgerEntry"
ADD CONSTRAINT "CryptoLedgerEntry_cryptoBalanceId_fkey"
FOREIGN KEY ("cryptoBalanceId")
REFERENCES "CryptoBalance"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CryptoLedgerEntry"
ADD CONSTRAINT "CryptoLedgerEntry_depositId_fkey"
FOREIGN KEY ("depositId")
REFERENCES "CryptoDeposit"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
