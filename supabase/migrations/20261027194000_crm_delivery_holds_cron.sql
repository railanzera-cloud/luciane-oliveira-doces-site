-- Outbox HOLD staging only. Never schedule network sending or Meta HTTP here.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
SELECT cron.schedule('lod-crm-delivery-holds-5min','2-59/5 * * * *',
  'select public.crm_delivery_prepare_holds();');
COMMIT;
