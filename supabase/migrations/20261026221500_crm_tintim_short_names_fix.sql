-- Corrige nomes do Tintim curtos (ex.: emoji) sem criar dados falsos de contato.
-- Função isolada: nenhum trigger ou compra/checkout alterado.
BEGIN;
CREATE OR REPLACE FUNCTION public.crm_sync_recent_tintim(p_hours integer DEFAULT 72, p_limit integer DEFAULT 100)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE t record; v_phone text; v_name text; v_customer uuid; v_conversation uuid;
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
    v_name:=left(btrim(coalesce(t.contact_name,'')),100);
    IF char_length(v_name)<2 THEN v_name:='Contato WhatsApp'; END IF;
    INSERT INTO public.crm_customers(phone_e164,display_name)
    VALUES(v_phone,v_name)
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
COMMIT;
