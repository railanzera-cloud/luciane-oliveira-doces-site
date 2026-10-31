-- Commercial LOD only. Prepared for approval; never applied automatically.
-- Reuse the existing read-only preflight. Only sender_disabled is irrelevant
-- to a HUMAN opening wa.me; consent, timestamps, purchases and opt-out remain.
BEGIN;
-- Preserve the established actions behind a staff-only wrapper. The legacy
-- endpoint must not bypass the new assisted check for sent_manually.
ALTER FUNCTION public.crm_record_action(uuid,text,text,integer,text)
 RENAME TO crm_record_action_core;
REVOKE ALL ON FUNCTION public.crm_record_action_core(uuid,text,text,integer,text)
 FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.crm_assisted_followup_review(p_follow_up_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=public,pg_temp AS $fn$
DECLARE
 v_check jsonb; v_reasons jsonb; v_conv public.crm_conversations%ROWTYPE;
 v_customer public.crm_customers%ROWTYPE; v_follow public.crm_follow_ups%ROWTYPE;
BEGIN
 PERFORM public.crm_require_staff();
 v_check:=public.crm_followup_send_preflight(p_follow_up_id);
 -- Fail closed for unknown/malformed preflight results.
 IF jsonb_typeof(v_check->'reasons') IS DISTINCT FROM 'array' THEN
  RAISE EXCEPTION 'crm_preflight_unavailable' USING ERRCODE='42501';
 END IF;
 SELECT coalesce(jsonb_agg(value),'[]'::jsonb) INTO v_reasons
 FROM jsonb_array_elements(v_check->'reasons')
 WHERE value IS DISTINCT FROM '"sender_disabled"'::jsonb;
 SELECT * INTO v_follow FROM public.crm_follow_ups WHERE id=p_follow_up_id;
 SELECT * INTO v_conv FROM public.crm_conversations WHERE id=v_follow.conversation_id;
 SELECT * INTO v_customer FROM public.crm_customers WHERE id=v_conv.customer_id;
 IF v_conv.interest_basis IS DISTINCT FROM 'staff_confirmed'
   OR length(btrim(coalesce(v_conv.interest_label,''))) NOT BETWEEN 2 AND 80 THEN
  v_reasons:=v_reasons||jsonb_build_array('product_not_confirmed');
 END IF;
 -- An observed outbound after a manual send may schedule a NEW reminder.
 -- Do not contact the same phone again without a subsequent customer reply.
 IF EXISTS (
  SELECT 1 FROM public.crm_follow_ups f
  JOIN public.crm_conversations c ON c.id=f.conversation_id
  WHERE c.customer_id=v_customer.id AND f.status='sent_manually'
    AND f.sent_at>=coalesce(v_conv.last_inbound_at,'epoch'::timestamptz)
 ) THEN v_reasons:=v_reasons||jsonb_build_array('already_contacted_since_reply'); END IF;
 RETURN jsonb_build_object(
  'eligible',jsonb_array_length(v_reasons)=0,'reasons',v_reasons,
  'checked_at',now(),'follow_up_id',p_follow_up_id,
  'conversation_id',v_follow.conversation_id,
  'phone_e164',CASE WHEN jsonb_array_length(v_reasons)=0 THEN v_customer.phone_e164 END,
  'customer_name',CASE WHEN jsonb_array_length(v_reasons)=0 THEN v_customer.display_name END,
  'interest_label',CASE WHEN jsonb_array_length(v_reasons)=0 THEN v_conv.interest_label END
 );
END; $fn$;

CREATE FUNCTION public.crm_assisted_record_send(
 p_follow_up_id uuid,p_expected_phone text,p_expected_interest text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,pg_temp AS $fn$
DECLARE v_conversation uuid; v_customer uuid; v_check jsonb;
BEGIN
 PERFORM public.crm_require_staff();
 SELECT f.conversation_id,c.customer_id INTO v_conversation,v_customer
 FROM public.crm_follow_ups f JOIN public.crm_conversations c ON c.id=f.conversation_id
 WHERE f.id=p_follow_up_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'crm_follow_up_not_found' USING ERRCODE='22023'; END IF;
 -- Provider ingestion serializes on customer then conversation. Lock both
 -- before rechecking, so a reply/opt-out cannot race the manual send record.
 PERFORM 1 FROM public.crm_customers WHERE id=v_customer FOR UPDATE;
 PERFORM 1 FROM public.crm_conversations WHERE id=v_conversation FOR UPDATE;
 PERFORM 1 FROM public.crm_follow_ups WHERE id=p_follow_up_id FOR UPDATE;
 v_check:=public.crm_assisted_followup_review(p_follow_up_id);
 IF (v_check->>'eligible')::boolean IS DISTINCT FROM true
    OR v_check->>'phone_e164' IS DISTINCT FROM p_expected_phone
    OR v_check->>'interest_label' IS DISTINCT FROM p_expected_interest THEN
  RAISE EXCEPTION 'crm_assisted_review_required' USING ERRCODE='42501';
 END IF;
 PERFORM public.crm_record_action_core(v_conversation,'sent_manually',NULL,45,NULL);
END; $fn$;
CREATE FUNCTION public.crm_record_action(
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
REVOKE ALL ON FUNCTION public.crm_record_action(uuid,text,text,integer,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_record_action(uuid,text,text,integer,text) TO authenticated;
REVOKE ALL ON FUNCTION public.crm_assisted_followup_review(uuid),
 public.crm_assisted_record_send(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_assisted_followup_review(uuid),
 public.crm_assisted_record_send(uuid,text,text) TO authenticated;
COMMIT;
