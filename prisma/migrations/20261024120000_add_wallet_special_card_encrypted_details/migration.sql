ALTER TABLE "WalletSpecialCardRequest"
    ADD COLUMN "cardNumberEncrypted" TEXT,
    ADD COLUMN "expiryEncrypted" TEXT,
    ADD COLUMN "membershipNumberEncrypted" TEXT;
