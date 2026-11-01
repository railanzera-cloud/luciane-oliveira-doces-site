-- Todas as asserções são executadas em PostgreSQL sintético na CI.
\set ON_ERROR_STOP on
DO $$
DECLARE n integer;st public.item_status;v bigint;v2 bigint; available integer;
BEGIN
 SELECT count(*) INTO n FROM public.crocante_inventory WHERE item_key LIKE 'trufada_%';
 IF n<>9 THEN RAISE EXCEPTION 'Esperava 9 estoques, encontrou %',n; END IF;
 SELECT count(*) INTO n FROM public.crocante_inventory
 WHERE item_key LIKE 'trufada_%' AND total_stock=0 AND is_enabled=false;
 IF n<>9 THEN RAISE EXCEPTION 'Novos estoques devem iniciar zerados e inativos'; END IF;
 SELECT count(*) INTO n FROM public.menu_availability
 WHERE item_key LIKE 'trufada_%' AND status='sold_out';
 IF n<>9 THEN RAISE EXCEPTION 'Nove itens indisponíveis após migração'; END IF;
 SELECT count(*) INTO n FROM public.crocante_inventory
 WHERE item_key IN ('crocante_copo_ninho','crocante_copo_chocolate');
 IF n<>2 THEN RAISE EXCEPTION 'Perdeu legado'; END IF;
 SELECT status INTO st FROM public.menu_availability WHERE item_key='crocante_copo_chocolate';
 IF st<>'hidden' THEN RAISE EXCEPTION 'Chocolate legado não ocultado'; END IF;
 -- Falha fechada antes de qualquer intervenção do operador.
 SELECT (z->>'available')::integer INTO available
 FROM jsonb_array_elements(public.public_crocante_inventory()) z
 WHERE z->>'item_key'='trufada_pacoca_p';
 IF available<>0 THEN RAISE EXCEPTION 'Inativo vazou disponibilidade'; END IF;
END;
$$;

DO $$
BEGIN
  PERFORM set_config('lod.test.staff','no',false);
  BEGIN
    PERFORM public.admin_set_trufadas_pmg_inventory('trufada_pacoca_p',3,1,true);
    RAISE EXCEPTION 'staff guard bypassed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='staff guard bypassed' THEN RAISE; END IF;
    IF SQLERRM<>'staff_auth_required' THEN RAISE EXCEPTION 'Unexpected auth: %',SQLERRM; END IF;
  END;
END;
$$;
SELECT set_config('lod.test.staff','yes',false);

-- API antiga continua retornando dois registros, sem quebrar rollback.
SELECT set_config('lod.test.staff','yes',false);
DO $verify_version$
DECLARE old_count integer; new_count integer;
BEGIN
 SELECT jsonb_array_length(public.admin_get_crocante_inventory()) INTO old_count;
 SELECT jsonb_array_length(public.admin_get_trufadas_pmg_inventory()) INTO new_count;
 IF old_count<>2 OR new_count<>11 THEN
   RAISE EXCEPTION 'Versioned RPC regression: old % new %',old_count,new_count;
 END IF;
 IF has_function_privilege('anon','public.admin_get_trufadas_pmg_inventory()','EXECUTE') THEN
   RAISE EXCEPTION 'Anonymous PMG getter exposed';
 END IF;
 IF has_function_privilege('anon','public.admin_set_trufadas_pmg_inventory(text,integer,bigint,boolean)','EXECUTE') THEN
   RAISE EXCEPTION 'Anonymous PMG setter exposed';
 END IF;
 IF NOT has_function_privilege('authenticated','public.admin_get_trufadas_pmg_inventory()','EXECUTE') THEN
   RAISE EXCEPTION 'Authenticated PMG getter unavailable';
 END IF;
END;
$verify_version$;

-- Administrador configura dois SKUs sem tocar nos outros 7 ou nos IDs antigos.
SELECT public.admin_set_trufadas_pmg_inventory('trufada_pacoca_p',3,1,true);
SELECT public.admin_set_trufadas_pmg_inventory('trufada_ninho_g',2,1,true);
DO $$
DECLARE n integer;v integer; s public.item_status;
BEGIN
 SELECT count(*) INTO n FROM public.crocante_inventory WHERE item_key LIKE 'trufada_%' AND is_enabled;
 IF n<>2 THEN RAISE EXCEPTION 'Habilitou SKU inesperado'; END IF;
 SELECT (r->>'available')::integer INTO v FROM jsonb_array_elements(public.public_crocante_inventory()) r
 WHERE r->>'item_key'='trufada_pacoca_p';
 IF v<>3 THEN RAISE EXCEPTION 'Expected Paçoca P stock 3, got %',v; END IF;
 SELECT status INTO s FROM public.menu_availability WHERE item_key='trufada_pacoca_p';
 IF s<>'available' THEN RAISE EXCEPTION 'Admin não liberou menu'; END IF;
END;
$$;

-- Optimistic concurrency: escrita com versão antiga deve ser rejeitada.
DO $$
BEGIN
 BEGIN
  PERFORM public.admin_set_trufadas_pmg_inventory('trufada_pacoca_p',5,1,true);
  RAISE EXCEPTION 'optimistic guard bypassed';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM='optimistic guard bypassed' THEN RAISE; END IF;
  IF SQLERRM<>'crocante_inventory_conflict_reload' THEN
    RAISE EXCEPTION 'Unexpected version error: %', SQLERRM;
  END IF;
 END;
END;
$$;

-- Reserva + cancelamento liberam disponibilidade e nunca baixam total_stock.
INSERT INTO public.orders (id) VALUES ('00000000-0000-4000-8000-000000000001');
INSERT INTO public.order_items(order_uuid,item_key,quantity)
VALUES('00000000-0000-4000-8000-000000000001','trufada_pacoca_p',2);
DO $$
DECLARE n integer;held integer;
BEGIN
 SELECT public.lod_crocante_active_reserved('trufada_pacoca_p') INTO held;
 SELECT total_stock INTO n FROM public.crocante_inventory WHERE item_key='trufada_pacoca_p';
 IF held<>2 OR n<>3 THEN RAISE EXCEPTION 'Hold incorreto: reservado %, total %',held,n; END IF;
END;
$$;
UPDATE public.orders SET order_status='cancelled' WHERE id='00000000-0000-4000-8000-000000000001';
DO $$
DECLARE held integer;state text;
BEGIN
 SELECT public.lod_crocante_active_reserved('trufada_pacoca_p') INTO held;
 SELECT h.state INTO state FROM public.crocante_inventory_holds h
 WHERE order_uuid='00000000-0000-4000-8000-000000000001';
 IF held<>0 OR state<>'released' THEN RAISE EXCEPTION 'Cancelamento não liberou'; END IF;
END;
$$;

-- Confirmação paga baixa uma única vez o SKU correto.
INSERT INTO public.orders(id) VALUES('00000000-0000-4000-8000-000000000002');
INSERT INTO public.order_items(order_uuid,item_key,quantity)
VALUES('00000000-0000-4000-8000-000000000002','trufada_ninho_g',1);
UPDATE public.orders SET payment_status='paid' WHERE id='00000000-0000-4000-8000-000000000002';
UPDATE public.orders SET payment_status='paid' WHERE id='00000000-0000-4000-8000-000000000002';
DO $$
DECLARE stock_g integer; stock_p integer; state text;
BEGIN
 SELECT total_stock INTO stock_g FROM public.crocante_inventory WHERE item_key='trufada_ninho_g';
 SELECT total_stock INTO stock_p FROM public.crocante_inventory WHERE item_key='trufada_pacoca_p';
 SELECT h.state INTO state FROM public.crocante_inventory_holds h
 WHERE order_uuid='00000000-0000-4000-8000-000000000002';
 IF stock_g<>1 OR stock_p<>3 OR state<>'committed'
 THEN RAISE EXCEPTION 'Baixa não idempotente: Ninho G %, Paçoca P %, hold %',stock_g,stock_p,state; END IF;
END;
$$;

SELECT 'TRUFADAS_PMG_SYNTHETIC_DB_ASSERTIONS_PASS' AS test_result;
