CREATE TABLE "WalletSpecialCardRequest" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AWAITING_CODE',
    "verificationCodeHash" TEXT,
    "verificationCodeIssuedAt" TIMESTAMP(3),
    "verificationCodeExpiresAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "issuedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletSpecialCardRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WalletSpecialCardRequest_transactionId_key"
    ON "WalletSpecialCardRequest"("transactionId");
CREATE INDEX "WalletSpecialCardRequest_userId_idx"
    ON "WalletSpecialCardRequest"("userId");
CREATE INDEX "WalletSpecialCardRequest_status_idx"
    ON "WalletSpecialCardRequest"("status");
CREATE INDEX "WalletSpecialCardRequest_verificationCodeExpiresAt_idx"
    ON "WalletSpecialCardRequest"("verificationCodeExpiresAt");
CREATE INDEX "WalletSpecialCardRequest_issuedById_idx"
    ON "WalletSpecialCardRequest"("issuedById");
CREATE INDEX "WalletSpecialCardRequest_createdAt_idx"
    ON "WalletSpecialCardRequest"("createdAt");

ALTER TABLE "WalletSpecialCardRequest"
    ADD CONSTRAINT "WalletSpecialCardRequest_transactionId_fkey"
    FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WalletSpecialCardRequest"
    ADD CONSTRAINT "WalletSpecialCardRequest_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WalletSpecialCardRequest"
    ADD CONSTRAINT "WalletSpecialCardRequest_issuedById_fkey"
    FOREIGN KEY ("issuedById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;