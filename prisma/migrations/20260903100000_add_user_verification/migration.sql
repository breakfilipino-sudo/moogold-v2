-- CreateEnum
CREATE TYPE "VerificationTier" AS ENUM (
  'TIER_1',
  'TIER_2',
  'TIER_3'
);

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM (
  'NOT_STARTED',
  'IN_PROGRESS',
  'UNDER_REVIEW',
  'VERIFIED',
  'REJECTED',
  'MORE_INFORMATION_REQUIRED'
);

-- CreateEnum
CREATE TYPE "VerificationDocumentType" AS ENUM (
  'NATIONAL_ID',
  'PASSPORT',
  'DRIVERS_LICENSE',
  'RESIDENCE_PERMIT',
  'OTHER'
);

-- CreateEnum
CREATE TYPE "VerificationDocumentStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED'
);

-- CreateEnum
CREATE TYPE "VerificationCheckType" AS ENUM (
  'DOCUMENT',
  'DOCUMENT_EXPIRY',
  'DOCUMENT_TAMPERING',
  'SELFIE',
  'FACE_MATCH',
  'LIVENESS',
  'ADDRESS',
  'DATA_CONSISTENCY',
  'MANUAL_REVIEW'
);

-- CreateEnum
CREATE TYPE "VerificationCheckStatus" AS ENUM (
  'PENDING',
  'PASSED',
  'FAILED',
  'REVIEW'
);

-- CreateTable
CREATE TABLE "UserVerification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tier" "VerificationTier" NOT NULL DEFAULT 'TIER_1',
  "status" "VerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "dateOfBirth" TIMESTAMP(3),
  "countryCode" TEXT,
  "addressLine1" TEXT,
  "addressLine2" TEXT,
  "city" TEXT,
  "stateProvince" TEXT,
  "postalCode" TEXT,
  "submittedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  "rejectionReason" TEXT,
  "informationRequest" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationDocument" (
  "id" TEXT NOT NULL,
  "verificationId" TEXT NOT NULL,
  "type" "VerificationDocumentType" NOT NULL,
  "documentNumber" TEXT,
  "countryCode" TEXT,
  "storagePath" TEXT NOT NULL,
  "status" "VerificationDocumentStatus" NOT NULL DEFAULT 'PENDING',
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "VerificationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationCheck" (
  "id" TEXT NOT NULL,
  "verificationId" TEXT NOT NULL,
  "type" "VerificationCheckType" NOT NULL,
  "status" "VerificationCheckStatus" NOT NULL,
  "result" TEXT,
  "metadata" JSONB,
  "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "VerificationCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserVerification_userId_key"
ON "UserVerification"("userId");

CREATE INDEX "UserVerification_status_idx"
ON "UserVerification"("status");

CREATE INDEX "UserVerification_tier_idx"
ON "UserVerification"("tier");

CREATE INDEX "UserVerification_reviewedById_idx"
ON "UserVerification"("reviewedById");

CREATE INDEX "UserVerification_createdAt_idx"
ON "UserVerification"("createdAt");

CREATE INDEX "VerificationDocument_verificationId_idx"
ON "VerificationDocument"("verificationId");

CREATE INDEX "VerificationDocument_type_idx"
ON "VerificationDocument"("type");

CREATE INDEX "VerificationDocument_status_idx"
ON "VerificationDocument"("status");

CREATE INDEX "VerificationCheck_verificationId_idx"
ON "VerificationCheck"("verificationId");

CREATE INDEX "VerificationCheck_type_idx"
ON "VerificationCheck"("type");

CREATE INDEX "VerificationCheck_status_idx"
ON "VerificationCheck"("status");

CREATE INDEX "VerificationCheck_checkedAt_idx"
ON "VerificationCheck"("checkedAt");

-- AddForeignKey
ALTER TABLE "UserVerification"
ADD CONSTRAINT "UserVerification_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserVerification"
ADD CONSTRAINT "UserVerification_reviewedById_fkey"
FOREIGN KEY ("reviewedById")
REFERENCES "User"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationDocument"
ADD CONSTRAINT "VerificationDocument_verificationId_fkey"
FOREIGN KEY ("verificationId")
REFERENCES "UserVerification"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationCheck"
ADD CONSTRAINT "VerificationCheck_verificationId_fkey"
FOREIGN KEY ("verificationId")
REFERENCES "UserVerification"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;