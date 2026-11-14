-- V4.7.13 / 14-11-2026. PREPARADA, NÃO EXECUTADA EM PRODUÇÃO.
-- Aplicar somente com autorização específica e Edge compatível; Folheado inicia hidden.
-- Não excluir pedidos históricos nem mudar o estado atual do Kinder.
BEGIN;
INSERT INTO public.menu_availability (item_key, name, item_type, category_key, status)
VALUES ('cascao_folheado_geleia_morango_ninho', 'Folheado — Geleia de Morango com Ninho', 'product', 'category_cones', 'hidden'::public.item_status)
ON CONFLICT (item_key) DO NOTHING;
UPDATE public.menu_availability SET name = 'Kinder Bueno e Nutella'
WHERE item_key = 'cascao_kinder_bueno' AND item_type = 'product';
UPDATE public.menu_availability SET status = 'hidden'::public.item_status
WHERE item_key = 'cone_dois_amores' AND item_type = 'product';
COMMIT;
