-- Painel de resultados: agregados de pedidos, pagamentos e evidência de campanhas.
-- Nenhuma mensagem, telefone, email, token, nome ou identificador de cliente é retornado.
-- Não altera pedido, pagamento, campanha, Tintim ou eventos da Meta.
CREATE OR REPLACE FUNCTION public.admin_get_results_overview(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path=public,auth,pg_temp
AS $$
DECLARE
  v_now timestamptz := now();
  v_start timestamptz;
  v_answer jsonb;
BEGIN
  PERFORM public.lod_require_authenticated_staff();
  IF p_days IS NULL OR p_days NOT IN (7,30,90) THEN
    RAISE EXCEPTION 'invalid_results_period' USING ERRCODE='22023';
  END IF;
  v_start := v_now - make_interval(days=>p_days);

  WITH base AS (
    SELECT
      o.id, o.created_at, o.total,
      o.payment_status::text payment_status,
      o.order_status::text order_status,
      o.sales_channel,
      COALESCE(s.evidence_kind,'no_link') AS evidence_kind,
      NULLIF(s.campaign_name,'') AS campaign_name,
      NULLIF(s.campaign_id,'') AS campaign_id,
      (o.payment_status::text='paid' AND o.order_status::text <> 'cancelled') AS valid_paid,
      (o.payment_status::text='pending' AND o.order_status::text <> 'cancelled') AS valid_pending,
      CASE
        WHEN lower(coalesce(o.attribution_snapshot #>> '{current_visit,parameters,utm_content,0}',''))='link_in_bio'
          AND lower(coalesce(o.attribution_snapshot #>> '{current_visit,parameters,utm_source,0}','')) IN ('ig','instagram')
          THEN 'Instagram (link da bio)'
        WHEN lower(coalesce(o.attribution_snapshot #>> '{current_visit,parameters,utm_source,0}','')) IN ('ig','instagram')
          THEN 'Instagram (origem da visita)'
        WHEN lower(coalesce(o.attribution_snapshot #>> '{current_visit,parameters,utm_source,0}','')) IN ('fb','facebook')
          THEN 'Facebook (origem da visita)'
        WHEN lower(coalesce(o.attribution_snapshot #>> '{current_visit,parameters,utm_source,0}',''))='google'
          THEN 'Google (origem da visita)'
        WHEN lower(coalesce(o.attribution_snapshot #>> '{current_visit,parameters,utm_content,0}',''))='link_in_bio'
          THEN 'Link da bio (plataforma não identificada)'
        WHEN coalesce(o.attribution_snapshot #>> '{current_visit,parameters,utm_source,0}','') <> ''
          THEN 'Outra origem identificada'
        ELSE 'Não identificada'
      END AS visit_source
    FROM public.orders o
    LEFT JOIN public.tintim_order_tracking_snapshots s ON s.order_uuid=o.id
    WHERE o.created_at >= v_start AND o.created_at <= v_now
  ),
  summary AS (
    SELECT
      count(*)::integer AS orders,
      count(*) FILTER(WHERE valid_paid)::integer AS paid_orders,
      coalesce(sum(total) FILTER(WHERE valid_paid),0)::numeric(14,2) AS paid_amount,
      count(*) FILTER(WHERE valid_pending)::integer AS pending_orders,
      coalesce(sum(total) FILTER(WHERE valid_pending),0)::numeric(14,2) AS pending_amount,
      count(*) FILTER(WHERE order_status='cancelled')::integer AS cancelled_orders,
      count(*) FILTER(WHERE order_status='cancelled' AND payment_status='paid')::integer AS paid_cancelled_orders,
      count(*) FILTER(WHERE evidence_kind='near_order' AND campaign_name IS NOT NULL)::integer AS near_campaign_orders,
      count(*) FILTER(WHERE evidence_kind='historical_conversation' AND campaign_name IS NOT NULL)::integer AS historical_campaign_orders,
      count(*) FILTER(WHERE evidence_kind='no_campaign')::integer AS linked_without_campaign,
      count(*) FILTER(WHERE evidence_kind='no_link')::integer AS without_tintim_link
    FROM base
  ),
  channel_group AS (
    SELECT sales_channel AS channel,count(*)::integer AS orders,
      count(*) FILTER(WHERE valid_paid)::integer AS paid_orders,
      coalesce(sum(total) FILTER(WHERE valid_paid),0)::numeric(14,2) AS paid_amount
    FROM base GROUP BY sales_channel
  ),
  evidence_group AS (
    SELECT evidence_kind AS kind,count(*)::integer AS orders,
      count(*) FILTER(WHERE valid_paid)::integer AS paid_orders,
      coalesce(sum(total) FILTER(WHERE valid_paid),0)::numeric(14,2) AS paid_amount
    FROM base GROUP BY evidence_kind
  ),
  source_group AS (
    SELECT visit_source AS source,count(*)::integer AS orders,
      count(*) FILTER(WHERE valid_paid)::integer AS paid_orders
    FROM base GROUP BY visit_source
  ),
  campaign_group AS (
    SELECT campaign_name, campaign_id, evidence_kind,
      count(*)::integer AS orders,
      count(*) FILTER(WHERE valid_paid)::integer AS paid_orders,
      coalesce(sum(total) FILTER(WHERE valid_paid),0)::numeric(14,2) AS paid_amount,
      count(*) FILTER(WHERE valid_pending)::integer AS pending_orders
    FROM base WHERE campaign_name IS NOT NULL
      AND evidence_kind IN ('near_order','historical_conversation')
    GROUP BY campaign_name,campaign_id,evidence_kind
  ),
  daily_group AS (
    SELECT to_char(created_at AT TIME ZONE 'America/Belem','YYYY-MM-DD') AS day,
      count(*)::integer AS orders,
      count(*) FILTER(WHERE valid_paid)::integer AS paid_orders
    FROM base GROUP BY 1
  )
  SELECT jsonb_build_object(
    'period_days',p_days,
    'generated_at',v_now,
    'summary',(SELECT to_jsonb(summary) FROM summary),
    'channels',(SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.orders DESC,c.channel),'[]'::jsonb) FROM channel_group c),
    'evidence',(SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY e.orders DESC,e.kind),'[]'::jsonb) FROM evidence_group e),
    'visits',(SELECT coalesce(jsonb_agg(to_jsonb(v) ORDER BY v.orders DESC,v.source),'[]'::jsonb) FROM source_group v),
    'campaigns',(SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.paid_amount DESC,c.orders DESC,c.campaign_name),'[]'::jsonb)
      FROM (SELECT * FROM campaign_group ORDER BY paid_amount DESC,orders DESC,campaign_name LIMIT 15) c),
    'daily',(SELECT coalesce(jsonb_agg(to_jsonb(d) ORDER BY d.day),'[]'::jsonb) FROM daily_group d)
  ) INTO v_answer;
  RETURN v_answer;
END
$$;
REVOKE ALL ON FUNCTION public.admin_get_results_overview(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_results_overview(integer) TO authenticated;
