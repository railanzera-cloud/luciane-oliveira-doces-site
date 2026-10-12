-- Vinculação somente candidata: mensagem padronizada do cliente -> pedido existente.
-- Não armazena texto da conversa nem altera pagamento/Purchase/atribuição histórica.
ALTER TABLE public.tintim_webhook_receipts
  DROP CONSTRAINT IF EXISTS tintim_webhook_receipts_event_type_check;
ALTER TABLE public.tintim_webhook_receipts
  ADD CONSTRAINT tintim_webhook_receipts_event_type_check
  CHECK (event_type IN ('lead_create','lead_update','lead_source_update','message_order_reference'));

CREATE UNIQUE INDEX IF NOT EXISTS tintim_one_active_conversation_per_order_idx
  ON public.tintim_order_links(order_uuid)
  WHERE status IN ('candidate','confirmed');

CREATE OR REPLACE FUNCTION public.record_tintim_order_reference(
  p_fingerprint text,
  p_account_key text,
  p_lead_key text,
  p_phone_digits text,
  p_order_number bigint,
  p_observed_at timestamptz
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
 v_order_uuid uuid;
 v_conversation_id uuid;
 v_existing_phone text;
 v_effective_key text:=NULLIF(trim(COALESCE(p_lead_key,'')),'');
 v_is_provisional boolean:=false;
 v_receipt_id uuid;
 v_existing_conversation uuid;
 v_link_id uuid;
BEGIN
 IF p_fingerprint !~ '^[0-9a-f]{64}$'
    OR length(p_account_key) NOT BETWEEN 1 AND 100
    OR p_phone_digits !~ '^[0-9]{10,15}$'
    OR p_order_number IS NULL OR p_order_number<=0 OR p_observed_at IS NULL
 THEN RAISE EXCEPTION 'invalid_order_reference_event' USING ERRCODE='22023'; END IF;

 IF v_effective_key IS NULL THEN
   v_effective_key:='phone:'||p_phone_digits;
   v_is_provisional:=true;
 ELSIF length(v_effective_key)>160 THEN
   RAISE EXCEPTION 'invalid_lead_reference' USING ERRCODE='22023';
 END IF;

 -- Limitar a mensagens relacionadas a um pedido efetivamente criado pouco antes.
 SELECT id INTO v_order_uuid FROM public.orders
 WHERE order_number=p_order_number
   AND created_at <= p_observed_at+interval '5 minutes'
   AND created_at >= p_observed_at-interval '30 days';

 IF v_order_uuid IS NULL THEN
   RETURN jsonb_build_object('accepted',true,'linked',false,'reason','order_not_found_or_outside_window');
 END IF;

 -- Serializa tentativas concorrentes para o mesmo pedido.
 PERFORM pg_advisory_xact_lock(hashtextextended(v_order_uuid::text, 0));

 SELECT id,phone_digits INTO v_conversation_id,v_existing_phone
 FROM public.tintim_conversations
 WHERE account_key=p_account_key AND external_lead_id=v_effective_key;
 IF v_conversation_id IS NOT NULL AND v_existing_phone IS NOT NULL
   AND v_existing_phone <> p_phone_digits THEN
   RETURN jsonb_build_object('accepted',true,'linked',false,'reason','phone_mismatch');
 END IF;

 -- Deduplica entregas do Tintim. Recibo contém somente o número do pedido.
 INSERT INTO public.tintim_webhook_receipts
  (fingerprint,account_key,lead_key,event_type,observed_at,summary)
 VALUES (p_fingerprint,p_account_key,v_effective_key,'message_order_reference',
         p_observed_at,jsonb_build_object('order_number',p_order_number))
 ON CONFLICT(fingerprint) DO NOTHING RETURNING id INTO v_receipt_id;
 IF v_receipt_id IS NULL THEN
   RETURN jsonb_build_object('accepted',true,'duplicate',true,'linked',false);
 END IF;

 IF v_conversation_id IS NULL THEN
   INSERT INTO public.tintim_conversations
     (account_key,external_lead_id,identity_basis,phone_digits,first_observed_at,last_observed_at)
   VALUES (p_account_key,v_effective_key,
          CASE WHEN v_is_provisional THEN 'phone_provisional' ELSE 'tintim_lead_id' END,
          p_phone_digits,p_observed_at,p_observed_at)
   ON CONFLICT(account_key,external_lead_id) DO NOTHING;
   SELECT id INTO v_conversation_id FROM public.tintim_conversations
   WHERE account_key=p_account_key AND external_lead_id=v_effective_key;
 END IF;

 SELECT conversation_id INTO v_existing_conversation
 FROM public.tintim_order_links
 WHERE order_uuid=v_order_uuid AND status IN ('candidate','confirmed');
 IF v_existing_conversation IS NOT NULL AND v_existing_conversation<>v_conversation_id THEN
   RETURN jsonb_build_object('accepted',true,'linked',false,'reason','different_conversation_already_linked');
 END IF;

 INSERT INTO public.tintim_order_links
   (order_uuid,conversation_id,match_basis,status)
 VALUES(v_order_uuid,v_conversation_id,'order_reference','candidate')
 ON CONFLICT DO NOTHING RETURNING id INTO v_link_id;
 RETURN jsonb_build_object('accepted',true,'duplicate',false,
   'linked',v_link_id IS NOT NULL,
   'status','candidate',
   'already_linked',v_link_id IS NULL);
END
$$;
REVOKE ALL ON FUNCTION public.record_tintim_order_reference(text,text,text,text,bigint,timestamptz)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_tintim_order_reference(text,text,text,text,bigint,timestamptz)
  TO service_role;
