-- HOTFIX 25/10/2026: aceitar a pré-reserva SOMENTE após reserva real do estoque.
-- Orders AFTER INSERT ocorre antes dos itens; permanece a exclusão inicial da pré-reserva.
-- A alocação AFTER INSERT é o instante seguro: primeiro valida lote e estoque, depois
-- confirma pedido (NÃO pagamento), cria histórico e encaminha comanda idempotente.
-- Isolado a Chocolate com Morango, WhatsApp, somente 25/10 em America/Belem.
CREATE OR REPLACE FUNCTION public.lod_queue_strawberry_preorder_print_on_allocation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_order public.orders%rowtype;
  v_cutoff timestamptz;
  v_confirmed uuid;
BEGIN
  IF NEW.item_key <> 'slice_chocolate_morango'
    OR NEW.state <> 'reserved'
    OR NEW.quantity <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id=NEW.order_uuid;
  IF NOT FOUND
     OR v_order.created_at < '2026-10-25 00:00:00-03'::timestamptz
     OR v_order.created_at >= '2026-10-26 00:00:00-03'::timestamptz
     OR now() >= '2026-10-26 00:00:00-03'::timestamptz
     OR coalesce(v_order.notes,'') NOT LIKE 'PRÉ-RESERVA — Chocolate com Morango:%'
     OR v_order.sales_channel <> 'whatsapp'
     OR v_order.payment_method NOT IN ('manual_pix','cash','card_on_delivery')
     OR v_order.payment_status NOT IN ('paid','pending')
     OR v_order.order_status NOT IN ('new','confirmed','preparing','ready','ready_for_pickup','out_for_delivery')
  THEN
    RETURN NEW;
  END IF;

  SELECT c.accept_new_after INTO v_cutoff
  FROM public.kitchen_print_control c
  WHERE c.control_id=true AND c.enabled=true AND c.auto_mode_enabled=true
    AND c.auto_mode_started_at IS NOT NULL
    AND v_order.created_at >= c.auto_mode_started_at
    AND v_order.created_at >= c.accept_new_after;
  IF v_cutoff IS NULL OR NOT public.lod_kitchen_print_eligible(v_order) THEN
    RETURN NEW;
  END IF;

  -- Confirmação operacional, SEM implicar pagamento recebido.
  -- A condição new evita confirmação duplicada e funciona com concorrência.
  IF v_order.order_status='new' THEN
    UPDATE public.orders
    SET order_status='confirmed', confirmed_at=coalesce(confirmed_at,now())
    WHERE id=v_order.id AND order_status='new'
      AND payment_status IN ('pending','paid')
    RETURNING id INTO v_confirmed;
    IF v_confirmed IS NOT NULL THEN
      INSERT INTO public.order_status_history(
        order_uuid,previous_order_status,new_order_status,
        previous_payment_status,new_payment_status,source,changed_by
      ) VALUES(
        v_confirmed,'new','confirmed',
        v_order.payment_status,v_order.payment_status,'system',NULL
      );
    END IF;
  END IF;

  -- O UPDATE acima também dispara o gatilho normal da fila.
  -- Esta tentativa é fallback e NÃO cria duplicatas ou reimprime pedidos existentes.
  INSERT INTO public.print_jobs(order_uuid,job_key,kind)
  VALUES(v_order.id,'initial:'||v_order.order_id,'initial')
  ON CONFLICT(job_key) DO NOTHING;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.lod_queue_strawberry_preorder_print_on_allocation()
  FROM PUBLIC,anon,authenticated;
