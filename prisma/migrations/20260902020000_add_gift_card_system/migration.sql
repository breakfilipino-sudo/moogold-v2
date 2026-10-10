-- CreateEnum
CREATE TYPE "GiftCardInputMode" AS ENUM ('PHOTO', 'CODE', 'BOTH');

-- CreateEnum
CREATE TYPE "GiftCardRedemptionMethod" AS ENUM ('FIXED_FEE', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "GiftCardSubmissionStatus" AS ENUM ('PENDING', 'PROCESSING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'GIFT_CARD_REDEMPTION';

-- CreateTable
CREATE TABLE "GiftCardBrand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftCardBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCardProduct" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "countryCode" TEXT,
    "region" TEXT,
    "currency" TEXT NOT NULL,
    "requiresCountry" BOOLEAN NOT NULL DEFAULT false,
    "inputMode" "GiftCardInputMode" NOT NULL DEFAULT 'BOTH',
    "redemptionMethod" "GiftCardRedemptionMethod" NOT NULL DEFAULT 'FIXED_FEE',
    "redemptionValue" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "minValue" DECIMAL(20,2),
    "maxValue" DECIMAL(20,2),
    "allowMultipleCards" BOOLEAN NOT NULL DEFAULT true,
    "maxCardsPerSubmission" INTEGER NOT NULL DEFAULT 10,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftCardProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCardDenomination" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "value" DECIMAL(20,2) NOT NULL,
    "creditAmount" DECIMAL(20,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftCardDenomination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCardSubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "countryCode" TEXT,
    "region" TEXT,
    "currency" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "faceValuePerCard" DECIMAL(20,2) NOT NULL,
    "totalFaceValue" DECIMAL(20,2) NOT NULL,
    "totalCreditAmount" DECIMAL(20,2) NOT NULL,
    "status" "GiftCardSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "adminNotes" TEXT,
    "rejectionReason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftCardSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCardSubmissionCard" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "faceValue" DECIMAL(20,2) NOT NULL,
    "creditAmount" DECIMAL(20,2) NOT NULL,
    "giftCardCode" TEXT,
    "giftCardCodeHash" TEXT,
    "photoPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftCardSubmissionCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GiftCardBrand_slug_key" ON "GiftCardBrand"("slug");

-- CreateIndex
CREATE INDEX "GiftCardBrand_active_idx" ON "GiftCardBrand"("active");

-- CreateIndex
CREATE INDEX "GiftCardBrand_name_idx" ON "GiftCardBrand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCardProduct_slug_key" ON "GiftCardProduct"("slug");

-- CreateIndex
CREATE INDEX "GiftCardProduct_brandId_idx" ON "GiftCardProduct"("brandId");

-- CreateIndex
CREATE INDEX "GiftCardProduct_countryCode_idx" ON "GiftCardProduct"("countryCode");

-- CreateIndex
CREATE INDEX "GiftCardProduct_currency_idx" ON "GiftCardProduct"("currency");

-- CreateIndex
CREATE INDEX "GiftCardProduct_region_idx" ON "GiftCardProduct"("region");

-- CreateIndex
CREATE INDEX "GiftCardProduct_active_idx" ON "GiftCardProduct"("active");

-- CreateIndex
CREATE INDEX "GiftCardDenomination_productId_idx" ON "GiftCardDenomination"("productId");

-- CreateIndex
CREATE INDEX "GiftCardDenomination_active_idx" ON "GiftCardDenomination"("active");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCardDenomination_productId_value_key" ON "GiftCardDenomination"("productId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCardSubmission_transactionId_key" ON "GiftCardSubmission"("transactionId");

-- CreateIndex
CREATE INDEX "GiftCardSubmission_userId_idx" ON "GiftCardSubmission"("userId");

-- CreateIndex
CREATE INDEX "GiftCardSubmission_productId_idx" ON "GiftCardSubmission"("productId");

-- CreateIndex
CREATE INDEX "GiftCardSubmission_status_idx" ON "GiftCardSubmission"("status");

-- CreateIndex
CREATE INDEX "GiftCardSubmission_createdAt_idx" ON "GiftCardSubmission"("createdAt");

-- CreateIndex
CREATE INDEX "GiftCardSubmission_reviewedById_idx" ON "GiftCardSubmission"("reviewedById");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCardSubmissionCard_giftCardCodeHash_key" ON "GiftCardSubmissionCard"("giftCardCodeHash");

-- CreateIndex
CREATE INDEX "GiftCardSubmissionCard_submissionId_idx" ON "GiftCardSubmissionCard"("submissionId");

-- CreateIndex
CREATE INDEX "GiftCardSubmissionCard_giftCardCodeHash_idx" ON "GiftCardSubmissionCard"("giftCardCodeHash");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCardSubmissionCard_submissionId_sequence_key" ON "GiftCardSubmissionCard"("submissionId", "sequence");

-- AddForeignKey
ALTER TABLE "GiftCardProduct" ADD CONSTRAINT "GiftCardProduct_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "GiftCardBrand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardDenomination" ADD CONSTRAINT "GiftCardDenomination_productId_fkey" FOREIGN KEY ("productId") REFERENCES "GiftCardProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardSubmission" ADD CONSTRAINT "GiftCardSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardSubmission" ADD CONSTRAINT "GiftCardSubmission_productId_fkey" FOREIGN KEY ("productId") REFERENCES "GiftCardProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardSubmission" ADD CONSTRAINT "GiftCardSubmission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardSubmission" ADD CONSTRAINT "GiftCardSubmission_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardSubmissionCard" ADD CONSTRAINT "GiftCardSubmissionCard_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "GiftCardSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
