-- Modo cozinha opt-in. Instalação NÃO ativa a automação; histórico/pagamento intocados.
-- Funciona somente com o notebook Windows e QZ Tray conectados no /admin.
ALTER TABLE public.kitchen_print_control
  ADD COLUMN IF NOT EXISTS auto_mode_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_mode_started_at timestamptz;

CREATE OR REPLACE FUNCTION public.admin_get_kitchen_auto_mode_v1()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth', 'pg_temp'
AS $$
BEGIN
  PERFORM public.lod_require_authenticated_staff();
  RETURN COALESCE((
    SELECT jsonb_build_object(
      'enabled', c.auto_mode_enabled,
      'started_at', c.auto_mode_started_at,
      'print_queue_enabled', c.enabled,
      'print_queue_cutoff', c.accept_new_after
    ) FROM public.kitchen_print_control c WHERE c.control_id = true
  ),jsonb_build_object('enabled',false,'print_queue_enabled',false));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_kitchen_auto_mode_v1(p_enabled boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','auth','pg_temp'
AS $$
DECLARE
  v_enabled boolean;
  v_print_enabled boolean;
  v_started timestamptz;
BEGIN
  PERFORM public.lod_require_authenticated_staff();
  IF p_enabled IS NULL THEN
    RAISE EXCEPTION 'invalid_kitchen_auto_mode' USING ERRCODE='22023';
  END IF;
  SELECT c.enabled INTO v_print_enabled
  FROM public.kitchen_print_control c WHERE c.control_id=true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'kitchen_print_control_missing' USING ERRCODE='P0002'; END IF;
  IF p_enabled AND NOT v_print_enabled THEN
    RAISE EXCEPTION 'kitchen_print_queue_paused' USING ERRCODE='22023';
  END IF;
  UPDATE public.kitchen_print_control c
  SET auto_mode_enabled = p_enabled,
      auto_mode_started_at = CASE
        WHEN NOT p_enabled THEN NULL
        WHEN NOT c.auto_mode_enabled THEN now()
        ELSE c.auto_mode_started_at
      END,
      updated_at=now()
  WHERE c.control_id=true
  RETURNING c.auto_mode_enabled,c.auto_mode_started_at INTO v_enabled,v_started;
  RETURN jsonb_build_object(
    'enabled',v_enabled,
    'started_at',v_started,
    'print_queue_enabled',v_print_enabled);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_kitchen_auto_mode_v1() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_set_kitchen_auto_mode_v1(boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_kitchen_auto_mode_v1() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_kitchen_auto_mode_v1(boolean) TO authenticated;

-- Preserva as condições originais; só soma o caso opt-in de WhatsApp ainda não pago.
CREATE OR REPLACE FUNCTION public.lod_kitchen_print_eligible(p_order public.orders)
RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public','pg_temp'
AS $$
  SELECT p_order.order_status IN ('new','confirmed','preparing','ready','ready_for_pickup','out_for_delivery')
    AND p_order.payment_status NOT IN ('failed','cancelled','refunded')
    AND public.lod_crocante_print_allocation_ready(p_order.id)
    AND (
      (p_order.sales_channel='site'
       AND p_order.payment_method IN ('mercado_pago_pix','mercado_pago_card')
       AND p_order.payment_status='paid')
      OR
      (p_order.sales_channel='whatsapp'
       AND p_order.payment_method='manual_pix'
       AND p_order.payment_status='paid'
       AND p_order.order_status IN ('confirmed','preparing','ready','ready_for_pickup','out_for_delivery'))
      OR
      (p_order.sales_channel='whatsapp'
       AND p_order.payment_method IN ('cash','card_on_delivery')
       AND p_order.order_status IN ('confirmed','preparing','ready','ready_for_pickup','out_for_delivery'))
      OR
      (p_order.sales_channel='whatsapp'
       AND p_order.payment_method IN ('manual_pix','cash','card_on_delivery')
       AND p_order.payment_status IN ('paid','pending')
       AND p_order.order_status IN ('confirmed','preparing','ready','ready_for_pickup','out_for_delivery')
       AND EXISTS (
         SELECT 1 FROM public.kitchen_print_control c
         WHERE c.control_id=true AND c.enabled=true AND c.auto_mode_enabled=true
           AND c.auto_mode_started_at IS NOT NULL
           AND p_order.created_at >= c.auto_mode_started_at
           AND p_order.created_at >= c.accept_new_after
       ))
    );
$$;
-- A função interna continua sem exposição para visitantes.
REVOKE ALL ON FUNCTION public.lod_kitchen_print_eligible(public.orders)
  FROM PUBLIC, anon, authenticated;

-- Aceita apenas pedidos WhatsApp novos, posteriores à ativação. NÃO altera payment_status/paid_at.
CREATE OR REPLACE FUNCTION public.lod_auto_accept_whatsapp_for_kitchen()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $$
BEGIN
  IF NEW.sales_channel <> 'whatsapp'
     OR NEW.order_status <> 'new'
     OR NEW.payment_status NOT IN ('paid','pending')
     OR NEW.payment_method NOT IN ('manual_pix','cash','card_on_delivery')
  THEN RETURN NULL; END IF;

  PERFORM 1 FROM public.kitchen_print_control c
  WHERE c.control_id=true AND c.enabled=true AND c.auto_mode_enabled=true
    AND c.auto_mode_started_at IS NOT NULL
    AND NEW.created_at >= c.auto_mode_started_at
    AND NEW.created_at >= c.accept_new_after;
  IF NOT FOUND THEN RETURN NULL; END IF;

  UPDATE public.orders
  SET order_status='confirmed', confirmed_at=COALESCE(confirmed_at, now())
  WHERE id=NEW.id AND order_status='new';
  IF FOUND THEN
    INSERT INTO public.order_status_history
      (order_uuid, previous_order_status, new_order_status,
       previous_payment_status, new_payment_status, source, changed_by)
    VALUES (NEW.id, 'new', 'confirmed', NEW.payment_status, NEW.payment_status, 'system', NULL);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS kitchen_auto_accept_whatsapp_on_insert ON public.orders;
CREATE TRIGGER kitchen_auto_accept_whatsapp_on_insert
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.lod_auto_accept_whatsapp_for_kitchen();
REVOKE ALL ON FUNCTION public.lod_auto_accept_whatsapp_for_kitchen() FROM PUBLIC,anon,authenticated;
