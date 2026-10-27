/*
 * ============================================================
 * MOO GOLD — WEALTH BOX COUNTRY CONFIGURATION SEED
 * ============================================================
 *
 * Existing WealthPlan records:
 *
 * wealth_plan_5d_70   -> 5-day-growth
 * wealth_plan_10d_100 -> 10-day-growth
 * wealth_plan_20d_160 -> 20-day-growth
 * wealth_plan_30d_250 -> 30-day-growth
 *
 * This file:
 * - Preserves existing WealthPlan records.
 * - Does not insert or modify WealthPlan IDs.
 * - Updates the four existing plans by their real IDs.
 * - Creates/updates all 16 country configurations.
 * - 4 plans x 16 countries = 64 configurations.
 *
 * No migration or database reset is required.
 */


/* ============================================================
 * 1. UPDATE EXISTING PLANS
 * ============================================================ */

UPDATE "WealthPlan"
SET
  name = '5 Day Growth',
  description = 'Grow your investment over 5 days.',
  "durationDays" = 5,
  "returnPercentage" = 70.0000,
  "minimumUsd" = 17.00,
  "maximumUsd" = 100000.00,
  active = true,
  "displayOrder" = 1,
  "updatedAt" = NOW()
WHERE id = 'wealth_plan_5d_70';


UPDATE "WealthPlan"
SET
  name = '10 Day Growth',
  description = 'Grow your investment over 10 days.',
  "durationDays" = 10,
  "returnPercentage" = 100.0000,
  "minimumUsd" = 17.00,
  "maximumUsd" = 100000.00,
  active = true,
  "displayOrder" = 2,
  "updatedAt" = NOW()
WHERE id = 'wealth_plan_10d_100';


UPDATE "WealthPlan"
SET
  name = '20 Day Growth',
  description = 'Grow your investment over 20 days.',
  "durationDays" = 20,
  "returnPercentage" = 160.0000,
  "minimumUsd" = 17.00,
  "maximumUsd" = 100000.00,
  active = true,
  "displayOrder" = 3,
  "updatedAt" = NOW()
WHERE id = 'wealth_plan_20d_160';


UPDATE "WealthPlan"
SET
  name = 'Wealth Builder',
  description = 'Build your investment over 1 month.',
  "durationDays" = 30,
  "returnPercentage" = 250.0000,
  "minimumUsd" = 17.00,
  "maximumUsd" = 100000.00,
  active = true,
  "displayOrder" = 4,
  "updatedAt" = NOW()
WHERE id = 'wealth_plan_30d_250';


/* ============================================================
 * 2. VERIFY THE FOUR EXISTING PLANS
 * ============================================================ */

DO $$
DECLARE
  plan_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO plan_count
  FROM "WealthPlan"
  WHERE id IN (
    'wealth_plan_5d_70',
    'wealth_plan_10d_100',
    'wealth_plan_20d_160',
    'wealth_plan_30d_250'
  );

  IF plan_count <> 4 THEN
    RAISE EXCEPTION
      'Expected 4 existing Wealth Box plans, but found %.',
      plan_count;
  END IF;
END $$;


/* ============================================================
 * 3. US — USD
 * ============================================================ */

INSERT INTO "WealthPlanCountry" (
  id,
  "planId",
  "countryCode",
  currency,
  "currencySymbol",
  "minimumLocalAmount",
  "maximumLocalAmount",
  active,
  "createdAt",
  "updatedAt"
)
VALUES
  ('wpc_wealth_plan_5d_70_US', 'wealth_plan_5d_70', 'US', 'USD', '$', 10.00, 100000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_10d_100_US', 'wealth_plan_10d_100', 'US', 'USD', '$', 10.00, 100000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_20d_160_US', 'wealth_plan_20d_160', 'US', 'USD', '$', 10.00, 100000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_30d_250_US', 'wealth_plan_30d_250', 'US', 'USD', '$', 10.00, 100000.00, true, NOW(), NOW())
ON CONFLICT ("planId", "countryCode")
DO UPDATE SET
  currency = EXCLUDED.currency,
  "currencySymbol" = EXCLUDED."currencySymbol",
  "minimumLocalAmount" = EXCLUDED."minimumLocalAmount",
  "maximumLocalAmount" = EXCLUDED."maximumLocalAmount",
  active = EXCLUDED.active,
  "updatedAt" = NOW();


/* ============================================================
 * 4. PH — PHP
 * ============================================================ */

INSERT INTO "WealthPlanCountry" (
  id,
  "planId",
  "countryCode",
  currency,
  "currencySymbol",
  "minimumLocalAmount",
  "maximumLocalAmount",
  active,
  "createdAt",
  "updatedAt"
)
VALUES
  ('wpc_wealth_plan_5d_70_PH', 'wealth_plan_5d_70', 'PH', 'PHP', '₱', 1000.00, 5000000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_10d_100_PH', 'wealth_plan_10d_100', 'PH', 'PHP', '₱', 1000.00, 5000000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_20d_160_PH', 'wealth_plan_20d_160', 'PH', 'PHP', '₱', 1000.00, 5000000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_30d_250_PH', 'wealth_plan_30d_250', 'PH', 'PHP', '₱', 1000.00, 5000000.00, true, NOW(), NOW())
ON CONFLICT ("planId", "countryCode")
DO UPDATE SET
  currency = EXCLUDED.currency,
  "currencySymbol" = EXCLUDED."currencySymbol",
  "minimumLocalAmount" = EXCLUDED."minimumLocalAmount",
  "maximumLocalAmount" = EXCLUDED."maximumLocalAmount",
  active = EXCLUDED.active,
  "updatedAt" = NOW();


/* ============================================================
 * 5. SG — SGD
 * ============================================================ */

INSERT INTO "WealthPlanCountry" (
  id,
  "planId",
  "countryCode",
  currency,
  "currencySymbol",
  "minimumLocalAmount",
  "maximumLocalAmount",
  active,
  "createdAt",
  "updatedAt"
)
VALUES
  ('wpc_wealth_plan_5d_70_SG', 'wealth_plan_5d_70', 'SG', 'SGD', 'S$', 20.00, 130000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_10d_100_SG', 'wealth_plan_10d_100', 'SG', 'SGD', 'S$', 20.00, 130000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_20d_160_SG', 'wealth_plan_20d_160', 'SG', 'SGD', 'S$', 20.00, 130000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_30d_250_SG', 'wealth_plan_30d_250', 'SG', 'SGD', 'S$', 20.00, 130000.00, true, NOW(), NOW())
ON CONFLICT ("planId", "countryCode")
DO UPDATE SET
  currency = EXCLUDED.currency,
  "currencySymbol" = EXCLUDED."currencySymbol",
  "minimumLocalAmount" = EXCLUDED."minimumLocalAmount",
  "maximumLocalAmount" = EXCLUDED."maximumLocalAmount",
  active = EXCLUDED.active,
  "updatedAt" = NOW();


/* ============================================================
 * 6. MY — MYR
 * ============================================================ */

INSERT INTO "WealthPlanCountry" (
  id,
  "planId",
  "countryCode",
  currency,
  "currencySymbol",
  "minimumLocalAmount",
  "maximumLocalAmount",
  active,
  "createdAt",
  "updatedAt"
)
VALUES
  ('wpc_wealth_plan_5d_70_MY', 'wealth_plan_5d_70', 'MY', 'MYR', 'RM', 100.00, 500000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_10d_100_MY', 'wealth_plan_10d_100', 'MY', 'MYR', 'RM', 100.00, 500000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_20d_160_MY', 'wealth_plan_20d_160', 'MY', 'MYR', 'RM', 100.00, 500000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_30d_250_MY', 'wealth_plan_30d_250', 'MY', 'MYR', 'RM', 100.00, 500000.00, true, NOW(), NOW())
ON CONFLICT ("planId", "countryCode")
DO UPDATE SET
  currency = EXCLUDED.currency,
  "currencySymbol" = EXCLUDED."currencySymbol",
  "minimumLocalAmount" = EXCLUDED."minimumLocalAmount",
  "maximumLocalAmount" = EXCLUDED."maximumLocalAmount",
  active = EXCLUDED.active,
  "updatedAt" = NOW();


/* ============================================================
 * 7. KE — KES
 * ============================================================ */

INSERT INTO "WealthPlanCountry" (
  id,
  "planId",
  "countryCode",
  currency,
  "currencySymbol",
  "minimumLocalAmount",
  "maximumLocalAmount",
  active,
  "createdAt",
  "updatedAt"
)
VALUES
  ('wpc_wealth_plan_5d_70_KE', 'wealth_plan_5d_70', 'KE', 'KES', 'KSh', 1500.00, 13000000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_10d_100_KE', 'wealth_plan_10d_100', 'KE', 'KES', 'KSh', 1500.00, 13000000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_20d_160_KE', 'wealth_plan_20d_160', 'KE', 'KES', 'KSh', 1500.00, 13000000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_30d_250_KE', 'wealth_plan_30d_250', 'KE', 'KES', 'KSh', 1500.00, 13000000.00, true, NOW(), NOW())
ON CONFLICT ("planId", "countryCode")
DO UPDATE SET
  currency = EXCLUDED.currency,
  "currencySymbol" = EXCLUDED."currencySymbol",
  "minimumLocalAmount" = EXCLUDED."minimumLocalAmount",
  "maximumLocalAmount" = EXCLUDED."maximumLocalAmount",
  active = EXCLUDED.active,
  "updatedAt" = NOW();


/* ============================================================
 * 8. GH — GHS
 * ============================================================ */

INSERT INTO "WealthPlanCountry" (
  id,
  "planId",
  "countryCode",
  currency,
  "currencySymbol",
  "minimumLocalAmount",
  "maximumLocalAmount",
  active,
  "createdAt",
  "updatedAt"
)
VALUES
  ('wpc_wealth_plan_5d_70_GH', 'wealth_plan_5d_70', 'GH', 'GHS', '₵', 150.00, 1500000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_10d_100_GH', 'wealth_plan_10d_100', 'GH', 'GHS', '₵', 150.00, 1500000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_20d_160_GH', 'wealth_plan_20d_160', 'GH', 'GHS', '₵', 150.00, 1500000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_30d_250_GH', 'wealth_plan_30d_250', 'GH', 'GHS', '₵', 150.00, 1500000.00, true, NOW(), NOW())
ON CONFLICT ("planId", "countryCode")
DO UPDATE SET
  currency = EXCLUDED.currency,
  "currencySymbol" = EXCLUDED."currencySymbol",
  "minimumLocalAmount" = EXCLUDED."minimumLocalAmount",
  "maximumLocalAmount" = EXCLUDED."maximumLocalAmount",
  active = EXCLUDED.active,
  "updatedAt" = NOW();


/* ============================================================
 * 9. NG — NGN
 * ============================================================ */

INSERT INTO "WealthPlanCountry" (
  id,
  "planId",
  "countryCode",
  currency,
  "currencySymbol",
  "minimumLocalAmount",
  "maximumLocalAmount",
  active,
  "createdAt",
  "updatedAt"
)
VALUES
  ('wpc_wealth_plan_5d_70_NG', 'wealth_plan_5d_70', 'NG', 'NGN', '₦', 10000.00, 150000000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_10d_100_NG', 'wealth_plan_10d_100', 'NG', 'NGN', '₦', 10000.00, 150000000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_20d_160_NG', 'wealth_plan_20d_160', 'NG', 'NGN', '₦', 10000.00, 150000000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_30d_250_NG', 'wealth_plan_30d_250', 'NG', 'NGN', '₦', 10000.00, 150000000.00, true, NOW(), NOW())
ON CONFLICT ("planId", "countryCode")
DO UPDATE SET
  currency = EXCLUDED.currency,
  "currencySymbol" = EXCLUDED."currencySymbol",
  "minimumLocalAmount" = EXCLUDED."minimumLocalAmount",
  "maximumLocalAmount" = EXCLUDED."maximumLocalAmount",
  active = EXCLUDED.active,
  "updatedAt" = NOW();


/* ============================================================
 * 10. ZA — ZAR
 * ============================================================ */

INSERT INTO "WealthPlanCountry" (
  id,
  "planId",
  "countryCode",
  currency,
  "currencySymbol",
  "minimumLocalAmount",
  "maximumLocalAmount",
  active,
  "createdAt",
  "updatedAt"
)
VALUES
  ('wpc_wealth_plan_5d_70_ZA', 'wealth_plan_5d_70', 'ZA', 'ZAR', 'R', 180.00, 1800000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_10d_100_ZA', 'wealth_plan_10d_100', 'ZA', 'ZAR', 'R', 180.00, 1800000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_20d_160_ZA', 'wealth_plan_20d_160', 'ZA', 'ZAR', 'R', 180.00, 1800000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_30d_250_ZA', 'wealth_plan_30d_250', 'ZA', 'ZAR', 'R', 180.00, 1800000.00, true, NOW(), NOW())
ON CONFLICT ("planId", "countryCode")
DO UPDATE SET
  currency = EXCLUDED.currency,
  "currencySymbol" = EXCLUDED."currencySymbol",
  "minimumLocalAmount" = EXCLUDED."minimumLocalAmount",
  "maximumLocalAmount" = EXCLUDED."maximumLocalAmount",
  active = EXCLUDED.active,
  "updatedAt" = NOW();


/* ============================================================
 * 11. GB — GBP
 * ============================================================ */

INSERT INTO "WealthPlanCountry" (
  id,
  "planId",
  "countryCode",
  currency,
  "currencySymbol",
  "minimumLocalAmount",
  "maximumLocalAmount",
  active,
  "createdAt",
  "updatedAt"
)
VALUES
  ('wpc_wealth_plan_5d_70_GB', 'wealth_plan_5d_70', 'GB', 'GBP', '£', 10.00, 80000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_10d_100_GB', 'wealth_plan_10d_100', 'GB', 'GBP', '£', 10.00, 80000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_20d_160_GB', 'wealth_plan_20d_160', 'GB', 'GBP', '£', 10.00, 80000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_30d_250_GB', 'wealth_plan_30d_250', 'GB', 'GBP', '£', 10.00, 80000.00, true, NOW(), NOW())
ON CONFLICT ("planId", "countryCode")
DO UPDATE SET
  currency = EXCLUDED.currency,
  "currencySymbol" = EXCLUDED."currencySymbol",
  "minimumLocalAmount" = EXCLUDED."minimumLocalAmount",
  "maximumLocalAmount" = EXCLUDED."maximumLocalAmount",
  active = EXCLUDED.active,
  "updatedAt" = NOW();


/* ============================================================
 * 12. CA — CAD
 * ============================================================ */

INSERT INTO "WealthPlanCountry" (
  id,
  "planId",
  "countryCode",
  currency,
  "currencySymbol",
  "minimumLocalAmount",
  "maximumLocalAmount",
  active,
  "createdAt",
  "updatedAt"
)
VALUES
  ('wpc_wealth_plan_5d_70_CA', 'wealth_plan_5d_70', 'CA', 'CAD', 'C$', 15.00, 140000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_10d_100_CA', 'wealth_plan_10d_100', 'CA', 'CAD', 'C$', 15.00, 140000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_20d_160_CA', 'wealth_plan_20d_160', 'CA', 'CAD', 'C$', 15.00, 140000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_30d_250_CA', 'wealth_plan_30d_250', 'CA', 'CAD', 'C$', 15.00, 140000.00, true, NOW(), NOW())
ON CONFLICT ("planId", "countryCode")
DO UPDATE SET
  currency = EXCLUDED.currency,
  "currencySymbol" = EXCLUDED."currencySymbol",
  "minimumLocalAmount" = EXCLUDED."minimumLocalAmount",
  "maximumLocalAmount" = EXCLUDED."maximumLocalAmount",
  active = EXCLUDED.active,
  "updatedAt" = NOW();


/* ============================================================
 * 13. IN — INR
 * ============================================================ */

INSERT INTO "WealthPlanCountry" (
  id,
  "planId",
  "countryCode",
  currency,
  "currencySymbol",
  "minimumLocalAmount",
  "maximumLocalAmount",
  active,
  "createdAt",
  "updatedAt"
)
VALUES
  ('wpc_wealth_plan_5d_70_IN', 'wealth_plan_5d_70', 'IN', 'INR', '₹', 1000.00, 8500000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_10d_100_IN', 'wealth_plan_10d_100', 'IN', 'INR', '₹', 1000.00, 8500000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_20d_160_IN', 'wealth_plan_20d_160', 'IN', 'INR', '₹', 1000.00, 8500000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_30d_250_IN', 'wealth_plan_30d_250', 'IN', 'INR', '₹', 1000.00, 8500000.00, true, NOW(), NOW())
ON CONFLICT ("planId", "countryCode")
DO UPDATE SET
  currency = EXCLUDED.currency,
  "currencySymbol" = EXCLUDED."currencySymbol",
  "minimumLocalAmount" = EXCLUDED."minimumLocalAmount",
  "maximumLocalAmount" = EXCLUDED."maximumLocalAmount",
  active = EXCLUDED.active,
  "updatedAt" = NOW();


/* ============================================================
 * 14. CN — CNY
 * ============================================================ */

INSERT INTO "WealthPlanCountry" (
  id,
  "planId",
  "countryCode",
  currency,
  "currencySymbol",
  "minimumLocalAmount",
  "maximumLocalAmount",
  active,
  "createdAt",
  "updatedAt"
)
VALUES
  ('wpc_wealth_plan_5d_70_CN', 'wealth_plan_5d_70', 'CN', 'CNY', '¥', 75.00, 700000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_10d_100_CN', 'wealth_plan_10d_100', 'CN', 'CNY', '¥', 75.00, 700000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_20d_160_CN', 'wealth_plan_20d_160', 'CN', 'CNY', '¥', 75.00, 700000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_30d_250_CN', 'wealth_plan_30d_250', 'CN', 'CNY', '¥', 75.00, 700000.00, true, NOW(), NOW())
ON CONFLICT ("planId", "countryCode")
DO UPDATE SET
  currency = EXCLUDED.currency,
  "currencySymbol" = EXCLUDED."currencySymbol",
  "minimumLocalAmount" = EXCLUDED."minimumLocalAmount",
  "maximumLocalAmount" = EXCLUDED."maximumLocalAmount",
  active = EXCLUDED.active,
  "updatedAt" = NOW();


/* ============================================================
 * 15. AE — AED
 * ============================================================ */

INSERT INTO "WealthPlanCountry" (
  id,
  "planId",
  "countryCode",
  currency,
  "currencySymbol",
  "minimumLocalAmount",
  "maximumLocalAmount",
  active,
  "createdAt",
  "updatedAt"
)
VALUES
  ('wpc_wealth_plan_5d_70_AE', 'wealth_plan_5d_70', 'AE', 'AED', 'د.إ', 40.00, 370000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_10d_100_AE', 'wealth_plan_10d_100', 'AE', 'AED', 'د.إ', 40.00, 370000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_20d_160_AE', 'wealth_plan_20d_160', 'AE', 'AED', 'د.إ', 40.00, 370000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_30d_250_AE', 'wealth_plan_30d_250', 'AE', 'AED', 'د.إ', 40.00, 370000.00, true, NOW(), NOW())
ON CONFLICT ("planId", "countryCode")
DO UPDATE SET
  currency = EXCLUDED.currency,
  "currencySymbol" = EXCLUDED."currencySymbol",
  "minimumLocalAmount" = EXCLUDED."minimumLocalAmount",
  "maximumLocalAmount" = EXCLUDED."maximumLocalAmount",
  active = EXCLUDED.active,
  "updatedAt" = NOW();


/* ============================================================
 * 16. BR — BRL
 * ============================================================ */

INSERT INTO "WealthPlanCountry" (
  id,
  "planId",
  "countryCode",
  currency,
  "currencySymbol",
  "minimumLocalAmount",
  "maximumLocalAmount",
  active,
  "createdAt",
  "updatedAt"
)
VALUES
  ('wpc_wealth_plan_5d_70_BR', 'wealth_plan_5d_70', 'BR', 'BRL', 'R$', 60.00, 550000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_10d_100_BR', 'wealth_plan_10d_100', 'BR', 'BRL', 'R$', 60.00, 550000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_20d_160_BR', 'wealth_plan_20d_160', 'BR', 'BRL', 'R$', 60.00, 550000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_30d_250_BR', 'wealth_plan_30d_250', 'BR', 'BRL', 'R$', 60.00, 550000.00, true, NOW(), NOW())
ON CONFLICT ("planId", "countryCode")
DO UPDATE SET
  currency = EXCLUDED.currency,
  "currencySymbol" = EXCLUDED."currencySymbol",
  "minimumLocalAmount" = EXCLUDED."minimumLocalAmount",
  "maximumLocalAmount" = EXCLUDED."maximumLocalAmount",
  active = EXCLUDED.active,
  "updatedAt" = NOW();


/* ============================================================
 * 17. VN — VND
 * ============================================================ */

INSERT INTO "WealthPlanCountry" (
  id,
  "planId",
  "countryCode",
  currency,
  "currencySymbol",
  "minimumLocalAmount",
  "maximumLocalAmount",
  active,
  "createdAt",
  "updatedAt"
)
VALUES
  ('wpc_wealth_plan_5d_70_VN', 'wealth_plan_5d_70', 'VN', 'VND', '₫', 250000.00, 2500000000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_10d_100_VN', 'wealth_plan_10d_100', 'VN', 'VND', '₫', 250000.00, 2500000000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_20d_160_VN', 'wealth_plan_20d_160', 'VN', 'VND', '₫', 250000.00, 2500000000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_30d_250_VN', 'wealth_plan_30d_250', 'VN', 'VND', '₫', 250000.00, 2500000000.00, true, NOW(), NOW())
ON CONFLICT ("planId", "countryCode")
DO UPDATE SET
  currency = EXCLUDED.currency,
  "currencySymbol" = EXCLUDED."currencySymbol",
  "minimumLocalAmount" = EXCLUDED."minimumLocalAmount",
  "maximumLocalAmount" = EXCLUDED."maximumLocalAmount",
  active = EXCLUDED.active,
  "updatedAt" = NOW();


/* ============================================================
 * 18. TR — TRY
 * ============================================================ */

INSERT INTO "WealthPlanCountry" (
  id,
  "planId",
  "countryCode",
  currency,
  "currencySymbol",
  "minimumLocalAmount",
  "maximumLocalAmount",
  active,
  "createdAt",
  "updatedAt"
)
VALUES
  ('wpc_wealth_plan_5d_70_TR', 'wealth_plan_5d_70', 'TR', 'TRY', '₺', 400.00, 4000000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_10d_100_TR', 'wealth_plan_10d_100', 'TR', 'TRY', '₺', 400.00, 4000000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_20d_160_TR', 'wealth_plan_20d_160', 'TR', 'TRY', '₺', 400.00, 4000000.00, true, NOW(), NOW()),
  ('wpc_wealth_plan_30d_250_TR', 'wealth_plan_30d_250', 'TR', 'TRY', '₺', 400.00, 4000000.00, true, NOW(), NOW())
ON CONFLICT ("planId", "countryCode")
DO UPDATE SET
  currency = EXCLUDED.currency,
  "currencySymbol" = EXCLUDED."currencySymbol",
  "minimumLocalAmount" = EXCLUDED."minimumLocalAmount",
  "maximumLocalAmount" = EXCLUDED."maximumLocalAmount",
  active = EXCLUDED.active,
  "updatedAt" = NOW();


/* ============================================================
 * 19. FINAL VERIFICATION
 * ============================================================ */

DO $$
DECLARE
  config_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO config_count
  FROM "WealthPlanCountry"
  WHERE "planId" IN (
    'wealth_plan_5d_70',
    'wealth_plan_10d_100',
    'wealth_plan_20d_160',
    'wealth_plan_30d_250'
  )
  AND "countryCode" IN (
    'US',
    'PH',
    'SG',
    'MY',
    'KE',
    'GH',
    'NG',
    'ZA',
    'GB',
    'CA',
    'IN',
    'CN',
    'AE',
    'BR',
    'VN',
    'TR'
  );

  IF config_count <> 64 THEN
    RAISE EXCEPTION
      'Wealth Box country configuration check failed. Expected 64 configurations, found %.',
      config_count;
  END IF;
END $$;