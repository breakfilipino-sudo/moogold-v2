ALTER TYPE "DepositMethod" ADD VALUE 'GCASH';
ALTER TYPE "DepositMethod" ADD VALUE 'MAYA';
ALTER TYPE "DepositMethod" ADD VALUE 'TOUCH_N_GO';

ALTER TABLE "DepositDetails"
ADD COLUMN "gatewayUrl" TEXT;