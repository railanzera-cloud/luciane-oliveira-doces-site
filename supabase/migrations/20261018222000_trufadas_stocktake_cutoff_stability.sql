-- Segurança adicional para a reconciliação do estoque de Trufadas.
-- Após a PRIMEIRA reconciliação absoluta, o marco histórico é fixo.
-- Reposições futuras seguem a semântica anterior do admin: total inclui
-- as reservas válidas de novos pedidos, que são subtraídas em 'Disponíveis'.
-- Um pedido novo com hold vencido só pode renovar reserva se houver estoque.
-- Não altera pedidos, pagamentos, saldos ou reservas existentes.
CREATE OR REPLACE FUNCTION public.admin_set_crocante_inventory(
  p_item_key text,p_total integer,p_version bigint,p_enabled boolean
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','auth','pg_temp'
AS $fn$
DECLARE
 v_rec public.crocante_inventory%rowtype;
 v_held integer;
BEGIN
 PERFORM public.lod_require_authenticated_staff();
 IF p_item_key NOT IN ('crocante_copo_ninho','crocante_copo_chocolate')
    OR p_total IS NULL OR p_total<0 OR p_total>100000
    OR p_version IS NULL OR p_enabled IS NULL THEN
   RAISE EXCEPTION USING errcode='22023',message='crocante_inventory_invalid';
 END IF;

 SELECT * INTO v_rec FROM public.crocante_inventory
 WHERE item_key=p_item_key FOR UPDATE;
 IF NOT FOUND THEN
   RAISE EXCEPTION USING errcode='P0002',message='crocante_inventory_missing';
 END IF;
 IF v_rec.version<>p_version THEN
   RAISE EXCEPTION USING errcode='40001',message='crocante_inventory_conflict_reload';
 END IF;

 SELECT public.lod_crocante_active_reserved(p_item_key) INTO v_held;
 IF p_total<v_held THEN
   RAISE EXCEPTION USING errcode='22023',message='crocante_inventory_below_reserved';
 END IF;

 UPDATE public.crocante_inventory
 SET total_stock=p_total,
     is_enabled=p_enabled,
     version=version+1,
     updated_at=now(),
     last_physical_recount_at=v_rec.last_physical_recount_at
 WHERE item_key=p_item_key;

 UPDATE public.menu_availability
 SET status=CASE WHEN p_enabled AND p_total>0 THEN 'available'::public.item_status
                 ELSE 'sold_out'::public.item_status END,
     updated_at=now()
 WHERE item_key=p_item_key AND item_type='product';

 RETURN public.admin_get_crocante_inventory();
END;
$fn$;


CREATE OR REPLACE FUNCTION public.lod_reconcile_crocante_on_order_status()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $fn$
DECLARE
 v_hold public.crocante_inventory_holds%rowtype;
 v_inventory public.crocante_inventory%rowtype;
 v_other_held integer;
 v_should_consume boolean;
BEGIN
 v_should_consume := new.payment_status='paid' OR new.order_status='completed';

 FOR v_hold IN
   SELECT * FROM public.crocante_inventory_holds
   WHERE order_uuid=new.id AND state IN ('held','shortage') ORDER BY item_key
 LOOP
   SELECT * INTO v_inventory FROM public.crocante_inventory
     WHERE item_key=v_hold.item_key FOR UPDATE;

   IF new.order_status='cancelled'
      OR new.payment_status IN ('cancelled','failed','refunded') THEN
     UPDATE public.crocante_inventory_holds
       SET state='released',updated_at=now()
       WHERE order_uuid=v_hold.order_uuid AND item_key=v_hold.item_key;

   ELSIF v_should_consume THEN
     IF v_inventory.last_physical_recount_at IS NOT NULL
         AND v_hold.created_at<=v_inventory.last_physical_recount_at THEN
       -- Já refletido na contagem física mais recente. Marca resolvido,
       -- sem retirar novamente um pacote do estoque.
       UPDATE public.crocante_inventory_holds
         SET state='committed',updated_at=now()
         WHERE order_uuid=v_hold.order_uuid AND item_key=v_hold.item_key;
     ELSE
       v_other_held:=public.lod_crocante_active_reserved(v_hold.item_key,new.id);
       IF v_inventory.total_stock-v_other_held>=v_hold.quantity THEN
         UPDATE public.crocante_inventory
           SET total_stock=total_stock-v_hold.quantity,
               version=version+1,updated_at=now()
           WHERE item_key=v_hold.item_key;
         UPDATE public.crocante_inventory_holds
           SET state='committed',updated_at=now()
           WHERE order_uuid=v_hold.order_uuid AND item_key=v_hold.item_key;
         UPDATE public.menu_availability
           SET status=CASE WHEN v_inventory.total_stock-v_hold.quantity>0
                              AND v_inventory.is_enabled
                THEN 'available'::public.item_status ELSE 'sold_out'::public.item_status END,
               updated_at=now()
           WHERE item_key=v_hold.item_key;
       ELSE
         UPDATE public.crocante_inventory_holds
           SET state='shortage',updated_at=now()
           WHERE order_uuid=v_hold.order_uuid AND item_key=v_hold.item_key;
       END IF;
     END IF;

   ELSIF new.order_status IN ('confirmed','preparing','ready','ready_for_pickup','out_for_delivery')
       AND v_hold.state='held'
       AND (v_inventory.last_physical_recount_at IS NULL
            OR v_hold.created_at>v_inventory.last_physical_recount_at) THEN
     -- Uma reserva expirada volta a ser vigente apenas quando ainda
     -- houver quantidade realmente livre. Evita overbooking na aceitação tardia.
     v_other_held:=public.lod_crocante_active_reserved(v_hold.item_key,new.id);
     IF v_inventory.total_stock-v_other_held>=v_hold.quantity THEN
       UPDATE public.crocante_inventory_holds
         SET expires_at='infinity'::timestamptz,updated_at=now()
         WHERE order_uuid=v_hold.order_uuid AND item_key=v_hold.item_key;
     ELSE
       UPDATE public.crocante_inventory_holds
         SET state='shortage',updated_at=now()
         WHERE order_uuid=v_hold.order_uuid AND item_key=v_hold.item_key;
     END IF;
   END IF;
 END LOOP;
 RETURN new;
END;
$fn$;

