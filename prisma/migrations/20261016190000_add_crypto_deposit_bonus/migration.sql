CREATE TABLE "CryptoDepositBonus" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "qualifyingDepositId" TEXT NOT NULL,
    "cryptoBalanceId" TEXT NOT NULL,
    "asset" "CryptoAsset" NOT NULL,
    "network" "CryptoNetwork" NOT NULL,
    "amount" DECIMAL(30,18) NOT NULL,
    "usdValue" DECIMAL(20,2) NOT NULL,
    "exchangeRate" DECIMAL(20,8) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CryptoDepositBonus_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CryptoDepositBonus_userId_key"
    ON "CryptoDepositBonus"("userId");
CREATE UNIQUE INDEX "CryptoDepositBonus_qualifyingDepositId_key"
    ON "CryptoDepositBonus"("qualifyingDepositId");
CREATE INDEX "CryptoDepositBonus_cryptoBalanceId_idx"
    ON "CryptoDepositBonus"("cryptoBalanceId");
CREATE INDEX "CryptoDepositBonus_createdAt_idx"
    ON "CryptoDepositBonus"("createdAt");

ALTER TABLE "CryptoDepositBonus"
    ADD CONSTRAINT "CryptoDepositBonus_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CryptoDepositBonus"
    ADD CONSTRAINT "CryptoDepositBonus_qualifyingDepositId_fkey"
    FOREIGN KEY ("qualifyingDepositId") REFERENCES "CryptoDeposit"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CryptoDepositBonus"
    ADD CONSTRAINT "CryptoDepositBonus_cryptoBalanceId_fkey"
    FOREIGN KEY ("cryptoBalanceId") REFERENCES "CryptoBalance"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
