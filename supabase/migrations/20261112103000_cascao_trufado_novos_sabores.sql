-- 12/11/2026 — Cascão Trufado: novos SKUs com liberação manual pela proprietária.
-- Somente metadados. O preço é cotado na Edge (commerce-catalog.mjs).
-- Aplicar separadamente antes de ativar os três novos SKUs no painel.
-- Não modificar status dos itens antigos, estoque nem histórico de pedidos.
BEGIN;

UPDATE public.menu_availability
SET name = 'Cascão Trufado'
WHERE item_key = 'category_cones'
  AND item_type = 'category';

INSERT INTO public.menu_availability (item_key, name, item_type, category_key, status)
VALUES
  ('cascao_kinder_bueno', 'Kinder Bueno', 'product', 'category_cones', 'hidden'::public.item_status),
  ('cascao_ninho_morango', 'Ninho com Morango', 'product', 'category_cones', 'hidden'::public.item_status),
  ('cascao_ninho_nutella_chocotone', 'Ninho com Nutella e Chocottone', 'product', 'category_cones', 'hidden'::public.item_status)
ON CONFLICT (item_key) DO NOTHING;

COMMIT;
