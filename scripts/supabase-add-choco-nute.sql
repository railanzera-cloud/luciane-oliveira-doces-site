-- Inclusão pontual do novo sabor no projeto Supabase EXISTENTE.
-- Execute uma vez no SQL Editor. Não execute novamente o supabase_seed.sql.
-- Não altera schema, RLS, Auth, usuários, pedidos abertos ou estados existentes.
insert into public.menu_availability (item_key, name, item_type, category_key, status)
values ('popcorn_flavor_choco_nute', 'Choco Nute', 'popcorn_flavor', 'category_pipocas', 'available')
on conflict (item_key) do nothing;

-- Atualiza somente o nome comercial; conserva ID, item_key e disponibilidade.
update public.menu_availability
set name = 'Crispy Bueno'
where item_key = 'popcorn_flavor_kinder_bueno_crisp'
  and name is distinct from 'Crispy Bueno';
