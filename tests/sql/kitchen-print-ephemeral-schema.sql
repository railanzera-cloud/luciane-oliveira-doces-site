-- Somente banco efêmero do GitHub Actions. Nenhum dado real.
create role anon;
create role authenticated;
create role service_role;
create schema auth;

create type public.lod_order_status as enum ('payment_pending','new','confirmed','preparing','ready','ready_for_pickup','out_for_delivery','completed','cancelled');
create type public.lod_payment_status as enum ('pending','paid','failed','cancelled','refunded');
create type public.lod_payment_method as enum ('mercado_pago_pix','mercado_pago_card','card_on_delivery','cash','whatsapp','manual_pix');
create type public.lod_print_status as enum ('pending','printing','printed','failed','cancelled');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_id text not null unique,
  order_number integer not null,
  created_at timestamptz not null default now(),
  sales_channel text not null,
  payment_method public.lod_payment_method not null,
  payment_status public.lod_payment_status not null,
  order_status public.lod_order_status not null,
  customer_name text not null default 'Cliente Teste',
  customer_phone text not null default '000',
  notes text, cash_change_for numeric,
  fulfillment_type text not null default 'pickup',
  neighborhood text,street text,street_number text,complement text,reference text,
  total numeric not null default 15.90,currency text default 'BRL'
);

create table public.print_jobs (
 id uuid primary key default gen_random_uuid(),
 order_uuid uuid not null references public.orders(id),
 job_key text not null unique,
 kind text not null default 'initial',
 status public.lod_print_status not null default 'pending',
 claim_token uuid,claimed_by text,claimed_at timestamptz,
 attempts integer not null default 0,
 last_error text,requested_by uuid,printed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table public.order_items (
 id uuid primary key default gen_random_uuid(),
 order_uuid uuid not null references public.orders(id),
 name text not null default 'Produto teste',
 size_label text,option_names text[],quantity integer not null default 1,
 unit_price numeric not null default 15.90,
 line_total numeric not null default 15.90,
 created_at timestamptz not null default now()
);

create or replace function public.lod_require_authenticated_staff()
returns uuid language sql stable as $$
 select '11111111-1111-4111-8111-111111111111'::uuid;
$$;

insert into public.orders(order_id,order_number,sales_channel,payment_method,payment_status,order_status,created_at)
values ('legacy',1000,'site','mercado_pago_pix','paid','completed',now()-interval '2 days');
insert into public.print_jobs(order_uuid,job_key,status,created_at)
select id,'initial:legacy','pending',now()-interval '2 days' from public.orders where order_id='legacy';
