-- REVIEW ONLY: DO NOT APPLY OR DEPLOY.
-- Generated structural diff plus guarded backfill and custom checks.
-- Existing application code still needs coordinated reservation-bucket updates.
BEGIN;


-- CreateEnum
CREATE TYPE "CryptoLoanStatus" AS ENUM ('ACTIVE', 'REPAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CryptoCashConversionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'CRYPTO_CONVERSION';


-- AlterTable
ALTER TABLE "CryptoLedgerEntry" ADD COLUMN     "collateralReservedBalanceAfter" DECIMAL(30,18),
ADD COLUMN     "collateralReservedBalanceBefore" DECIMAL(30,18),
ADD COLUMN     "conversionId" TEXT,
ADD COLUMN     "conversionReservedBalanceAfter" DECIMAL(30,18),
ADD COLUMN     "conversionReservedBalanceBefore" DECIMAL(30,18),
ADD COLUMN     "loanId" TEXT,
ADD COLUMN     "operationKey" TEXT,
ADD COLUMN     "reservedBalanceAfter" DECIMAL(30,18),
ADD COLUMN     "reservedBalanceBefore" DECIMAL(30,18),
ADD COLUMN     "withdrawalReservedBalanceAfter" DECIMAL(30,18),
ADD COLUMN     "withdrawalReservedBalanceBefore" DECIMAL(30,18);

-- CreateTable
CREATE TABLE "CryptoLoan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cryptoBalanceId" TEXT NOT NULL,
    "borrowedCryptoBalanceId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "principalAmount" DECIMAL(30,18) NOT NULL,
    "collateralAmount" DECIMAL(30,18) NOT NULL,
    "principalUsdValue" DECIMAL(30,8) NOT NULL,
    "collateralUsdValue" DECIMAL(30,8) NOT NULL,
    "principalUsdPriceAtOrigination" DECIMAL(20,8) NOT NULL,
    "principalPriceSource" TEXT NOT NULL,
    "principalPriceObservedAt" TIMESTAMP(3) NOT NULL,
    "collateralUsdPriceAtOrigination" DECIMAL(20,8) NOT NULL,
    "collateralPriceSource" TEXT NOT NULL,
    "collateralPriceObservedAt" TIMESTAMP(3) NOT NULL,
    "termsVersion" TEXT NOT NULL,
    "termsAcceptedAt" TIMESTAMP(3) NOT NULL,
    "termsAcceptedText" TEXT NOT NULL,
    "repaidAmount" DECIMAL(30,18) NOT NULL DEFAULT 0,
    "interestRate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "status" "CryptoLoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "repaidAt" TIMESTAMP(3),
    "collateralReleasedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CryptoLoan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CryptoLoanRepayment" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "ledgerEntryId" TEXT NOT NULL,
    "amount" DECIMAL(30,18) NOT NULL,
    "reference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CryptoLoanRepayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CryptoCashConversion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cryptoBalanceId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "asset" "CryptoAsset" NOT NULL,
    "network" "CryptoNetwork" NOT NULL,
    "cryptoAmount" DECIMAL(30,18) NOT NULL,
    "cryptoUsdPrice" DECIMAL(20,8) NOT NULL,
    "cryptoPriceSource" TEXT NOT NULL,
    "cryptoPriceObservedAt" TIMESTAMP(3) NOT NULL,
    "usdToLocalRate" DECIMAL(20,8) NOT NULL,
    "fxRateSource" TEXT NOT NULL,
    "fxRateObservedAt" TIMESTAMP(3) NOT NULL,
    "usdValue" DECIMAL(30,8) NOT NULL,
    "feeUsd" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "payoutAmount" DECIMAL(20,2) NOT NULL,
    "payoutCurrency" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountNumberEncrypted" TEXT NOT NULL,
    "accountNumberLast4" TEXT NOT NULL,
    "routingNumberEncrypted" TEXT,
    "quoteExpiresAt" TIMESTAMP(3) NOT NULL,
    "reservedAt" TIMESTAMP(3),
    "status" "CryptoCashConversionStatus" NOT NULL DEFAULT 'PENDING',
    "transactionId" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CryptoCashConversion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CryptoLoan_reference_key" ON "CryptoLoan"("reference");

-- CreateIndex
CREATE INDEX "CryptoLoan_userId_status_idx" ON "CryptoLoan"("userId", "status");

-- CreateIndex
CREATE INDEX "CryptoLoan_cryptoBalanceId_idx" ON "CryptoLoan"("cryptoBalanceId");

-- CreateIndex
CREATE INDEX "CryptoLoan_borrowedCryptoBalanceId_idx" ON "CryptoLoan"("borrowedCryptoBalanceId");

-- CreateIndex
CREATE INDEX "CryptoLoan_createdAt_idx" ON "CryptoLoan"("createdAt");

-- CreateIndex
CREATE INDEX "CryptoLoan_principalPriceObservedAt_idx" ON "CryptoLoan"("principalPriceObservedAt");

-- CreateIndex
CREATE INDEX "CryptoLoan_collateralPriceObservedAt_idx" ON "CryptoLoan"("collateralPriceObservedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CryptoLoanRepayment_ledgerEntryId_key" ON "CryptoLoanRepayment"("ledgerEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "CryptoLoanRepayment_reference_key" ON "CryptoLoanRepayment"("reference");

-- CreateIndex
CREATE INDEX "CryptoLoanRepayment_loanId_createdAt_idx" ON "CryptoLoanRepayment"("loanId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CryptoCashConversion_reference_key" ON "CryptoCashConversion"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "CryptoCashConversion_transactionId_key" ON "CryptoCashConversion"("transactionId");

-- CreateIndex
CREATE INDEX "CryptoCashConversion_userId_status_idx" ON "CryptoCashConversion"("userId", "status");

-- CreateIndex
CREATE INDEX "CryptoCashConversion_cryptoBalanceId_idx" ON "CryptoCashConversion"("cryptoBalanceId");

-- CreateIndex
CREATE INDEX "CryptoCashConversion_countryCode_idx" ON "CryptoCashConversion"("countryCode");

-- CreateIndex
CREATE INDEX "CryptoCashConversion_createdAt_idx" ON "CryptoCashConversion"("createdAt");

-- CreateIndex
CREATE INDEX "CryptoCashConversion_quoteExpiresAt_idx" ON "CryptoCashConversion"("quoteExpiresAt");

-- CreateIndex
CREATE INDEX "CryptoCashConversion_cryptoPriceObservedAt_idx" ON "CryptoCashConversion"("cryptoPriceObservedAt");

-- CreateIndex
CREATE INDEX "CryptoCashConversion_fxRateObservedAt_idx" ON "CryptoCashConversion"("fxRateObservedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CryptoLedgerEntry_operationKey_key" ON "CryptoLedgerEntry"("operationKey");

-- CreateIndex
CREATE INDEX "CryptoLedgerEntry_loanId_idx" ON "CryptoLedgerEntry"("loanId");

-- CreateIndex
CREATE INDEX "CryptoLedgerEntry_conversionId_idx" ON "CryptoLedgerEntry"("conversionId");

-- AddForeignKey
ALTER TABLE "CryptoLedgerEntry" ADD CONSTRAINT "CryptoLedgerEntry_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "CryptoLoan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CryptoLedgerEntry" ADD CONSTRAINT "CryptoLedgerEntry_conversionId_fkey" FOREIGN KEY ("conversionId") REFERENCES "CryptoCashConversion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CryptoLoan" ADD CONSTRAINT "CryptoLoan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CryptoLoan" ADD CONSTRAINT "CryptoLoan_cryptoBalanceId_fkey" FOREIGN KEY ("cryptoBalanceId") REFERENCES "CryptoBalance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CryptoLoan" ADD CONSTRAINT "CryptoLoan_borrowedCryptoBalanceId_fkey" FOREIGN KEY ("borrowedCryptoBalanceId") REFERENCES "CryptoBalance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CryptoLoanRepayment" ADD CONSTRAINT "CryptoLoanRepayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "CryptoLoan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CryptoLoanRepayment" ADD CONSTRAINT "CryptoLoanRepayment_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "CryptoLedgerEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CryptoCashConversion" ADD CONSTRAINT "CryptoCashConversion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CryptoCashConversion" ADD CONSTRAINT "CryptoCashConversion_cryptoBalanceId_fkey" FOREIGN KEY ("cryptoBalanceId") REFERENCES "CryptoBalance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CryptoCashConversion" ADD CONSTRAINT "CryptoCashConversion_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CryptoCashConversion" ADD CONSTRAINT "CryptoCashConversion_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;



-- REVIEW-DRAFT CUSTOM CHECKS
-- These supplement Prisma's generated schema diff.
-- Do not apply until server-side accounting and transaction logic are reviewed.

ALTER TABLE "CryptoLoan"
  ADD CONSTRAINT "CryptoLoan_principalAmount_positive_check"
    CHECK ("principalAmount" > 0),
  ADD CONSTRAINT "CryptoLoan_collateralAmount_positive_check"
    CHECK ("collateralAmount" > 0),
  ADD CONSTRAINT "CryptoLoan_principalUsdValue_minimum_check"
    CHECK ("principalUsdValue" >= 1000),
  ADD CONSTRAINT "CryptoLoan_collateralUsdValue_positive_check"
    CHECK ("collateralUsdValue" > 0),
  ADD CONSTRAINT "CryptoLoan_collateral_ratio_check"
    CHECK ("collateralUsdValue" >= "principalUsdValue" * 0.40),
  ADD CONSTRAINT "CryptoLoan_principalUsdPrice_positive_check"
    CHECK ("principalUsdPriceAtOrigination" > 0),
  ADD CONSTRAINT "CryptoLoan_collateralUsdPrice_positive_check"
    CHECK ("collateralUsdPriceAtOrigination" > 0),
  ADD CONSTRAINT "CryptoLoan_repaidAmount_valid_check"
    CHECK ("repaidAmount" >= 0 AND "repaidAmount" <= "principalAmount"),
  ADD CONSTRAINT "CryptoLoan_zero_interest_check"
    CHECK ("interestRate" = 0),
  ADD CONSTRAINT "CryptoLoan_audit_text_required_check"
    CHECK (
      length(trim("principalPriceSource")) > 0 AND
      length(trim("collateralPriceSource")) > 0 AND
      length(trim("termsVersion")) > 0 AND
      length(trim("termsAcceptedText")) > 0
    );

ALTER TABLE "CryptoLoanRepayment"
  ADD CONSTRAINT "CryptoLoanRepayment_amount_positive_check"
    CHECK ("amount" > 0);

ALTER TABLE "CryptoCashConversion"
  ADD CONSTRAINT "CryptoCashConversion_cryptoAmount_positive_check"
    CHECK ("cryptoAmount" > 0),
  ADD CONSTRAINT "CryptoCashConversion_cryptoUsdPrice_positive_check"
    CHECK ("cryptoUsdPrice" > 0),
  ADD CONSTRAINT "CryptoCashConversion_usdToLocalRate_positive_check"
    CHECK ("usdToLocalRate" > 0),
  ADD CONSTRAINT "CryptoCashConversion_usdValue_positive_check"
    CHECK ("usdValue" > 0),
  ADD CONSTRAINT "CryptoCashConversion_feeUsd_valid_check"
    CHECK ("feeUsd" >= 0 AND "feeUsd" < "usdValue"),
  ADD CONSTRAINT "CryptoCashConversion_payoutAmount_positive_check"
    CHECK ("payoutAmount" > 0),
  ADD CONSTRAINT "CryptoCashConversion_audit_text_required_check"
    CHECK (
      length(trim("cryptoPriceSource")) > 0 AND
      length(trim("fxRateSource")) > 0 AND
      length(trim("payoutCurrency")) > 0 AND
      length(trim("countryCode")) > 0 AND
      length(trim("bankName")) > 0 AND
      length(trim("accountName")) > 0 AND
      length(trim("accountNumberLast4")) > 0
    );

COMMIT;