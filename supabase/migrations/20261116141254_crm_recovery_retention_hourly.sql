-- Authorized controlled production cut: private expiry maintenance only.
BEGIN;
CREATE OR REPLACE FUNCTION public.crm_recovery_purge_expired()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE deleted integer;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' AND NOT (session_user='postgres' AND auth.role() IS NULL) THEN RAISE EXCEPTION 'provider_only' USING ERRCODE='42501'; END IF;
 WITH expired AS (
  SELECT conversation_id,message_id FROM crm_recovery_private.observations
  WHERE expires_at<=now() ORDER BY expires_at,conversation_id,message_id LIMIT 1000 FOR UPDATE SKIP LOCKED
 ) DELETE FROM crm_recovery_private.observations o USING expired e
 WHERE o.conversation_id=e.conversation_id AND o.message_id=e.message_id;
 GET DIAGNOSTICS deleted = ROW_COUNT; RETURN deleted;
END; $$;
REVOKE ALL ON FUNCTION public.crm_recovery_purge_expired() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_recovery_purge_expired() TO service_role;

-- SCHEDULER: reuse installed pg_cron, do not install extensions or replace jobs.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM cron.job WHERE jobname='lod-recovery-private-retention-hourly') THEN
  RAISE EXCEPTION 'retention_job_already_exists'; END IF;
END $$;
SELECT cron.schedule('lod-recovery-private-retention-hourly','17 * * * *',
$command$DO $job$ DECLARE n integer; BEGIN
 FOR i IN 1..10 LOOP
  n:=public.crm_recovery_purge_expired();
  EXIT WHEN n<1000;
 END LOOP;
END $job$;$command$);
COMMIT;
