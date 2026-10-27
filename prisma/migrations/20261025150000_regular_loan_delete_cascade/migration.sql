ALTER TABLE "RegularLoanLedgerEntry"
    DROP CONSTRAINT "RegularLoanLedgerEntry_balanceId_fkey",
    ADD CONSTRAINT "RegularLoanLedgerEntry_balanceId_fkey"
        FOREIGN KEY ("balanceId")
        REFERENCES "RegularLoanBalance"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RegularLoanLedgerEntry"
    DROP CONSTRAINT "RegularLoanLedgerEntry_applicationId_fkey",
    ADD CONSTRAINT "RegularLoanLedgerEntry_applicationId_fkey"
        FOREIGN KEY ("applicationId")
        REFERENCES "RegularLoanApplication"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
