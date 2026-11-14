-- V4.7.13 / 14-11-2026 — liberação coordenada de catálogo após QA.
-- Aplicação produtiva somente com a loja fechada e dois SKUs antigos esgotados.
-- Não muda status de estoque do Kinder nem libera o novo Folheado.
BEGIN;

DO $preflight$
BEGIN
  IF (SELECT value::text FROM public.store_settings WHERE key = 'orders_open') IS DISTINCT FROM 'false' THEN
    RAISE EXCEPTION 'V4.7.13: loja deve permanecer fechada durante a sincronização de catálogo';
  END IF;
  IF (SELECT status::text FROM public.menu_availability WHERE item_key = 'cascao_kinder_bueno') IS DISTINCT FROM 'sold_out' THEN
    RAISE EXCEPTION 'V4.7.13: disponibilidade do Kinder mudou; revalidar antes de atualizar';
  END IF;
  IF (SELECT status::text FROM public.menu_availability WHERE item_key = 'cone_dois_amores') IS DISTINCT FROM 'sold_out' THEN
    RAISE EXCEPTION 'V4.7.13: disponibilidade do Dois Amores mudou; revalidar antes de atualizar';
  END IF;
END;
$preflight$;

INSERT INTO public.menu_availability (item_key, name, item_type, category_key, status)
VALUES ('cascao_folheado_geleia_morango_ninho', 'Folheado — Geleia de Morango com Ninho', 'product', 'category_cones', 'hidden'::public.item_status)
ON CONFLICT (item_key) DO NOTHING;

UPDATE public.menu_availability
SET name = 'Kinder Bueno e Nutella'
WHERE item_key = 'cascao_kinder_bueno' AND item_type = 'product';

UPDATE public.menu_availability
SET status = 'hidden'::public.item_status
WHERE item_key = 'cone_dois_amores' AND item_type = 'product';

COMMIT;
