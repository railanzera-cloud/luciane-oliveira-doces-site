-- Observação passiva do Tintim: etapa da jornada e valor INFORMADO pelo webhook.
-- Não é ledger de vendas, nem prova de Pix recebido. NÃO cria Purchase, nem atualiza orders.
-- Mesmo contato pode comprar várias vezes; a mudança de etapa não identifica uma venda por pedido.
CREATE TABLE IF NOT EXISTS public.tintim_commercial_observations (
  receipt_id uuid PRIMARY KEY REFERENCES public.tintim_webhook_receipts(id) ON DELETE CASCADE,
  observed_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  stage_label text,
  stage_id text,
  reported_sale_amount numeric(12,2),
  reported_amount_source text NOT NULL CHECK (
    reported_amount_source IN ('none','manual_or_default','from_message','ambiguous_both_fields')
  ),
  review_status text NOT NULL DEFAULT 'unverified' CHECK (review_status='unverified'),
  CHECK (
    NULLIF(stage_label,'') IS NOT NULL
    OR reported_sale_amount IS NOT NULL
    OR reported_amount_source='ambiguous_both_fields'
  )
);
ALTER TABLE public.tintim_commercial_observations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tintim_commercial_observations FROM PUBLIC,anon,authenticated;
CREATE INDEX IF NOT EXISTS tintim_commercial_observations_time
 ON public.tintim_commercial_observations(observed_at DESC);

CREATE OR REPLACE FUNCTION public.tintim_capture_commercial_observation()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
 v_stage text;
 v_stage_id text;
 v_manual numeric(12,2);
 v_message numeric(12,2);
 v_value numeric(12,2);
 v_source text := 'none';
BEGIN
 IF NEW.event_type <> 'lead_update' THEN RETURN NEW; END IF;

 v_stage := left(NULLIF(trim(COALESCE(NEW.summary->>'stage','')),''),100);
 v_stage_id := left(NULLIF(trim(COALESCE(NEW.summary->>'stage_id','')),''),100);

 IF jsonb_typeof(NEW.summary->'sale_amount')='number'
    AND (NEW.summary->>'sale_amount')::numeric BETWEEN 0.01 AND 10000000 THEN
    v_manual := round((NEW.summary->>'sale_amount')::numeric,2);
 END IF;
 IF jsonb_typeof(NEW.summary->'sale_amount_from_message')='number'
    AND (NEW.summary->>'sale_amount_from_message')::numeric BETWEEN 0.01 AND 10000000 THEN
    v_message := round((NEW.summary->>'sale_amount_from_message')::numeric,2);
 END IF;

 IF v_manual IS NOT NULL AND v_message IS NOT NULL THEN
   v_source := 'ambiguous_both_fields';  -- Não decidir qual atualização do Tintim vale.
 ELSIF v_manual IS NOT NULL THEN
   v_source := 'manual_or_default'; v_value := v_manual;
 ELSIF v_message IS NOT NULL THEN
   v_source := 'from_message'; v_value := v_message;
 END IF;

 IF v_stage IS NULL AND v_value IS NULL AND v_source <> 'ambiguous_both_fields' THEN
   RETURN NEW;
 END IF;
 INSERT INTO public.tintim_commercial_observations(
    receipt_id,observed_at,stage_label,stage_id,
    reported_sale_amount,reported_amount_source
 )
 VALUES (NEW.id,NEW.observed_at,v_stage,v_stage_id,v_value,v_source)
 ON CONFLICT(receipt_id) DO NOTHING;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.tintim_capture_commercial_observation()
 FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS tintim_commercial_observation_on_receipt
 ON public.tintim_webhook_receipts;
CREATE TRIGGER tintim_commercial_observation_on_receipt
 AFTER INSERT ON public.tintim_webhook_receipts
 FOR EACH ROW EXECUTE FUNCTION public.tintim_capture_commercial_observation();

COMMENT ON TABLE public.tintim_commercial_observations IS
 'Sinais comerciais de lead_update; não são vendas confirmadas nem comprovantes de pagamento.';
