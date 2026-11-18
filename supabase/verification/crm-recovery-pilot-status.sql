-- Read-only, privileged verification for the ONE configured shadow conversation.
-- Never expose this through a browser or substitute receipt time for message time.
-- A fresh blocked decision is a valid result; it does not prove a recovered sale.
WITH scope AS (
 SELECT s.*,c.customer_id,c.status conversation_status,c.last_inbound_at,c.last_outbound_at
 FROM crm_recovery_private.episode_scope s
 JOIN public.crm_conversations c ON c.id=s.conversation_id
), latest AS (
 SELECT d.*,f.status follow_up_status,f.sent_at,f.due_at
 FROM crm_recovery_private.due_checks d
 JOIN scope s ON s.conversation_id=d.conversation_id
 JOIN public.crm_follow_ups f ON f.id=d.follow_up_id
 ORDER BY d.evaluated_at DESC NULLS LAST LIMIT 1
), interest AS (
 SELECT o.occurred_at,o.semantic->>'status' status,o.semantic->>'reason' reason
 FROM crm_recovery_private.observations o
 JOIN scope s ON s.conversation_id=o.conversation_id
 JOIN public.crm_whatsapp_message_events e ON e.conversation_id=o.conversation_id
  AND e.message_id=o.message_id AND e.occurred_at=o.occurred_at
 JOIN public.crm_customers u ON u.id=s.customer_id AND u.phone_e164=e.phone_e164
 WHERE o.expires_at>now() AND o.occurred_at>now()-interval '24 hours'
  AND o.occurred_at<=now() AND e.direction='inbound'
  AND o.semantic->>'version'='shadow-1' AND o.semantic->>'intent'='interest'
 ORDER BY o.occurred_at DESC LIMIT 1
)
SELECT jsonb_build_object(
 'checked_at_local',now() AT TIME ZONE 'America/Belem',
 'scope',(SELECT jsonb_build_object('enabled',enabled,
  'active',enabled AND enabled_at<=now() AND expires_at>now(),
  'enabled_at_local',enabled_at AT TIME ZONE 'America/Belem',
  'expires_at_local',expires_at AT TIME ZONE 'America/Belem',
  'conversation_status',conversation_status,
  'last_inbound_local',last_inbound_at AT TIME ZONE 'America/Belem',
  'last_outbound_local',last_outbound_at AT TIME ZONE 'America/Belem') FROM scope),
 'latest_interest',(SELECT jsonb_build_object('at_local',occurred_at AT TIME ZONE 'America/Belem',
  'status',status,'reason',reason) FROM interest),
 'tintim_purchase_stage_present',EXISTS(
  SELECT 1 FROM public.tintim_conversations t JOIN public.crm_customers u
   ON t.phone_digits IN(u.phone_e164,substring(u.phone_e164 FROM 3))
  JOIN scope s ON s.customer_id=u.id
  WHERE lower(btrim(coalesce(t.stage_label,''))) IN('comprou','convertido','vendido','venda realizada')),
 'tintim_review_required',(SELECT crm_recovery_private.tintim_episode_requires_review(conversation_id) FROM scope),
 'latest_scheduler_local',(SELECT max(received_at) AT TIME ZONE 'America/Belem' FROM crm_recovery_private.scheduler_invocations),
 'decision',(SELECT jsonb_build_object(
  'evaluated_at_local',evaluated_at AT TIME ZONE 'America/Belem',
  'classification',classification,'blockers',blockers,
  'send_authorized',send_authorized,'follow_up_status',follow_up_status,'sent_at',sent_at,
  'due_at_local',due_at AT TIME ZONE 'America/Belem',
  'next_check_local',next_check_at AT TIME ZONE 'America/Belem',
  'lease_active',lease_token IS NOT NULL,
  'valid_until_local',valid_until AT TIME ZONE 'America/Belem',
  'source_matches',decision_revision=crm_recovery_private.source_revision(follow_up_id),
  'fresh',coalesce(valid_until>now() AND decision_revision=crm_recovery_private.source_revision(follow_up_id)
    AND follow_up_status='pending' AND sent_at IS NULL,false)) FROM latest),
 'automatic_sends_enabled',(SELECT automatic_sends_enabled FROM public.crm_automation_settings WHERE singleton=true),
 'delivery_attempts',(SELECT count(*) FROM public.crm_delivery_attempts)
) AS pilot_status;
