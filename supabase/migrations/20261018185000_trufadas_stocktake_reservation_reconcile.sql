-- Trufadas: proteção de contagem física contra baixa duplicada de pedidos antigos.
-- PREPARATÓRIA: não altera estoque físico, pagamentos, pedidos ou reservas históricas.
-- A reconciliação física pontual é um procedimento SEPARADO, autorizado e auditado.
-- Todos os direitos/grants das funções antigas permanecem após CREATE OR REPLACE.

ALTER TABLE public.crocante_inventory
  ADD COLUMN IF NOT EXISTS last_physical_recount_at timestamptz;

COMMENT ON COLUMN public.crocante_inventory.last_physical_recount_at
  IS 'Última contagem física absoluta; holds criados antes dela já integram o saldo informado e não devem baixar de novo.';

-- Uma única regra para reservas: confirmações operacionais continuam reservadas
-- (mesmo após 30 minutos); antigos holds pré-contagem NÃO ocupam novo saldo.
CREATE OR REPLACE FUNCTION public.lod_crocante_active_reserved(
  p_item_key text, p_excluding_order uuid DEFAULT NULL
) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $fn$
  SELECT coalesce(sum(h.quantity), 0)::integer
  FROM public.crocante_inventory_holds h
  JOIN public.orders o ON o.id = h.order_uuid
  JOIN public.crocante_inventory inv ON inv.item_key = h.item_key
  WHERE h.item_key=p_item_key
    AND h.state='held'
    AND (p_excluding_order IS NULL OR h.order_uuid<>p_excluding_order)
    AND (inv.last_physical_recount_at IS NULL OR h.created_at > inv.last_physical_recount_at)
    AND (
      h.expires_at>now()
      OR (
        inv.last_physical_recount_at IS NOT NULL
        AND o.order_status IN ('confirmed','preparing','ready','ready_for_pickup','out_for_delivery')
        AND o.payment_status NOT IN ('cancelled','failed','refunded')
      )
    );
$fn$;

-- RPC pública existente permanece compatível.
CREATE OR REPLACE FUNCTION public.public_crocante_inventory()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $fn$
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'item_key', inv.item_key,
   'available', CASE WHEN inv.is_enabled
      THEN greatest(inv.total_stock-public.lod_crocante_active_reserved(inv.item_key),0)
      ELSE 0 END
 ) ORDER BY inv.item_key), '[]'::jsonb)
 FROM public.crocante_inventory inv;
$fn$;

-- RPC administrativa existente permanece compatível, inclusive version/shortages.
CREATE OR REPLACE FUNCTION public.admin_get_crocante_inventory()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public','auth','pg_temp'
AS $fn$
BEGIN
 PERFORM public.lod_require_authenticated_staff();
 RETURN (
  SELECT coalesce(jsonb_agg(jsonb_build_object(
   'item_key',inv.item_key, 'total',inv.total_stock, 'enabled',inv.is_enabled,
   'version',inv.version,
   'reserved',public.lod_crocante_active_reserved(inv.item_key),
   'available',CASE WHEN inv.is_enabled THEN greatest(
       inv.total_stock-public.lod_crocante_active_reserved(inv.item_key),0
     ) ELSE 0 END,
   'shortages',(SELECT count(*)::integer FROM public.crocante_inventory_holds h
       WHERE h.item_key=inv.item_key AND h.state='shortage')
  ) ORDER BY inv.item_key),'[]'::jsonb)
  FROM public.crocante_inventory inv
 );
END;
$fn$;

-- Um número digitado no painel é uma contagem física ABSOLUTA, não produção somada.
-- Se a quantidade mudou, preservamos um novo marco que impede dupla baixa futura.
-- Alterar somente a flag de disponibilidade não cria nova contagem.
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
     last_physical_recount_at=CASE WHEN p_total IS DISTINCT FROM v_rec.total_stock
       THEN clock_timestamp()
       ELSE v_rec.last_physical_recount_at END
 WHERE item_key=p_item_key;

 UPDATE public.menu_availability
 SET status=CASE WHEN p_enabled AND p_total>0 THEN 'available'::public.item_status
                 ELSE 'sold_out'::public.item_status END,
     updated_at=now()
 WHERE item_key=p_item_key AND item_type='product';

 RETURN public.admin_get_crocante_inventory();
END;
$fn$;

-- Pedido futuro consome reserva. Se a cozinha já confirmou, reserva não expira
-- enquanto ele estiver em curso. Pedido ainda não aceito mantém janela de 30 min.
CREATE OR REPLACE FUNCTION public.lod_hold_crocante_on_item_insert()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $fn$
DECLARE
 v_inventory public.crocante_inventory%rowtype;
 v_held integer;
 v_status public.item_status;
 v_order_status public.lod_order_status;
 v_expiry timestamptz;
BEGIN
 IF new.item_key NOT IN ('crocante_copo_ninho','crocante_copo_chocolate') THEN
   RETURN new;
 END IF;

 SELECT * INTO v_inventory FROM public.crocante_inventory
 WHERE item_key=new.item_key FOR UPDATE;
 IF NOT FOUND OR NOT v_inventory.is_enabled THEN
   RAISE EXCEPTION USING errcode='23514',message='crocante_sem_estoque';
 END IF;
 SELECT status INTO v_status FROM public.menu_availability WHERE item_key=new.item_key;
 IF v_status IS DISTINCT FROM 'available'::public.item_status THEN
   RAISE EXCEPTION USING errcode='23514',message='crocante_sem_estoque';
 END IF;

 v_held:=public.lod_crocante_active_reserved(new.item_key);
 IF v_inventory.total_stock-v_held<new.quantity THEN
   RAISE EXCEPTION USING errcode='23514',message='crocante_sem_estoque';
 END IF;

 SELECT order_status INTO v_order_status FROM public.orders WHERE id=new.order_uuid;
 v_expiry:=CASE WHEN v_order_status IN
   ('confirmed','preparing','ready','ready_for_pickup','out_for_delivery')
   THEN 'infinity'::timestamptz
   ELSE now()+interval '30 minutes' END;

 INSERT INTO public.crocante_inventory_holds(order_uuid,item_key,quantity,state,expires_at)
 VALUES(new.order_uuid,new.item_key,new.quantity,'held',v_expiry)
 ON CONFLICT(order_uuid,item_key) DO UPDATE
 SET quantity=public.crocante_inventory_holds.quantity+excluded.quantity,
     expires_at=greatest(public.crocante_inventory_holds.expires_at,excluded.expires_at),
     updated_at=now();
 RETURN new;
END;
$fn$;

-- Reconciliação de estoque operacional, independente do significado financeiro:
-- (1) nunca confirmar pagamento automaticamente;
-- (2) pedidos confirmados pendentes mantêm reserva;
-- (3) pago OU concluído fisicamente consome uma só vez;
-- (4) pedido ANTERIOR à contagem já foi incluído no saldo absoluto;
-- (5) cancelamento libera somente reserva ainda held/shortage.
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
     UPDATE public.crocante_inventory_holds
       SET expires_at='infinity'::timestamptz,updated_at=now()
       WHERE order_uuid=v_hold.order_uuid AND item_key=v_hold.item_key;
   END IF;
 END LOOP;
 RETURN new;
END;
$fn$;

-- IMPORTANTE: a migração não faz UPDATE dos saldos atuais e nem reconcilia
-- automaticamente os pedidos antigos. Isso será feito após aprovação do usuário,
-- em transação que verifica versões, ausência de novos pedidos e contagem física.
