-- CRM commercial: repeatable registration of observation-only scheduler.
-- No POST/WhatsApp send, no change to orders or existing follow-up deadlines.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
SELECT cron.schedule(
 'lod-crm-audit-only-5min',
 '*/5 * * * *',
 'select public.crm_automation_evaluate_pending();'
);
COMMIT;
