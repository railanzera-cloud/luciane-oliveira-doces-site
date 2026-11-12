-- 12/11/2026: Cascão Trufado (nome comercial) e três novos SKUs.
-- Reaproveitar category_cones para manter pedidos, links e histórico.
-- Não alterar disponibilidade dos três produtos antigos nem da categoria.
-- Novos produtos começam OCULTOS até publicar frontend, fotos e Edge Function.
BEGIN;

UPDATE public.menu_availability
SET name = 'Cascão Trufado'
WHERE item_key = 'category_cones' AND item_type = 'category';

INSERT INTO public.menu_availability (item_key, name, item_type, category_key, status)
VALUES
  ('cascao_kinder_bueno', 'Kinder Bueno', 'product', 'category_cones', 'hidden'::public.item_status),
  ('cascao_ninho_morango', 'Ninho com Morango', 'product', 'category_cones', 'hidden'::public.item_status),
  ('cascao_ninho_nutella_chocotone', 'Ninho Nutella e Chocotone', 'product', 'category_cones', 'hidden'::public.item_status)
ON CONFLICT (item_key) DO NOTHING;

COMMIT;
