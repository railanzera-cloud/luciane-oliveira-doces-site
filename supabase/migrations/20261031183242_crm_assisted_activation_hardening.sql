-- PREPARED ONLY. Apply AFTER 20261031175609, with explicit approval and backup.
-- Same CRM/RPC signatures; no sending, orders, payments, stock or cron changes.
BEGIN;
CREATE TABLE public.crm_consent_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 customer_id uuid NOT NULL REFERENCES public.crm_customers(id),
 actor_user_id uuid,
 old_status text NOT NULL,new_status text NOT NULL,
 old_evidence text,new_evidence text,
 old_consent_at timestamptz,new_consent_at timestamptz,
 old_opt_out boolean NOT NULL,new_opt_out boolean NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX crm_consent_audit_customer_time ON public.crm_consent_audit(customer_id,recorded_at);
ALTER TABLE public.crm_consent_audit ENABLE ROW LEVEL SECURITY;
-- Append-only to application callers. Retain evidence even after rollback.
REVOKE ALL ON public.crm_consent_audit FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.crm_capture_consent_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
BEGIN
 IF ROW(OLD.consent_status,OLD.consent_evidence,OLD.consent_at,OLD.commercial_opt_out)
    IS DISTINCT FROM ROW(NEW.consent_status,NEW.consent_evidence,NEW.consent_at,NEW.commercial_opt_out) THEN
  INSERT INTO public.crm_consent_audit(customer_id,actor_user_id,old_status,new_status,
   old_evidence,new_evidence,old_consent_at,new_consent_at,old_opt_out,new_opt_out)
  VALUES(NEW.id,auth.uid(),OLD.consent_status,NEW.consent_status,
   OLD.consent_evidence,NEW.consent_evidence,OLD.consent_at,NEW.consent_at,
   OLD.commercial_opt_out,NEW.commercial_opt_out);
 END IF;
 RETURN NEW;
END; $fn$;
REVOKE ALL ON FUNCTION public.crm_capture_consent_audit() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER crm_consent_audit_after_change
AFTER UPDATE OF consent_status,consent_evidence,consent_at,commercial_opt_out ON public.crm_customers
FOR EACH ROW EXECUTE FUNCTION public.crm_capture_consent_audit();

-- Existing core locks conversation then customer. Provider and assisted record
-- lock customer then conversation. Serialize EVERY public staff action on the
-- customer first, before delegating, avoiding the lock-order inversion.
CREATE OR REPLACE FUNCTION public.crm_record_action(
 p_conversation_id uuid,p_action text,p_interest text DEFAULT NULL,
 p_due_minutes integer DEFAULT 45,p_evidence text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE v_follow uuid;v_phone text;v_interest text;v_customer uuid;
BEGIN
 PERFORM public.crm_require_staff();
 SELECT customer_id INTO v_customer FROM public.crm_conversations WHERE id=p_conversation_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'crm_conversation_not_found' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM public.crm_customers WHERE id=v_customer FOR UPDATE;
 PERFORM 1 FROM public.crm_conversations WHERE id=p_conversation_id FOR UPDATE;
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
-- No backend/provider should bypass the canonical public action path either.
REVOKE ALL ON FUNCTION public.crm_record_action_core(uuid,text,text,integer,text)
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.crm_record_action(uuid,text,text,integer,text)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.crm_record_action(uuid,text,text,integer,text) TO authenticated,service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
