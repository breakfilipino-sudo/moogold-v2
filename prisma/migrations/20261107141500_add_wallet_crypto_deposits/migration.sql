CREATE TYPE "WalletCryptoDepositStatus" AS ENUM (
    'PENDING',
    'COMPLETED',
    'REJECTED'
);

CREATE TABLE "WalletCryptoDeposit" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionId" TEXT,
    "asset" "CryptoAsset" NOT NULL,
    "network" "CryptoNetwork" NOT NULL,
    "receivingAddress" TEXT NOT NULL,
    "memo" TEXT,
    "transactionHash" TEXT NOT NULL,
    "reportedAmount" DECIMAL(30,18) NOT NULL,
    "verifiedAmount" DECIMAL(30,18),
    "countryCode" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "localAmount" DECIMAL(20,2),
    "usdAmount" DECIMAL(20,2),
    "cryptoUsdRate" DECIMAL(20,8),
    "cryptoPriceSource" TEXT,
    "cryptoPriceObservedAt" TIMESTAMP(3),
    "usdFxRate" DECIMAL(20,8),
    "fxSource" TEXT,
    "fxObservedAt" TIMESTAMP(3),
    "status" "WalletCryptoDepositStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletCryptoDeposit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WalletCryptoDeposit_reference_key"
ON "WalletCryptoDeposit"("reference");

CREATE UNIQUE INDEX "WalletCryptoDeposit_transactionId_key"
ON "WalletCryptoDeposit"("transactionId");

CREATE INDEX "WalletCryptoDeposit_userId_idx"
ON "WalletCryptoDeposit"("userId");

CREATE INDEX "WalletCryptoDeposit_status_idx"
ON "WalletCryptoDeposit"("status");

CREATE INDEX "WalletCryptoDeposit_asset_network_idx"
ON "WalletCryptoDeposit"("asset", "network");

CREATE INDEX "WalletCryptoDeposit_transactionHash_idx"
ON "WalletCryptoDeposit"("transactionHash");

CREATE INDEX "WalletCryptoDeposit_createdAt_idx"
ON "WalletCryptoDeposit"("createdAt");

CREATE INDEX "WalletCryptoDeposit_reviewedById_idx"
ON "WalletCryptoDeposit"("reviewedById");

ALTER TABLE "WalletCryptoDeposit"
ADD CONSTRAINT "WalletCryptoDeposit_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WalletCryptoDeposit"
ADD CONSTRAINT "WalletCryptoDeposit_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WalletCryptoDeposit"
ADD CONSTRAINT "WalletCryptoDeposit_transactionId_fkey"
FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id")
ON DELETE SET NULL ON UPDATE CASCADE;