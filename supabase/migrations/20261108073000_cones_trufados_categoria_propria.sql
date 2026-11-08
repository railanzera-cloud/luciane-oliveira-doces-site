-- Cones Trufados: categoria permanente, SKUs autônomos e preços em fonte de código.
-- Sem supor quantidades. Começa OCULTO: só liberar após publicação testada
-- e confirmação da Luciane de que cada sabor foi produzido.
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_type_check;
ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_type_check CHECK (item_type = ANY (ARRAY['popcorn'::text,'slice'::text,'cone'::text]));

INSERT INTO public.menu_availability (item_key, name, item_type, category_key, status)
VALUES
 ('category_cones','Cones Trufados','category','category_cones','hidden'::public.item_status),
 ('cone_prestigio','Prestígio','product','category_cones','hidden'::public.item_status),
 ('cone_dois_amores','Dois Amores','product','category_cones','hidden'::public.item_status),
 ('cone_ferrero_rocher','Ferrero Rocher','product','category_cones','hidden'::public.item_status)
ON CONFLICT (item_key) DO NOTHING;
