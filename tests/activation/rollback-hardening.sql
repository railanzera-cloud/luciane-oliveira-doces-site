-- PREPARED ONLY. Preserve private audit rows; never drop historical evidence.
BEGIN;
DROP TRIGGER crm_consent_audit_after_change ON public.crm_customers;
DROP FUNCTION public.crm_capture_consent_audit();
CREATE OR REPLACE FUNCTION public.crm_record_action(
 p_conversation_id uuid,p_action text,p_interest text DEFAULT NULL,
 p_due_minutes integer DEFAULT 45,p_evidence text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,pg_temp AS $fn$
DECLARE v_follow uuid; v_phone text; v_interest text;
BEGIN
 PERFORM public.crm_require_staff();
 IF p_action='sent_manually' THEN
  SELECT f.id,u.phone_e164,c.interest_label INTO v_follow,v_phone,v_interest
  FROM public.crm_follow_ups f JOIN public.crm_conversations c ON c.id=f.conversation_id
  JOIN public.crm_customers u ON u.id=c.customer_id
  WHERE c.id=p_conversation_id AND f.status='pending'
  ORDER BY f.created_at DESC LIMIT 1;
  PERFORM public.crm_assisted_record_send(v_follow,v_phone,v_interest);
 ELSE
  PERFORM public.crm_record_action_core(p_conversation_id,p_action,p_interest,p_due_minutes,p_evidence);
 END IF;
END; $fn$;
GRANT EXECUTE ON FUNCTION public.crm_record_action_core(uuid,text,text,integer,text) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
