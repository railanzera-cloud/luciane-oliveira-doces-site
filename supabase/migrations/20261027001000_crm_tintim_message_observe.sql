-- Tintim messages -> CRM private metadata, completely separate from order-reference reconciliation.
-- New state defaults to observation-only until a real payload is homologated.
BEGIN;
CREATE TABLE public.crm_tintim_message_events(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint text NOT NULL UNIQUE CHECK(fingerprint ~ '^[0-9a-f]{64}$'),
  phone_e164 text NOT NULL CHECK(phone_e164 ~ '^55[1-9][0-9]{9,10}$'),
  direction text NOT NULL CHECK(direction IN ('inbound','business_outbound')),
  occurred_at timestamptz NOT NULL,
  conversation_id uuid REFERENCES public.crm_conversations(id) ON DELETE SET NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX crm_tintim_message_phone_time_idx ON public.crm_tintim_message_events(phone_e164,occurred_at DESC);
ALTER TABLE public.crm_tintim_message_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crm_tintim_message_events FROM PUBLIC,anon,authenticated;

CREATE TABLE public.crm_tintim_observation_settings(
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 apply_to_followups boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.crm_tintim_observation_settings(singleton) VALUES(true);
ALTER TABLE public.crm_tintim_observation_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crm_tintim_observation_settings FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.crm_record_tintim_message(
 p_fingerprint text,p_phone text,p_direction text,p_occurred_at timestamptz,
 p_account_key text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE v_phone text;v_event_id uuid;v_customer uuid;v_conv uuid;
 v_prev_in timestamptz;v_prev_out timestamptz;v_status text;v_optout boolean;
 v_apply boolean;v_delay integer;v_blocked boolean;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN
  RAISE EXCEPTION 'crm_provider_only' USING ERRCODE='42501';
 END IF;
 IF p_account_key IS DISTINCT FROM '2c956a42-229f-4d21-ade6-4442f8c048ed'
    OR p_direction NOT IN ('inbound','business_outbound')
    OR p_fingerprint !~ '^[0-9a-f]{64}$'
    OR p_occurred_at IS NULL OR p_occurred_at > now()+interval '5 minutes'
    OR p_occurred_at < now()-interval '48 hours'
 THEN RETURN jsonb_build_object('accepted',false,'reason','invalid_or_old_event'); END IF;
 BEGIN v_phone:=public.crm_normalize_br_phone(p_phone);
 EXCEPTION WHEN SQLSTATE '22023' THEN
  RETURN jsonb_build_object('accepted',false,'reason','invalid_phone');
 END;
 INSERT INTO public.crm_tintim_message_events(fingerprint,phone_e164,direction,occurred_at)
 VALUES(p_fingerprint,v_phone,p_direction,p_occurred_at)
 ON CONFLICT(fingerprint) DO NOTHING RETURNING id INTO v_event_id;
 IF v_event_id IS NULL THEN RETURN jsonb_build_object('accepted',true,'duplicate',true); END IF;

 SELECT apply_to_followups INTO v_apply FROM public.crm_tintim_observation_settings WHERE singleton=true;
 IF NOT coalesce(v_apply,false) THEN
  RETURN jsonb_build_object('accepted',true,'duplicate',false,'mode','observe_only');
 END IF;

 -- Serialize all messages for the same customer, to make dedup and ordering deterministic.
 INSERT INTO public.crm_customers(phone_e164,display_name)
 VALUES(v_phone,'Contato WhatsApp') ON CONFLICT(phone_e164) DO NOTHING;
 SELECT id,commercial_opt_out INTO v_customer,v_optout
 FROM public.crm_customers WHERE phone_e164=v_phone FOR UPDATE;
 SELECT id,last_inbound_at,last_outbound_at,status
 INTO v_conv,v_prev_in,v_prev_out,v_status
 FROM public.crm_conversations
 WHERE customer_id=v_customer AND status NOT IN ('converted','lost','closed')
 ORDER BY updated_at DESC LIMIT 1 FOR UPDATE;
 IF v_conv IS NULL AND p_direction='inbound' THEN
  INSERT INTO public.crm_conversations(customer_id,source_label,status)
  VALUES(v_customer,'tintim_message','in_progress') RETURNING id INTO v_conv;
  v_status:='in_progress';
 END IF;
 IF v_conv IS NULL THEN
  RETURN jsonb_build_object('accepted',true,'linked',false,'reason','no_active_conversation');
 END IF;
 UPDATE public.crm_tintim_message_events SET conversation_id=v_conv WHERE id=v_event_id;

 IF p_direction='inbound' THEN
  UPDATE public.crm_conversations SET
    last_inbound_at=greatest(coalesce(last_inbound_at,p_occurred_at),p_occurred_at),
    status=CASE WHEN p_occurred_at>coalesce(last_outbound_at,'epoch'::timestamptz)
      THEN 'in_progress' ELSE status END,updated_at=now()
  WHERE id=v_conv;
  IF p_occurred_at>coalesce(v_prev_out,'epoch'::timestamptz) THEN
    UPDATE public.crm_follow_ups SET status='canceled',resolved_at=now(),
      resolution_reason='tintim_customer_replied'
    WHERE status='pending' AND conversation_id IN
      (SELECT id FROM public.crm_conversations WHERE customer_id=v_customer);
  END IF;
 ELSE
  -- Outbound without a verified earlier inbound is NOT a follow-up opportunity.
  UPDATE public.crm_conversations SET
    last_outbound_at=greatest(coalesce(last_outbound_at,p_occurred_at),p_occurred_at),
    updated_at=now() WHERE id=v_conv;
  SELECT EXISTS (
    SELECT 1 FROM public.tintim_conversations t
    WHERE t.phone_digits IS NOT NULL
      AND regexp_replace(t.phone_digits,'[^0-9]','','g') IN (v_phone,substring(v_phone FROM 3))
      AND lower(btrim(coalesce(t.stage_label,''))) IN
        ('comprou','convertido','vendido','venda realizada')
  ) INTO v_blocked;
  IF NOT v_optout AND NOT v_blocked AND v_prev_in IS NOT NULL
    AND p_occurred_at>v_prev_in
    AND p_occurred_at>coalesce(v_prev_out,'epoch'::timestamptz)
    AND p_occurred_at>=now()-interval '20 hours'
    AND v_prev_in>=now()-interval '24 hours'
    AND v_status IN ('in_progress','waiting_customer') THEN
    SELECT follow_up_minutes INTO v_delay FROM public.crm_automation_settings WHERE singleton=true;
    UPDATE public.crm_follow_ups SET status='canceled',resolved_at=now(),
      resolution_reason='tintim_new_business_reply'
    WHERE conversation_id=v_conv AND status='pending';
    INSERT INTO public.crm_follow_ups(conversation_id,due_at)
      VALUES(v_conv,p_occurred_at+make_interval(mins=>v_delay));
    UPDATE public.crm_conversations SET status='waiting_customer',updated_at=now() WHERE id=v_conv;
  END IF;
 END IF;
 INSERT INTO public.crm_events(conversation_id,event_type,event_origin,provider_event_id,occurred_at,summary)
 VALUES(v_conv,
   CASE WHEN p_direction='inbound' THEN 'customer_message_received' ELSE 'business_message_observed' END,
   'tintim',p_fingerprint,p_occurred_at,'Evento de direcao; texto da conversa nao armazenado')
 ON CONFLICT DO NOTHING;
 RETURN jsonb_build_object('accepted',true,'duplicate',false,'linked',true);
END; $fn$;
REVOKE ALL ON FUNCTION public.crm_record_tintim_message(text,text,text,timestamptz,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_record_tintim_message(text,text,text,timestamptz,text)
 TO service_role;

CREATE FUNCTION public.crm_tintim_message_diagnostics()
RETURNS TABLE(direction text,events bigint,latest timestamptz,apply_to_followups boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
BEGIN
 PERFORM public.crm_require_staff();
 RETURN QUERY SELECT e.direction,count(*)::bigint,max(e.occurred_at),
   (SELECT s.apply_to_followups FROM public.crm_tintim_observation_settings s WHERE s.singleton=true)
 FROM public.crm_tintim_message_events e GROUP BY e.direction;
END; $fn$;
REVOKE ALL ON FUNCTION public.crm_tintim_message_diagnostics()
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_tintim_message_diagnostics() TO authenticated;
COMMIT;
