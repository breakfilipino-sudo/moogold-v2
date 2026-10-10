CREATE TABLE "GoldMarketSnapshot" (
    "id" TEXT NOT NULL,
    "price" DECIMAL(20,8) NOT NULL,
    "source" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoldMarketSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GoldMarketSnapshot_capturedAt_idx"
ON "GoldMarketSnapshot"("capturedAt");