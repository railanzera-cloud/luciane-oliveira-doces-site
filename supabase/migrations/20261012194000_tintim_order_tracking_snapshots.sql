-- Foto da atribuição no momento do pedido, sem copiar dados pessoais nem afirmar venda paga.
-- Os recibos de origem são a evidência: nunca consulta campanha mutável de tintim_conversations.
CREATE TABLE IF NOT EXISTS public.tintim_order_tracking_snapshots (
  order_uuid uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.tintim_conversations(id),
  source_label text,
  campaign_name text,
  campaign_id text,
  adset_name text,
  adset_id text,
  ad_name text,
  ad_id text,
  campaign_observed_at timestamptz,
  evidence_kind text NOT NULL CHECK (evidence_kind IN ('near_order','historical_conversation','no_campaign')),
  click_identifier_matches boolean NOT NULL DEFAULT false,
  sealed_at timestamptz NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tintim_order_tracking_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tintim_order_tracking_snapshots FROM anon,authenticated;
CREATE INDEX IF NOT EXISTS tintim_order_snapshots_evidence_idx
 ON public.tintim_order_tracking_snapshots(evidence_kind,captured_at DESC);

-- Executa apenas para pedidos que já possuem vínculo por número de pedido.
-- Retém a campanha mais recente observada até 2 minutos depois de criar o pedido.
-- Um evento anterior é classificado como "historical_conversation", mesmo se o fbclid coincidir.
CREATE OR REPLACE FUNCTION public.capture_tintim_order_tracking_snapshot(p_order_uuid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
 v record;
 v_evidence text;
BEGIN
 SELECT
   o.id AS order_uuid, o.created_at AS ordered_at, o.fbclid AS order_fbclid,
   l.conversation_id, c.account_key,c.external_lead_id,c.identity_basis,c.phone_digits,
   src.source_label,
   ad.campaign_name,ad.campaign_id,ad.adset_name,ad.adset_id,ad.ad_name,ad.ad_id,
   ad.observed_at AS campaign_observed_at,
   ad.campaign_fbclid
 INTO v
 FROM public.orders o
 JOIN public.tintim_order_links l ON l.order_uuid=o.id AND l.status IN ('candidate','confirmed')
 JOIN public.tintim_conversations c ON c.id=l.conversation_id
 LEFT JOIN LATERAL (
   SELECT NULLIF(r.summary->>'source','') AS source_label
   FROM public.tintim_webhook_receipts r
   WHERE r.account_key=c.account_key
     AND (r.lead_key=c.external_lead_id
       OR (c.identity_basis='phone_provisional' AND c.phone_digits IS NOT NULL AND r.summary->>'phone_digits'=c.phone_digits))
     AND r.event_type IN ('lead_source_update','lead_update','lead_create')
     AND r.observed_at <= o.created_at + interval '2 minutes'
     AND r.observed_at >= o.created_at - interval '90 days'
     AND NULLIF(r.summary->>'source','') IS NOT NULL
   ORDER BY r.observed_at DESC, r.received_at DESC LIMIT 1
 ) src ON true
 LEFT JOIN LATERAL (
   SELECT
     NULLIF(r.summary->>'campaign_name','') AS campaign_name,
     NULLIF(r.summary->>'campaign_id','') AS campaign_id,
     NULLIF(r.summary->>'adset_name','') AS adset_name,
     NULLIF(r.summary->>'adset_id','') AS adset_id,
     NULLIF(r.summary->>'ad_name','') AS ad_name,
     NULLIF(r.summary->>'ad_id','') AS ad_id,
     NULLIF(r.summary->'visit_parameters'->>'fbclid','') AS campaign_fbclid,
     r.observed_at
   FROM public.tintim_webhook_receipts r
   WHERE r.account_key=c.account_key
     AND (r.lead_key=c.external_lead_id
       OR (c.identity_basis='phone_provisional' AND c.phone_digits IS NOT NULL AND r.summary->>'phone_digits'=c.phone_digits))
     AND r.event_type IN ('lead_source_update','lead_update','lead_create')
     AND r.observed_at <= o.created_at + interval '2 minutes'
     AND r.observed_at >= o.created_at - interval '90 days'
     AND (NULLIF(r.summary->>'campaign_name','') IS NOT NULL OR NULLIF(r.summary->>'campaign_id','') IS NOT NULL)
   ORDER BY
     (r.observed_at BETWEEN o.created_at-interval '2 minutes' AND o.created_at+interval '2 minutes') DESC,
     r.observed_at DESC,r.received_at DESC
   LIMIT 1
 ) ad ON true
 WHERE o.id=p_order_uuid
 ORDER BY l.created_at DESC
 LIMIT 1;
 IF NOT FOUND THEN RETURN; END IF;
 v_evidence := CASE
   WHEN v.campaign_observed_at IS NULL THEN 'no_campaign'
   WHEN v.campaign_observed_at >= v.ordered_at-interval '2 minutes' THEN 'near_order'
   ELSE 'historical_conversation' END;

 INSERT INTO public.tintim_order_tracking_snapshots(
  order_uuid,conversation_id,source_label,campaign_name,campaign_id,
  adset_name,adset_id,ad_name,ad_id,campaign_observed_at,evidence_kind,
  click_identifier_matches,sealed_at
 ) VALUES (
   v.order_uuid,v.conversation_id,v.source_label,v.campaign_name,v.campaign_id,
   v.adset_name,v.adset_id,v.ad_name,v.ad_id,v.campaign_observed_at,v_evidence,
   NULLIF(v.order_fbclid,'') IS NOT NULL AND NULLIF(v.order_fbclid,'')=NULLIF(v.campaign_fbclid,''),
   v.ordered_at+interval '2 minutes'
 )
 ON CONFLICT(order_uuid) DO UPDATE SET
   source_label=COALESCE(EXCLUDED.source_label,tintim_order_tracking_snapshots.source_label),
   campaign_name=EXCLUDED.campaign_name,
   campaign_id=EXCLUDED.campaign_id,
   adset_name=EXCLUDED.adset_name,
   adset_id=EXCLUDED.adset_id,
   ad_name=EXCLUDED.ad_name,
   ad_id=EXCLUDED.ad_id,
   campaign_observed_at=EXCLUDED.campaign_observed_at,
   evidence_kind=EXCLUDED.evidence_kind,
   click_identifier_matches=EXCLUDED.click_identifier_matches
 WHERE tintim_order_tracking_snapshots.conversation_id=EXCLUDED.conversation_id
   AND clock_timestamp() < tintim_order_tracking_snapshots.sealed_at
   AND (
     (tintim_order_tracking_snapshots.evidence_kind='no_campaign' AND EXCLUDED.evidence_kind<>'no_campaign')
     OR (tintim_order_tracking_snapshots.evidence_kind='historical_conversation' AND EXCLUDED.evidence_kind='near_order')
     OR (tintim_order_tracking_snapshots.evidence_kind=EXCLUDED.evidence_kind
       AND EXCLUDED.campaign_observed_at > tintim_order_tracking_snapshots.campaign_observed_at)
   );
END;
$$;
REVOKE ALL ON FUNCTION public.capture_tintim_order_tracking_snapshot(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.capture_tintim_order_tracking_snapshot(uuid) TO service_role;

-- Event order: a source webhook might arrive milliseconds after a message webhook.
-- Upgrade a historical snapshot only within 2 minutes of the order's creation.
CREATE OR REPLACE FUNCTION public.tintim_snapshot_on_order_link()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.status IN ('candidate','confirmed') THEN
   PERFORM public.capture_tintim_order_tracking_snapshot(NEW.order_uuid);
 END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS tintim_snapshot_order_link_created ON public.tintim_order_links;
CREATE TRIGGER tintim_snapshot_order_link_created
 AFTER INSERT OR UPDATE OF conversation_id ON public.tintim_order_links
 FOR EACH ROW EXECUTE FUNCTION public.tintim_snapshot_on_order_link();

CREATE OR REPLACE FUNCTION public.tintim_snapshot_on_source_receipt()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_order_uuid uuid;
BEGIN
 IF NEW.event_type NOT IN ('lead_create','lead_update','lead_source_update')
    OR (NULLIF(NEW.summary->>'campaign_name','') IS NULL AND NULLIF(NEW.summary->>'campaign_id','') IS NULL) THEN
   RETURN NEW;
 END IF;
 FOR v_order_uuid IN
   SELECT o.id FROM public.orders o
   JOIN public.tintim_order_links l ON l.order_uuid=o.id AND l.status IN ('candidate','confirmed')
   JOIN public.tintim_conversations c ON c.id=l.conversation_id
   WHERE c.account_key=NEW.account_key
     AND (NEW.lead_key=c.external_lead_id OR (c.identity_basis='phone_provisional'
          AND c.phone_digits IS NOT NULL AND NEW.summary->>'phone_digits'=c.phone_digits))
     AND NEW.observed_at BETWEEN o.created_at-interval '2 minutes' AND o.created_at+interval '2 minutes'
     AND clock_timestamp() < o.created_at+interval '2 minutes'
 LOOP
   PERFORM public.capture_tintim_order_tracking_snapshot(v_order_uuid);
 END LOOP;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS tintim_snapshot_campaign_receipt ON public.tintim_webhook_receipts;
CREATE TRIGGER tintim_snapshot_campaign_receipt
 AFTER INSERT ON public.tintim_webhook_receipts
 FOR EACH ROW EXECUTE FUNCTION public.tintim_snapshot_on_source_receipt();

-- Reconstrução de pedidos anteriores usa estritamente eventos ocorridos perto/antes de cada pedido.
-- Não altera vendas, status, pedidos ou mensagens.
DO $$
DECLARE v_order_uuid uuid;
BEGIN
 FOR v_order_uuid IN SELECT DISTINCT order_uuid FROM public.tintim_order_links
   WHERE status IN ('candidate','confirmed') LOOP
   PERFORM public.capture_tintim_order_tracking_snapshot(v_order_uuid);
 END LOOP;
END $$;

-- Leitura do painel usa a foto imutável. Se o vínculo foi corrigido depois da captura,
-- não mostra uma foto de outra conversa como se fosse válida.
CREATE OR REPLACE FUNCTION public.admin_get_tintim_order_tracking_v3(p_order_uuids uuid[])
RETURNS TABLE(
  order_uuid uuid,match_status text,match_basis text,
  source_label text,campaign_name text,campaign_id text,
  ad_name text,ad_id text,adset_name text,last_observed_at timestamptz,
  provisional_identity boolean,click_identifier_matches boolean,
  campaign_evidence_kind text,campaign_observed_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,auth,pg_temp AS $$
BEGIN
 PERFORM public.lod_require_authenticated_staff();
 IF p_order_uuids IS NULL OR cardinality(p_order_uuids)>100 THEN
   RAISE EXCEPTION 'invalid_order_selection' USING ERRCODE='22023';
 END IF;
 RETURN QUERY
 SELECT o.id,l.status::text,l.match_basis::text,
  snap.source_label,snap.campaign_name,snap.campaign_id,
  snap.ad_name,snap.ad_id,snap.adset_name,snap.campaign_observed_at,
  (c.identity_basis='phone_provisional'),snap.click_identifier_matches,
  snap.evidence_kind,snap.campaign_observed_at
 FROM public.orders o
 JOIN public.tintim_order_links l ON l.order_uuid=o.id AND l.status IN ('candidate','confirmed')
 JOIN public.tintim_conversations c ON c.id=l.conversation_id
 JOIN public.tintim_order_tracking_snapshots snap ON snap.order_uuid=o.id AND snap.conversation_id=c.id
 WHERE o.id=ANY(p_order_uuids);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_get_tintim_order_tracking_v3(uuid[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_tintim_order_tracking_v3(uuid[]) TO authenticated;
