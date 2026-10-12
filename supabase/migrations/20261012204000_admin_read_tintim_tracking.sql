-- Leitura de associação de mensuração restrita a usuários autenticados do painel.
-- Apenas metadados de rastreamento; nunca devolve nome, telefone, texto de mensagem,
-- dados de pagamento ou tokens de rastreamento dos pedidos.
CREATE OR REPLACE FUNCTION public.admin_get_tintim_order_tracking(p_order_uuids uuid[])
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
  provisional_identity boolean
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
    ord.id,
    link.status::text,
    link.match_basis::text,
    conversation.source_label,
    conversation.campaign_name,
    conversation.campaign_id,
    conversation.ad_name,
    conversation.ad_id,
    conversation.adset_name,
    conversation.last_observed_at,
    conversation.identity_basis='phone_provisional'
  FROM public.orders ord
  JOIN public.tintim_order_links link ON link.order_uuid=ord.id
  JOIN public.tintim_conversations conversation ON conversation.id=link.conversation_id
  WHERE ord.id=ANY(p_order_uuids)
    AND link.status IN ('candidate','confirmed');
END
$$;
REVOKE ALL ON FUNCTION public.admin_get_tintim_order_tracking(uuid[])
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_tintim_order_tracking(uuid[]) TO authenticated;
