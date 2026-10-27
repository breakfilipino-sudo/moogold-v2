ALTER TABLE "CryptoBalance"
ADD COLUMN "reservedBalance" DECIMAL(30,18) NOT NULL DEFAULT 0;

-- Preserve funds associated with existing withdrawals awaiting review.
UPDATE "CryptoBalance" AS cb
SET "reservedBalance" = COALESCE(
  (
    SELECT SUM(cw."totalAmount")
    FROM "CryptoWithdrawal" AS cw
    WHERE cw."cryptoBalanceId" = cb."id"
      AND cw."status" IN ('PENDING', 'PROCESSING')
  ),
  0
);