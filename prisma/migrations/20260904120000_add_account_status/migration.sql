CREATE TYPE "AccountStatus" AS ENUM (
  'ACTIVE',
  'CLOSURE_REQUESTED',
  'CLOSED'
);

ALTER TABLE "User"
ADD COLUMN "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "closureRequestedAt" TIMESTAMP(3),
ADD COLUMN "closedAt" TIMESTAMP(3);

CREATE INDEX "User_accountStatus_idx"
ON "User"("accountStatus");