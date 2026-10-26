-- CRM comercial isolado: nenhuma alteracao em orders, checkout, pagamentos ou cozinha.
-- Etapa assistida SEM API de envio. Executar somente apos homologacao/backup.
-- Acesso inicial intencionalmente fechado: provisionar crm_staff_access apenas apos conferir o UUID da Luciane.
BEGIN;
CREATE TABLE public.crm_staff_access (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.crm_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 text NOT NULL UNIQUE CHECK (phone_e164 ~ '^55[1-9][0-9]{9,10}$'),
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 100),
  consent_status text NOT NULL DEFAULT 'unknown' CHECK (consent_status IN ('unknown','granted','denied')),
  consent_evidence text CHECK (consent_evidence IS NULL OR char_length(consent_evidence) <= 240),
  consent_at timestamptz,
  commercial_opt_out boolean NOT NULL DEFAULT false,
  opt_out_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.crm_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.crm_customers(id),
  tintim_conversation_id uuid UNIQUE REFERENCES public.tintim_conversations(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress','waiting_customer','converted','lost','closed')),
  interest_label text CHECK (interest_label IS NULL OR char_length(interest_label) <= 80),
  interest_basis text NOT NULL DEFAULT 'unknown' CHECK (interest_basis IN ('unknown','staff_confirmed')),
  source_label text CHECK (source_label IS NULL OR char_length(source_label) <= 160),
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  converted_at timestamptz,
  conversion_basis text CHECK (conversion_basis IS NULL OR conversion_basis IN ('manual','verified_order')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.crm_follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.crm_conversations(id),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','sent_manually','canceled')),
  due_at timestamptz NOT NULL,
  sent_at timestamptz,
  resolved_at timestamptz,
  resolution_reason text CHECK (resolution_reason IS NULL OR char_length(resolution_reason) <= 80),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX crm_one_pending_follow_up_per_conversation
  ON public.crm_follow_ups(conversation_id) WHERE status='pending';
CREATE INDEX crm_pending_due_idx ON public.crm_follow_ups(due_at) WHERE status='pending';
CREATE INDEX crm_conversations_customer_idx ON public.crm_conversations(customer_id,created_at DESC);
CREATE TABLE public.crm_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.crm_conversations(id),
  event_type text NOT NULL CHECK (char_length(event_type) BETWEEN 2 AND 80),
  event_origin text NOT NULL CHECK (event_origin IN ('admin','tintim','meta','orders')),
  provider_event_id text,
  summary text CHECK (summary IS NULL OR char_length(summary) <= 240),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX crm_events_provider_dedupe
  ON public.crm_events(event_origin,provider_event_id) WHERE provider_event_id IS NOT NULL;
CREATE INDEX crm_events_conversation_idx ON public.crm_events(conversation_id,occurred_at DESC);
ALTER TABLE public.crm_staff_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crm_staff_access,public.crm_customers,public.crm_conversations,
  public.crm_follow_ups,public.crm_events FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.crm_require_staff() RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT EXISTS(SELECT 1 FROM public.crm_staff_access WHERE user_id=v_uid) THEN
    RAISE EXCEPTION 'crm_access_denied' USING ERRCODE='42501';
  END IF;
  RETURN v_uid;
END; $$;
REVOKE ALL ON FUNCTION public.crm_require_staff() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_require_staff() TO authenticated;

-- Sem suposicoes sobre o numero do pais: apenas numero local brasileiro com DDD,
-- ou E.164 com 55 ja presente. Nao alterar o identificador de Tintim original.
CREATE FUNCTION public.crm_normalize_br_phone(p_input text) RETURNS text
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE v_digits text := regexp_replace(coalesce(p_input,''),'[^0-9]','','g');
BEGIN
  IF v_digits ~ '^[1-9][0-9]{9,10}$' THEN v_digits:='55'||v_digits; END IF;
  IF v_digits !~ '^55[1-9][0-9]{9,10}$' THEN
    RAISE EXCEPTION 'crm_invalid_br_phone' USING ERRCODE='22023';
  END IF;
  RETURN v_digits;
END; $$;
REVOKE ALL ON FUNCTION public.crm_normalize_br_phone(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_normalize_br_phone(text) TO authenticated;

CREATE FUNCTION public.crm_list_tintim_candidates(p_limit integer DEFAULT 40)
RETURNS TABLE (
  tintim_id uuid, contact_name text, phone_hint text,
  stage_label text, source_label text, campaign_name text,
  last_seen_at timestamptz, imported boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  PERFORM public.crm_require_staff();
  RETURN QUERY SELECT t.id,
   coalesce(nullif(trim(t.contact_name),''),'Contato WhatsApp'),
   right(t.phone_digits,4),t.stage_label,t.source_label,t.campaign_name,
   t.last_observed_at, EXISTS(SELECT 1 FROM public.crm_conversations cc WHERE cc.tintim_conversation_id=t.id)
  FROM public.tintim_conversations t
  WHERE t.phone_digits IS NOT NULL AND t.phone_digits ~ '^(55)?[1-9][0-9]{9,10}$'
  ORDER BY t.last_observed_at DESC LIMIT least(greatest(coalesce(p_limit,40),1),100);
END; $$;

CREATE FUNCTION public.crm_list_opportunities()
RETURNS TABLE (
  conversation_id uuid, customer_name text, phone_e164 text, consent_status text,
  commercial_opt_out boolean, interest_label text, status text,
  source_label text, last_inbound_at timestamptz, last_outbound_at timestamptz,
  follow_up_id uuid, follow_up_due_at timestamptz, follow_up_status text, created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 PERFORM public.crm_require_staff();
 RETURN QUERY SELECT c.id,cu.display_name,cu.phone_e164,cu.consent_status,
   cu.commercial_opt_out,c.interest_label,c.status,c.source_label,
   c.last_inbound_at,c.last_outbound_at,
   f.id,f.due_at,f.status,c.created_at
 FROM public.crm_conversations c
 JOIN public.crm_customers cu ON cu.id=c.customer_id
 LEFT JOIN LATERAL (
   SELECT fu.id,fu.due_at,fu.status FROM public.crm_follow_ups fu
   WHERE fu.conversation_id=c.id ORDER BY fu.created_at DESC LIMIT 1
 ) f ON true
 ORDER BY CASE WHEN f.status='pending' AND f.due_at<=now() THEN 0
               WHEN f.status='pending' THEN 1 ELSE 2 END,
          coalesce(f.due_at,c.updated_at) DESC
 LIMIT 150;
END; $$;

-- Cria uma oportunidade somente mediante acao explicita da atendente.
-- Importacao preserva opt-out por telefone e nao ativa disparos.
CREATE FUNCTION public.crm_open_opportunity(
 p_tintim_id uuid DEFAULT NULL,p_name text DEFAULT NULL,p_phone text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_phone text;v_name text;v_source text;v_customer uuid;v_conversation uuid;
BEGIN
 PERFORM public.crm_require_staff();
 IF p_tintim_id IS NOT NULL THEN
  SELECT t.phone_digits,coalesce(nullif(trim(t.contact_name),''),'Contato WhatsApp'),t.source_label
  INTO v_phone,v_name,v_source FROM public.tintim_conversations t WHERE t.id=p_tintim_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'crm_tintim_not_found' USING ERRCODE='22023'; END IF;
 ELSE
  v_phone:=p_phone;v_name:=nullif(btrim(coalesce(p_name,'')),'');v_source:='manual';
 END IF;
 v_phone:=public.crm_normalize_br_phone(v_phone);
 IF v_name IS NULL OR char_length(v_name)>100 THEN RAISE EXCEPTION 'crm_invalid_name' USING ERRCODE='22023'; END IF;
 INSERT INTO public.crm_customers(phone_e164,display_name)
 VALUES(v_phone,v_name)
 ON CONFLICT(phone_e164) DO UPDATE SET
  display_name=CASE WHEN crm_customers.display_name='Contato WhatsApp'
                    THEN EXCLUDED.display_name ELSE crm_customers.display_name END,
  updated_at=now()
 RETURNING id INTO v_customer;
 IF p_tintim_id IS NOT NULL THEN
  INSERT INTO public.crm_conversations(customer_id,tintim_conversation_id,source_label)
  VALUES(v_customer,p_tintim_id,left(v_source,160))
  ON CONFLICT(tintim_conversation_id) DO UPDATE
    SET updated_at=public.crm_conversations.updated_at
  RETURNING id INTO v_conversation;
 ELSE
  SELECT id INTO v_conversation FROM public.crm_conversations
  WHERE customer_id=v_customer AND status NOT IN ('converted','lost','closed')
  ORDER BY created_at DESC LIMIT 1;
  IF v_conversation IS NULL THEN
   INSERT INTO public.crm_conversations(customer_id,source_label) VALUES(v_customer,'manual')
   RETURNING id INTO v_conversation;
  END IF;
 END IF;
 INSERT INTO public.crm_events(conversation_id,event_type,event_origin,summary)
 VALUES(v_conversation,'opportunity_opened','admin','Contato selecionado; sem mensagem enviada');
 RETURN v_conversation;
END; $$;

CREATE FUNCTION public.crm_record_action(
 p_conversation_id uuid,p_action text,p_interest text DEFAULT NULL,
 p_due_minutes integer DEFAULT 45,p_evidence text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_conv public.crm_conversations%ROWTYPE;
        v_contact public.crm_customers%ROWTYPE;
        v_label text:=nullif(btrim(coalesce(p_interest,'')),'');
        v_evidence text:=nullif(btrim(coalesce(p_evidence,'')),'');
BEGIN
 PERFORM public.crm_require_staff();
 SELECT * INTO v_conv FROM public.crm_conversations WHERE id=p_conversation_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'crm_conversation_not_found' USING ERRCODE='22023'; END IF;
 SELECT * INTO v_contact FROM public.crm_customers WHERE id=v_conv.customer_id FOR UPDATE;
 IF p_action NOT IN ('waiting','replied','sent_manually','converted','lost','closed','opt_out','consent_granted','snooze') THEN
  RAISE EXCEPTION 'crm_invalid_action' USING ERRCODE='22023';
 END IF;
 IF v_label IS NOT NULL AND char_length(v_label)>80 THEN
  RAISE EXCEPTION 'crm_invalid_interest' USING ERRCODE='22023';
 END IF;
 IF p_action='consent_granted' THEN
  IF v_contact.commercial_opt_out THEN RAISE EXCEPTION 'crm_opt_out' USING ERRCODE='42501'; END IF;
  IF v_evidence IS NULL OR length(v_evidence)<8 OR length(v_evidence)>240 THEN
   RAISE EXCEPTION 'crm_consent_evidence_required' USING ERRCODE='22023';
  END IF;
  UPDATE public.crm_customers SET consent_status='granted',consent_evidence=v_evidence,consent_at=now(),
    updated_at=now() WHERE id=v_contact.id;
 ELSIF p_action='opt_out' THEN
  UPDATE public.crm_customers SET commercial_opt_out=true,opt_out_at=now(),consent_status='denied',
   updated_at=now() WHERE id=v_contact.id;
  UPDATE public.crm_follow_ups SET status='canceled',resolved_at=now(),resolution_reason='customer_opt_out'
   WHERE conversation_id IN (SELECT id FROM public.crm_conversations WHERE customer_id=v_contact.id)
   AND status='pending';
  UPDATE public.crm_conversations SET status='closed',updated_at=now()
   WHERE customer_id=v_contact.id AND status NOT IN ('converted','lost','closed');
 ELSIF p_action='waiting' THEN
  IF v_contact.commercial_opt_out OR v_conv.status IN ('converted','lost','closed') THEN
    RAISE EXCEPTION 'crm_not_eligible' USING ERRCODE='42501'; END IF;
  IF p_due_minutes NOT BETWEEN 15 AND 2880 THEN RAISE EXCEPTION 'crm_invalid_delay' USING ERRCODE='22023'; END IF;
  IF v_label IS NOT NULL THEN
   UPDATE public.crm_conversations SET interest_label=v_label,interest_basis='staff_confirmed'
   WHERE id=v_conv.id;
  END IF;
  UPDATE public.crm_follow_ups SET status='canceled',resolved_at=now(),resolution_reason='rescheduled'
   WHERE conversation_id=v_conv.id AND status='pending';
  INSERT INTO public.crm_follow_ups(conversation_id,due_at) VALUES(v_conv.id,now()+make_interval(mins=>p_due_minutes));
  UPDATE public.crm_conversations SET status='waiting_customer',last_outbound_at=now(),updated_at=now() WHERE id=v_conv.id;
 ELSIF p_action='snooze' THEN
  IF p_due_minutes NOT BETWEEN 15 AND 2880 OR v_contact.commercial_opt_out OR v_conv.status<>'waiting_customer' THEN
   RAISE EXCEPTION 'crm_not_eligible' USING ERRCODE='42501'; END IF;
  UPDATE public.crm_follow_ups SET due_at=now()+make_interval(mins=>p_due_minutes)
   WHERE conversation_id=v_conv.id AND status='pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'crm_follow_up_not_found' USING ERRCODE='22023'; END IF;
 ELSIF p_action='sent_manually' THEN
  IF v_contact.consent_status<>'granted' OR v_contact.commercial_opt_out
     OR v_conv.status<>'waiting_customer' THEN
   RAISE EXCEPTION 'crm_not_eligible' USING ERRCODE='42501'; END IF;
  UPDATE public.crm_follow_ups SET status='sent_manually',sent_at=now(),resolved_at=now(),
    resolution_reason='staff_confirmed_send'
   WHERE conversation_id=v_conv.id AND status='pending' AND due_at<=now();
  IF NOT FOUND THEN RAISE EXCEPTION 'crm_follow_up_not_due' USING ERRCODE='22023'; END IF;
  -- Confirmacao humana; a plataforma NAO comprova entrega.
  UPDATE public.crm_conversations SET last_outbound_at=now(),updated_at=now() WHERE id=v_conv.id;
 ELSE
  UPDATE public.crm_follow_ups SET status='canceled',resolved_at=now(),
   resolution_reason=CASE p_action WHEN 'replied' THEN 'customer_replied'
     WHEN 'converted' THEN 'manual_conversion' ELSE p_action END
   WHERE conversation_id=v_conv.id AND status='pending';
  UPDATE public.crm_conversations SET
   status=CASE p_action WHEN 'replied' THEN 'in_progress'
      WHEN 'converted' THEN 'converted' ELSE p_action END,
   last_inbound_at=CASE WHEN p_action='replied' THEN now() ELSE last_inbound_at END,
   converted_at=CASE WHEN p_action='converted' THEN now() ELSE converted_at END,
   conversion_basis=CASE WHEN p_action='converted' THEN 'manual' ELSE conversion_basis END,
   updated_at=now() WHERE id=v_conv.id;
 END IF;
 INSERT INTO public.crm_events(conversation_id,event_type,event_origin,summary)
 VALUES(v_conv.id,p_action,'admin',CASE WHEN p_action='consent_granted' THEN 'Aceite registrado com evidencia'
   WHEN p_action='converted' THEN 'Conversao manual; sem criar pedido ou faturamento'
   ELSE NULL END);
END; $$;

-- Principal medida anti-regressao: NENHUMA rotina desta migration envia WhatsApp,
-- gera Purchase, escreve em orders, ou acessa tokens de provedores.
REVOKE ALL ON FUNCTION public.crm_list_tintim_candidates(integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.crm_list_opportunities() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.crm_open_opportunity(uuid,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.crm_record_action(uuid,text,text,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_list_tintim_candidates(integer),
 public.crm_list_opportunities(),public.crm_open_opportunity(uuid,text,text),
 public.crm_record_action(uuid,text,text,integer,text) TO authenticated;
COMMIT;
