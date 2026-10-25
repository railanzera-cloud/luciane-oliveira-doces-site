-- LOD | 2026-10-25 | Ajuste de reservas externas da última fornada.
-- Só Chocolate com Morango. Preserva reservas existentes e pagamentos.
ALTER TABLE public.slice_preorder_batches
  ADD COLUMN IF NOT EXISTS external_reserved_units integer NOT NULL DEFAULT 0;
ALTER TABLE public.slice_preorder_batches
  ADD CONSTRAINT slice_preorder_external_units_bounds
  CHECK (external_reserved_units >= 0 AND reserved_units + external_reserved_units <= capacity);

CREATE TABLE IF NOT EXISTS public.slice_preorder_external_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 item_key text NOT NULL REFERENCES public.slice_preorder_batches(item_key),
 old_units integer NOT NULL,
 new_units integer NOT NULL,
 changed_by uuid NOT NULL,
 changed_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT external_audit_nonnegative CHECK (old_units>=0 AND new_units>=0)
);
ALTER TABLE public.slice_preorder_external_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.slice_preorder_external_audit FROM PUBLIC, anon, authenticated;

-- O estoque efetivo tem uma só conta: capacidade menos site menos WhatsApp manual.
CREATE OR REPLACE FUNCTION public.public_slice_preorder()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='public','pg_temp'
AS $$
 SELECT coalesce((
 SELECT jsonb_build_object(
 'active', b.enabled AND now()<b.expires_at AND m.status='sold_out'::public.item_status,
 'item_key', b.item_key,
 'remaining', greatest(0,b.capacity-b.reserved_units-b.external_reserved_units),
 'ready_at', b.ready_at
 ) FROM public.slice_preorder_batches b
 JOIN public.menu_availability m ON m.item_key=b.item_key
 WHERE b.item_key='slice_chocolate_morango'
 ),'{"active":false,"remaining":0}'::jsonb);
$$;
REVOKE ALL ON FUNCTION public.public_slice_preorder() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_slice_preorder() TO anon, authenticated;

-- A reserva do site trava a mesma linha usada pelo ajuste manual;
-- duas compras simultâneas não ultrapassam o lote.
CREATE OR REPLACE FUNCTION public.lod_preorder_allocation_on_item()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','pg_temp'
AS $$
DECLARE v public.slice_preorder_batches%rowtype;
BEGIN
 IF NEW.item_key<>'slice_chocolate_morango' THEN RETURN NEW; END IF;
 SELECT * INTO v FROM public.slice_preorder_batches
 WHERE item_key=NEW.item_key FOR UPDATE;
 IF NOT FOUND OR NOT v.enabled OR now()>=v.expires_at THEN RETURN NEW; END IF;
 IF v.capacity-v.reserved_units-v.external_reserved_units<NEW.quantity THEN
   RAISE EXCEPTION USING errcode='23514',message='slice_preorder_full';
 END IF;
 INSERT INTO public.slice_preorder_allocations(order_uuid,item_key,quantity)
 VALUES(NEW.order_uuid,NEW.item_key,NEW.quantity)
 ON CONFLICT(order_uuid,item_key)
 DO UPDATE SET quantity=public.slice_preorder_allocations.quantity+excluded.quantity;
 UPDATE public.slice_preorder_batches
 SET reserved_units=reserved_units+NEW.quantity,updated_at=now()
 WHERE item_key=NEW.item_key;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.lod_preorder_allocation_on_item() FROM PUBLIC,anon,authenticated;

-- Consulta privada. A interface pública nunca vê o número das vendas externas.
CREATE OR REPLACE FUNCTION public.admin_strawberry_preorder_status()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path='public','auth','pg_temp'
AS $$
DECLARE v_actor uuid; v jsonb;
BEGIN
 v_actor := public.lod_require_authenticated_staff();
 SELECT jsonb_build_object(
  'item_key',b.item_key,'capacity',b.capacity,
  'site_reserved',b.reserved_units,'external_reserved',b.external_reserved_units,
  'remaining',greatest(0,b.capacity-b.reserved_units-b.external_reserved_units),
  'active',b.enabled AND now()<b.expires_at AND m.status='sold_out'::public.item_status,
  'ready_at',b.ready_at,'expires_at',b.expires_at,
  'updated_at',b.updated_at
 ) INTO v FROM public.slice_preorder_batches b
 JOIN public.menu_availability m ON m.item_key=b.item_key
 WHERE b.item_key='slice_chocolate_morango';
 RETURN coalesce(v,'{"active":false,"capacity":0,"site_reserved":0,"external_reserved":0,"remaining":0}'::jsonb);
END; $$;
REVOKE ALL ON FUNCTION public.admin_strawberry_preorder_status() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_strawberry_preorder_status() TO authenticated;

-- O painel informa o TOTAL comprometido fora do site, não um novo pedido.
-- CAS protege contra duas abas administrando o total simultaneamente.
CREATE OR REPLACE FUNCTION public.admin_set_strawberry_external_units(
 p_expected_units integer, p_new_units integer
)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path='public','auth','pg_temp'
AS $$
DECLARE v_actor uuid; v public.slice_preorder_batches%rowtype;
BEGIN
 v_actor:=public.lod_require_authenticated_staff();
 IF p_expected_units IS NULL OR p_new_units IS NULL OR p_expected_units<0 OR p_new_units<0 THEN
  RAISE EXCEPTION USING errcode='22023',message='invalid_external_units';
 END IF;
 SELECT * INTO v FROM public.slice_preorder_batches
 WHERE item_key='slice_chocolate_morango' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING errcode='P0002',message='preorder_batch_not_found'; END IF;
 IF NOT v.enabled OR now()>=v.expires_at THEN
  RAISE EXCEPTION USING errcode='22023',message='preorder_batch_not_active';
 END IF;
 IF v.external_reserved_units<>p_expected_units THEN
  RAISE EXCEPTION USING errcode='40001',message='external_units_changed_refresh';
 END IF;
 IF p_new_units>v.capacity-v.reserved_units THEN
  RAISE EXCEPTION USING errcode='23514',message='insufficient_preorder_capacity';
 END IF;
 IF v.external_reserved_units<>p_new_units THEN
  UPDATE public.slice_preorder_batches
  SET external_reserved_units=p_new_units,updated_at=now()
  WHERE item_key=v.item_key;
  INSERT INTO public.slice_preorder_external_audit(item_key,old_units,new_units,changed_by)
  VALUES(v.item_key,v.external_reserved_units,p_new_units,v_actor);
 END IF;
 RETURN public.admin_strawberry_preorder_status();
END; $$;
REVOKE ALL ON FUNCTION public.admin_set_strawberry_external_units(integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_strawberry_external_units(integer,integer) TO authenticated;

COMMENT ON COLUMN public.slice_preorder_batches.external_reserved_units IS
 'Fatias comprometidas diretamente no WhatsApp, fora do checkout do site. Somam ao reservado no site, sem gerar pedidos, recebimentos ou Purchase.';
