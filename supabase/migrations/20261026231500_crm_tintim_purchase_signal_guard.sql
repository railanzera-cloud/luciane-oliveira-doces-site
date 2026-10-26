-- Comercial Luciane Oliveira Doces: seguranca de sinais de compra do Tintim.
-- NAO marca pagamentos, nao altera pedidos nem registra receita. Somente bloqueia lembretes.
BEGIN;

CREATE OR REPLACE FUNCTION public.crm_list_tintim_signals()
RETURNS TABLE (
  conversation_id uuid,
  stage_label text,
  ad_name text,
  campaign_name text,
  last_observed_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=public,pg_temp AS $$
BEGIN
  PERFORM public.crm_require_staff();
  RETURN QUERY
    SELECT c.id,t.stage_label,t.ad_name,t.campaign_name,t.last_observed_at
    FROM public.crm_conversations c
    JOIN public.tintim_conversations t ON t.id=c.tintim_conversation_id
    ORDER BY t.last_observed_at DESC
    LIMIT 150;
END; $$;
REVOKE ALL ON FUNCTION public.crm_list_tintim_signals() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_list_tintim_signals() TO authenticated;

-- Mesmo que o operador clique por engano, bloquear criacao/adiamento do lembrete.
-- O estado 'Comprou' e um sinal de um sistema externo, NAO venda confirmada.
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
         ('comprou','convertido','venda realizada','vendido')
  ) THEN
    RAISE EXCEPTION 'crm_possible_purchase_review_required' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.crm_protect_purchase_signal_followup() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER crm_purchase_signal_before_followup
BEFORE INSERT OR UPDATE OF status,due_at ON public.crm_follow_ups
FOR EACH ROW EXECUTE FUNCTION public.crm_protect_purchase_signal_followup();

-- Quando o painel consultar oportunidades, suspender lembretes que passaram a
-- ter sinal de compra externo. Sem mudar status da conversa para 'converted'.
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
        ('comprou','convertido','venda realizada','vendido')
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
REVOKE ALL ON FUNCTION public.crm_hold_tintim_purchase_signals() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_hold_tintim_purchase_signals() TO authenticated;

COMMIT;
