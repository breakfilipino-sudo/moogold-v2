-- Phone push is exclusively for admin-controlled promotional campaigns.
-- Preserve all existing in-app notifications and push delivery history.

DROP TRIGGER IF EXISTS "Notification_queue_account_push" ON "Notification";

DROP FUNCTION IF EXISTS "moogold_queue_account_push"();