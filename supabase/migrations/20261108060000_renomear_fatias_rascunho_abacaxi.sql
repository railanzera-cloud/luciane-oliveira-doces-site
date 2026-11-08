-- Renomeações aprovadas sem mudar identidade, estoque, preço ou status.
-- Não reaplicar seeds completos nem recriar SKUs existentes.
UPDATE public.menu_availability
SET name = 'Brigadeiro Branco com Morango'
WHERE item_key = 'slice_ninho_morango'
  AND name IS DISTINCT FROM 'Brigadeiro Branco com Morango';

UPDATE public.menu_availability
SET name = 'Geleia de Morango com Coco Cremoso'
WHERE item_key = 'slice_coco_cremoso_morango'
  AND name IS DISTINCT FROM 'Geleia de Morango com Coco Cremoso';

-- Lançamento futuro, preço e imagem ainda não informados.
-- Oculto desde a criação; a aplicação bloqueia qualquer liberação prematura.
INSERT INTO public.menu_availability (item_key, name, item_type, category_key, status)
VALUES ('slice_abacaxi_doce_leite', 'Abacaxi com Doce de Leite', 'slice', 'category_fatias', 'hidden'::public.item_status)
ON CONFLICT (item_key) DO NOTHING;
