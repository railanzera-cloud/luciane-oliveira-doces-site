-- LOD: sinal derivado de texto inbound; NÃO guarda corpo da mensagem.
-- Identifica MENÇÃO, não interesse confirmado, consentimento, pagamento ou venda.
BEGIN;
CREATE TABLE public.crm_tintim_product_hints (
  conversation_id uuid PRIMARY KEY REFERENCES public.crm_conversations(id) ON DELETE CASCADE,
  product_id text NOT NULL CHECK(product_id IN (
    'fatia-chocolate-morango','fatia-ninho-morango','fatia-prestigio',
    'fatia-chocolate-maracuja','fatia-chocolatudo',
    'fatia-coco-cremoso-morango','fatia-chocolate-cenoura'
  )),
  basis text NOT NULL DEFAULT 'customer_text_mention' CHECK(basis='customer_text_mention'),
  message_event_id uuid NOT NULL REFERENCES public.crm_tintim_message_events(id),
  last_seen_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_tintim_product_hints ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crm_tintim_product_hints FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.crm_record_tintim_product_mention(
 p_fingerprint text,p_product_id text,p_action text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE v_event record;v_done integer;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN
   RAISE EXCEPTION 'crm_provider_only' USING ERRCODE='42501';
 END IF;
 IF p_fingerprint !~ '^[0-9a-f]{64}$'
    OR p_action NOT IN ('set','clear')
    OR p_product_id NOT IN (
      'fatia-chocolate-morango','fatia-ninho-morango','fatia-prestigio',
      'fatia-chocolate-maracuja','fatia-chocolatudo',
      'fatia-coco-cremoso-morango','fatia-chocolate-cenoura')
 THEN RETURN jsonb_build_object('accepted',false,'reason','invalid_input'); END IF;

 -- O próprio evento must have passed the existing authenticated + deduped webhook,
 -- must be inbound and linked to an actual CRM conversation (observation-only denied).
 SELECT e.id,e.conversation_id,e.occurred_at INTO v_event
 FROM public.crm_tintim_message_events e
 WHERE e.fingerprint=p_fingerprint AND e.direction='inbound'
   AND e.conversation_id IS NOT NULL
   AND e.occurred_at BETWEEN now()-interval '24 hours' AND now()+interval '1 minute';
 IF NOT FOUND THEN
   RETURN jsonb_build_object('accepted',false,'reason','unverified_message');
 END IF;

 -- Não alterar interesse confirmado pela equipe nem estado do atendimento.
 IF p_action='clear' THEN
   DELETE FROM public.crm_tintim_product_hints h
   WHERE h.conversation_id=v_event.conversation_id
     AND h.product_id=p_product_id
     AND h.last_seen_at <= v_event.occurred_at;
   GET DIAGNOSTICS v_done=ROW_COUNT;
 ELSE
   INSERT INTO public.crm_tintim_product_hints(
     conversation_id,product_id,message_event_id,last_seen_at
   ) VALUES(v_event.conversation_id,p_product_id,v_event.id,v_event.occurred_at)
   ON CONFLICT(conversation_id) DO UPDATE
     SET product_id=excluded.product_id,
         message_event_id=excluded.message_event_id,
         last_seen_at=excluded.last_seen_at,updated_at=now()
     WHERE public.crm_tintim_product_hints.last_seen_at<=excluded.last_seen_at;
   GET DIAGNOSTICS v_done=ROW_COUNT;
 END IF;
 RETURN jsonb_build_object('accepted',true,'changed',v_done>0);
END; $fn$;
REVOKE ALL ON FUNCTION public.crm_record_tintim_product_mention(text,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_record_tintim_product_mention(text,text,text)
 TO service_role;

CREATE FUNCTION public.crm_list_tintim_product_hints()
RETURNS TABLE(conversation_id uuid,product_id text,basis text,last_seen_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
BEGIN
 PERFORM public.crm_require_staff();
 RETURN QUERY SELECT h.conversation_id,h.product_id,h.basis,h.last_seen_at
 FROM public.crm_tintim_product_hints h
 JOIN public.crm_conversations c ON c.id=h.conversation_id
 WHERE c.status NOT IN ('closed','lost','converted')
 ORDER BY h.last_seen_at DESC LIMIT 200;
END; $fn$;
REVOKE ALL ON FUNCTION public.crm_list_tintim_product_hints()
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_list_tintim_product_hints()
 TO authenticated;
COMMIT;
