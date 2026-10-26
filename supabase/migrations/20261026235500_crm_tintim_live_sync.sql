-- CRM comercial Luciane Oliveira Doces: importacao sem abrir o painel.
-- Dispara somente para eventos novos/atualizados recebidos pelo Tintim.
-- NAO agenda nem envia WhatsApp, nao modifica pedidos, pagamentos, Meta ou estoque.
BEGIN;

CREATE FUNCTION public.crm_ingest_tintim_on_change()
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

REVOKE ALL ON FUNCTION public.crm_ingest_tintim_on_change()
  FROM PUBLIC,anon,authenticated;

CREATE TRIGGER crm_tintim_live_sync
AFTER INSERT OR UPDATE OF
 phone_digits, contact_name, source_label, stage_label, last_observed_at
ON public.tintim_conversations
FOR EACH ROW EXECUTE FUNCTION public.crm_ingest_tintim_on_change();

COMMIT;
