-- READ ONLY, after both prepared migrations have been explicitly authorized.
SELECT signature,
 to_regprocedure(signature) IS NOT NULL AS exists,
 has_function_privilege('anon',to_regprocedure(signature),'EXECUTE') AS anon_execute,
 has_function_privilege('authenticated',to_regprocedure(signature),'EXECUTE') AS staff_role_execute
FROM (VALUES
 ('public.crm_assisted_followup_review(uuid)'),
 ('public.crm_assisted_record_send(uuid,text,text)'),
 ('public.crm_record_action(uuid,text,text,integer,text)')
) expected(signature);
SELECT
 has_function_privilege('authenticated','public.crm_record_action_core(uuid,text,text,integer,text)','EXECUTE') AS browser_core_execute,
 has_function_privilege('service_role','public.crm_record_action_core(uuid,text,text,integer,text)','EXECUTE') AS provider_core_execute;
SELECT c.relname,c.relrowsecurity,
 has_table_privilege('anon',c.oid,'SELECT') AS anon_select,
 has_table_privilege('authenticated',c.oid,'SELECT') AS browser_select,
 has_table_privilege('authenticated',c.oid,'UPDATE') AS browser_update,
 has_table_privilege('service_role',c.oid,'UPDATE') AS provider_update
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname='crm_consent_audit';
SELECT follow_up_minutes,automatic_sends_enabled FROM public.crm_automation_settings;
-- Do not fabricate claims, impersonate a staff member, or create synthetic rows in production.
