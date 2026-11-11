-- Coleção temporária de Natal, preparada OCULTA para publicação manual posterior.
-- Compatível com pedidos antigos (inclusive refrigerantes) e preserva históricos.
BEGIN;
ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_type_check;
ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_type_check
  CHECK (item_type = ANY (ARRAY['popcorn','slice','cone','drink','chocotone']::text[]));

INSERT INTO public.menu_availability (item_key,name,item_type,category_key,status)
VALUES
 ('category_natal','Edição Especial de Natal','category','category_natal','hidden'::public.item_status),
 ('chocotone_ninho_nutella','Chocotone — Ninho com Nutella','product','category_natal','hidden'::public.item_status),
 ('chocotone_ferrero_rocher','Chocotone — Ferrero Rocher','product','category_natal','hidden'::public.item_status),
 ('chocotone_casadinho','Chocotone — Casadinho','product','category_natal','hidden'::public.item_status),
 ('chocotone_morango_brigadeiro_branco_chocolate','Chocotone — Morango com Brigadeiro Branco e Chocolate','product','category_natal','hidden'::public.item_status)
ON CONFLICT (item_key) DO NOTHING;
COMMIT;
