-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "exchangeRate" DECIMAL(20,8),
ADD COLUMN     "originalAmount" DECIMAL(20,2),
ADD COLUMN     "originalCurrency" TEXT;
