-- Pré-reservas temporárias 25/10/2026 - apenas Chocolate com Morango.
-- Não reabre loja, não cria pagamentos e não libera impressão antecipada.
CREATE TABLE IF NOT EXISTS public.slice_preorder_batches (
 item_key text PRIMARY KEY,
 capacity integer NOT NULL CHECK(capacity>=0),
 reserved_units integer NOT NULL DEFAULT 0 CHECK(reserved_units>=0),
 ready_at timestamptz NOT NULL,
 expires_at timestamptz NOT NULL,
 enabled boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT preorder_count_valid CHECK(reserved_units<=capacity),
 CONSTRAINT preorder_window_valid CHECK(expires_at>ready_at)
);
ALTER TABLE public.slice_preorder_batches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.slice_preorder_batches FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS public.slice_preorder_allocations (
 order_uuid uuid NOT NULL REFERENCES public.orders(id),
 item_key text NOT NULL REFERENCES public.slice_preorder_batches(item_key),
 quantity integer NOT NULL CHECK(quantity>0),
 state text NOT NULL DEFAULT 'reserved' CHECK(state IN ('reserved','released')),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(order_uuid,item_key)
);
ALTER TABLE public.slice_preorder_allocations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.slice_preorder_allocations FROM PUBLIC, anon, authenticated;

-- Serviço público retorna apenas quantidade e previsão. Não revela pedidos.
CREATE OR REPLACE FUNCTION public.public_slice_preorder()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='public','pg_temp'
AS $$
 SELECT COALESCE((
 SELECT jsonb_build_object(
  'active',b.enabled AND now()<b.expires_at AND m.status='sold_out'::public.item_status,
  'item_key',b.item_key,
  'remaining',greatest(0,b.capacity-b.reserved_units),
  'ready_at',b.ready_at
 ) FROM public.slice_preorder_batches b
 JOIN public.menu_availability m ON m.item_key=b.item_key
 WHERE b.item_key='slice_chocolate_morango'), '{"active":false,"remaining":0}'::jsonb);
$$;
REVOKE ALL ON FUNCTION public.public_slice_preorder() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_slice_preorder() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.lod_preorder_allocation_on_item()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','pg_temp'
AS $$
DECLARE v public.slice_preorder_batches%rowtype;
BEGIN
 IF NEW.item_key<>'slice_chocolate_morango' THEN RETURN NEW; END IF;
 SELECT * INTO v FROM public.slice_preorder_batches
   WHERE item_key=NEW.item_key FOR UPDATE;
 IF NOT FOUND OR NOT v.enabled OR now()>=v.expires_at THEN RETURN NEW; END IF;
 IF v.capacity-v.reserved_units<NEW.quantity THEN
  RAISE EXCEPTION USING errcode='23514',message='slice_preorder_full';
 END IF;
 INSERT INTO public.slice_preorder_allocations(order_uuid,item_key,quantity)
 VALUES(NEW.order_uuid,NEW.item_key,NEW.quantity)
 ON CONFLICT(order_uuid,item_key) DO UPDATE SET quantity=public.slice_preorder_allocations.quantity+excluded.quantity;
 UPDATE public.slice_preorder_batches SET reserved_units=reserved_units+NEW.quantity,updated_at=now()
 WHERE item_key=NEW.item_key;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.lod_preorder_allocation_on_item() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS trg_lod_slice_preorder_item ON public.order_items;
CREATE TRIGGER trg_lod_slice_preorder_item AFTER INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.lod_preorder_allocation_on_item();

CREATE OR REPLACE FUNCTION public.lod_preorder_release_on_cancel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','pg_temp'
AS $$
DECLARE v public.slice_preorder_allocations%rowtype;
BEGIN
 IF NEW.order_status <> 'cancelled' OR OLD.order_status='cancelled' THEN RETURN NEW; END IF;
 FOR v IN SELECT * FROM public.slice_preorder_allocations WHERE order_uuid=NEW.id AND state='reserved' LOOP
   PERFORM 1 FROM public.slice_preorder_batches WHERE item_key=v.item_key FOR UPDATE;
   UPDATE public.slice_preorder_allocations SET state='released'
   WHERE order_uuid=v.order_uuid AND item_key=v.item_key AND state='reserved';
   IF FOUND THEN
      UPDATE public.slice_preorder_batches
      SET reserved_units=greatest(0,reserved_units-v.quantity),updated_at=now()
      WHERE item_key=v.item_key;
   END IF;
 END LOOP;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.lod_preorder_release_on_cancel() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS trg_lod_slice_preorder_cancel ON public.orders;
CREATE TRIGGER trg_lod_slice_preorder_cancel AFTER UPDATE OF order_status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.lod_preorder_release_on_cancel();

-- A RPC de pedidos mantém idempotência e todas as validações atuais. Somente
-- o Chocolate com Morango sold_out é permitido se a pré-reserva está ativa.
CREATE OR REPLACE FUNCTION public.create_whatsapp_store_order(
 p_order jsonb,p_items jsonb,p_availability_keys text[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','pg_temp'
AS $$
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

 -- Item esgotado só pode ser vendido com capacidade reservada e aviso formal.
 IF v_preorder_qty>0 AND (v_preorder->>'active')::boolean IS TRUE THEN
   IF v_preorder_qty > (v_preorder->>'remaining')::integer THEN
     RAISE EXCEPTION USING errcode='23514',message='slice_preorder_full';
   END IF;
   v_preorder_title:='PRÉ-RESERVA — Chocolate com Morango: produção prevista por volta das 17h de 25/10. Entrega ou retirada somente após confirmação da loja.';
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
END; $$;

-- Reserva é registrada para atendimento, mas não vai para impressão automática.
CREATE OR REPLACE FUNCTION public.lod_auto_accept_whatsapp_for_kitchen()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','pg_temp'
AS $$
BEGIN
 IF NEW.notes LIKE 'PRÉ-RESERVA — Chocolate com Morango:%' THEN RETURN NULL; END IF;
 IF NEW.sales_channel<>'whatsapp'
 OR NEW.order_status<>'new'
 OR NEW.payment_status NOT IN ('paid','pending')
 OR NEW.payment_method NOT IN ('manual_pix','cash','card_on_delivery') THEN RETURN NULL; END IF;
 PERFORM 1 FROM public.kitchen_print_control c
 WHERE c.control_id=true AND c.enabled=true AND c.auto_mode_enabled=true
 AND c.auto_mode_started_at IS NOT NULL
 AND NEW.created_at>=c.auto_mode_started_at AND NEW.created_at>=c.accept_new_after;
 IF NOT FOUND THEN RETURN NULL; END IF;
 UPDATE public.orders SET order_status='confirmed',confirmed_at=coalesce(confirmed_at,now())
 WHERE id=NEW.id AND order_status='new';
 IF FOUND THEN
 INSERT INTO public.order_status_history(order_uuid,previous_order_status,new_order_status,
 previous_payment_status,new_payment_status,source,changed_by)
 VALUES(NEW.id,'new','confirmed',NEW.payment_status,NEW.payment_status,'system',NULL);
 END IF;
 RETURN NULL;
END; $$;

-- Comandas de pré-reserva somente depois da previsão E ação de preparo da loja.
CREATE OR REPLACE FUNCTION public.lod_kitchen_print_eligible(p_order public.orders)
RETURNS boolean LANGUAGE sql STABLE SET search_path='public','pg_temp'
AS $$
 SELECT
 (coalesce(p_order.notes,'') NOT LIKE 'PRÉ-RESERVA — Chocolate com Morango:%'
  OR (now() >= '2026-10-25 17:00:00-03'::timestamptz
      AND p_order.order_status IN ('preparing','ready','ready_for_pickup','out_for_delivery')))
 AND p_order.order_status IN ('new','confirmed','preparing','ready','ready_for_pickup','out_for_delivery')
 AND p_order.payment_status NOT IN ('failed','cancelled','refunded')
 AND public.lod_crocante_print_allocation_ready(p_order.id)
 AND (
   (p_order.sales_channel='site' AND p_order.payment_method IN ('mercado_pago_pix','mercado_pago_card') AND p_order.payment_status='paid')
   OR (p_order.sales_channel='whatsapp' AND p_order.payment_method='manual_pix' AND p_order.payment_status='paid'
       AND p_order.order_status IN ('confirmed','preparing','ready','ready_for_pickup','out_for_delivery'))
   OR (p_order.sales_channel='whatsapp' AND p_order.payment_method IN ('cash','card_on_delivery')
       AND p_order.order_status IN ('confirmed','preparing','ready','ready_for_pickup','out_for_delivery'))
   OR (p_order.sales_channel='whatsapp' AND p_order.payment_method IN ('manual_pix','cash','card_on_delivery')
       AND p_order.payment_status IN ('paid','pending')
       AND p_order.order_status IN ('confirmed','preparing','ready','ready_for_pickup','out_for_delivery')
       AND EXISTS(SELECT 1 FROM public.kitchen_print_control c WHERE c.control_id=true AND c.enabled=true AND c.auto_mode_enabled=true
          AND c.auto_mode_started_at IS NOT NULL AND p_order.created_at>=c.auto_mode_started_at
          AND p_order.created_at>=c.accept_new_after))
 );
$$;

-- Configura lote INATIVO; habilitação ocorre apenas após deployment da UI/Edge.
INSERT INTO public.slice_preorder_batches(item_key,capacity,reserved_units,ready_at,expires_at,enabled)
VALUES('slice_chocolate_morango',21,0,'2026-10-25 17:00:00-03','2026-10-25 19:00:00-03',false)
ON CONFLICT(item_key) DO NOTHING;
