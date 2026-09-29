begin;
-- Existing sequence, tables, staff authorization and private RLS are preserved.
alter table public.orders alter column customer_phone drop not null;
alter table public.orders add constraint orders_site_phone_required check (sales_channel <> 'site' or customer_phone is not null);
alter table public.orders add column notes text check (char_length(notes) <= 500);
alter table public.orders add column attribution_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(attribution_snapshot) = 'object');
alter table public.orders add column confirmed_at timestamptz;

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
    landing_url, event_source_url, source_parameters, notes, attribution_snapshot
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
    nullif(p_order->>'landing_url', ''), nullif(p_order->>'event_source_url', ''), coalesce(p_order->'source_parameters', '{}'::jsonb), nullif(p_order->>'notes', ''), coalesce(p_order->'attribution_snapshot', '{}'::jsonb)
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

  if v_order.sales_channel = 'site' and v_payment_method in ('card_on_delivery', 'cash') then
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

create or replace function public.admin_confirm_offline_payment(p_order_uuid uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_actor uuid := public.lod_require_authenticated_staff();
  v_order public.orders%rowtype;
  v_event_id text;
begin
  select * into v_order from public.orders where id = p_order_uuid for update;
  if not found then raise exception using errcode = 'P0002', message = 'order_not_found'; end if;
  if v_order.payment_method not in ('card_on_delivery', 'cash', 'manual_pix') then
    raise exception using errcode = '22023', message = 'payment_not_confirmable_manually';
  end if;
  if v_order.order_status = 'cancelled' then
    raise exception using errcode = '22023', message = 'cancelled_order';
  end if;
  if v_order.payment_status = 'paid' then
    return jsonb_build_object('idempotent', true, 'id', v_order.id, 'order_number', v_order.order_number,
      'order_status', v_order.order_status, 'payment_status', v_order.payment_status);
  end if;

  v_event_id := 'lod_purchase_' || lower(replace(v_order.order_id, '-', '_'));
  update public.orders
  set payment_status = 'paid', paid_at = coalesce(paid_at, now()),
      meta_purchase_status = case when sales_channel = 'site' then 'pending'::public.lod_job_status else meta_purchase_status end,
      meta_purchase_event_id = case when sales_channel = 'site' then v_event_id else meta_purchase_event_id end
  where id = v_order.id;

  insert into public.order_status_history (
    order_uuid, previous_order_status, new_order_status,
    previous_payment_status, new_payment_status, source, changed_by
  ) values (
    v_order.id, v_order.order_status, v_order.order_status,
    v_order.payment_status, 'paid', 'admin', v_actor
  );

  if v_order.sales_channel = 'site' then
  insert into public.event_outbox (order_uuid, event_type, dedupe_key, payload)
  values (v_order.id, 'meta_purchase', 'meta_purchase:' || v_order.order_id,
    jsonb_build_object('order_id', v_order.order_id, 'event_id', v_event_id))
  on conflict (dedupe_key) do nothing;
  end if;

  return jsonb_build_object('idempotent', false, 'id', v_order.id, 'order_number', v_order.order_number,
    'order_status', v_order.order_status, 'payment_status', 'paid');
end;
$$;

create or replace function public.admin_transition_order(
  p_order_uuid uuid,
  p_new_status public.lod_order_status
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_actor uuid := public.lod_require_authenticated_staff();
  v_order public.orders%rowtype;
  v_allowed boolean := false;
begin
  select * into v_order from public.orders where id = p_order_uuid for update;
  if not found then raise exception using errcode = 'P0002', message = 'order_not_found'; end if;

  if v_order.order_status = p_new_status then
    return jsonb_build_object('idempotent', true, 'id', v_order.id, 'order_number', v_order.order_number,
      'order_status', v_order.order_status, 'payment_status', v_order.payment_status);
  end if;

  v_allowed := case v_order.order_status
    when 'payment_pending' then p_new_status = 'cancelled'
    when 'new' then p_new_status in ('confirmed', 'preparing', 'cancelled')
    when 'confirmed' then p_new_status in ('preparing', 'cancelled')
    when 'preparing' then p_new_status in ('ready', 'ready_for_pickup', 'out_for_delivery', 'cancelled')
    when 'ready' then p_new_status in ('ready_for_pickup', 'out_for_delivery', 'completed', 'cancelled')
    when 'ready_for_pickup' then p_new_status in ('completed', 'cancelled')
    when 'out_for_delivery' then p_new_status in ('completed', 'cancelled')
    else false
  end;
  if v_order.sales_channel = 'whatsapp' and v_order.order_status = 'new' then
    v_allowed := p_new_status in ('confirmed', 'cancelled');
  end if;
  if not v_allowed then raise exception using errcode = '22023', message = 'invalid_order_transition'; end if;

  if v_order.payment_method in ('mercado_pago_pix', 'mercado_pago_card')
    and v_order.payment_status <> 'paid' and p_new_status <> 'cancelled' then
    raise exception using errcode = '22023', message = 'online_payment_not_paid';
  end if;
  if p_new_status = 'ready_for_pickup' and v_order.fulfillment_type <> 'pickup' then
    raise exception using errcode = '22023', message = 'pickup_status_for_delivery';
  end if;
  if p_new_status = 'out_for_delivery' and v_order.fulfillment_type <> 'delivery' then
    raise exception using errcode = '22023', message = 'delivery_status_for_pickup';
  end if;

  update public.orders
  set order_status = p_new_status,
      confirmed_at = case when p_new_status = 'confirmed' then coalesce(confirmed_at, now()) else confirmed_at end,
      completed_at = case when p_new_status = 'completed' then coalesce(completed_at, now()) else completed_at end
  where id = v_order.id;

  insert into public.order_status_history (
    order_uuid, previous_order_status, new_order_status,
    previous_payment_status, new_payment_status, source, changed_by
  ) values (
    v_order.id, v_order.order_status, p_new_status,
    v_order.payment_status, v_order.payment_status, 'admin', v_actor
  );

  return jsonb_build_object('idempotent', false, 'id', v_order.id, 'order_number', v_order.order_number,
    'order_status', p_new_status, 'payment_status', v_order.payment_status);
end;
$$;

create or replace function public.get_public_order_status(p_tracking_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_safe_payment jsonb := '{}'::jsonb;
begin
  if p_tracking_token is null or p_tracking_token !~ '^[0-9a-f]{48}$' then return null; end if;
  select * into v_order from public.orders where tracking_token = p_tracking_token;
  if not found then return null; end if;

  if v_order.payment_method = 'mercado_pago_pix' and v_order.payment_status = 'pending' then
    select coalesce(safe_response, '{}'::jsonb) into v_safe_payment
    from public.payment_attempts where order_uuid = v_order.id
    order by attempt_number desc limit 1;
  end if;

  return jsonb_build_object(
    'order_number', v_order.order_number,
    'payment_method', v_order.payment_method,
    'payment_status', v_order.payment_status,
    'order_status', v_order.order_status,
    'fulfillment_type', v_order.fulfillment_type,
    'total', v_order.total,
    'currency', v_order.currency,
    'created_at', v_order.created_at,
    'updated_at', v_order.updated_at,
    'paid_at', v_order.paid_at,
    'confirmed_at', v_order.confirmed_at,
    'sales_channel', v_order.sales_channel,
    'items', (select coalesce(jsonb_agg(jsonb_build_object('name', i.name, 'size_label', i.size_label, 'option_names', i.option_names, 'quantity', i.quantity, 'line_total', i.line_total) order by i.created_at), '[]'::jsonb) from public.order_items i where i.order_uuid = v_order.id),
    'payment', v_safe_payment
  );
end;
$$;

-- Retries require the exact request hash including a browser-generated 256-bit secret.
-- LOD or human number alone cannot reveal the tracking token.
create or replace function public.recover_whatsapp_order(p_order_id text, p_request_hash text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v public.orders%rowtype;
begin
  select * into v from public.orders where order_id = p_order_id and sales_channel = 'whatsapp';
  if not found then return null; end if;
  if v.request_hash is distinct from p_request_hash then
    raise exception using errcode = '23505', message = 'order_id_payload_conflict';
  end if;
  return jsonb_build_object('id',v.id,'order_id',v.order_id,'order_number',v.order_number,
    'tracking_token',v.tracking_token,'payment_status',v.payment_status,'order_status',v.order_status,
    'total',v.total,'currency',v.currency,'idempotent',true);
end;
$$;
revoke all on function public.recover_whatsapp_order(text,text) from public, anon, authenticated;
grant execute on function public.recover_whatsapp_order(text,text) to service_role;

-- Recheck availability in the same transaction, sharing locks with staff updates.
create or replace function public.create_whatsapp_store_order(p_order jsonb, p_items jsonb, p_availability_keys text[])
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_existing jsonb; v_open boolean; v_count integer;
begin
  if p_order->>'sales_channel' is distinct from 'whatsapp'
     or p_order->>'payment_method' not in ('manual_pix','card_on_delivery','cash') then
    raise exception using errcode='22023', message='invalid_manual_order';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_order->>'order_id',0));
  v_existing := public.recover_whatsapp_order(p_order->>'order_id',p_order->>'request_hash');
  if v_existing is not null then return v_existing; end if;
  select value into v_open from public.store_settings where key='orders_open' for share;
  if v_open is distinct from true then raise exception using errcode='P0001',message='orders_closed'; end if;
  perform 1 from public.menu_availability where item_key=any(p_availability_keys) for share;
  select count(*) into v_count from public.menu_availability where item_key=any(p_availability_keys) and status='available';
  if coalesce(cardinality(p_availability_keys),0)=0 or v_count <> cardinality(p_availability_keys) then
    raise exception using errcode='P0001',message='menu_changed';
  end if;
  return public.create_store_order(p_order,p_items);
end;
$$;
revoke all on function public.create_whatsapp_store_order(jsonb,jsonb,text[]) from public, anon, authenticated;
grant execute on function public.create_whatsapp_store_order(jsonb,jsonb,text[]) to service_role;

commit;
