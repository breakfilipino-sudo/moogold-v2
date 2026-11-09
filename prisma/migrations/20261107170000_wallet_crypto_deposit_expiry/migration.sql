ALTER TABLE "WalletCryptoDeposit"
  ALTER COLUMN "transactionHash" DROP NOT NULL,
  ALTER COLUMN "reportedAmount" DROP NOT NULL,
  ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "blockchainReceivedAt" TIMESTAMP(3);

UPDATE "WalletCryptoDeposit"
SET "expiresAt" = "createdAt" + INTERVAL '5 minutes'
WHERE "expiresAt" IS NULL;

ALTER TABLE "WalletCryptoDeposit"
  ALTER COLUMN "expiresAt" SET NOT NULL;

CREATE INDEX "WalletCryptoDeposit_userId_status_expiresAt_idx"
  ON "WalletCryptoDeposit"("userId", "status", "expiresAt");