-- Acrescentar apenas a nova fatia sem alterar as configurações existentes.
-- A linha habilita o controle individual Disponível / Esgotado / Oculto no /admin.
INSERT INTO public.menu_availability (item_key, name, item_type, category_key, status)
VALUES ('slice_coco_cremoso_morango', 'Coco cremoso com geleia de morango na massa branca', 'slice', 'category_fatias', 'available'::public.item_status)
ON CONFLICT (item_key) DO NOTHING;
