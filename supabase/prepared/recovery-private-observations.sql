-- PREPARED ONLY. No production execution, scheduler or change to active ingress.
BEGIN;
CREATE SCHEMA crm_recovery_private;
REVOKE ALL ON SCHEMA crm_recovery_private FROM PUBLIC,anon,authenticated;
CREATE TABLE crm_recovery_private.observations (
 conversation_id uuid NOT NULL REFERENCES public.crm_conversations(id) ON DELETE CASCADE,
 message_id text NOT NULL CHECK (message_id ~ '^wamid\.[A-Za-z0-9=+/_-]+$' AND length(message_id) BETWEEN 9 AND 296),
 occurred_at timestamptz NOT NULL,
 semantic jsonb NOT NULL CHECK (jsonb_typeof(semantic)='object' AND octet_length(semantic::text)<=6000),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days',
 PRIMARY KEY(conversation_id,message_id)
);
ALTER TABLE crm_recovery_private.observations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON crm_recovery_private.observations FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.crm_recovery_store_observation(p_conversation_id uuid,p_message_id text,p_occurred_at timestamptz,p_semantic jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE inserted integer;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'provider_only' USING ERRCODE='42501'; END IF;
 IF p_semantic IS NULL OR jsonb_typeof(p_semantic)<>'object'
 OR p_semantic - ARRAY['version','catalog_version','status','intent','categories','candidates','variant_ids','option_ids','availability_keys','reason'] <> '{}'::jsonb
 OR p_semantic->>'version' IS DISTINCT FROM 'shadow-1'
 OR coalesce(p_semantic->>'intent','') NOT IN ('unknown','interest','opt_out','possible_purchase','declined')
 OR coalesce(p_semantic->>'status','') NOT IN ('unconfirmed','resolved','partial','ambiguous')
 OR p_occurred_at IS NULL OR p_occurred_at>now()+interval '1 minute' OR p_occurred_at<now()-interval '7 days'
 THEN RAISE EXCEPTION 'invalid_observation'; END IF;
 INSERT INTO crm_recovery_private.observations(conversation_id,message_id,occurred_at,semantic)
 VALUES(p_conversation_id,p_message_id,p_occurred_at,p_semantic) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS inserted = ROW_COUNT;
 RETURN inserted=1;
END; $$;
CREATE FUNCTION public.crm_recovery_read_observations(p_conversation_id uuid)
RETURNS TABLE(message_id text,occurred_at timestamptz,semantic jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'provider_only' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT o.message_id,o.occurred_at,o.semantic FROM crm_recovery_private.observations o
 WHERE o.conversation_id=p_conversation_id AND o.expires_at>now() AND o.occurred_at>=now()-interval '24 hours'
 ORDER BY o.occurred_at,o.message_id LIMIT 1001;
END; $$;
REVOKE ALL ON FUNCTION public.crm_recovery_store_observation(uuid,text,timestamptz,jsonb),public.crm_recovery_read_observations(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_recovery_store_observation(uuid,text,timestamptz,jsonb),public.crm_recovery_read_observations(uuid) TO service_role;
-- Retention maintenance, to be scheduled only in a separately authorized cut:
-- DELETE FROM crm_recovery_private.observations WHERE expires_at<=now();
COMMIT;
