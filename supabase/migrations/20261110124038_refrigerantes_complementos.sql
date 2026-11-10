-- Refrigerantes: apresentação nova recebe chave nova. Preserva chaves e pedidos antigos.
-- Não altera estoque nem libera vendas: as quatro linhas começam OCULTAS.
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_type_check;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_type_check
  CHECK (item_type = ANY (ARRAY['popcorn'::text,'slice'::text,'cone'::text,'drink'::text]));
INSERT INTO public.menu_availability(item_key,name,item_type,category_key,status) VALUES
 ('drink_coca_cola_zero_220','Coca-Cola Zero — Lata 220 ml','product','extras_drinks','hidden'::public.item_status),
 ('drink_fanta_laranja_220','Fanta Laranja — Lata 220 ml','product','extras_drinks','hidden'::public.item_status),
 ('drink_guarana_antarctica_200','Guaraná Antarctica — Garrafa 200 ml','product','extras_drinks','hidden'::public.item_status),
 ('drink_coca_cola_350','Coca-Cola tradicional — Lata 350 ml','product','extras_drinks','hidden'::public.item_status)
ON CONFLICT (item_key) DO NOTHING;

-- A verificação Edge é refeita na transação de inserção nos DOIS canais.
-- FOR SHARE serializa com a alteração de status pelo admin; não reserva estoque físico.
CREATE OR REPLACE FUNCTION public.lod_validate_drink_on_item_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path TO public, pg_temp AS $$
DECLARE v_status public.item_status;
BEGIN
  IF NEW.item_type <> 'drink' THEN RETURN NEW; END IF;
  SELECT status INTO v_status FROM public.menu_availability
    WHERE item_key = NEW.item_key AND item_type = 'product' AND category_key = 'extras_drinks'
    FOR SHARE;
  IF v_status IS DISTINCT FROM 'available'::public.item_status THEN
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='menu_changed';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.lod_validate_drink_on_item_insert() FROM PUBLIC;
DROP TRIGGER IF EXISTS lod_validate_drink_on_item_insert ON public.order_items;
CREATE TRIGGER lod_validate_drink_on_item_insert BEFORE INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.lod_validate_drink_on_item_insert();
