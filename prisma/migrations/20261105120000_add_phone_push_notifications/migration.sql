CREATE TYPE "PushDeliveryStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'SENT',
    'FAILED'
);

CREATE TYPE "PushCampaignStatus" AS ENUM (
    'QUEUED',
    'SENT',
    'PARTIALLY_SENT',
    'FAILED',
    'NO_DEVICES'
);

CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "expirationTime" BIGINT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PushCampaign" (
    "id" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT,
    "audience" TEXT NOT NULL DEFAULT 'ALL',
    "targetUserIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "status" "PushCampaignStatus" NOT NULL DEFAULT 'QUEUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    CONSTRAINT "PushCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PushDelivery" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "notificationId" TEXT,
    "campaignId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT,
    "status" "PushDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PushDelivery_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PushDelivery_exactly_one_source_check"
      CHECK (("notificationId" IS NOT NULL AND "campaignId" IS NULL)
          OR ("notificationId" IS NULL AND "campaignId" IS NOT NULL))
);

CREATE UNIQUE INDEX "PushSubscription_endpoint_key"
    ON "PushSubscription"("endpoint");

CREATE INDEX "PushSubscription_userId_revokedAt_idx"
    ON "PushSubscription"("userId", "revokedAt");

CREATE INDEX "PushCampaign_createdAt_idx"
    ON "PushCampaign"("createdAt");

CREATE INDEX "PushCampaign_status_createdAt_idx"
    ON "PushCampaign"("status", "createdAt");

CREATE UNIQUE INDEX "PushDelivery_subscriptionId_notificationId_key"
    ON "PushDelivery"("subscriptionId", "notificationId");

CREATE UNIQUE INDEX "PushDelivery_subscriptionId_campaignId_key"
    ON "PushDelivery"("subscriptionId", "campaignId");

CREATE INDEX "PushDelivery_status_nextAttemptAt_idx"
    ON "PushDelivery"("status", "nextAttemptAt");

CREATE INDEX "PushDelivery_subscriptionId_status_idx"
    ON "PushDelivery"("subscriptionId", "status");

ALTER TABLE "PushSubscription"
    ADD CONSTRAINT "PushSubscription_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PushCampaign"
    ADD CONSTRAINT "PushCampaign_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PushDelivery"
    ADD CONSTRAINT "PushDelivery_subscriptionId_fkey"
    FOREIGN KEY ("subscriptionId") REFERENCES "PushSubscription"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PushDelivery"
    ADD CONSTRAINT "PushDelivery_notificationId_fkey"
    FOREIGN KEY ("notificationId") REFERENCES "Notification"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PushDelivery"
    ADD CONSTRAINT "PushDelivery_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "PushCampaign"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "moogold_queue_account_push"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO "PushDelivery" (
        "id",
        "subscriptionId",
        "notificationId",
        "title",
        "message",
        "href",
        "status",
        "attempts",
        "nextAttemptAt",
        "createdAt",
        "updatedAt"
    )
    SELECT
        'push_' || md5(NEW."id" || ':' || subscription."id"),
        subscription."id",
        NEW."id",
        NEW."title",
        NEW."message",
        NEW."href",
        'PENDING',
        0,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    FROM "PushSubscription" AS subscription
    WHERE subscription."userId" = NEW."userId"
      AND subscription."revokedAt" IS NULL
    ON CONFLICT ("subscriptionId", "notificationId") DO NOTHING;

    RETURN NEW;
END;
$$;

CREATE TRIGGER "Notification_queue_account_push"
AFTER INSERT ON "Notification"
FOR EACH ROW
EXECUTE FUNCTION "moogold_queue_account_push"();