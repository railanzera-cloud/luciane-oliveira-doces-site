-- Read-only operator probe. Set a private cutoff in the SQL session before running:
-- SELECT set_config('crm_homologation.started_at','<ISO timestamp>',false);
-- No phone, content, raw payload or credentials in the output; never commit results.
WITH cutoff AS (
 SELECT nullif(current_setting('crm_homologation.started_at',true),'')::timestamptz started_at
), observed AS (
 SELECT e.* FROM public.crm_whatsapp_message_events e,cutoff c WHERE e.received_at>=c.started_at
)
SELECT direction,count(*) events,count(DISTINCT conversation_id) conversations,
 min(occurred_at) first_provider_at,max(occurred_at) last_provider_at,
 max(received_at) last_received_at,
 max(extract(epoch FROM received_at-occurred_at)) maximum_receive_delay_seconds
FROM observed GROUP BY direction;
SELECT automatic_sends_enabled FROM public.crm_automation_settings WHERE singleton;
SELECT count(*) delivery_attempts FROM public.crm_delivery_attempts;
-- A separately scoped private query must correlate the two authorized test contacts
-- with their actual events. Aggregate counts alone do not certify the test.
