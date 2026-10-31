-- Pré-reserva reutilizável: Chocolate com Morango, produção 31/10/2026.
-- Migração prepara infraestrutura e NOVO lote com pré-reserva DESATIVADA.
-- Ativar b.enabled e menu_availability sold_out SOMENTE após publicar
-- o frontend de horário dinâmico e conferir a quantidade atual da fornada.
-- Corrige isolamento entre lotes sem apagar ou alterar reservas de 25/10.

ALTER TABLE public.slice_preorder_batches
  ADD COLUMN IF NOT EXISTS batch_id uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS started_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.slice_preorder_allocations
  ADD COLUMN IF NOT EXISTS batch_id uuid;

-- O pedido da nova fornada recebe o identificador do lote de HOJE.
-- Pedidos antigos permanecem com batch_id NULL (histórico preservado).
CREATE OR REPLACE FUNCTION public.lod_preorder_allocation_on_item()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','pg_temp'
AS $function$
DECLARE v public.slice_preorder_batches%rowtype;
BEGIN
 IF NEW.item_key <> 'slice_chocolate_morango' THEN RETURN NEW; END IF;
 SELECT * INTO v FROM public.slice_preorder_batches WHERE item_key=NEW.item_key FOR UPDATE;
 IF NOT FOUND OR NOT v.enabled OR now()>=v.expires_at THEN RETURN NEW; END IF;
 IF v.capacity-v.reserved_units-v.external_reserved_units<NEW.quantity THEN
   RAISE EXCEPTION USING errcode='23514',message='slice_preorder_full';
 END IF;
 INSERT INTO public.slice_preorder_allocations(order_uuid,item_key,quantity,batch_id)
 VALUES(NEW.order_uuid,NEW.item_key,NEW.quantity,v.batch_id)
 ON CONFLICT(order_uuid,item_key)
 DO UPDATE SET quantity=public.slice_preorder_allocations.quantity+excluded.quantity
 WHERE public.slice_preorder_allocations.batch_id=excluded.batch_id;
 IF NOT FOUND THEN
   RAISE EXCEPTION USING errcode='23514',message='preorder_batch_mismatch';
 END IF;
 UPDATE public.slice_preorder_batches SET reserved_units=reserved_units+NEW.quantity,updated_at=now()
 WHERE item_key=v.item_key AND batch_id=v.batch_id;
 RETURN NEW;
END; $function$;
REVOKE ALL ON FUNCTION public.lod_preorder_allocation_on_item() FROM PUBLIC,anon,authenticated;

-- Cancelamento de reserva antiga não devolve estoque para a fornada nova.
CREATE OR REPLACE FUNCTION public.lod_preorder_release_on_cancel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','pg_temp'
AS $function$
DECLARE v public.slice_preorder_allocations%rowtype;
DECLARE v_batch public.slice_preorder_batches%rowtype;
BEGIN
 IF NEW.order_status <> 'cancelled' OR OLD.order_status='cancelled' THEN RETURN NEW; END IF;
 FOR v IN SELECT * FROM public.slice_preorder_allocations
   WHERE order_uuid=NEW.id AND state='reserved' LOOP
   SELECT * INTO v_batch FROM public.slice_preorder_batches
     WHERE item_key=v.item_key FOR UPDATE;
   UPDATE public.slice_preorder_allocations
   SET state='released'
   WHERE order_uuid=v.order_uuid AND item_key=v.item_key AND state='reserved';
   IF FOUND AND v_batch.batch_id IS NOT DISTINCT FROM v.batch_id THEN
     UPDATE public.slice_preorder_batches
     SET reserved_units=greatest(0,reserved_units-v.quantity),updated_at=now()
     WHERE item_key=v.item_key AND batch_id=v.batch_id;
   END IF;
 END LOOP;
 RETURN NEW;
END; $function$;
REVOKE ALL ON FUNCTION public.lod_preorder_release_on_cancel() FROM PUBLIC,anon,authenticated;

-- Checkout continua idempotente, exige loja aberta e reserva validada.
-- Nota do pedido deriva de ready_at; não guarda '17h de 25/10' como texto fixo.
CREATE OR REPLACE FUNCTION public.create_whatsapp_store_order(
 p_order jsonb,p_items jsonb,p_availability_keys text[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','pg_temp'
AS $function$
DECLARE v_existing jsonb;v_open boolean;v_count integer;v_preorder jsonb;
v_preorder_qty integer;v_preorder_title text;
BEGIN
 IF p_order->>'sales_channel' IS DISTINCT FROM 'whatsapp'
 OR p_order->>'payment_method' NOT IN ('manual_pix','card_on_delivery','cash') THEN
  RAISE EXCEPTION USING errcode='22023',message='invalid_manual_order';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_order->>'order_id',0));
 v_existing:=public.recover_whatsapp_order(p_order->>'order_id',p_order->>'request_hash');
 IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;
 SELECT value INTO v_open FROM public.store_settings WHERE key='orders_open' FOR SHARE;
 IF v_open IS DISTINCT FROM true THEN
  RAISE EXCEPTION USING errcode='P0001',message='orders_closed';
 END IF;

 v_preorder:=public.public_slice_preorder();
 SELECT coalesce(sum((i->>'quantity')::integer),0)
 INTO v_preorder_qty FROM jsonb_array_elements(p_items) AS i
 WHERE i->>'item_key'='slice_chocolate_morango';

 IF v_preorder_qty>0 AND (v_preorder->>'active')::boolean IS TRUE THEN
   IF v_preorder_qty > (v_preorder->>'remaining')::integer THEN
     RAISE EXCEPTION USING errcode='23514',message='slice_preorder_full';
   END IF;
   v_preorder_title:='PRÉ-RESERVA — Chocolate com Morango: produção prevista por volta das '
     || to_char((v_preorder->>'ready_at')::timestamptz AT TIME ZONE 'America/Belem','HH24"h"MI')
     || ' de ' || to_char((v_preorder->>'ready_at')::timestamptz AT TIME ZONE 'America/Belem','DD/MM')
     || '. Entrega ou retirada somente após confirmação da loja.';
   p_order:=jsonb_set(p_order,'{notes}',
     to_jsonb(left(v_preorder_title||CASE WHEN nullif(btrim(p_order->>'notes'),'') IS NULL
       THEN '' ELSE E'\nObservação do cliente: '||btrim(p_order->>'notes') END,500)));
 END IF;
 PERFORM 1 FROM public.menu_availability WHERE item_key=any(p_availability_keys) FOR SHARE;
 SELECT count(*) INTO v_count FROM public.menu_availability
 WHERE item_key=any(p_availability_keys)
 AND (status='available'::public.item_status OR (
   item_key='slice_chocolate_morango'
   AND (v_preorder->>'active')::boolean IS TRUE
   AND v_preorder_qty>0
 ));
 IF coalesce(cardinality(p_availability_keys),0)=0 OR
    v_count<>cardinality(p_availability_keys) THEN
   RAISE EXCEPTION USING errcode='P0001',message='menu_changed';
 END IF;
 RETURN public.create_store_order(p_order,p_items);
END; $function$;
-- Preservar permissões já atribuídas à RPC pública.

-- Sem alterar a aceitação/impressão de pedidos normais ou de 25/10.
-- Novo fluxo de 31/10 exige reserva no lote correto; mesmo após o horário de
-- fechamento, jobs que foram criados validamente podem ser reclamados pelo QZ.
CREATE OR REPLACE FUNCTION public.lod_kitchen_print_eligible(p_order public.orders)
RETURNS boolean LANGUAGE sql STABLE SET search_path='public','pg_temp'
AS $function$
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
     -- Concessão histórica já aplicada aos pedidos de 25/10.
     p_order.created_at >= '2026-10-25 00:00:00-03'::timestamptz
     AND p_order.created_at < '2026-10-26 00:00:00-03'::timestamptz
     AND now() < '2026-10-26 00:00:00-03'::timestamptz
     AND coalesce(p_order.notes,'') LIKE 'PRÉ-RESERVA — Chocolate com Morango:%'
     AND p_order.sales_channel='whatsapp'
     AND p_order.payment_method IN ('manual_pix','cash','card_on_delivery')
     AND p_order.payment_status IN ('pending','paid')
     AND EXISTS (SELECT 1 FROM public.kitchen_print_control c
       WHERE c.control_id=true AND c.enabled=true AND c.auto_mode_enabled=true
         AND c.auto_mode_started_at IS NOT NULL
         AND p_order.created_at>=c.auto_mode_started_at
         AND p_order.created_at>=c.accept_new_after)
     AND EXISTS(SELECT 1 FROM public.slice_preorder_allocations a
       WHERE a.order_uuid=p_order.id AND a.item_key='slice_chocolate_morango'
         AND a.state='reserved' AND a.quantity>0)
   )
   OR (
     -- Nova produção: apenas a alocação vinculada ao lote atual pode imprimir.
     coalesce(p_order.notes,'') LIKE 'PRÉ-RESERVA — Chocolate com Morango:%'
     AND p_order.sales_channel='whatsapp'
     AND p_order.payment_method IN ('manual_pix','cash','card_on_delivery')
     AND p_order.payment_status IN ('pending','paid')
     AND EXISTS (
       SELECT 1 FROM public.slice_preorder_allocations a
       JOIN public.slice_preorder_batches b ON b.item_key=a.item_key
       WHERE a.order_uuid=p_order.id AND a.item_key='slice_chocolate_morango'
         AND a.state='reserved' AND a.quantity>0 AND a.batch_id=b.batch_id
         AND p_order.created_at >= b.started_at
         AND p_order.created_at < b.expires_at
         AND a.quantity=(SELECT coalesce(sum(i.quantity),0)::integer
           FROM public.order_items i WHERE i.order_uuid=p_order.id
             AND i.item_key='slice_chocolate_morango')
     )
     AND EXISTS (
       SELECT 1 FROM public.kitchen_print_control c
       WHERE c.control_id=true AND c.enabled=true AND c.auto_mode_enabled=true
         AND c.auto_mode_started_at IS NOT NULL
         AND p_order.created_at>=c.auto_mode_started_at
         AND p_order.created_at>=c.accept_new_after
     )
   )
 );
$function$;
REVOKE ALL ON FUNCTION public.lod_kitchen_print_eligible(public.orders) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.lod_queue_strawberry_preorder_print_on_allocation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_order public.orders%rowtype;
  v_batch public.slice_preorder_batches%rowtype;
  v_cutoff timestamptz;
  v_confirmed uuid;
BEGIN
  IF NEW.item_key<>'slice_chocolate_morango'
     OR NEW.state<>'reserved' OR NEW.quantity<=0 OR NEW.batch_id IS NULL
  THEN RETURN NEW; END IF;
  SELECT * INTO v_batch FROM public.slice_preorder_batches WHERE item_key=NEW.item_key;
  SELECT * INTO v_order FROM public.orders WHERE id=NEW.order_uuid;
  IF NOT FOUND OR v_batch.batch_id IS DISTINCT FROM NEW.batch_id
    OR v_order.created_at < v_batch.started_at OR v_order.created_at >= v_batch.expires_at
    OR coalesce(v_order.notes,'') NOT LIKE 'PRÉ-RESERVA — Chocolate com Morango:%'
    OR v_order.sales_channel <> 'whatsapp'
    OR v_order.payment_method NOT IN ('manual_pix','cash','card_on_delivery')
    OR v_order.payment_status NOT IN ('paid','pending')
    OR v_order.order_status NOT IN ('new','confirmed','preparing','ready','ready_for_pickup','out_for_delivery')
  THEN RETURN NEW; END IF;

  SELECT c.accept_new_after INTO v_cutoff FROM public.kitchen_print_control c
  WHERE c.control_id=true AND c.enabled=true AND c.auto_mode_enabled=true
    AND c.auto_mode_started_at IS NOT NULL
    AND v_order.created_at>=c.auto_mode_started_at
    AND v_order.created_at>=c.accept_new_after;
  IF v_cutoff IS NULL OR NOT public.lod_kitchen_print_eligible(v_order) THEN RETURN NEW; END IF;
  IF v_order.order_status='new' THEN
    UPDATE public.orders
    SET order_status='confirmed',confirmed_at=coalesce(confirmed_at,now())
    WHERE id=v_order.id AND order_status='new'
      AND payment_status IN ('pending','paid')
    RETURNING id INTO v_confirmed;
    IF v_confirmed IS NOT NULL THEN
      INSERT INTO public.order_status_history(
        order_uuid,previous_order_status,new_order_status,
        previous_payment_status,new_payment_status,source,changed_by)
      VALUES(v_confirmed,'new','confirmed',v_order.payment_status,v_order.payment_status,'system',NULL);
    END IF;
  END IF;
  INSERT INTO public.print_jobs(order_uuid,job_key,kind)
  VALUES(v_order.id,'initial:'||v_order.order_id,'initial')
  ON CONFLICT(job_key) DO NOTHING;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.lod_queue_strawberry_preorder_print_on_allocation()
  FROM PUBLIC,anon,authenticated;

-- Lote preparado para a nova produção; NÃO enfileira pedidos ou remove histórico.
-- Não há quantidade de fatias confirmada ainda: 0, desativado até confirmação.
UPDATE public.slice_preorder_batches
SET batch_id=gen_random_uuid(),started_at=now(),
    capacity=0,reserved_units=0,external_reserved_units=0,
    ready_at='2026-10-31 12:00:00-03'::timestamptz,
    expires_at='2026-10-31 23:59:00-03'::timestamptz,
    enabled=false,updated_at=now()
WHERE item_key='slice_chocolate_morango'
  AND enabled=false
  AND ready_at<'2026-10-31 00:00:00-03'::timestamptz;
