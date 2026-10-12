-- Versão 2 do relatório: cobertura real dos sinais disponíveis no Supabase.
-- Mantém RPC anterior intacta até homologação do novo painel.
-- Origem não identificada nunca é definida como orgânica.
-- Nenhum corpo de mensagem, telefone, identidade, token ou clique é retornado.
CREATE OR REPLACE FUNCTION public.admin_get_results_overview_v2(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=public,auth,pg_temp
AS $$
DECLARE
  v_now timestamptz := now();
  v_start timestamptz;
  v_result jsonb;
BEGIN
  PERFORM public.lod_require_authenticated_staff();
  IF p_days IS NULL OR p_days NOT IN (7,30,90) THEN
    RAISE EXCEPTION 'invalid_results_period' USING ERRCODE='22023';
  END IF;
  v_start := v_now - make_interval(days => p_days);

  WITH base AS (
    SELECT
      o.id, o.created_at,o.total,
      o.payment_status::text AS payment_status,
      o.order_status::text AS order_status,
      o.sales_channel,
      s.evidence_kind AS tintim_evidence,
      NULLIF(s.campaign_name,'') AS tintim_campaign,
      NULLIF(s.campaign_id,'') AS tintim_campaign_id,
      NULLIF(o.utm_campaign,'') AS saved_utm_campaign,
      (o.payment_status::text='paid' AND o.order_status::text <> 'cancelled') AS paid_in_site,
      (o.payment_status::text='pending' AND o.order_status::text <> 'cancelled') AS no_site_payment_confirmation,
      (lower(coalesce(o.attribution_snapshot #>> '{current_visit,parameters,utm_content,0}',''))='link_in_bio') AS from_bio,
      (NULLIF(o.fbclid,'') IS NOT NULL) AS has_fbclid,
      (NULLIF(o.tintim_fbid,'') IS NOT NULL) AS has_tintim_fbid,
      CASE
        WHEN NULLIF(s.campaign_name,'') IS NOT NULL
          AND s.evidence_kind IN ('near_order','historical_conversation')
          THEN 'tintim_campaign'
        WHEN NULLIF(o.utm_campaign,'') IS NOT NULL
          THEN 'saved_utm_campaign'
        WHEN NULLIF(o.fbclid,'') IS NOT NULL OR NULLIF(o.tintim_fbid,'') IS NOT NULL
          THEN 'meta_link_identifier'
        WHEN lower(coalesce(o.attribution_snapshot #>> '{current_visit,parameters,utm_content,0}',''))='link_in_bio'
          THEN 'bio_without_campaign_or_click_id'
        ELSE 'unclassified'
      END AS diagnostic_kind,
      CASE
        WHEN lower(coalesce(o.attribution_snapshot #>> '{current_visit,parameters,utm_content,0}',''))='link_in_bio'
             AND lower(coalesce(o.attribution_snapshot #>> '{current_visit,parameters,utm_source,0}','')) IN ('ig','instagram')
          THEN 'Instagram (link da bio)'
        WHEN lower(coalesce(o.attribution_snapshot #>> '{current_visit,parameters,utm_source,0}','')) IN ('ig','instagram')
          THEN 'Instagram (visita)'
        WHEN lower(coalesce(o.attribution_snapshot #>> '{current_visit,parameters,utm_source,0}','')) IN ('fb','facebook')
          THEN 'Facebook (visita)'
        WHEN lower(coalesce(o.attribution_snapshot #>> '{current_visit,parameters,utm_source,0}',''))='google'
          THEN 'Google (visita)'
        WHEN lower(coalesce(o.attribution_snapshot #>> '{current_visit,parameters,utm_content,0}',''))='link_in_bio'
          THEN 'Link da bio (plataforma não identificada)'
        WHEN nullif(o.attribution_snapshot #>> '{current_visit,parameters,utm_source,0}','') IS NOT NULL
          THEN 'Outra origem informada no link'
        ELSE 'Origem da visita não identificada'
      END AS visit_source
    FROM public.orders o
    LEFT JOIN public.tintim_order_tracking_snapshots s ON s.order_uuid=o.id
    WHERE o.created_at >= v_start AND o.created_at <= v_now
  ),
  totals AS (
    SELECT
      count(*)::integer AS orders,
      count(*) FILTER(WHERE paid_in_site)::integer AS paid_orders,
      coalesce(sum(total) FILTER(WHERE paid_in_site),0)::numeric(14,2) AS paid_amount,
      count(*) FILTER(WHERE no_site_payment_confirmation)::integer AS pending_orders,
      coalesce(sum(total) FILTER(WHERE no_site_payment_confirmation),0)::numeric(14,2) AS pending_amount,
      count(*) FILTER(WHERE order_status='cancelled')::integer AS cancelled_orders,
      count(*) FILTER(WHERE order_status='cancelled' AND payment_status='paid')::integer AS paid_cancelled_orders,
      count(*) FILTER(WHERE tintim_evidence='near_order' AND tintim_campaign IS NOT NULL)::integer AS near_campaign_orders,
      count(*) FILTER(WHERE tintim_evidence='historical_conversation' AND tintim_campaign IS NOT NULL)::integer AS historical_campaign_orders,
      count(*) FILTER(WHERE tintim_evidence='no_campaign')::integer AS linked_without_campaign,
      count(*) FILTER(WHERE tintim_evidence IS NULL)::integer AS without_tintim_link,
      count(*) FILTER(WHERE tintim_evidence IS NOT NULL)::integer AS tintim_linked_orders,
      count(*) FILTER(WHERE diagnostic_kind IN ('tintim_campaign','saved_utm_campaign','meta_link_identifier'))::integer AS orders_with_campaign_or_meta_signal,
      count(*) FILTER(WHERE diagnostic_kind='unclassified')::integer AS unclassified_orders,
      count(*) FILTER(WHERE from_bio)::integer AS bio_orders,
      count(*) FILTER(WHERE from_bio AND has_fbclid)::integer AS bio_with_fbclid,
      count(*) FILTER(WHERE has_fbclid)::integer AS orders_with_fbclid,
      count(*) FILTER(WHERE diagnostic_kind='tintim_campaign')::integer AS with_tintim_campaign,
      count(*) FILTER(WHERE diagnostic_kind='saved_utm_campaign')::integer AS with_saved_utm_campaign,
      count(*) FILTER(WHERE diagnostic_kind='meta_link_identifier')::integer AS with_meta_link_id
    FROM base
  ),
  diagnostic AS (
    SELECT diagnostic_kind AS kind,
      count(*)::integer AS orders,
      count(*) FILTER(WHERE paid_in_site)::integer AS marked_paid_on_site,
      count(*) FILTER(WHERE from_bio)::integer AS bio_orders
    FROM base GROUP BY diagnostic_kind
  ),
  channel_group AS (
    SELECT sales_channel AS channel, count(*)::integer AS orders,
      count(*) FILTER(WHERE paid_in_site)::integer AS paid_orders,
      coalesce(sum(total) FILTER(WHERE paid_in_site),0)::numeric(14,2) AS paid_amount
    FROM base GROUP BY sales_channel
  ),
  visit_group AS (
    SELECT visit_source AS source,count(*)::integer AS orders,
      count(*) FILTER(WHERE paid_in_site)::integer AS paid_orders
    FROM base GROUP BY visit_source
  ),
  tintim_group AS (
    SELECT tintim_campaign AS campaign_name, tintim_campaign_id AS campaign_id,
      tintim_evidence AS evidence_kind, count(*)::integer AS orders,
      count(*) FILTER(WHERE paid_in_site)::integer AS paid_orders,
      coalesce(sum(total) FILTER(WHERE paid_in_site),0)::numeric(14,2) AS paid_amount,
      count(*) FILTER(WHERE no_site_payment_confirmation)::integer AS pending_orders
    FROM base
    WHERE diagnostic_kind='tintim_campaign'
    GROUP BY tintim_campaign,tintim_campaign_id,tintim_evidence
  ),
  utm_group AS (
    SELECT saved_utm_campaign AS campaign_name,count(*)::integer AS orders,
      count(*) FILTER(WHERE paid_in_site)::integer AS marked_paid_on_site
    FROM base WHERE diagnostic_kind='saved_utm_campaign'
    GROUP BY saved_utm_campaign
  ),
  daily_group AS (
    SELECT to_char(created_at AT TIME ZONE 'America/Belem','YYYY-MM-DD') AS day,
      count(*)::integer AS orders,
      count(*) FILTER(WHERE paid_in_site)::integer AS paid_orders
    FROM base GROUP BY 1
  )
  SELECT jsonb_build_object(
    'period_days',p_days,
    'generated_at',v_now,
    'data_scope','orders_created_in_supabase_only',
    'sales_coverage','incomplete_tintim_confirmations_not_synced',
    'summary',(SELECT to_jsonb(t) FROM totals t),
    'tracking_evidence',(SELECT coalesce(jsonb_agg(to_jsonb(d) ORDER BY d.orders DESC,d.kind),'[]'::jsonb) FROM diagnostic d),
    'channels',(SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.orders DESC,c.channel),'[]'::jsonb) FROM channel_group c),
    'visits',(SELECT coalesce(jsonb_agg(to_jsonb(v) ORDER BY v.orders DESC,v.source),'[]'::jsonb) FROM visit_group v),
    'campaigns',(SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.orders DESC,c.campaign_name),'[]'::jsonb) FROM (SELECT * FROM tintim_group ORDER BY orders DESC,campaign_name LIMIT 15) c),
    'utm_campaigns',(SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.orders DESC,c.campaign_name),'[]'::jsonb) FROM (SELECT * FROM utm_group ORDER BY orders DESC,campaign_name LIMIT 12) c),
    'daily',(SELECT coalesce(jsonb_agg(to_jsonb(d) ORDER BY d.day),'[]'::jsonb) FROM daily_group d)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_get_results_overview_v2(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_results_overview_v2(integer) TO authenticated;
