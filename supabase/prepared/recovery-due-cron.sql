-- CANDIDATE ONLY. Explicit production approval + secure Vault setup required.
-- Values live in Vault, never in this file, cron.command or public GitHub.
-- Installs only this NEW job INACTIVE; enabling is a separate rollout step.
BEGIN;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_net') THEN
  RAISE EXCEPTION 'pg_net_requires_separate_authorized_setup'; END IF;
 IF EXISTS(SELECT 1 FROM (VALUES('anon'),('authenticated'),('service_role')) r(role_name)
  WHERE has_schema_privilege(r.role_name,'net','USAGE')
   OR has_table_privilege(r.role_name,'net.http_request_queue','SELECT')
   OR has_table_privilege(r.role_name,'net.http_request_queue','INSERT')
   OR has_function_privilege(r.role_name,'net.http_post(text,jsonb,jsonb,jsonb,integer)','EXECUTE'))
 THEN RAISE EXCEPTION 'pg_net_acl_not_restricted'; END IF;
 IF EXISTS(SELECT 1 FROM cron.job WHERE jobname='lod-recovery-shadow-due-5min') THEN
  RAISE EXCEPTION 'due_job_already_exists'; END IF;
 IF (SELECT count(*) FROM vault.decrypted_secrets WHERE name='crm_recovery_project_url')<>1 OR
    (SELECT count(*) FROM vault.decrypted_secrets WHERE name='crm_recovery_service_role')<>1
 THEN RAISE EXCEPTION 'due_scheduler_secrets_missing'; END IF;
END $$;
SELECT cron.schedule('lod-recovery-shadow-due-5min','*/5 * * * *',
$command$SELECT net.http_post(
 url:=(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='crm_recovery_project_url')||'/functions/v1/crm-recovery-reevaluate',
 headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||
   (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='crm_recovery_service_role')),
 body:='{}'::jsonb,timeout_milliseconds:=30000);$command$);
SELECT cron.alter_job((SELECT jobid FROM cron.job WHERE jobname='lod-recovery-shadow-due-5min'),active:=false);
COMMIT;
