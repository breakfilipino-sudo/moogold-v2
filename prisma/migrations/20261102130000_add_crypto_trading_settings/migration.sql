CREATE TABLE "CryptoTradingSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "sellPremiumPercent" DECIMAL(7,4) NOT NULL DEFAULT 50,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CryptoTradingSettings_pkey" PRIMARY KEY ("id")
);
