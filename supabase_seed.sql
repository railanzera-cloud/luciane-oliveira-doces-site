-- Luciane Oliveira Doces — disponibilidade inicial do cardápio público.
-- Execute este arquivo UMA VEZ no SQL Editor do projeto Supabase da Luciane.
-- Ele pode ser executado novamente sem duplicar registros e sem reabrir itens
-- que tenham sido alterados posteriormente pelo painel.

insert into public.menu_availability (
  item_key,
  name,
  item_type,
  category_key,
  status
)
values
  ('category_pipocas', 'Pipocas Gourmet', 'category', 'category_pipocas', 'available'),
  ('category_fatias', 'Fatias Artesanais', 'category', 'category_fatias', 'available'),

  ('popcorn_size_350ml', 'Pipoca Gourmet — 350 ml', 'popcorn_size', 'category_pipocas', 'available'),
  ('popcorn_size_500ml', 'Pipoca Gourmet — 500 ml', 'popcorn_size', 'category_pipocas', 'available'),
  ('popcorn_size_750ml', 'Pipoca Gourmet — 750 ml', 'popcorn_size', 'category_pipocas', 'available'),
  ('popcorn_size_1l', 'Pipoca Gourmet — 1 litro', 'popcorn_size', 'category_pipocas', 'available'),

  ('popcorn_flavor_leitinho', 'Leitinho', 'popcorn_flavor', 'category_pipocas', 'available'),
  ('popcorn_flavor_nutella', 'Nutella', 'popcorn_flavor', 'category_pipocas', 'available'),
  ('popcorn_flavor_kinder_bueno', 'Kinder Bueno', 'popcorn_flavor', 'category_pipocas', 'available'),
  ('popcorn_flavor_kinder_bueno_crisp', 'Kinder Bueno Crisp', 'popcorn_flavor', 'category_pipocas', 'available'),
  ('popcorn_flavor_choco_cookies_branco', 'Choco Cookies Branco', 'popcorn_flavor', 'category_pipocas', 'available'),
  ('popcorn_flavor_choco_cookies_leite', 'Choco Cookies ao Leite', 'popcorn_flavor', 'category_pipocas', 'available'),
  ('popcorn_flavor_ovomaltine', 'Ovomaltine', 'popcorn_flavor', 'category_pipocas', 'available'),

  ('slice_chocolate_morango', 'Chocolate com Morango', 'slice', 'category_fatias', 'available'),
  ('slice_ninho_morango', 'Ninho com Morango — Massa branca', 'slice', 'category_fatias', 'available'),
  ('slice_prestigio', 'Prestígio', 'slice', 'category_fatias', 'available'),
  ('slice_chocolate_maracuja', 'Chocolate com Maracujá', 'slice', 'category_fatias', 'available'),
  ('slice_chocolatudo', 'Chocolatudo', 'slice', 'category_fatias', 'available'),
  ('slice_chocolate_cenoura', 'Chocolate com Cenoura', 'slice', 'category_fatias', 'available')
on conflict (item_key) do update
set
  name = excluded.name,
  item_type = excluded.item_type,
  category_key = excluded.category_key;
