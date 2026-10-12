-- RPC de mensuração v2. Mantém v1 intacta para o painel já publicado.
-- Correspondência de fbclid é sinal de histórico rastreado, NÃO de clique nesta visita,
-- pagamento confirmado nem causalidade incremental.
CREATE OR REPLACE FUNCTION public.admin_get_tintim_order_tracking_v2(p_order_uuids uuid[])
RETURNS TABLE(
  order_uuid uuid,
  match_status text,
  match_basis text,
  source_label text,
  campaign_name text,
  campaign_id text,
  ad_name text,
  ad_id text,
  adset_name text,
  last_observed_at timestamptz,
  provisional_identity boolean,
  click_identifier_matches boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=public,auth,pg_temp
AS $$
BEGIN
  PERFORM public.lod_require_authenticated_staff();
  IF p_order_uuids IS NULL OR cardinality(p_order_uuids) > 100 THEN
    RAISE EXCEPTION 'invalid_order_selection' USING ERRCODE='22023';
  END IF;
  RETURN QUERY
  SELECT
    ord.id, link.status::text, link.match_basis::text,
    conv.source_label, conv.campaign_name, conv.campaign_id,
    conv.ad_name, conv.ad_id, conv.adset_name, conv.last_observed_at,
    conv.identity_basis='phone_provisional',
    NULLIF(ord.fbclid,'') IS NOT NULL
      AND NULLIF(conv.visit_parameters->>'fbclid','')=NULLIF(ord.fbclid,'')
  FROM public.orders ord
  JOIN public.tintim_order_links link ON link.order_uuid=ord.id
  JOIN public.tintim_conversations conv ON conv.id=link.conversation_id
  WHERE ord.id=ANY(p_order_uuids)
    AND link.status IN ('candidate','confirmed');
END
$$;
REVOKE ALL ON FUNCTION public.admin_get_tintim_order_tracking_v2(uuid[])
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_tintim_order_tracking_v2(uuid[]) TO authenticated;
