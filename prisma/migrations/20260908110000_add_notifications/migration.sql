CREATE TYPE "NotificationType" AS ENUM (
  'ACCOUNT',
  'SECURITY',
  'DEPOSIT',
  'WITHDRAWAL',
  'CRYPTO_DEPOSIT',
  'CRYPTO_WITHDRAWAL',
  'REFERRAL',
  'GIFT_CARD',
  'GOLD',
  'SUPPORT',
  'SYSTEM'
);

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "href" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_userId_idx"
ON "Notification"("userId");

CREATE INDEX "Notification_userId_readAt_idx"
ON "Notification"("userId", "readAt");

CREATE INDEX "Notification_userId_createdAt_idx"
ON "Notification"("userId", "createdAt");

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;