-- Complemento read-only da aba Resultados.
-- Base principal: pedidos CRIADOS no intervalo e agora CONCLUÍDOS + PAGOS.
-- Pedidos antigos concluídos no intervalo são separados, nunca somados ao total principal.
CREATE FUNCTION public.admin_get_sales_summary_v1(p_start_date date, p_end_date date)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=public,auth,pg_temp
AS $$
DECLARE
  v_now timestamptz := now();
  v_today date := (v_now AT TIME ZONE 'America/Belem')::date;
  v_start timestamptz;
  v_end timestamptz;
  v_result jsonb;
BEGIN
  PERFORM public.lod_require_authenticated_staff();
  IF p_start_date IS NULL OR p_end_date IS NULL
     OR p_start_date > p_end_date OR p_end_date > v_today
     OR p_end_date - p_start_date >= 3660 THEN
    RAISE EXCEPTION 'invalid_results_period' USING ERRCODE='22023';
  END IF;
  v_start := p_start_date::timestamp AT TIME ZONE 'America/Belem';
  v_end := (p_end_date + 1)::timestamp AT TIME ZONE 'America/Belem';

  WITH included AS (
    SELECT o.created_at, o.completed_at, o.total,
           o.order_status::text AS status,
           o.payment_status::text AS payment,
           (o.created_at >= v_start AND o.created_at < v_end AND o.created_at <= v_now) AS created_in_range,
           (o.created_at < v_start AND o.completed_at >= v_start AND o.completed_at < v_end AND o.completed_at <= v_now) AS previously_created_completed_in_range
    FROM public.orders o
    WHERE (o.created_at >= v_start AND o.created_at < v_end AND o.created_at <= v_now)
       OR (o.created_at < v_start AND o.completed_at >= v_start AND o.completed_at < v_end AND o.completed_at <= v_now)
  )
  SELECT jsonb_build_object(
    'period_start',p_start_date,
    'period_end',p_end_date,
    'generated_at',v_now,
    'scope','orders_registered_in_panel',
    'orders_created',count(*) FILTER (WHERE created_in_range),
    'completed_paid_orders',count(*) FILTER (WHERE created_in_range AND status='completed' AND payment='paid'),
    'completed_paid_amount',coalesce(sum(total) FILTER (WHERE created_in_range AND status='completed' AND payment='paid'),0),
    'completed_unpaid_orders',count(*) FILTER (WHERE created_in_range AND status='completed' AND payment<>'paid'),
    'completed_unpaid_amount',coalesce(sum(total) FILTER (WHERE created_in_range AND status='completed' AND payment<>'paid'),0),
    'paid_in_progress_orders',count(*) FILTER (WHERE created_in_range AND status NOT IN ('completed','cancelled') AND payment='paid'),
    'paid_in_progress_amount',coalesce(sum(total) FILTER (WHERE created_in_range AND status NOT IN ('completed','cancelled') AND payment='paid'),0),
    'previous_completed_paid_orders',count(*) FILTER (WHERE previously_created_completed_in_range AND status='completed' AND payment='paid'),
    'previous_completed_paid_amount',coalesce(sum(total) FILTER (WHERE previously_created_completed_in_range AND status='completed' AND payment='paid'),0)
  ) INTO v_result
  FROM included;

  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_get_sales_summary_v1(date,date) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_sales_summary_v1(date,date) TO authenticated;
