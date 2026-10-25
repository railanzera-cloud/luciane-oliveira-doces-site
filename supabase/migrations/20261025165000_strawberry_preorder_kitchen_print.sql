-- 25/10/2026 somente: pré-reserva Chocolate com Morango pode emitir comanda
-- ao ser alocada, mesmo sem pagamento ou etapa de preparo.
-- Preserva regra normal da cozinha e NÃO altera order_status/payment_status/paid_at.
-- Apenas pedidos WhatsApp deste dia, com alocação reservada válida e modo cozinha
-- já autorizado. Não reimprime nem busca pedidos antigos automaticamente.
CREATE OR REPLACE FUNCTION public.lod_kitchen_print_eligible(p_order public.orders)
RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public','pg_temp'
AS $$
 SELECT
 p_order.order_status IN ('new','confirmed','preparing','ready','ready_for_pickup','out_for_delivery')
 AND p_order.payment_status NOT IN ('failed','cancelled','refunded')
 AND public.lod_crocante_print_allocation_ready(p_order.id)
 AND (
   (
     (coalesce(p_order.notes,'') NOT LIKE 'PRÉ-RESERVA — Chocolate com Morango:%'
       OR (now() >= '2026-10-25 17:00:00-03'::timestamptz
         AND p_order.order_status IN ('preparing','ready','ready_for_pickup','out_for_delivery')))
     AND (
       (p_order.sales_channel='site'
         AND p_order.payment_method IN ('mercado_pago_pix','mercado_pago_card')
         AND p_order.payment_status='paid')
       OR (p_order.sales_channel='whatsapp' AND p_order.payment_method='manual_pix'
         AND p_order.payment_status='paid'
         AND p_order.order_status IN ('confirmed','preparing','ready','ready_for_pickup','out_for_delivery'))
       OR (p_order.sales_channel='whatsapp' AND p_order.payment_method IN ('cash','card_on_delivery')
         AND p_order.order_status IN ('confirmed','preparing','ready','ready_for_pickup','out_for_delivery'))
       OR (p_order.sales_channel='whatsapp' AND p_order.payment_method IN ('manual_pix','cash','card_on_delivery')
         AND p_order.payment_status IN ('paid','pending')
         AND p_order.order_status IN ('confirmed','preparing','ready','ready_for_pickup','out_for_delivery')
         AND EXISTS (
           SELECT 1 FROM public.kitchen_print_control c
           WHERE c.control_id=true AND c.enabled=true AND c.auto_mode_enabled=true
             AND c.auto_mode_started_at IS NOT NULL
             AND p_order.created_at>=c.auto_mode_started_at
             AND p_order.created_at>=c.accept_new_after
         ))
     )
   )
   OR (
     -- Exceção pontual para reservas de HOJE, sem exigir preparo nem pagamento.
     p_order.created_at >= '2026-10-25 00:00:00-03'::timestamptz
     AND p_order.created_at < '2026-10-26 00:00:00-03'::timestamptz
     AND now() < '2026-10-26 00:00:00-03'::timestamptz
     AND coalesce(p_order.notes,'') LIKE 'PRÉ-RESERVA — Chocolate com Morango:%'
     AND p_order.sales_channel='whatsapp'
     AND p_order.payment_method IN ('manual_pix','cash','card_on_delivery')
     AND p_order.payment_status IN ('pending','paid')
     AND EXISTS (
       SELECT 1 FROM public.kitchen_print_control c
       WHERE c.control_id=true AND c.enabled=true AND c.auto_mode_enabled=true
         AND c.auto_mode_started_at IS NOT NULL
         AND p_order.created_at>=c.auto_mode_started_at
         AND p_order.created_at>=c.accept_new_after
     )
     AND EXISTS (
       SELECT 1 FROM public.slice_preorder_allocations a
       WHERE a.order_uuid=p_order.id AND a.item_key='slice_chocolate_morango'
         AND a.state='reserved' AND a.quantity>0
         AND a.quantity=(
           SELECT coalesce(sum(i.quantity),0)::integer FROM public.order_items i
           WHERE i.order_uuid=p_order.id AND i.item_key='slice_chocolate_morango'
         )
     )
   )
 );
$$;
REVOKE ALL ON FUNCTION public.lod_kitchen_print_eligible(public.orders)
  FROM PUBLIC,anon,authenticated;

-- O trigger original de orders dispara ANTES da criação dos order_items.
-- Enfileirar a comanda quando a reserva estiver efetivamente alocada evita
-- comprovante sem itens e mantém o job único por pedido (job_key existente).
CREATE OR REPLACE FUNCTION public.lod_queue_strawberry_preorder_print_on_allocation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $$
DECLARE
 v_order public.orders%rowtype;
 v_cutoff timestamptz;
BEGIN
 IF NEW.item_key <> 'slice_chocolate_morango' OR NEW.state <> 'reserved' THEN RETURN NEW; END IF;
 SELECT * INTO v_order FROM public.orders WHERE id=NEW.order_uuid;
 IF NOT FOUND OR NOT public.lod_kitchen_print_eligible(v_order) THEN RETURN NEW; END IF;
 SELECT c.accept_new_after INTO v_cutoff
 FROM public.kitchen_print_control c WHERE c.control_id=true AND c.enabled=true;
 IF v_cutoff IS NULL OR v_order.created_at < v_cutoff THEN RETURN NEW; END IF;
 INSERT INTO public.print_jobs(order_uuid,job_key,kind)
 VALUES(v_order.id,'initial:'||v_order.order_id,'initial')
 ON CONFLICT(job_key) DO NOTHING;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.lod_queue_strawberry_preorder_print_on_allocation()
  FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS trg_lod_strawberry_preorder_print ON public.slice_preorder_allocations;
CREATE TRIGGER trg_lod_strawberry_preorder_print
AFTER INSERT ON public.slice_preorder_allocations
FOR EACH ROW EXECUTE FUNCTION public.lod_queue_strawberry_preorder_print_on_allocation();
