CREATE TYPE "RegularLoanType" AS ENUM ('PERSONAL', 'BUSINESS');
CREATE TYPE "RegularLoanStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'DISBURSED');
CREATE TYPE "RegularLoanDocumentType" AS ENUM ('PERSONAL_ID', 'BUSINESS_REGISTRATION', 'ADDRESS_PROOF', 'OTHER');
CREATE TYPE "RegularLoanLedgerDirection" AS ENUM ('CREDIT', 'DEBIT');

CREATE TABLE "RegularLoanApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "loanType" "RegularLoanType" NOT NULL,
    "status" "RegularLoanStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "currency" TEXT NOT NULL,
    "requestedAmount" DECIMAL(20,2) NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "requestedInterestRate" DECIMAL(7,4) NOT NULL,
    "requestedTotalRepayment" DECIMAL(20,2) NOT NULL,
    "offerAmount" DECIMAL(20,2),
    "offerInterestRate" DECIMAL(7,4),
    "offerTotalRepayment" DECIMAL(20,2),
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "offerAcceptedAt" TIMESTAMP(3),
    "disbursedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RegularLoanApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RegularLoanDocument" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "type" "RegularLoanDocumentType" NOT NULL,
    "storagePath" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RegularLoanDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RegularLoanBalance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RegularLoanBalance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RegularLoanLedgerEntry" (
    "id" TEXT NOT NULL,
    "balanceId" TEXT NOT NULL,
    "applicationId" TEXT,
    "direction" "RegularLoanLedgerDirection" NOT NULL,
    "amount" DECIMAL(20,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "balanceBefore" DECIMAL(20,2) NOT NULL,
    "balanceAfter" DECIMAL(20,2) NOT NULL,
    "reference" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RegularLoanLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RegularLoanBalance_userId_key" ON "RegularLoanBalance"("userId");
CREATE UNIQUE INDEX "RegularLoanLedgerEntry_applicationId_key" ON "RegularLoanLedgerEntry"("applicationId");
CREATE UNIQUE INDEX "RegularLoanLedgerEntry_reference_key" ON "RegularLoanLedgerEntry"("reference");

CREATE INDEX "RegularLoanApplication_userId_createdAt_idx" ON "RegularLoanApplication"("userId", "createdAt");
CREATE INDEX "RegularLoanApplication_status_createdAt_idx" ON "RegularLoanApplication"("status", "createdAt");
CREATE INDEX "RegularLoanApplication_reviewedById_idx" ON "RegularLoanApplication"("reviewedById");
CREATE INDEX "RegularLoanDocument_applicationId_idx" ON "RegularLoanDocument"("applicationId");
CREATE INDEX "RegularLoanDocument_type_idx" ON "RegularLoanDocument"("type");
CREATE INDEX "RegularLoanLedgerEntry_balanceId_createdAt_idx" ON "RegularLoanLedgerEntry"("balanceId", "createdAt");
CREATE INDEX "RegularLoanLedgerEntry_direction_createdAt_idx" ON "RegularLoanLedgerEntry"("direction", "createdAt");

ALTER TABLE "RegularLoanApplication"
    ADD CONSTRAINT "RegularLoanApplication_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RegularLoanApplication"
    ADD CONSTRAINT "RegularLoanApplication_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RegularLoanDocument"
    ADD CONSTRAINT "RegularLoanDocument_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "RegularLoanApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RegularLoanBalance"
    ADD CONSTRAINT "RegularLoanBalance_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RegularLoanLedgerEntry"
    ADD CONSTRAINT "RegularLoanLedgerEntry_balanceId_fkey"
    FOREIGN KEY ("balanceId") REFERENCES "RegularLoanBalance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RegularLoanLedgerEntry"
    ADD CONSTRAINT "RegularLoanLedgerEntry_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "RegularLoanApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;