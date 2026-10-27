-- CRM / LOD commercial. Read-only gate for future WhatsApp delivery.
-- Does not send or mark messages, modify orders, payments, followups, CRM state.
BEGIN;
CREATE FUNCTION public.crm_followup_send_preflight(p_follow_up_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE
 v_f public.crm_follow_ups%ROWTYPE;
 v_c public.crm_conversations%ROWTYPE;
 v_u public.crm_customers%ROWTYPE;
 v_reasons text[] := ARRAY[]::text[];
 v_verified_inbound boolean := false;
 v_purchase_signal boolean := false;
 v_sender_enabled boolean := false;
BEGIN
 -- API callers must already be staff; a trusted provider may call as service_role.
 IF auth.role() IS DISTINCT FROM 'service_role' THEN
    PERFORM public.crm_require_staff();
 END IF;
 IF p_follow_up_id IS NULL THEN
    RETURN jsonb_build_object('ready',false,'reasons',jsonb_build_array('invalid_id'));
 END IF;
 SELECT * INTO v_f FROM public.crm_follow_ups WHERE id=p_follow_up_id;
 IF NOT FOUND THEN
    RETURN jsonb_build_object('ready',false,'reasons',jsonb_build_array('not_found'));
 END IF;
 SELECT * INTO v_c FROM public.crm_conversations WHERE id=v_f.conversation_id;
 SELECT * INTO v_u FROM public.crm_customers WHERE id=v_c.customer_id;
 IF v_f.status IS DISTINCT FROM 'pending' THEN
    v_reasons:=array_append(v_reasons,'not_pending');
 END IF;
 IF v_f.due_at>now() THEN
    v_reasons:=array_append(v_reasons,'not_due');
 END IF;
 IF v_c.status IS DISTINCT FROM 'waiting_customer' THEN
    v_reasons:=array_append(v_reasons,'not_waiting_customer');
 END IF;
 IF v_u.commercial_opt_out IS DISTINCT FROM false THEN
    v_reasons:=array_append(v_reasons,'commercial_opt_out');
 END IF;
 IF v_u.consent_status IS DISTINCT FROM 'granted'
    OR v_u.consent_at IS NULL
    OR nullif(btrim(coalesce(v_u.consent_evidence,'')),'') IS NULL THEN
    v_reasons:=array_append(v_reasons,'consent_not_verified');
 END IF;
 IF v_c.last_inbound_at IS NULL
    OR v_c.last_inbound_at<=now()-interval '23 hours'
    OR v_c.last_inbound_at>now()+interval '1 minute' THEN
    v_reasons:=array_append(v_reasons,'outside_verified_service_window');
 END IF;
 IF v_c.last_outbound_at IS NULL
    OR v_c.last_inbound_at IS NULL
    OR v_c.last_outbound_at<=v_c.last_inbound_at THEN
    v_reasons:=array_append(v_reasons,'not_waiting_after_business_reply');
 END IF;
 -- Never interpret server webhook receive-time as Meta's original timestamp.
 -- Require a provider/Meta-origin inbound timestamp tied to the same conversation.
 SELECT EXISTS(
   SELECT 1 FROM public.crm_tintim_message_events e
   WHERE e.conversation_id=v_c.id AND e.direction='inbound'
     AND e.time_basis='provider_timestamp'
     AND e.occurred_at BETWEEN now()-interval '23 hours' AND now()
     AND v_c.last_inbound_at IS NOT NULL
     AND e.occurred_at BETWEEN v_c.last_inbound_at-interval '2 minutes'
                           AND v_c.last_inbound_at+interval '2 minutes'
 ) OR EXISTS(
   SELECT 1 FROM public.crm_whatsapp_message_events e
   WHERE e.conversation_id=v_c.id AND e.direction='inbound'
     AND e.occurred_at BETWEEN now()-interval '23 hours' AND now()
     AND v_c.last_inbound_at IS NOT NULL
     AND e.occurred_at BETWEEN v_c.last_inbound_at-interval '2 minutes'
                           AND v_c.last_inbound_at+interval '2 minutes'
 ) INTO v_verified_inbound;
 IF NOT v_verified_inbound THEN
    v_reasons:=array_append(v_reasons,'inbound_timestamp_unverified');
 END IF;

 -- Stage is an indication to STOP pending commercial contacts, not proof of revenue.
 SELECT EXISTS (
   SELECT 1 FROM public.tintim_conversations t
   WHERE regexp_replace(coalesce(t.phone_digits,''),'[^0-9]','','g')
     IN (v_u.phone_e164,substring(v_u.phone_e164 from 3))
     AND lower(btrim(coalesce(t.stage_label,'')))
       IN ('comprou','convertido','vendido','venda realizada')
 ) OR EXISTS (
   SELECT 1 FROM public.orders o
   WHERE regexp_replace(coalesce(o.customer_phone,''),'[^0-9]','','g')
     IN (v_u.phone_e164,substring(v_u.phone_e164 from 3))
     AND o.created_at>=v_c.created_at-interval '1 hour'
     AND (o.payment_status::text='paid'
       OR o.order_status::text IN ('delivered','completed'))
 ) OR EXISTS (
   SELECT 1
   FROM public.tintim_order_links l
   JOIN public.tintim_conversations t ON t.id=l.conversation_id
   JOIN public.orders o ON o.id=l.order_uuid
   WHERE regexp_replace(coalesce(t.phone_digits,''),'[^0-9]','','g')
     IN (v_u.phone_e164,substring(v_u.phone_e164 from 3))
     AND l.status IN ('candidate','confirmed')
     AND (o.payment_status::text='paid'
       OR o.order_status::text IN ('delivered','completed'))
 ) INTO v_purchase_signal;
 IF v_purchase_signal THEN
    v_reasons:=array_append(v_reasons,'purchase_signal_review');
 END IF;
 SELECT automatic_sends_enabled INTO v_sender_enabled
 FROM public.crm_automation_settings WHERE singleton=true;
 IF NOT coalesce(v_sender_enabled,false) THEN
    v_reasons:=array_append(v_reasons,'sender_disabled');
 END IF;
 RETURN jsonb_build_object(
   'ready',cardinality(v_reasons)=0,
   'reasons',to_jsonb(v_reasons),
   'checked_at',now(),
   'follow_up_id',v_f.id,
   'note','read_only_preflight_not_delivery_authorization'
 );
END; $fn$;

REVOKE ALL ON FUNCTION public.crm_followup_send_preflight(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_followup_send_preflight(uuid)
 TO authenticated,service_role;
COMMIT;
