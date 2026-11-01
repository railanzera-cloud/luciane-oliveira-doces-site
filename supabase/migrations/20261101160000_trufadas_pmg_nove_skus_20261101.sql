-- Expansao comercial de Trufadas por sabor/tamanho, preparada em 01/11/2026.
-- NAO EXECUTAR isoladamente antes da homologacao integral do frontend, backend,
-- imagens e empacotamento. Aplicar com backup e autorizacao de producao.
-- Fonte das duas funcoes: introspeccao do projeto edqiwvccmboyayojvuea em 01/11.
-- Preserva holds/ids historicos e regras de baixa ja existentes.
BEGIN;

SET LOCAL lock_timeout = '8s';
SET LOCAL statement_timeout = '60s';

ALTER TABLE public.crocante_inventory
  DROP CONSTRAINT crocante_inventory_item_key_check;
ALTER TABLE public.crocante_inventory
  ADD CONSTRAINT crocante_inventory_item_key_check
  CHECK (item_key IN ('trufada_ninho_p', 'trufada_ninho_m', 'trufada_ninho_g', 'trufada_pacoca_p', 'trufada_pacoca_m', 'trufada_pacoca_g', 'trufada_coco_queimado_p', 'trufada_coco_queimado_m', 'trufada_coco_queimado_g', 'crocante_copo_ninho', 'crocante_copo_chocolate'));

INSERT INTO public.crocante_inventory
  (item_key,total_stock,is_enabled)
VALUES
  ('trufada_ninho_p',0,false),
  ('trufada_ninho_m',0,false),
  ('trufada_ninho_g',0,false),
  ('trufada_pacoca_p',0,false),
  ('trufada_pacoca_m',0,false),
  ('trufada_pacoca_g',0,false),
  ('trufada_coco_queimado_p',0,false),
  ('trufada_coco_queimado_m',0,false),
  ('trufada_coco_queimado_g',0,false)
ON CONFLICT (item_key) DO NOTHING;

INSERT INTO public.menu_availability
  (id,item_key,name,item_type,category_key,status)
VALUES
  (nextval('public.menu_availability_id_seq'),'trufada_ninho_p','Trufadas — Ninho · Pacote P','product','category_pipocas','sold_out'::public.item_status),
  (nextval('public.menu_availability_id_seq'),'trufada_ninho_m','Trufadas — Ninho · Pacote M','product','category_pipocas','sold_out'::public.item_status),
  (nextval('public.menu_availability_id_seq'),'trufada_ninho_g','Trufadas — Ninho · Pacote G','product','category_pipocas','sold_out'::public.item_status),
  (nextval('public.menu_availability_id_seq'),'trufada_pacoca_p','Trufadas — Paçoca · Pacote P','product','category_pipocas','sold_out'::public.item_status),
  (nextval('public.menu_availability_id_seq'),'trufada_pacoca_m','Trufadas — Paçoca · Pacote M','product','category_pipocas','sold_out'::public.item_status),
  (nextval('public.menu_availability_id_seq'),'trufada_pacoca_g','Trufadas — Paçoca · Pacote G','product','category_pipocas','sold_out'::public.item_status),
  (nextval('public.menu_availability_id_seq'),'trufada_coco_queimado_p','Trufadas — Coco Queimado · Pacote P','product','category_pipocas','sold_out'::public.item_status),
  (nextval('public.menu_availability_id_seq'),'trufada_coco_queimado_m','Trufadas — Coco Queimado · Pacote M','product','category_pipocas','sold_out'::public.item_status),
  (nextval('public.menu_availability_id_seq'),'trufada_coco_queimado_g','Trufadas — Coco Queimado · Pacote G','product','category_pipocas','sold_out'::public.item_status)
ON CONFLICT (item_key) DO NOTHING;

-- O legado Chocolate sai do menu sem remover seu estoque/historico.
UPDATE public.menu_availability SET status='hidden'::public.item_status, updated_at=now()
WHERE item_key='crocante_copo_chocolate' AND item_type='product';

-- Amplia somente a guarda de identificadores conhecidos; mantem locks,
-- RLS staff, reservas, conflito de versao e prevencao de overbooking.
CREATE OR REPLACE FUNCTION public.admin_set_crocante_inventory(p_item_key text, p_total integer, p_version bigint, p_enabled boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE
 v_rec public.crocante_inventory%rowtype;
 v_held integer;
BEGIN
 PERFORM public.lod_require_authenticated_staff();
 IF NOT EXISTS (SELECT 1 FROM public.crocante_inventory WHERE item_key=p_item_key)
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
$function$;

CREATE OR REPLACE FUNCTION public.lod_hold_crocante_on_item_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 v_inventory public.crocante_inventory%rowtype;
 v_held integer;
 v_status public.item_status;
 v_order_status public.lod_order_status;
 v_expiry timestamptz;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.crocante_inventory WHERE item_key=new.item_key) THEN
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
$function$;

-- Verificacao transacional de cardinalidade antes de confirmar.
DO $verify$
DECLARE v_i integer;v_m integer;
BEGIN
 SELECT count(*) INTO v_i FROM public.crocante_inventory
 WHERE item_key IN ('trufada_ninho_p', 'trufada_ninho_m', 'trufada_ninho_g', 'trufada_pacoca_p', 'trufada_pacoca_m', 'trufada_pacoca_g', 'trufada_coco_queimado_p', 'trufada_coco_queimado_m', 'trufada_coco_queimado_g');
 SELECT count(*) INTO v_m FROM public.menu_availability
 WHERE item_key IN ('trufada_ninho_p', 'trufada_ninho_m', 'trufada_ninho_g', 'trufada_pacoca_p', 'trufada_pacoca_m', 'trufada_pacoca_g', 'trufada_coco_queimado_p', 'trufada_coco_queimado_m', 'trufada_coco_queimado_g')
   AND status='sold_out'::public.item_status;
 IF v_i <> 9 OR v_m <> 9 THEN
   RAISE EXCEPTION 'trufadas_pmg_incomplete: inventory %, menu %',v_i,v_m;
 END IF;
END;
$verify$;

COMMIT;
