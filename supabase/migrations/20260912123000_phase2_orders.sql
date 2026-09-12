begin;

-- Phase 2 is additive. Existing menu, Auth and availability objects are left intact.
create extension if not exists pgcrypto with schema extensions;

do $$
begin
  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'lod_fulfillment_type') then
    create type public.lod_fulfillment_type as enum ('delivery', 'pickup');
  end if;
  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'lod_payment_method') then
    create type public.lod_payment_method as enum ('mercado_pago_pix', 'mercado_pago_card', 'card_on_delivery', 'cash', 'whatsapp');
  end if;
  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'lod_payment_status') then
    create type public.lod_payment_status as enum ('pending', 'paid', 'failed', 'cancelled', 'refunded');
  end if;
  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'lod_order_status') then
    create type public.lod_order_status as enum ('payment_pending', 'new', 'confirmed', 'preparing', 'ready', 'ready_for_pickup', 'out_for_delivery', 'completed', 'cancelled');
  end if;
  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'lod_job_status') then
    create type public.lod_job_status as enum ('pending', 'processing', 'sent', 'failed');
  end if;
  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'lod_print_status') then
    create type public.lod_print_status as enum ('pending', 'printing', 'printed', 'failed', 'cancelled');
  end if;
end
$$;

create sequence if not exists public.lod_order_number_seq
  as bigint
  start with 1001
  increment by 1
  minvalue 1001
  no maxvalue
  cache 1;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_id text not null unique,
  order_number bigint not null unique default nextval('public.lod_order_number_seq'),
  tracking_token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  request_hash text not null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  sales_channel text not null default 'site',
  checkout_channel text not null default 'site',
  fulfillment_type public.lod_fulfillment_type not null,
  delivery_zone_id text,
  neighborhood text,
  street text,
  street_number text,
  complement text,
  reference text,
  subtotal numeric(12,2) not null,
  delivery_fee numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null,
  currency text not null default 'BRL',
  payment_method public.lod_payment_method not null,
  payment_status public.lod_payment_status not null default 'pending',
  order_status public.lod_order_status not null default 'payment_pending',
  cash_change_for numeric(12,2),
  mercado_pago_order_id text,
  mercado_pago_payment_id text,
  gateway_environment text,
  gateway_status text,
  gateway_status_detail text,
  source text,
  origem text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  fbclid text,
  fbp text,
  fbc text,
  tintim_fbid text,
  landing_url text,
  event_source_url text,
  source_parameters jsonb not null default '{}'::jsonb,
  meta_purchase_status public.lod_job_status not null default 'pending',
  meta_purchase_event_id text,
  meta_purchase_sent_at timestamptz,
  meta_purchase_attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  completed_at timestamptz,
  constraint orders_order_id_format check (order_id ~ '^LOD-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$'),
  constraint orders_tracking_token_format check (tracking_token ~ '^[0-9a-f]{48}$'),
  constraint orders_request_hash_format check (request_hash ~ '^[0-9a-f]{64}$'),
  constraint orders_customer_name_length check (char_length(customer_name) between 2 and 100),
  constraint orders_customer_phone_format check (customer_phone ~ '^[0-9]{10,15}$'),
  constraint orders_customer_email_length check (customer_email is null or char_length(customer_email) <= 254),
  constraint orders_sales_channel_check check (sales_channel in ('site', 'whatsapp')),
  constraint orders_checkout_channel_check check (checkout_channel in ('site', 'whatsapp')),
  constraint orders_amounts_check check (subtotal >= 0 and delivery_fee >= 0 and discount >= 0 and total = subtotal + delivery_fee - discount and total > 0),
  constraint orders_currency_check check (currency = 'BRL'),
  constraint orders_gateway_environment_check check (gateway_environment is null or gateway_environment in ('test', 'production')),
  constraint orders_source_parameters_object check (jsonb_typeof(source_parameters) = 'object'),
  constraint orders_online_email_check check (payment_method not in ('mercado_pago_pix', 'mercado_pago_card') or customer_email is not null),
  constraint orders_cash_change_check check (payment_method = 'cash' or cash_change_for is null),
  constraint orders_delivery_address_check check (
    fulfillment_type = 'pickup'
    or (delivery_zone_id is not null and neighborhood is not null and street is not null and street_number is not null)
  )
);

alter sequence public.lod_order_number_seq owned by public.orders.order_number;

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_uuid uuid not null references public.orders(id) on delete cascade,
  item_key text not null,
  product_id text not null,
  category_key text not null,
  item_type text not null,
  name text not null,
  variant_id text not null,
  variant_item_key text,
  size_label text,
  option_ids text[] not null default '{}',
  option_item_keys text[] not null default '{}',
  option_names jsonb not null default '[]'::jsonb,
  quantity integer not null,
  unit_price numeric(12,2) not null,
  line_total numeric(12,2) not null,
  item_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  constraint order_items_type_check check (item_type in ('popcorn', 'slice')),
  constraint order_items_name_length check (char_length(name) between 1 and 160),
  constraint order_items_quantity_check check (quantity between 1 and 99),
  constraint order_items_amounts_check check (unit_price > 0 and line_total = unit_price * quantity),
  constraint order_items_options_array check (jsonb_typeof(option_names) = 'array'),
  constraint order_items_snapshot_object check (jsonb_typeof(item_snapshot) = 'object')
);

create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_uuid uuid not null references public.orders(id) on delete cascade,
  attempt_number integer not null,
  gateway text not null default 'mercado_pago',
  method public.lod_payment_method not null,
  idempotency_key text not null unique,
  status text not null default 'created',
  mercado_pago_order_id text,
  mercado_pago_payment_id text,
  gateway_status text,
  gateway_status_detail text,
  safe_response jsonb not null default '{}'::jsonb,
  last_error_code text,
  last_error_message text,
  retry_after timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint payment_attempts_number_check check (attempt_number > 0),
  constraint payment_attempts_gateway_check check (gateway = 'mercado_pago'),
  constraint payment_attempts_method_check check (method in ('mercado_pago_pix', 'mercado_pago_card')),
  constraint payment_attempts_status_check check (status in ('created', 'requesting', 'pending', 'processing', 'processed', 'failed', 'cancelled', 'unknown', 'retry_wait')),
  constraint payment_attempts_safe_response_object check (jsonb_typeof(safe_response) = 'object'),
  unique (order_uuid, attempt_number)
);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  order_uuid uuid references public.orders(id) on delete set null,
  gateway text not null default 'mercado_pago',
  provider_event_key text not null unique,
  request_id text,
  event_type text,
  action text,
  mercado_pago_order_id text not null,
  mercado_pago_payment_id text,
  external_reference text,
  gateway_status text,
  gateway_status_detail text,
  body_hash text,
  sanitized_payload jsonb not null default '{}'::jsonb,
  processing_status public.lod_job_status not null default 'processing',
  last_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint payment_events_gateway_check check (gateway = 'mercado_pago'),
  constraint payment_events_payload_object check (jsonb_typeof(sanitized_payload) = 'object')
);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_uuid uuid not null references public.orders(id) on delete cascade,
  previous_order_status public.lod_order_status,
  new_order_status public.lod_order_status,
  previous_payment_status public.lod_payment_status,
  new_payment_status public.lod_payment_status,
  source text not null,
  source_event_key text,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint order_status_history_source_check check (source in ('checkout', 'mercado_pago_webhook', 'admin', 'system'))
);

create table if not exists public.event_outbox (
  id uuid primary key default gen_random_uuid(),
  order_uuid uuid not null references public.orders(id) on delete cascade,
  event_type text not null,
  dedupe_key text not null unique,
  payload jsonb not null default '{}'::jsonb,
  status public.lod_job_status not null default 'pending',
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_outbox_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint event_outbox_attempts_check check (attempts >= 0)
);

create table if not exists public.print_jobs (
  id uuid primary key default gen_random_uuid(),
  order_uuid uuid not null references public.orders(id) on delete cascade,
  job_key text not null unique,
  kind text not null default 'initial',
  status public.lod_print_status not null default 'pending',
  claim_token uuid,
  claimed_by text,
  claimed_at timestamptz,
  attempts integer not null default 0,
  last_error text,
  requested_by uuid references auth.users(id) on delete set null,
  printed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint print_jobs_kind_check check (kind in ('initial', 'reprint')),
  constraint print_jobs_attempts_check check (attempts >= 0)
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_operational_queue_idx on public.orders (order_status, created_at) where order_status not in ('completed', 'cancelled');
create index if not exists orders_payment_queue_idx on public.orders (payment_status, created_at) where payment_status = 'pending';
create unique index if not exists orders_mercado_pago_order_id_unique on public.orders (mercado_pago_order_id) where mercado_pago_order_id is not null;
create unique index if not exists orders_mercado_pago_payment_id_unique on public.orders (mercado_pago_payment_id) where mercado_pago_payment_id is not null;
create index if not exists order_items_order_uuid_idx on public.order_items (order_uuid, created_at);
create index if not exists payment_attempts_order_uuid_idx on public.payment_attempts (order_uuid, attempt_number desc);
create unique index if not exists payment_attempts_mp_order_unique on public.payment_attempts (mercado_pago_order_id) where mercado_pago_order_id is not null;
create unique index if not exists payment_attempts_mp_payment_unique on public.payment_attempts (mercado_pago_payment_id) where mercado_pago_payment_id is not null;
create unique index if not exists payment_attempts_one_open_per_order on public.payment_attempts (order_uuid)
  where status in ('created', 'requesting', 'pending', 'processing', 'unknown', 'retry_wait');
create index if not exists payment_events_order_uuid_idx on public.payment_events (order_uuid, received_at desc);
create index if not exists order_status_history_order_uuid_idx on public.order_status_history (order_uuid, created_at desc);
create index if not exists event_outbox_pending_idx on public.event_outbox (available_at, created_at) where status in ('pending', 'failed');
create index if not exists print_jobs_pending_idx on public.print_jobs (created_at) where status in ('pending', 'failed');

create or replace function public.lod_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_touch_updated_at on public.orders;
create trigger orders_touch_updated_at before update on public.orders
for each row execute function public.lod_touch_updated_at();

drop trigger if exists payment_attempts_touch_updated_at on public.payment_attempts;
create trigger payment_attempts_touch_updated_at before update on public.payment_attempts
for each row execute function public.lod_touch_updated_at();

drop trigger if exists event_outbox_touch_updated_at on public.event_outbox;
create trigger event_outbox_touch_updated_at before update on public.event_outbox
for each row execute function public.lod_touch_updated_at();

drop trigger if exists print_jobs_touch_updated_at on public.print_jobs;
create trigger print_jobs_touch_updated_at before update on public.print_jobs
for each row execute function public.lod_touch_updated_at();

create or replace function public.create_store_order(p_order jsonb, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_existing public.orders%rowtype;
  v_items_total numeric(12,2);
  v_order_id text := p_order->>'order_id';
  v_request_hash text := p_order->>'request_hash';
  v_payment_method public.lod_payment_method := (p_order->>'payment_method')::public.lod_payment_method;
  v_fulfillment public.lod_fulfillment_type := (p_order->>'fulfillment_type')::public.lod_fulfillment_type;
  v_order_status public.lod_order_status;
begin
  if jsonb_typeof(p_order) <> 'object' or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception using errcode = '22023', message = 'invalid_order_payload';
  end if;
  if v_order_id is null or v_request_hash is null then
    raise exception using errcode = '22023', message = 'missing_order_identity';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_order_id, 0));
  select * into v_existing from public.orders where order_id = v_order_id;
  if found then
    if v_existing.request_hash <> v_request_hash then
      raise exception using errcode = '23505', message = 'order_id_payload_conflict';
    end if;
    return jsonb_build_object(
      'id', v_existing.id,
      'order_id', v_existing.order_id,
      'order_number', v_existing.order_number,
      'tracking_token', v_existing.tracking_token,
      'payment_status', v_existing.payment_status,
      'order_status', v_existing.order_status,
      'total', v_existing.total,
      'currency', v_existing.currency,
      'idempotent', true
    );
  end if;

  v_order_status := case
    when v_payment_method in ('mercado_pago_pix', 'mercado_pago_card') then 'payment_pending'::public.lod_order_status
    else 'new'::public.lod_order_status
  end;

  insert into public.orders (
    order_id, request_hash, customer_name, customer_phone, customer_email,
    sales_channel, checkout_channel, fulfillment_type, delivery_zone_id,
    neighborhood, street, street_number, complement, reference,
    subtotal, delivery_fee, discount, total, currency,
    payment_method, payment_status, order_status, cash_change_for,
    gateway_environment, source, origem, utm_source, utm_medium,
    utm_campaign, utm_content, utm_term, fbclid, fbp, fbc, tintim_fbid,
    landing_url, event_source_url, source_parameters
  ) values (
    v_order_id, v_request_hash, p_order->>'customer_name', p_order->>'customer_phone', nullif(p_order->>'customer_email', ''),
    coalesce(nullif(p_order->>'sales_channel', ''), 'site'), coalesce(nullif(p_order->>'checkout_channel', ''), 'site'),
    v_fulfillment, nullif(p_order->>'delivery_zone_id', ''),
    nullif(p_order->>'neighborhood', ''), nullif(p_order->>'street', ''), nullif(p_order->>'street_number', ''),
    nullif(p_order->>'complement', ''), nullif(p_order->>'reference', ''),
    (p_order->>'subtotal')::numeric, (p_order->>'delivery_fee')::numeric, coalesce((p_order->>'discount')::numeric, 0),
    (p_order->>'total')::numeric, coalesce(nullif(p_order->>'currency', ''), 'BRL'),
    v_payment_method, 'pending', v_order_status, nullif(p_order->>'cash_change_for', '')::numeric,
    nullif(p_order->>'gateway_environment', ''), nullif(p_order->>'source', ''), nullif(p_order->>'origem', ''),
    nullif(p_order->>'utm_source', ''), nullif(p_order->>'utm_medium', ''), nullif(p_order->>'utm_campaign', ''),
    nullif(p_order->>'utm_content', ''), nullif(p_order->>'utm_term', ''), nullif(p_order->>'fbclid', ''),
    nullif(p_order->>'fbp', ''), nullif(p_order->>'fbc', ''), nullif(p_order->>'tintim_fbid', ''),
    nullif(p_order->>'landing_url', ''), nullif(p_order->>'event_source_url', ''), coalesce(p_order->'source_parameters', '{}'::jsonb)
  ) returning * into v_order;

  insert into public.order_items (
    order_uuid, item_key, product_id, category_key, item_type, name,
    variant_id, variant_item_key, size_label, option_ids, option_item_keys,
    option_names, quantity, unit_price, line_total, item_snapshot
  )
  select
    v_order.id,
    item->>'item_key',
    item->>'product_id',
    item->>'category_key',
    item->>'item_type',
    item->>'name',
    item->>'variant_id',
    nullif(item->>'variant_item_key', ''),
    nullif(item->>'size_label', ''),
    coalesce(array(select jsonb_array_elements_text(coalesce(item->'option_ids', '[]'::jsonb))), '{}'),
    coalesce(array(select jsonb_array_elements_text(coalesce(item->'option_item_keys', '[]'::jsonb))), '{}'),
    coalesce(item->'option_names', '[]'::jsonb),
    (item->>'quantity')::integer,
    (item->>'unit_price')::numeric,
    (item->>'line_total')::numeric,
    item
  from jsonb_array_elements(p_items) as item;

  select coalesce(sum(line_total), 0) into v_items_total from public.order_items where order_uuid = v_order.id;
  if v_items_total <> v_order.subtotal then
    raise exception using errcode = '22003', message = 'order_subtotal_mismatch';
  end if;

  insert into public.order_status_history (
    order_uuid, new_order_status, new_payment_status, source
  ) values (v_order.id, v_order.order_status, v_order.payment_status, 'checkout');

  if v_payment_method in ('card_on_delivery', 'cash') then
    insert into public.event_outbox (order_uuid, event_type, dedupe_key, payload)
    values (v_order.id, 'kitchen_order_actionable', 'kitchen:' || v_order.order_id, jsonb_build_object('order_id', v_order.order_id, 'order_number', v_order.order_number))
    on conflict (dedupe_key) do nothing;

    insert into public.print_jobs (order_uuid, job_key, kind)
    values (v_order.id, 'initial:' || v_order.order_id, 'initial')
    on conflict (job_key) do nothing;
  end if;

  return jsonb_build_object(
    'id', v_order.id,
    'order_id', v_order.order_id,
    'order_number', v_order.order_number,
    'tracking_token', v_order.tracking_token,
    'payment_status', v_order.payment_status,
    'order_status', v_order.order_status,
    'total', v_order.total,
    'currency', v_order.currency,
    'idempotent', false
  );
end;
$$;

create or replace function public.get_or_create_payment_attempt(
  p_order_uuid uuid,
  p_method public.lod_payment_method,
  p_new_attempt boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_attempt public.payment_attempts%rowtype;
  v_next integer;
begin
  select * into v_order from public.orders where id = p_order_uuid for update;
  if not found then raise exception using errcode = 'P0002', message = 'order_not_found'; end if;
  if v_order.payment_status = 'paid' then raise exception using errcode = 'P0001', message = 'order_already_paid'; end if;
  if p_method not in ('mercado_pago_pix', 'mercado_pago_card') or p_method <> v_order.payment_method then
    raise exception using errcode = '22023', message = 'invalid_payment_method';
  end if;

  select * into v_attempt from public.payment_attempts where order_uuid = p_order_uuid order by attempt_number desc limit 1 for update;
  if found and v_attempt.status in ('created', 'requesting', 'pending', 'processing', 'unknown', 'retry_wait', 'processed') then
    return to_jsonb(v_attempt) - 'safe_response' || jsonb_build_object('safe_response', v_attempt.safe_response, 'reused', true);
  end if;
  if found and not p_new_attempt then
    raise exception using errcode = 'P0001', message = 'new_payment_attempt_required';
  end if;

  select coalesce(max(attempt_number), 0) + 1 into v_next from public.payment_attempts where order_uuid = p_order_uuid;
  insert into public.payment_attempts (order_uuid, attempt_number, method, idempotency_key)
  values (p_order_uuid, v_next, p_method, gen_random_uuid()::text)
  returning * into v_attempt;

  return to_jsonb(v_attempt) - 'safe_response' || jsonb_build_object('safe_response', v_attempt.safe_response, 'reused', false);
end;
$$;

create or replace function public.apply_mercadopago_order_event(
  p_provider_event_key text,
  p_request_id text,
  p_event_type text,
  p_action text,
  p_mp_order_id text,
  p_mp_payment_id text,
  p_external_reference text,
  p_gateway_status text,
  p_gateway_status_detail text,
  p_total numeric,
  p_currency text,
  p_environment text,
  p_body_hash text,
  p_sanitized_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_event_id uuid;
  v_previous_payment public.lod_payment_status;
  v_previous_order public.lod_order_status;
  v_target_payment public.lod_payment_status;
  v_target_order public.lod_order_status;
  v_changed_to_paid boolean := false;
begin
  if p_provider_event_key is null or p_mp_order_id is null or p_external_reference is null then
    raise exception using errcode = '22023', message = 'invalid_gateway_event';
  end if;
  if p_environment not in ('test', 'production') then
    raise exception using errcode = '22023', message = 'invalid_gateway_environment';
  end if;

  select * into v_order from public.orders where order_id = p_external_reference for update;
  if not found then raise exception using errcode = 'P0002', message = 'order_not_found'; end if;
  if v_order.sales_channel <> 'site' or v_order.payment_method not in ('mercado_pago_pix', 'mercado_pago_card') then
    raise exception using errcode = '22023', message = 'gateway_event_channel_mismatch';
  end if;
  if v_order.gateway_environment is distinct from p_environment then
    raise exception using errcode = '22023', message = 'gateway_environment_mismatch';
  end if;
  if v_order.total <> p_total or v_order.currency <> upper(p_currency) then
    raise exception using errcode = '22003', message = 'gateway_amount_mismatch';
  end if;
  if v_order.mercado_pago_order_id is not null and v_order.mercado_pago_order_id <> p_mp_order_id then
    raise exception using errcode = '23505', message = 'gateway_order_id_mismatch';
  end if;

  insert into public.payment_events (
    order_uuid, provider_event_key, request_id, event_type, action,
    mercado_pago_order_id, mercado_pago_payment_id, external_reference,
    gateway_status, gateway_status_detail, body_hash, sanitized_payload,
    processing_status
  ) values (
    v_order.id, p_provider_event_key, p_request_id, p_event_type, p_action,
    p_mp_order_id, p_mp_payment_id, p_external_reference,
    p_gateway_status, p_gateway_status_detail, p_body_hash, coalesce(p_sanitized_payload, '{}'::jsonb),
    'processing'
  ) on conflict (provider_event_key) do nothing returning id into v_event_id;

  if v_event_id is null then
    return jsonb_build_object('duplicate', true, 'order_id', v_order.order_id, 'order_number', v_order.order_number, 'changed_to_paid', false);
  end if;

  v_previous_payment := v_order.payment_status;
  v_previous_order := v_order.order_status;
  v_target_payment := case
    when lower(p_gateway_status) = 'processed' and lower(p_gateway_status_detail) = 'accredited' then 'paid'::public.lod_payment_status
    when lower(p_gateway_status) in ('cancelled', 'canceled') then 'cancelled'::public.lod_payment_status
    when lower(p_gateway_status) in ('failed', 'refused') then 'failed'::public.lod_payment_status
    else 'pending'::public.lod_payment_status
  end;

  if v_previous_payment = 'paid' and v_target_payment <> 'paid' then
    v_target_payment := 'paid';
  end if;
  v_target_order := case
    when v_target_payment = 'paid' and v_order.order_status = 'payment_pending' then 'new'::public.lod_order_status
    else v_order.order_status
  end;
  v_changed_to_paid := v_previous_payment <> 'paid' and v_target_payment = 'paid';

  update public.orders set
    payment_status = v_target_payment,
    order_status = v_target_order,
    mercado_pago_order_id = p_mp_order_id,
    mercado_pago_payment_id = coalesce(p_mp_payment_id, mercado_pago_payment_id),
    gateway_status = p_gateway_status,
    gateway_status_detail = p_gateway_status_detail,
    paid_at = case when v_changed_to_paid then now() else paid_at end
  where id = v_order.id;

  update public.payment_attempts set
    status = case
      when v_target_payment = 'paid' then 'processed'
      when v_target_payment = 'failed' then 'failed'
      when v_target_payment = 'cancelled' then 'cancelled'
      when lower(p_gateway_status) = 'processing' then 'processing'
      else 'pending'
    end,
    mercado_pago_order_id = p_mp_order_id,
    mercado_pago_payment_id = coalesce(p_mp_payment_id, mercado_pago_payment_id),
    gateway_status = p_gateway_status,
    gateway_status_detail = p_gateway_status_detail,
    completed_at = case when v_target_payment in ('paid', 'failed', 'cancelled') then now() else completed_at end
  where id = (
    select id from public.payment_attempts where order_uuid = v_order.id order by attempt_number desc limit 1
  );

  if v_previous_payment is distinct from v_target_payment or v_previous_order is distinct from v_target_order then
    insert into public.order_status_history (
      order_uuid, previous_order_status, new_order_status,
      previous_payment_status, new_payment_status, source, source_event_key
    ) values (
      v_order.id, v_previous_order, v_target_order,
      v_previous_payment, v_target_payment, 'mercado_pago_webhook', p_provider_event_key
    );
  end if;

  if v_changed_to_paid then
    insert into public.event_outbox (order_uuid, event_type, dedupe_key, payload)
    values (v_order.id, 'meta_purchase', 'meta_purchase:' || v_order.order_id, jsonb_build_object('order_id', v_order.order_id))
    on conflict (dedupe_key) do nothing;

    insert into public.event_outbox (order_uuid, event_type, dedupe_key, payload)
    values (v_order.id, 'kitchen_order_actionable', 'kitchen:' || v_order.order_id, jsonb_build_object('order_id', v_order.order_id, 'order_number', v_order.order_number))
    on conflict (dedupe_key) do nothing;

    insert into public.print_jobs (order_uuid, job_key, kind)
    values (v_order.id, 'initial:' || v_order.order_id, 'initial')
    on conflict (job_key) do nothing;
  end if;

  update public.payment_events set processing_status = 'sent', processed_at = now() where id = v_event_id;

  return jsonb_build_object(
    'duplicate', false,
    'order_id', v_order.order_id,
    'order_number', v_order.order_number,
    'payment_status', v_target_payment,
    'order_status', v_target_order,
    'changed_to_paid', v_changed_to_paid
  );
end;
$$;

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.payment_events enable row level security;
alter table public.order_status_history enable row level security;
alter table public.event_outbox enable row level security;
alter table public.print_jobs enable row level security;

drop policy if exists "Authenticated staff can read orders" on public.orders;
create policy "Authenticated staff can read orders" on public.orders for select to authenticated using (true);
drop policy if exists "Authenticated staff can read order items" on public.order_items;
create policy "Authenticated staff can read order items" on public.order_items for select to authenticated using (true);
drop policy if exists "Authenticated staff can read payment attempts" on public.payment_attempts;
create policy "Authenticated staff can read payment attempts" on public.payment_attempts for select to authenticated using (true);
drop policy if exists "Authenticated staff can read payment events" on public.payment_events;
create policy "Authenticated staff can read payment events" on public.payment_events for select to authenticated using (true);
drop policy if exists "Authenticated staff can read order history" on public.order_status_history;
create policy "Authenticated staff can read order history" on public.order_status_history for select to authenticated using (true);
drop policy if exists "Authenticated staff can read outbox" on public.event_outbox;
create policy "Authenticated staff can read outbox" on public.event_outbox for select to authenticated using (true);
drop policy if exists "Authenticated staff can read print jobs" on public.print_jobs;
create policy "Authenticated staff can read print jobs" on public.print_jobs for select to authenticated using (true);

revoke all on public.orders, public.order_items, public.payment_attempts, public.payment_events,
  public.order_status_history, public.event_outbox, public.print_jobs from anon, authenticated;
grant select on public.orders, public.order_items, public.payment_attempts, public.payment_events,
  public.order_status_history, public.event_outbox, public.print_jobs to authenticated;
grant all on public.orders, public.order_items, public.payment_attempts, public.payment_events,
  public.order_status_history, public.event_outbox, public.print_jobs to service_role;
revoke all on sequence public.lod_order_number_seq from anon, authenticated;
grant usage, select on sequence public.lod_order_number_seq to service_role;

revoke all on function public.create_store_order(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.get_or_create_payment_attempt(uuid, public.lod_payment_method, boolean) from public, anon, authenticated;
revoke all on function public.apply_mercadopago_order_event(text, text, text, text, text, text, text, text, text, numeric, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_store_order(jsonb, jsonb) to service_role;
grant execute on function public.get_or_create_payment_attempt(uuid, public.lod_payment_method, boolean) to service_role;
grant execute on function public.apply_mercadopago_order_event(text, text, text, text, text, text, text, text, text, numeric, text, text, text, jsonb) to service_role;

alter table public.orders replica identity full;
alter table public.order_items replica identity full;
alter table public.print_jobs replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders') then
      execute 'alter publication supabase_realtime add table public.orders';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'order_items') then
      execute 'alter publication supabase_realtime add table public.order_items';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'print_jobs') then
      execute 'alter publication supabase_realtime add table public.print_jobs';
    end if;
  end if;
end
$$;

comment on table public.orders is 'Pedidos imutáveis por identidade, com status financeiro separado do status operacional.';
comment on table public.order_items is 'Snapshot comercial dos itens no momento da compra.';
comment on table public.payment_attempts is 'Tentativas idempotentes de pagamento sem dados sensíveis de cartão.';
comment on table public.payment_events is 'Eventos sanitizados e deduplicados recebidos do gateway.';
comment on table public.event_outbox is 'Efeitos assíncronos exatamente uma vez por dedupe_key.';
comment on table public.print_jobs is 'Fila de impressão com claim atômico a ser habilitado na etapa operacional.';

commit;
