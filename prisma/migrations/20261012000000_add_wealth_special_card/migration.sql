ALTER TYPE "WealthPaymentMethod"
    ADD VALUE IF NOT EXISTS 'SPECIAL_CARD';

CREATE TYPE "WealthSpecialCardSubmissionStatus" AS ENUM (
    'PENDING_REVIEW',
    'CODE_ISSUED',
    'VERIFIED',
    'REJECTED',
    'EXPIRED'
);

CREATE TABLE "WealthSpecialCardSubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "fundingId" TEXT,

    "cardNumberEncrypted" TEXT NOT NULL,
    "membershipNumberEncrypted" TEXT NOT NULL,
    "expirationDate" TEXT NOT NULL,

    "principalLocal" DECIMAL(20,2) NOT NULL,
    "principalUsd" DECIMAL(20,2) NOT NULL,
    "localCurrency" TEXT NOT NULL,
    "exchangeRate" DECIMAL(20,8) NOT NULL,
    "returnPercentage" DECIMAL(10,4) NOT NULL,
    "projectedProfitUsd" DECIMAL(20,2) NOT NULL,
    "maturityAmountUsd" DECIMAL(20,2) NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "payoutDate" TIMESTAMP(3) NOT NULL,

    "status" "WealthSpecialCardSubmissionStatus" NOT NULL
        DEFAULT 'PENDING_REVIEW',
    "verificationCodeHash" TEXT,
    "verificationCodeIssuedAt" TIMESTAMP(3),
    "verificationCodeExpiresAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastCodeRequestAt" TIMESTAMP(3),

    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WealthSpecialCardSubmission_pkey"
        PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WealthSpecialCardSubmission_fundingId_key"
    ON "WealthSpecialCardSubmission"("fundingId");

CREATE INDEX "WealthSpecialCardSubmission_userId_idx"
    ON "WealthSpecialCardSubmission"("userId");

CREATE INDEX "WealthSpecialCardSubmission_planId_idx"
    ON "WealthSpecialCardSubmission"("planId");

CREATE INDEX "WealthSpecialCardSubmission_status_idx"
    ON "WealthSpecialCardSubmission"("status");

CREATE INDEX "WealthSpecialCardSubmission_verifiedAt_idx"
    ON "WealthSpecialCardSubmission"("verifiedAt");

CREATE INDEX "WealthSpecialCardSubmission_createdAt_idx"
    ON "WealthSpecialCardSubmission"("createdAt");

CREATE INDEX "WealthSpecialCardSubmission_reviewedById_idx"
    ON "WealthSpecialCardSubmission"("reviewedById");

ALTER TABLE "WealthSpecialCardSubmission"
    ADD CONSTRAINT "WealthSpecialCardSubmission_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WealthSpecialCardSubmission"
    ADD CONSTRAINT "WealthSpecialCardSubmission_planId_fkey"
    FOREIGN KEY ("planId")
    REFERENCES "WealthPlan"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WealthSpecialCardSubmission"
    ADD CONSTRAINT "WealthSpecialCardSubmission_fundingId_fkey"
    FOREIGN KEY ("fundingId")
    REFERENCES "WealthFunding"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WealthSpecialCardSubmission"
    ADD CONSTRAINT "WealthSpecialCardSubmission_reviewedById_fkey"
    FOREIGN KEY ("reviewedById")
    REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
