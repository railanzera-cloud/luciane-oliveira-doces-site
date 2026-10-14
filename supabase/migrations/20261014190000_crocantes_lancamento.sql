-- Cadastro de dois copos; preço e horário de abertura validados no backend.
-- ON CONFLICT preserva ajustes posteriores do operador.
insert into public.menu_availability (item_key, name, item_type, category_key, status)
values
('crocante_copo_ninho', 'Crocantes — Ninho (400 ml)', 'product', 'category_pipocas', 'available'),
('crocante_copo_chocolate', 'Crocantes — Chocolate (400 ml)', 'product', 'category_pipocas', 'available')
on conflict (item_key) do nothing;
