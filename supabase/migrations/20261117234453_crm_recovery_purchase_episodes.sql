-- Scoped shadow pilot only. No sends, financial mutations or reopening history.
BEGIN;
CREATE TABLE crm_recovery_private.episode_scope (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 conversation_id uuid NOT NULL UNIQUE REFERENCES public.crm_conversations(id) ON DELETE CASCADE,
 enabled boolean NOT NULL DEFAULT false,
 enabled_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours',
 CHECK(expires_at>enabled_at AND expires_at<=enabled_at+interval '24 hours')
);
ALTER TABLE crm_recovery_private.episode_scope ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON crm_recovery_private.episode_scope FROM PUBLIC,anon,authenticated,service_role;

-- Shared conservative predicate for queue insertion, holds and preflights.
-- Only the one explicitly scoped conversation can distinguish historical stage.
CREATE FUNCTION crm_recovery_private.tintim_episode_requires_review(p_conversation_id uuid)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_phone text;v_link uuid;v_start timestamptz;t record;
BEGIN
 SELECT u.phone_e164,c.tintim_conversation_id INTO v_phone,v_link
 FROM public.crm_conversations c JOIN public.crm_customers u ON u.id=c.customer_id
 WHERE c.id=p_conversation_id;
 IF v_phone IS NULL THEN RETURN true; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.tintim_conversations x
   WHERE (x.phone_digits IN(v_phone,substring(v_phone from 3)) OR x.id=v_link)
   AND lower(btrim(coalesce(x.stage_label,''))) IN('comprou','convertido','vendido','venda realizada'))
 THEN RETURN false; END IF;
 IF NOT EXISTS(SELECT 1 FROM crm_recovery_private.episode_scope s
   WHERE s.conversation_id=p_conversation_id AND s.enabled AND s.enabled_at<=now() AND s.expires_at>now())
 THEN RETURN true; END IF;
 -- A neutral greeting or raw last_inbound_at cannot start an episode.
 SELECT max(e.occurred_at) INTO v_start
 FROM crm_recovery_private.observations o JOIN public.crm_whatsapp_message_events e
 ON e.conversation_id=o.conversation_id AND e.message_id=o.message_id AND e.occurred_at=o.occurred_at
 WHERE o.conversation_id=p_conversation_id AND o.expires_at>now()
 AND o.semantic->>'version'='shadow-1' AND o.semantic->>'intent'='interest'
 AND e.direction='inbound' AND e.phone_e164=v_phone
 AND e.occurred_at>now()-interval '24 hours' AND e.occurred_at<=now()
 AND e.received_at>=e.occurred_at AND e.received_at<=now();
 IF v_start IS NULL THEN RETURN true; END IF;
 -- Current private closing signals also hold; never reinterpret them as paid.
 IF EXISTS(SELECT 1 FROM crm_recovery_private.observations o
   JOIN public.crm_whatsapp_message_events e ON e.conversation_id=o.conversation_id
     AND e.message_id=o.message_id AND e.occurred_at=o.occurred_at
   WHERE o.conversation_id=p_conversation_id AND o.expires_at>now()
     AND o.semantic->>'version'='shadow-1' AND o.semantic->>'intent'='possible_purchase'
     AND e.direction IN('inbound','app_echo') AND e.phone_e164=v_phone
     AND e.occurred_at>=v_start AND e.occurred_at<=now()
     AND e.received_at>=e.occurred_at AND e.received_at<=now())
 THEN RETURN true; END IF;
 -- Incoming purchase receipts remain ambiguous even if their provider date is old.
 IF EXISTS(SELECT 1 FROM public.tintim_webhook_receipts r
   WHERE r.received_at>=v_start AND r.received_at<=now()
   AND lower(btrim(coalesce(r.summary->>'stage',''))) IN('comprou','convertido','vendido','venda realizada')
   AND (r.summary->>'phone_digits' IN(v_phone,substring(v_phone from 3)) OR EXISTS(
     SELECT 1 FROM public.tintim_conversations x WHERE x.phone_digits IN(v_phone,substring(v_phone from 3))
       AND x.account_key=r.account_key AND x.external_lead_id=r.lead_key)))
 THEN RETURN true; END IF;
 FOR t IN SELECT x.* FROM public.tintim_conversations x
   WHERE (x.phone_digits IN(v_phone,substring(v_phone from 3)) OR x.id=v_link)
   AND lower(btrim(coalesce(x.stage_label,''))) IN('comprou','convertido','vendido','venda realizada')
 LOOP
   -- updated_at is server knowledge time, NOT sale time or the 24h clock.
   IF t.phone_digits NOT IN(v_phone,substring(v_phone from 3)) OR t.phone_digits IS NULL
      OR t.identity_basis IS DISTINCT FROM 'tintim_lead_id'
      OR t.updated_at IS NULL OR t.updated_at>=v_start OR t.updated_at<t.created_at
      OR t.last_observed_at>now()
      OR NOT EXISTS(SELECT 1 FROM public.tintim_webhook_receipts r
        WHERE r.account_key=t.account_key AND r.lead_key=t.external_lead_id
        AND r.received_at<v_start AND r.received_at<=t.updated_at
        AND r.summary->>'phone_digits' IN(v_phone,substring(v_phone from 3))
        AND lower(btrim(coalesce(r.summary->>'stage','')))=lower(btrim(t.stage_label)))
   THEN RETURN true; END IF;
 END LOOP;
 RETURN false;
END; $$;
REVOKE ALL ON FUNCTION crm_recovery_private.tintim_episode_requires_review(uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.crm_recovery_purchase_episode(p_conversation_id uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_review boolean;v_scoped boolean;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'provider_only' USING ERRCODE='42501'; END IF;
 SELECT EXISTS(SELECT 1 FROM crm_recovery_private.episode_scope s WHERE s.conversation_id=p_conversation_id
   AND s.enabled AND s.enabled_at<=now() AND s.expires_at>now()) INTO v_scoped;
 v_review:=crm_recovery_private.tintim_episode_requires_review(p_conversation_id);
 RETURN jsonb_build_object('review_required',v_review,'scoped',v_scoped,
   'send_authorized',false,'payment_confirmed',false);
END; $$;
REVOKE ALL ON FUNCTION public.crm_recovery_purchase_episode(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_recovery_purchase_episode(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.crm_protect_purchase_signal_followup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,pg_temp AS $$
BEGIN
  IF NEW.status='pending' AND EXISTS (
    SELECT 1
    FROM public.crm_conversations c
    JOIN public.tintim_conversations t ON t.id=c.tintim_conversation_id
    WHERE c.id=NEW.conversation_id
      AND lower(btrim(coalesce(t.stage_label,''))) IN
         ('comprou','convertido','venda realizada','vendido') AND crm_recovery_private.tintim_episode_requires_review(c.id)
  ) THEN
    RAISE EXCEPTION 'crm_possible_purchase_review_required' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.crm_hold_tintim_purchase_signals()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,pg_temp AS $$
DECLARE v_canceled integer:=0;
BEGIN
  PERFORM public.crm_require_staff();
  WITH flagged AS (
    SELECT f.id,f.conversation_id
    FROM public.crm_follow_ups f
    JOIN public.crm_conversations c ON c.id=f.conversation_id
    JOIN public.tintim_conversations t ON t.id=c.tintim_conversation_id
    WHERE f.status='pending' AND
      lower(btrim(coalesce(t.stage_label,''))) IN
        ('comprou','convertido','venda realizada','vendido') AND crm_recovery_private.tintim_episode_requires_review(c.id)
    FOR UPDATE OF f
  ), suspended AS (
    UPDATE public.crm_follow_ups f
      SET status='canceled',resolved_at=now(),resolution_reason='tintim_purchase_signal'
    FROM flagged x WHERE f.id=x.id
    RETURNING f.conversation_id
  ), recorded AS (
    INSERT INTO public.crm_events(conversation_id,event_type,event_origin,summary)
    SELECT s.conversation_id,'followup_held_purchase_signal','tintim',
      'Sinal externo de compra; venda nao foi confirmada no financeiro'
    FROM suspended s
    RETURNING id
  ) SELECT count(*)::integer INTO v_canceled FROM recorded;
  RETURN v_canceled;
END; $$;

CREATE OR REPLACE FUNCTION public.crm_ingest_tintim_on_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_phone text;
  v_name text;
  v_customer_id uuid;
  v_conversation_id uuid;
  v_is_purchase_signal boolean;
BEGIN
  IF NEW.phone_digits IS NULL THEN RETURN NEW; END IF;
  BEGIN
    v_phone:=public.crm_normalize_br_phone(NEW.phone_digits);
  EXCEPTION WHEN SQLSTATE '22023' THEN
    RETURN NEW;
  END;

  v_is_purchase_signal :=
    lower(btrim(coalesce(NEW.stage_label,''))) IN
      ('comprou','convertido','vendido','venda realizada');

  -- Suspende follow-ups pelo telefone quando Tintim indica POSSIVEL compra.
  -- Nao presume pagamento, nem atualiza status de venda, Pix ou pedido.
  IF v_is_purchase_signal THEN
    WITH held AS (
      UPDATE public.crm_follow_ups f
        SET status='canceled',
            resolved_at=now(),
            resolution_reason='tintim_purchase_signal'
      WHERE f.status='pending'
        AND EXISTS (
          SELECT 1 FROM public.crm_conversations c
          JOIN public.crm_customers cu ON cu.id=c.customer_id
          WHERE c.id=f.conversation_id AND cu.phone_e164=v_phone
            AND crm_recovery_private.tintim_episode_requires_review(c.id)
        )
      RETURNING f.conversation_id
    )
    INSERT INTO public.crm_events(conversation_id,event_type,event_origin,summary)
    SELECT h.conversation_id,'followup_held_purchase_signal','tintim',
      'Sinal do Tintim de possivel compra; nao confirmado como pagamento'
    FROM held h;
    RETURN NEW;
  END IF;

  -- So importar sinais recentes. Dados antigos nao passam a ser leads novos
  -- por replay/atualizacao de um registro antigo.
  IF NEW.last_observed_at < now()-interval '7 days' THEN RETURN NEW; END IF;

  v_name:=left(btrim(coalesce(NEW.contact_name,'')),100);
  IF char_length(v_name)<2 THEN v_name:='Contato WhatsApp'; END IF;

  INSERT INTO public.crm_customers(phone_e164,display_name)
  VALUES(v_phone,v_name)
  ON CONFLICT(phone_e164) DO UPDATE
     SET display_name=CASE
       WHEN public.crm_customers.display_name='Contato WhatsApp'
            AND EXCLUDED.display_name<>'Contato WhatsApp'
       THEN EXCLUDED.display_name
       ELSE public.crm_customers.display_name END,
       updated_at=CASE
        WHEN public.crm_customers.display_name='Contato WhatsApp'
             AND EXCLUDED.display_name<>'Contato WhatsApp'
        THEN now() ELSE public.crm_customers.updated_at END
  RETURNING id INTO v_customer_id;

  INSERT INTO public.crm_conversations(customer_id,tintim_conversation_id,source_label)
  VALUES(v_customer_id,NEW.id,left(NEW.source_label,160))
  ON CONFLICT(tintim_conversation_id) DO NOTHING
  RETURNING id INTO v_conversation_id;

  IF v_conversation_id IS NOT NULL THEN
    INSERT INTO public.crm_events(conversation_id,event_type,event_origin,summary)
    VALUES(v_conversation_id,'contact_discovered','tintim',
      'Lead recebido automaticamente; sem agendamento nem envio');
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Falha na ponte de CRM jamais pode impedir a captura do Tintim.
  RAISE WARNING 'crm_tintim_bridge_failed SQLSTATE %',SQLSTATE;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_record_tintim_message(
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
        ('comprou','convertido','vendido','venda realizada') AND crm_recovery_private.tintim_episode_requires_review(v_conv)
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

CREATE OR REPLACE FUNCTION public.crm_followup_send_preflight(p_follow_up_id uuid)
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
END; $fn$;

CREATE OR REPLACE FUNCTION public.crm_automation_evaluate_pending()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
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
END; $fn$;

CREATE OR REPLACE FUNCTION crm_recovery_private.source_revision(p_follow_up_id uuid)
RETURNS text LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT md5(jsonb_build_array(
  jsonb_build_array(f.status,f.due_at,f.sent_at,c.status,c.updated_at,c.last_inbound_at,c.last_outbound_at,
   u.phone_e164,u.updated_at,u.consent_status,u.consent_at,u.consent_evidence,u.commercial_opt_out),
  (SELECT jsonb_agg(to_jsonb(e) ORDER BY e.id) FROM public.crm_whatsapp_message_events e WHERE e.conversation_id=c.id AND e.occurred_at>=greatest(c.created_at,now()-interval '24 hours')),
  (SELECT jsonb_agg(to_jsonb(e) ORDER BY e.id) FROM public.crm_tintim_message_events e WHERE e.conversation_id=c.id AND e.occurred_at>=greatest(c.created_at,now()-interval '24 hours')),
  (SELECT jsonb_agg(jsonb_build_array(o.id,o.updated_at,o.customer_phone,o.payment_status,o.order_status,o.paid_at) ORDER BY o.id)
   FROM public.orders o WHERE (o.created_at>=greatest(c.created_at,now()-interval '24 hours') OR o.paid_at>=greatest(c.created_at,now()-interval '24 hours')) OR o.id IN (SELECT l.order_uuid FROM public.tintim_order_links l WHERE l.conversation_id=c.tintim_conversation_id)),
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
  (SELECT jsonb_agg(to_jsonb(a) ORDER BY a.id) FROM public.crm_consent_audit a WHERE a.customer_id=u.id),
  (SELECT jsonb_agg(to_jsonb(s)) FROM public.crm_automation_settings s)
 )::text)
 FROM public.crm_follow_ups f JOIN public.crm_conversations c ON c.id=f.conversation_id
 JOIN public.crm_customers u ON u.id=c.customer_id WHERE f.id=p_follow_up_id;
$$;
-- Preserve existing access contracts explicitly, including fresh test installs.
REVOKE ALL ON FUNCTION public.crm_protect_purchase_signal_followup(),public.crm_ingest_tintim_on_change() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.crm_hold_tintim_purchase_signals() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.crm_hold_tintim_purchase_signals() TO authenticated;
REVOKE ALL ON FUNCTION public.crm_record_tintim_message(text,text,text,timestamptz,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_record_tintim_message(text,text,text,timestamptz,text) TO service_role;
REVOKE ALL ON FUNCTION public.crm_followup_send_preflight(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_followup_send_preflight(uuid) TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.crm_automation_evaluate_pending() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_automation_evaluate_pending() TO service_role;
REVOKE ALL ON FUNCTION crm_recovery_private.source_revision(uuid) FROM PUBLIC,anon,authenticated,service_role;

COMMIT;
