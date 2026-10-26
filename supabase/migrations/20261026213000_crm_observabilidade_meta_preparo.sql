-- CRM incremental v2: inbox de contatos recentes e ingestao passiva de eventos Meta.
-- Nao instala gatilhos em pedidos, nao envia mensagens, nao altera Tintim/MP/CAPI.
BEGIN;

CREATE TABLE public.crm_whatsapp_message_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'meta' CHECK (provider='meta'),
  message_id text NOT NULL CHECK (char_length(message_id) BETWEEN 9 AND 300),
  direction text NOT NULL CHECK (direction IN ('inbound','app_echo')),
  phone_e164 text NOT NULL CHECK (phone_e164 ~ '^55[1-9][0-9]{9,10}$'),
  conversation_id uuid REFERENCES public.crm_conversations(id) ON DELETE SET NULL,
  occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider,message_id,direction)
);
CREATE INDEX crm_whatsapp_events_conversation ON public.crm_whatsapp_message_events(conversation_id,occurred_at DESC);
ALTER TABLE public.crm_whatsapp_message_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crm_whatsapp_message_events FROM PUBLIC,anon,authenticated;

CREATE TABLE public.crm_automation_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  follow_up_minutes integer NOT NULL DEFAULT 45 CHECK (follow_up_minutes BETWEEN 15 AND 2880),
  automatic_sends_enabled boolean NOT NULL DEFAULT false CHECK (automatic_sends_enabled=false),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.crm_automation_settings(singleton) VALUES(true);
ALTER TABLE public.crm_automation_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crm_automation_settings FROM PUBLIC,anon,authenticated;

-- Chamada na abertura do painel; nenhum efeito na ingestao do Tintim.
-- Apenas ultimas 72h: nao disparar follow-up e nao inferir opt-in/interesse.
CREATE FUNCTION public.crm_sync_recent_tintim(p_hours integer DEFAULT 72, p_limit integer DEFAULT 100)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE t record; v_phone text; v_customer uuid; v_conversation uuid;
        v_created integer:=0; v_seen integer:=0; v_skipped integer:=0;
BEGIN
  PERFORM public.crm_require_staff();
  IF p_hours NOT BETWEEN 1 AND 168 OR p_limit NOT BETWEEN 1 AND 150 THEN
    RAISE EXCEPTION 'crm_invalid_sync_window' USING ERRCODE='22023';
  END IF;
  FOR t IN
    SELECT id,phone_digits,contact_name,source_label,stage_label,last_observed_at
    FROM public.tintim_conversations
    WHERE last_observed_at >= now()-make_interval(hours=>p_hours)
      AND phone_digits IS NOT NULL
    ORDER BY last_observed_at DESC LIMIT p_limit
  LOOP
    v_seen:=v_seen+1;
    IF coalesce(lower(btrim(t.stage_label)),'') IN ('comprou','convertido','venda realizada','vendido') THEN
      v_skipped:=v_skipped+1;
      CONTINUE;
    END IF;
    BEGIN v_phone:=public.crm_normalize_br_phone(t.phone_digits);
    EXCEPTION WHEN SQLSTATE '22023' THEN
      v_skipped:=v_skipped+1; CONTINUE;
    END;
    INSERT INTO public.crm_customers(phone_e164,display_name)
    VALUES(v_phone,coalesce(nullif(left(btrim(t.contact_name),100),''),'Contato WhatsApp'))
    ON CONFLICT(phone_e164) DO NOTHING;
    SELECT id INTO v_customer FROM public.crm_customers WHERE phone_e164=v_phone;
    INSERT INTO public.crm_conversations(customer_id,tintim_conversation_id,source_label)
    VALUES(v_customer,t.id,left(t.source_label,160))
    ON CONFLICT(tintim_conversation_id) DO NOTHING RETURNING id INTO v_conversation;
    IF v_conversation IS NOT NULL THEN
      v_created:=v_created+1;
      INSERT INTO public.crm_events(conversation_id,event_type,event_origin,summary)
      VALUES(v_conversation,'contact_discovered','tintim','Novo contato organizado sem agendamento nem envio');
    END IF;
    v_conversation:=NULL;
  END LOOP;
  RETURN jsonb_build_object('scanned',v_seen,'added',v_created,'skipped',v_skipped);
END; $$;
REVOKE ALL ON FUNCTION public.crm_sync_recent_tintim(integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_sync_recent_tintim(integer,integer) TO authenticated;

-- Recebe apenas ID e direcao; NUNCA armazena texto, midia ou payload bruto.
-- Invocacao EXCLUSIVA da Edge Function apos autenticar HMAC + phone_number_id.
CREATE FUNCTION public.crm_record_meta_message(
  p_phone text,
  p_message_id text,
  p_direction text,
  p_occurred_at timestamptz
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_phone text; v_customer uuid; v_conv uuid; v_msg uuid;
        v_previous_inbound timestamptz; v_previous_outbound timestamptz;
        v_status text; v_optout boolean; v_delay integer;
BEGIN
  -- Nao aceitar token publico ou JWT da atendente como origem confiavel de webhook.
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'crm_provider_only' USING ERRCODE='42501';
  END IF;
  IF p_direction NOT IN ('inbound','app_echo')
     OR p_message_id IS NULL OR length(p_message_id) NOT BETWEEN 9 AND 300
     OR p_occurred_at IS NULL OR p_occurred_at > now()+interval '5 minutes'
     OR p_occurred_at < now()-interval '7 days' THEN
    RAISE EXCEPTION 'crm_invalid_provider_event' USING ERRCODE='22023';
  END IF;
  v_phone:=public.crm_normalize_br_phone(p_phone);
  INSERT INTO public.crm_whatsapp_message_events(message_id,direction,phone_e164,occurred_at)
    VALUES(p_message_id,p_direction,v_phone,p_occurred_at)
    ON CONFLICT(provider,message_id,direction) DO NOTHING RETURNING id INTO v_msg;
  IF v_msg IS NULL THEN RETURN jsonb_build_object('accepted',true,'duplicate',true); END IF;

  INSERT INTO public.crm_customers(phone_e164,display_name)
    VALUES(v_phone,'Contato WhatsApp')
    ON CONFLICT(phone_e164) DO NOTHING;
  SELECT id,commercial_opt_out INTO v_customer,v_optout
    FROM public.crm_customers WHERE phone_e164=v_phone FOR UPDATE;

  -- Se contato anterior converteu ou encerrou, inbound inicia novo atendimento.
  SELECT id,last_inbound_at,last_outbound_at,status
    INTO v_conv,v_previous_inbound,v_previous_outbound,v_status
  FROM public.crm_conversations
  WHERE customer_id=v_customer AND status NOT IN ('converted','lost','closed')
  ORDER BY updated_at DESC LIMIT 1 FOR UPDATE;
  IF v_conv IS NULL AND p_direction='inbound' THEN
    INSERT INTO public.crm_conversations(customer_id,source_label,status)
       VALUES(v_customer,'whatsapp_meta','in_progress') RETURNING id INTO v_conv;
    v_status:='in_progress';
  END IF;
  IF v_conv IS NULL THEN
    RETURN jsonb_build_object('accepted',true,'linked',false,'reason','no_active_conversation');
  END IF;
  UPDATE public.crm_whatsapp_message_events SET conversation_id=v_conv WHERE id=v_msg;
  IF p_direction='inbound' THEN
    UPDATE public.crm_conversations SET
      last_inbound_at=greatest(coalesce(last_inbound_at,p_occurred_at),p_occurred_at),
      updated_at=now(),
      status=CASE
       WHEN p_occurred_at >= coalesce(last_outbound_at,'epoch'::timestamptz)
       THEN 'in_progress' ELSE status END
    WHERE id=v_conv;
    IF p_occurred_at >= coalesce(v_previous_outbound,'epoch'::timestamptz) THEN
      -- Cancelar todos os lembretes ativos para esse telefone, inclusive atendimentos duplicados.
      UPDATE public.crm_follow_ups SET status='canceled',resolved_at=now(),
        resolution_reason='customer_replied'
      WHERE conversation_id IN (SELECT id FROM public.crm_conversations WHERE customer_id=v_customer)
        AND status='pending';
    END IF;
  ELSIF p_direction='app_echo' THEN
    UPDATE public.crm_conversations SET
       last_outbound_at=greatest(coalesce(last_outbound_at,p_occurred_at),p_occurred_at),
       updated_at=now()
    WHERE id=v_conv;
    -- Nao cria agendamento sem uma mensagem recebida comprovada anteriormente.
    -- Echo fora de ordem/historico nao pode iniciar follow-up retroativo.
    IF NOT v_optout AND v_previous_inbound IS NOT NULL
       AND p_occurred_at > v_previous_inbound
       AND p_occurred_at > coalesce(v_previous_outbound,'epoch'::timestamptz)
       AND p_occurred_at >= now()-interval '20 hours'
       AND v_status IN ('in_progress','waiting_customer')
    THEN
      SELECT follow_up_minutes INTO v_delay
      FROM public.crm_automation_settings WHERE singleton=true;
      UPDATE public.crm_follow_ups SET status='canceled',resolved_at=now(),
        resolution_reason='new_business_reply'
        WHERE conversation_id=v_conv AND status='pending';
      INSERT INTO public.crm_follow_ups(conversation_id,due_at)
        VALUES(v_conv,p_occurred_at+make_interval(mins=>v_delay));
      UPDATE public.crm_conversations SET status='waiting_customer',updated_at=now()
        WHERE id=v_conv;
    END IF;
  END IF;
  INSERT INTO public.crm_events(conversation_id,event_type,event_origin,provider_event_id,occurred_at)
    VALUES(v_conv, CASE WHEN p_direction='inbound' THEN 'customer_message_received'
                        ELSE 'business_message_observed' END,
           'meta',p_message_id,p_occurred_at)
    ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('accepted',true,'duplicate',false,'linked',true);
END; $$;
REVOKE ALL ON FUNCTION public.crm_record_meta_message(text,text,text,timestamptz)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_record_meta_message(text,text,text,timestamptz)
  TO service_role;

-- Conversao manual em um atendimento deve bloquear follow-ups de outros
-- atendimentos ainda abertos do mesmo comprador conhecido.
CREATE FUNCTION public.crm_cancel_customer_followups_on_conversion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF NEW.status='converted' AND OLD.status IS DISTINCT FROM 'converted' THEN
    UPDATE public.crm_follow_ups SET status='canceled',resolved_at=now(),
      resolution_reason='customer_converted'
    WHERE status='pending' AND conversation_id IN
      (SELECT id FROM public.crm_conversations WHERE customer_id=NEW.customer_id);
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.crm_cancel_customer_followups_on_conversion()
  FROM PUBLIC,anon,authenticated;
CREATE TRIGGER crm_cancel_converted_customer_followups
AFTER UPDATE OF status ON public.crm_conversations
FOR EACH ROW EXECUTE FUNCTION public.crm_cancel_customer_followups_on_conversion();
COMMIT;