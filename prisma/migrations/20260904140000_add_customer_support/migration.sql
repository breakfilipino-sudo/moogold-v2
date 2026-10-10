-- CreateEnum
CREATE TYPE "SupportCategory" AS ENUM (
  'ACCOUNT',
  'SECURITY',
  'DEPOSIT',
  'WITHDRAWAL',
  'GOLD',
  'CRYPTO',
  'GIFT_CARDS',
  'REFERRALS',
  'TRANSACTIONS',
  'VERIFICATION',
  'OTHER'
);

-- CreateEnum
CREATE TYPE "SupportConversationStatus" AS ENUM (
  'OPEN',
  'PENDING',
  'RESOLVED',
  'CLOSED'
);

-- CreateEnum
CREATE TYPE "SupportPriority" AS ENUM (
  'LOW',
  'NORMAL',
  'HIGH',
  'URGENT'
);

-- CreateEnum
CREATE TYPE "SupportSenderType" AS ENUM (
  'CUSTOMER',
  'SUPPORT',
  'SYSTEM'
);

-- CreateTable
CREATE TABLE "SupportConversation" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "assignedAdminId" TEXT,
  "reference" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "category" "SupportCategory" NOT NULL,
  "status" "SupportConversationStatus" NOT NULL DEFAULT 'OPEN',
  "priority" "SupportPriority" NOT NULL DEFAULT 'NORMAL',
  "lastMessageAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SupportConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "senderType" "SupportSenderType" NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupportConversation_reference_key"
ON "SupportConversation"("reference");

CREATE INDEX "SupportConversation_userId_idx"
ON "SupportConversation"("userId");

CREATE INDEX "SupportConversation_assignedAdminId_idx"
ON "SupportConversation"("assignedAdminId");

CREATE INDEX "SupportConversation_status_idx"
ON "SupportConversation"("status");

CREATE INDEX "SupportConversation_category_idx"
ON "SupportConversation"("category");

CREATE INDEX "SupportConversation_priority_idx"
ON "SupportConversation"("priority");

CREATE INDEX "SupportConversation_lastMessageAt_idx"
ON "SupportConversation"("lastMessageAt");

CREATE INDEX "SupportConversation_createdAt_idx"
ON "SupportConversation"("createdAt");

CREATE INDEX "SupportMessage_conversationId_idx"
ON "SupportMessage"("conversationId");

CREATE INDEX "SupportMessage_authorId_idx"
ON "SupportMessage"("authorId");

CREATE INDEX "SupportMessage_senderType_idx"
ON "SupportMessage"("senderType");

CREATE INDEX "SupportMessage_createdAt_idx"
ON "SupportMessage"("createdAt");

-- AddForeignKey
ALTER TABLE "SupportConversation"
ADD CONSTRAINT "SupportConversation_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "SupportConversation"
ADD CONSTRAINT "SupportConversation_assignedAdminId_fkey"
FOREIGN KEY ("assignedAdminId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "SupportMessage"
ADD CONSTRAINT "SupportMessage_conversationId_fkey"
FOREIGN KEY ("conversationId")
REFERENCES "SupportConversation"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "SupportMessage"
ADD CONSTRAINT "SupportMessage_authorId_fkey"
FOREIGN KEY ("authorId")
REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;