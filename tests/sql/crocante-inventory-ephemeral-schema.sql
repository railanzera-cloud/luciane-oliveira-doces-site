-- Banco efemero PostgreSQL 16, construido pela CI. NUNCA executar em producao.
create type public.item_status as enum ('available','sold_out','hidden');
create table public.menu_availability (
 item_key text primary key,
 item_type text not null default 'product',
 status public.item_status not null default 'available',
 updated_at timestamptz not null default now()
);
insert into public.menu_availability(item_key,item_type,status)
values ('crocante_copo_ninho','product','available'),
       ('crocante_copo_chocolate','product','available'),
       ('category_pipocas','category','available');
alter table public.order_items add column item_key text;
