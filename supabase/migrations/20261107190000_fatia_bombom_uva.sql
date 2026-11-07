-- Nova fatia confirmada pela proprietária em 07/11/2026: Bombom de Uva, R$ 20.
-- Disponibilidade é independente: não reabrir fatias já esgotadas/ocultas.
-- Começar oculta até que imagem, frontend, Edge WhatsApp e release sejam compatíveis.
-- Após o release, a proprietária controla Disponível/Esgotado/Oculto pelo /admin.
INSERT INTO public.menu_availability (item_key, name, item_type, category_key, status)
VALUES ('slice_bombom_uva', 'Bombom de Uva', 'slice', 'category_fatias', 'hidden'::public.item_status)
ON CONFLICT (item_key) DO NOTHING;
