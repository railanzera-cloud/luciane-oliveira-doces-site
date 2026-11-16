-- CANDIDATE ONLY: one-use scheduler authorization, no scheduler or auth deployment.
BEGIN;
CREATE TABLE crm_recovery_private.scheduler_invocations (
 nonce uuid PRIMARY KEY,
 tick bigint NOT NULL UNIQUE CHECK(tick % 300=0),
 received_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '1 hour'
);
CREATE INDEX scheduler_invocations_expiry ON crm_recovery_private.scheduler_invocations(expires_at);
ALTER TABLE crm_recovery_private.scheduler_invocations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON crm_recovery_private.scheduler_invocations FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.crm_recovery_consume_scheduler_nonce(p_nonce uuid,p_signed_at timestamptz,p_tick bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE inserted integer;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'provider_only' USING ERRCODE='42501'; END IF;
 IF p_nonce IS NULL OR p_signed_at IS NULL OR p_tick IS NULL OR p_tick%300<>0
  OR p_signed_at<now()-interval '90 seconds' OR p_signed_at>now()+interval '30 seconds'
  OR to_timestamp(p_tick)<now()-interval '10 minutes' OR to_timestamp(p_tick)>now()+interval '30 seconds'
 THEN RETURN false; END IF;
 INSERT INTO crm_recovery_private.scheduler_invocations(nonce,tick) VALUES(p_nonce,p_tick)
 ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS inserted=ROW_COUNT;RETURN inserted=1;
END; $$;
REVOKE ALL ON FUNCTION public.crm_recovery_consume_scheduler_nonce(uuid,timestamptz,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_recovery_consume_scheduler_nonce(uuid,timestamptz,bigint) TO service_role;
-- Existing hourly retention job stays unchanged. Add the private nonce batch only.
CREATE OR REPLACE FUNCTION public.crm_recovery_purge_expired()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a integer;b integer;c integer;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' AND NOT(session_user='postgres' AND auth.role() IS NULL)
 THEN RAISE EXCEPTION 'provider_only' USING ERRCODE='42501'; END IF;
 WITH expired AS (SELECT conversation_id,message_id FROM crm_recovery_private.observations WHERE expires_at<=now()
 ORDER BY expires_at,conversation_id,message_id LIMIT 1000 FOR UPDATE SKIP LOCKED)
 DELETE FROM crm_recovery_private.observations o USING expired e WHERE o.conversation_id=e.conversation_id AND o.message_id=e.message_id;
 GET DIAGNOSTICS a=ROW_COUNT;
 WITH expired AS (SELECT follow_up_id FROM crm_recovery_private.due_checks WHERE expires_at<=now()
 ORDER BY expires_at,follow_up_id LIMIT 1000 FOR UPDATE SKIP LOCKED)
 DELETE FROM crm_recovery_private.due_checks d USING expired e WHERE d.follow_up_id=e.follow_up_id;
 GET DIAGNOSTICS b=ROW_COUNT;
 WITH expired AS (SELECT nonce FROM crm_recovery_private.scheduler_invocations WHERE expires_at<=now()
 ORDER BY expires_at,nonce LIMIT 1000 FOR UPDATE SKIP LOCKED)
 DELETE FROM crm_recovery_private.scheduler_invocations s USING expired e WHERE s.nonce=e.nonce;
 GET DIAGNOSTICS c=ROW_COUNT;RETURN a+b+c;
END; $$;
REVOKE ALL ON FUNCTION public.crm_recovery_purge_expired() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_recovery_purge_expired() TO service_role;
COMMIT;
