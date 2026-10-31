-- PREPARED ONLY. Restore corresponding frontend first or hide CRM operations.
BEGIN;
DROP FUNCTION public.crm_record_action(uuid,text,text,integer,text);
DROP FUNCTION public.crm_assisted_record_send(uuid,text,text);
DROP FUNCTION public.crm_assisted_followup_review(uuid);
ALTER FUNCTION public.crm_record_action_core(uuid,text,text,integer,text) RENAME TO crm_record_action;
GRANT EXECUTE ON FUNCTION public.crm_record_action(uuid,text,text,integer,text) TO authenticated,service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
