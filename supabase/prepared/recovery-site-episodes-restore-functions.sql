-- Candidate structural rollback to the production functions read on 18/11/2026.
-- FIRST disable episode_scope AND CRM_RECOVERY_EPISODES_ENABLED; restore both bundles together.
-- Keep the unused private helper revoked; do not remove evidence/retention tables.
BEGIN;
CREATE OR REPLACE FUNCTION public.crm_automation_evaluate_pending()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 r record;
 v_blockers text[];
 v_state text;
 v_processed int:=0;
 v_scheduled int:=0;
 v_blocked int:=0;
 v_finished int:=0;
 v_review int:=0;
 v_purchase boolean;
 v_verified boolean;
 v_sender boolean;
BEGIN
 IF session_user <> 'postgres' AND auth.role() IS DISTINCT FROM 'service_role' THEN
   RAISE EXCEPTION 'crm_provider_only' USING ERRCODE='42501';
 END IF;
 SELECT automatic_sends_enabled INTO v_sender
 FROM public.crm_automation_settings WHERE singleton=true;
 -- Exact automation lifecycle is serialized; concurrent cron/webhook changes
 -- are read-only here, never turned into an actual send authorization.
 IF NOT pg_try_advisory_xact_lock(72180310,20261027) THEN
   RETURN jsonb_build_object('skipped','scan_already_running');
 END IF;
 FOR r IN
   SELECT f.id follow_up_id,f.conversation_id,f.status follow_up_status,
     f.due_at,f.created_at,c.status conversation_status,c.last_inbound_at,
     c.last_outbound_at,c.created_at conversation_created,
     u.phone_e164,u.consent_status,u.consent_at,u.consent_evidence,
     u.commercial_opt_out
   FROM public.crm_follow_ups f
   JOIN public.crm_conversations c ON c.id=f.conversation_id
   JOIN public.crm_customers u ON u.id=c.customer_id
   WHERE f.created_at > now()-interval '30 days'
   ORDER BY f.created_at DESC LIMIT 500
 LOOP
   v_processed:=v_processed+1;
   v_blockers:=ARRAY[]::text[];
   IF r.follow_up_status<>'pending' THEN
     v_state:='finished';
     v_finished:=v_finished+1;
   ELSIF r.due_at>now() THEN
     v_state:='scheduled';
     v_scheduled:=v_scheduled+1;
   ELSE
     v_state:='blocked';
     IF r.conversation_status<>'waiting_customer' THEN
       v_blockers:=array_append(v_blockers,'conversation_not_waiting');
     END IF;
     IF r.commercial_opt_out THEN
       v_blockers:=array_append(v_blockers,'customer_opted_out');
     END IF;
     IF r.consent_status<>'granted' OR r.consent_at IS NULL
        OR nullif(btrim(coalesce(r.consent_evidence,'')),'') IS NULL THEN
       v_blockers:=array_append(v_blockers,'consent_unverified');
     END IF;
     IF r.last_inbound_at IS NULL
       OR r.last_inbound_at<=now()-interval '23 hours'
       OR r.last_inbound_at>now()+interval '1 minute' THEN
       v_blockers:=array_append(v_blockers,'outside_verified_window');
     END IF;
     IF r.last_outbound_at IS NULL OR r.last_inbound_at IS NULL
       OR r.last_outbound_at<=r.last_inbound_at THEN
       v_blockers:=array_append(v_blockers,'business_reply_unverified');
     END IF;
     SELECT EXISTS(
       SELECT 1 FROM public.crm_tintim_message_events e
       WHERE e.conversation_id=r.conversation_id AND e.direction='inbound'
         AND e.time_basis='provider_timestamp'
         AND e.occurred_at BETWEEN now()-interval '23 hours' AND now()
         AND r.last_inbound_at IS NOT NULL
         AND e.occurred_at BETWEEN r.last_inbound_at-interval '2 minutes'
                               AND r.last_inbound_at+interval '2 minutes'
     ) OR EXISTS (
       SELECT 1 FROM public.crm_whatsapp_message_events e
       WHERE e.conversation_id=r.conversation_id AND e.direction='inbound'
         AND e.occurred_at BETWEEN now()-interval '23 hours' AND now()
         AND r.last_inbound_at IS NOT NULL
         AND e.occurred_at BETWEEN r.last_inbound_at-interval '2 minutes'
                               AND r.last_inbound_at+interval '2 minutes'
     ) INTO v_verified;
     IF NOT v_verified THEN
       v_blockers:=array_append(v_blockers,'provider_timestamp_unverified');
     END IF;
     -- Purchase is a suppression signal, never evidence of revenue.
     SELECT EXISTS(
        SELECT 1 FROM public.tintim_conversations t
        WHERE regexp_replace(coalesce(t.phone_digits,''),'[^0-9]','','g')
          IN (r.phone_e164,substring(r.phone_e164 from 3))
          AND lower(btrim(coalesce(t.stage_label,'')))
            IN ('comprou','convertido','vendido','venda realizada') AND crm_recovery_private.tintim_episode_requires_review(r.conversation_id)
     ) OR EXISTS(
        SELECT 1 FROM public.orders o
        WHERE regexp_replace(coalesce(o.customer_phone,''),'[^0-9]','','g')
          IN (r.phone_e164,substring(r.phone_e164 from 3))
          AND o.created_at>=r.conversation_created-interval '1 hour'
          AND (o.payment_status::text='paid'
            OR o.order_status::text IN ('delivered','completed'))
     ) INTO v_purchase;
     IF v_purchase THEN
       v_blockers:=array_append(v_blockers,'possible_purchase');
     END IF;
     IF NOT coalesce(v_sender,false) THEN
       v_blockers:=array_append(v_blockers,'sender_disabled');
     END IF;
     -- Hard gate: no integration certification exists. Never treat this
     -- queue as authority to dispatch, even if another setting changes.
     v_blockers:=array_append(v_blockers,'provider_not_certified');
     IF cardinality(v_blockers)=0 THEN v_state:='review_required'; END IF;
     IF v_state='blocked' THEN v_blocked:=v_blocked+1;
     ELSE v_review:=v_review+1;
     END IF;
   END IF;
   INSERT INTO public.crm_automation_queue
     (follow_up_id,conversation_id,due_at,queue_state,blockers,evaluated_at)
   VALUES (r.follow_up_id,r.conversation_id,r.due_at,v_state,v_blockers,now())
   ON CONFLICT(follow_up_id) DO UPDATE SET
     conversation_id=excluded.conversation_id,
     due_at=excluded.due_at,
     queue_state=excluded.queue_state,
     blockers=excluded.blockers,
     evaluated_at=excluded.evaluated_at;
 END LOOP;
 UPDATE public.crm_automation_monitor SET last_evaluated_at=now(),
   examined=v_processed,scheduled=v_scheduled,blocked=v_blocked,
   finished=v_finished,review_required=v_review
 WHERE singleton=true;
 RETURN jsonb_build_object('examined',v_processed,'scheduled',v_scheduled,
   'blocked',v_blocked,'finished',v_finished,'review_required',v_review,
   'dispatched',0,'mode','observe_only');
END; $function$;

CREATE OR REPLACE FUNCTION public.crm_followup_send_preflight(p_follow_up_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
       IN ('comprou','convertido','vendido','venda realizada') AND crm_recovery_private.tintim_episode_requires_review(v_c.id)
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
END; $function$;

CREATE OR REPLACE FUNCTION crm_recovery_private.source_revision(p_follow_up_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 SELECT md5(jsonb_build_array(
  jsonb_build_array(f.status,f.due_at,f.sent_at,c.status,c.updated_at,c.last_inbound_at,c.last_outbound_at,
   u.phone_e164,u.updated_at,u.consent_status,u.consent_at,u.consent_evidence,u.commercial_opt_out),
  (SELECT jsonb_agg(to_jsonb(e) ORDER BY e.id) FROM public.crm_whatsapp_message_events e WHERE e.conversation_id=c.id AND e.occurred_at>=now()-interval '24 hours'),
  (SELECT jsonb_agg(to_jsonb(e) ORDER BY e.id) FROM public.crm_tintim_message_events e WHERE e.conversation_id=c.id AND e.occurred_at>=now()-interval '24 hours'),
  (SELECT jsonb_agg(jsonb_build_array(o.id,o.updated_at,o.customer_phone,o.payment_status,o.order_status,o.paid_at) ORDER BY o.id)
   FROM public.orders o WHERE (o.created_at>=now()-interval '24 hours' OR o.paid_at>=now()-interval '24 hours') OR o.id IN (SELECT r.order_uuid FROM crm_recovery_private.order_references r WHERE r.conversation_id=c.id) OR o.id IN (SELECT l.order_uuid FROM public.tintim_order_links l WHERE l.conversation_id=c.tintim_conversation_id)),
  (SELECT jsonb_agg(jsonb_build_array(x.id,x.status,x.sent_at,x.due_at) ORDER BY x.id) FROM public.crm_follow_ups x WHERE x.conversation_id=c.id),
  (SELECT jsonb_agg(to_jsonb(a) ORDER BY a.id) FROM public.menu_availability a),
  public.public_crocante_inventory(),
  (SELECT jsonb_agg(to_jsonb(s) ORDER BY s.id) FROM public.store_settings s WHERE s.key='orders_open'),
  (SELECT jsonb_agg(to_jsonb(o) ORDER BY o.message_id) FROM crm_recovery_private.observations o WHERE o.conversation_id=c.id AND o.expires_at>now()),
  (SELECT jsonb_agg(to_jsonb(l) ORDER BY l.id) FROM public.tintim_order_links l WHERE l.conversation_id=c.tintim_conversation_id),
  (SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM public.tintim_conversations t WHERE t.phone_digits IN(u.phone_e164,substring(u.phone_e164 from 3))),
  (SELECT jsonb_agg(jsonb_build_array(to_jsonb(s),s.enabled AND s.enabled_at<=now() AND s.expires_at>now())) FROM crm_recovery_private.episode_scope s WHERE s.conversation_id=c.id),
  (SELECT jsonb_agg(jsonb_build_array(r.id,r.received_at,md5(r.summary::text)) ORDER BY r.id) FROM public.tintim_webhook_receipts r
   WHERE r.summary->>'phone_digits' IN(u.phone_e164,substring(u.phone_e164 from 3)) OR EXISTS(
    SELECT 1 FROM public.tintim_conversations t WHERE t.phone_digits IN(u.phone_e164,substring(u.phone_e164 from 3))
     AND t.account_key=r.account_key AND t.external_lead_id=r.lead_key)),
  (SELECT jsonb_agg(to_jsonb(r) ORDER BY r.message_id) FROM crm_recovery_private.order_references r WHERE r.conversation_id=c.id AND r.expires_at>now()),
  (SELECT jsonb_agg(to_jsonb(a) ORDER BY a.id) FROM public.crm_consent_audit a WHERE a.customer_id=u.id),
  (SELECT jsonb_agg(to_jsonb(s)) FROM public.crm_automation_settings s)
 )::text)
 FROM public.crm_follow_ups f JOIN public.crm_conversations c ON c.id=f.conversation_id
 JOIN public.crm_customers u ON u.id=c.customer_id WHERE f.id=p_follow_up_id;
$function$;
COMMIT;

