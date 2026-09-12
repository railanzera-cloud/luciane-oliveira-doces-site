begin;

-- Operational Phase 2: authenticated kitchen actions, safe public tracking,
-- atomic outbox/print claims and the complete Mercado Pago status mapping.

alter table public.payment_attempts
  drop constraint if exists payment_attempts_status_check;
alter table public.payment_attempts
  add constraint payment_attempts_status_check check (
    status in ('created', 'requesting', 'pending', 'processing', 'processed', 'failed', 'cancelled', 'refunded', 'unknown', 'retry_wait')
  );

create or replace function public.lod_require_authenticated_staff()
returns uuid
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not exists (select 1 from auth.users where id = v_user_id) then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  return v_user_id;
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
  if v_order.payment_method not in ('card_on_delivery', 'cash') then
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
      meta_purchase_status = 'pending', meta_purchase_event_id = v_event_id
  where id = v_order.id;

  insert into public.order_status_history (
    order_uuid, previous_order_status, new_order_status,
    previous_payment_status, new_payment_status, source, changed_by
  ) values (
    v_order.id, v_order.order_status, v_order.order_status,
    v_order.payment_status, 'paid', 'admin', v_actor
  );

  insert into public.event_outbox (order_uuid, event_type, dedupe_key, payload)
  values (v_order.id, 'meta_purchase', 'meta_purchase:' || v_order.order_id,
    jsonb_build_object('order_id', v_order.order_id, 'event_id', v_event_id))
  on conflict (dedupe_key) do nothing;

  return jsonb_build_object('idempotent', false, 'id', v_order.id, 'order_number', v_order.order_number,
    'order_status', v_order.order_status, 'payment_status', 'paid');
end;
$$;

create or replace function public.admin_create_reprint(p_order_uuid uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_actor uuid := public.lod_require_authenticated_staff();
  v_order public.orders%rowtype;
  v_job public.print_jobs%rowtype;
begin
  select * into v_order from public.orders where id = p_order_uuid;
  if not found then raise exception using errcode = 'P0002', message = 'order_not_found'; end if;
  if v_order.order_status = 'payment_pending' then
    raise exception using errcode = '22023', message = 'order_not_actionable';
  end if;

  insert into public.print_jobs (order_uuid, job_key, kind, requested_by)
  values (v_order.id, 'reprint:' || v_order.order_id || ':' || gen_random_uuid()::text, 'reprint', v_actor)
  returning * into v_job;

  return jsonb_build_object('id', v_job.id, 'status', v_job.status, 'kind', v_job.kind,
    'order_id', v_order.order_id, 'order_number', v_order.order_number);
end;
$$;

create or replace function public.claim_print_job(p_worker_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_actor uuid := public.lod_require_authenticated_staff();
  v_job public.print_jobs%rowtype;
  v_token uuid := gen_random_uuid();
begin
  if p_worker_id is null or char_length(trim(p_worker_id)) not between 8 and 120 then
    raise exception using errcode = '22023', message = 'invalid_worker_id';
  end if;

  select * into v_job
  from public.print_jobs
  where status = 'pending'
  order by created_at
  for update skip locked
  limit 1;

  if not found then return null; end if;

  update public.print_jobs
  set status = 'printing', claim_token = v_token, claimed_by = trim(p_worker_id),
      claimed_at = now(), attempts = attempts + 1, last_error = null
  where id = v_job.id
  returning * into v_job;

  return jsonb_build_object(
    'job', jsonb_build_object('id', v_job.id, 'claim_token', v_token, 'kind', v_job.kind, 'attempts', v_job.attempts),
    'order', (
      select jsonb_build_object(
        'id', o.id, 'order_id', o.order_id, 'order_number', o.order_number,
        'customer_name', o.customer_name, 'customer_phone', o.customer_phone,
        'fulfillment_type', o.fulfillment_type, 'neighborhood', o.neighborhood,
        'street', o.street, 'street_number', o.street_number, 'complement', o.complement,
        'reference', o.reference, 'total', o.total, 'currency', o.currency,
        'payment_method', o.payment_method, 'payment_status', o.payment_status,
        'order_status', o.order_status, 'created_at', o.created_at
      ) from public.orders o where o.id = v_job.order_uuid
    ),
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', i.name, 'size_label', i.size_label, 'option_names', i.option_names,
        'quantity', i.quantity, 'unit_price', i.unit_price, 'line_total', i.line_total
      ) order by i.created_at), '[]'::jsonb)
      from public.order_items i where i.order_uuid = v_job.order_uuid
    ),
    'claimed_by', v_actor
  );
end;
$$;

create or replace function public.complete_print_job(p_job_id uuid, p_claim_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_actor uuid := public.lod_require_authenticated_staff();
  v_job public.print_jobs%rowtype;
begin
  update public.print_jobs set status = 'printed', printed_at = now(), last_error = null
  where id = p_job_id and status = 'printing' and claim_token = p_claim_token
  returning * into v_job;
  if not found then raise exception using errcode = 'P0001', message = 'stale_print_claim'; end if;
  return jsonb_build_object('id', v_job.id, 'status', v_job.status, 'printed_at', v_job.printed_at, 'completed_by', v_actor);
end;
$$;

create or replace function public.fail_print_job(p_job_id uuid, p_claim_token uuid, p_error text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_actor uuid := public.lod_require_authenticated_staff();
  v_job public.print_jobs%rowtype;
begin
  update public.print_jobs
  set status = 'failed', last_error = left(coalesce(nullif(trim(p_error), ''), 'Falha de impressão.'), 500)
  where id = p_job_id and status = 'printing' and claim_token = p_claim_token
  returning * into v_job;
  if not found then raise exception using errcode = 'P0001', message = 'stale_print_claim'; end if;
  return jsonb_build_object('id', v_job.id, 'status', v_job.status, 'failed_by', v_actor);
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
    'payment', v_safe_payment
  );
end;
$$;

create or replace function public.claim_event_outbox(p_worker_id text, p_event_type text default 'meta_purchase')
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.event_outbox%rowtype;
begin
  if p_worker_id is null or char_length(trim(p_worker_id)) not between 8 and 120 then
    raise exception using errcode = '22023', message = 'invalid_worker_id';
  end if;

  select * into v_job from public.event_outbox
  where event_type = p_event_type and status in ('pending', 'failed')
    and available_at <= now() and attempts < 10
  order by created_at
  for update skip locked
  limit 1;
  if not found then return null; end if;

  update public.event_outbox
  set status = 'processing', attempts = attempts + 1, locked_at = now(),
      locked_by = trim(p_worker_id), last_error = null
  where id = v_job.id returning * into v_job;

  update public.orders set meta_purchase_status = 'processing', meta_purchase_attempts = v_job.attempts
  where id = v_job.order_uuid and v_job.event_type = 'meta_purchase';

  return jsonb_build_object(
    'job', jsonb_build_object('id', v_job.id, 'event_type', v_job.event_type,
      'dedupe_key', v_job.dedupe_key, 'attempts', v_job.attempts, 'payload', v_job.payload),
    'order', (select to_jsonb(o) from public.orders o where o.id = v_job.order_uuid),
    'items', (select coalesce(jsonb_agg(to_jsonb(i) order by i.created_at), '[]'::jsonb)
      from public.order_items i where i.order_uuid = v_job.order_uuid)
  );
end;
$$;

create or replace function public.complete_event_outbox(p_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.event_outbox%rowtype;
begin
  update public.event_outbox set status = 'sent', sent_at = now(), locked_at = null, locked_by = null, last_error = null
  where id = p_job_id and status = 'processing' returning * into v_job;
  if not found then raise exception using errcode = 'P0001', message = 'outbox_job_not_processing'; end if;
  if v_job.event_type = 'meta_purchase' then
    update public.orders set meta_purchase_status = 'sent', meta_purchase_sent_at = now(), meta_purchase_attempts = v_job.attempts
    where id = v_job.order_uuid;
  end if;
  return jsonb_build_object('id', v_job.id, 'status', v_job.status, 'sent_at', v_job.sent_at);
end;
$$;

create or replace function public.fail_event_outbox(p_job_id uuid, p_error text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.event_outbox%rowtype;
  v_delay integer;
begin
  select * into v_job from public.event_outbox where id = p_job_id and status = 'processing' for update;
  if not found then raise exception using errcode = 'P0001', message = 'outbox_job_not_processing'; end if;
  v_delay := least(3600, (30 * power(2, greatest(0, least(v_job.attempts - 1, 7))))::integer);
  update public.event_outbox
  set status = 'failed', available_at = now() + make_interval(secs => v_delay),
      locked_at = null, locked_by = null,
      last_error = left(coalesce(nullif(trim(p_error), ''), 'Falha no efeito assíncrono.'), 500)
  where id = v_job.id returning * into v_job;
  if v_job.event_type = 'meta_purchase' then
    update public.orders set meta_purchase_status = 'failed', meta_purchase_attempts = v_job.attempts
    where id = v_job.order_uuid;
  end if;
  return jsonb_build_object('id', v_job.id, 'status', v_job.status, 'retry_at', v_job.available_at);
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
  v_meta_event_id text;
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
    gateway_status, gateway_status_detail, body_hash, sanitized_payload, processing_status
  ) values (
    v_order.id, p_provider_event_key, p_request_id, p_event_type, p_action,
    p_mp_order_id, p_mp_payment_id, p_external_reference,
    p_gateway_status, p_gateway_status_detail, p_body_hash, coalesce(p_sanitized_payload, '{}'::jsonb), 'processing'
  ) on conflict (provider_event_key) do nothing returning id into v_event_id;

  if v_event_id is null then
    return jsonb_build_object('duplicate', true, 'order_id', v_order.order_id,
      'order_number', v_order.order_number, 'changed_to_paid', false);
  end if;

  v_previous_payment := v_order.payment_status;
  v_previous_order := v_order.order_status;
  v_target_payment := case
    when lower(p_gateway_status) = 'processed' and lower(p_gateway_status_detail) = 'accredited' then 'paid'::public.lod_payment_status
    when lower(p_gateway_status) in ('refunded', 'charged_back', 'chargeback') then 'refunded'::public.lod_payment_status
    when lower(p_gateway_status) in ('cancelled', 'canceled', 'expired') then 'cancelled'::public.lod_payment_status
    when lower(p_gateway_status) in ('failed', 'refused') then 'failed'::public.lod_payment_status
    else 'pending'::public.lod_payment_status
  end;

  if v_previous_payment = 'refunded' then v_target_payment := 'refunded'; end if;
  if v_previous_payment = 'paid' and v_target_payment not in ('paid', 'refunded') then v_target_payment := 'paid'; end if;
  v_target_order := case
    when v_target_payment = 'paid' and v_order.order_status = 'payment_pending' then 'new'::public.lod_order_status
    else v_order.order_status
  end;
  v_changed_to_paid := v_previous_payment <> 'paid' and v_target_payment = 'paid';
  v_meta_event_id := coalesce(v_order.meta_purchase_event_id, 'lod_purchase_' || lower(replace(v_order.order_id, '-', '_')));

  update public.orders set
    payment_status = v_target_payment,
    order_status = v_target_order,
    mercado_pago_order_id = p_mp_order_id,
    mercado_pago_payment_id = coalesce(p_mp_payment_id, mercado_pago_payment_id),
    gateway_status = p_gateway_status,
    gateway_status_detail = p_gateway_status_detail,
    paid_at = case when v_changed_to_paid then now() else paid_at end,
    meta_purchase_event_id = case when v_changed_to_paid then v_meta_event_id else meta_purchase_event_id end,
    meta_purchase_status = case when v_changed_to_paid then 'pending' else meta_purchase_status end
  where id = v_order.id;

  update public.payment_attempts set
    status = case
      when v_target_payment = 'paid' then 'processed'
      when v_target_payment = 'refunded' then 'refunded'
      when v_target_payment = 'failed' then 'failed'
      when v_target_payment = 'cancelled' then 'cancelled'
      when lower(p_gateway_status) = 'processing' then 'processing'
      else 'pending'
    end,
    mercado_pago_order_id = p_mp_order_id,
    mercado_pago_payment_id = coalesce(p_mp_payment_id, mercado_pago_payment_id),
    gateway_status = p_gateway_status,
    gateway_status_detail = p_gateway_status_detail,
    completed_at = case when v_target_payment in ('paid', 'failed', 'cancelled', 'refunded') then now() else completed_at end
  where id = (select id from public.payment_attempts where order_uuid = v_order.id order by attempt_number desc limit 1);

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
    values (v_order.id, 'meta_purchase', 'meta_purchase:' || v_order.order_id,
      jsonb_build_object('order_id', v_order.order_id, 'event_id', v_meta_event_id))
    on conflict (dedupe_key) do nothing;
    insert into public.event_outbox (order_uuid, event_type, dedupe_key, payload)
    values (v_order.id, 'kitchen_order_actionable', 'kitchen:' || v_order.order_id,
      jsonb_build_object('order_id', v_order.order_id, 'order_number', v_order.order_number))
    on conflict (dedupe_key) do nothing;
    insert into public.print_jobs (order_uuid, job_key, kind)
    values (v_order.id, 'initial:' || v_order.order_id, 'initial')
    on conflict (job_key) do nothing;
  end if;

  update public.payment_events set processing_status = 'sent', processed_at = now() where id = v_event_id;
  return jsonb_build_object(
    'duplicate', false, 'order_id', v_order.order_id, 'order_number', v_order.order_number,
    'payment_status', v_target_payment, 'order_status', v_target_order,
    'changed_to_paid', v_changed_to_paid
  );
end;
$$;

revoke all on function public.lod_require_authenticated_staff() from public, anon, authenticated;
revoke all on function public.admin_transition_order(uuid, public.lod_order_status) from public, anon, authenticated;
revoke all on function public.admin_confirm_offline_payment(uuid) from public, anon, authenticated;
revoke all on function public.admin_create_reprint(uuid) from public, anon, authenticated;
revoke all on function public.claim_print_job(text) from public, anon, authenticated;
revoke all on function public.complete_print_job(uuid, uuid) from public, anon, authenticated;
revoke all on function public.fail_print_job(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.get_public_order_status(text) from public, anon, authenticated;
revoke all on function public.claim_event_outbox(text, text) from public, anon, authenticated;
revoke all on function public.complete_event_outbox(uuid) from public, anon, authenticated;
revoke all on function public.fail_event_outbox(uuid, text) from public, anon, authenticated;

grant execute on function public.admin_transition_order(uuid, public.lod_order_status) to authenticated;
grant execute on function public.admin_confirm_offline_payment(uuid) to authenticated;
grant execute on function public.admin_create_reprint(uuid) to authenticated;
grant execute on function public.claim_print_job(text) to authenticated;
grant execute on function public.complete_print_job(uuid, uuid) to authenticated;
grant execute on function public.fail_print_job(uuid, uuid, text) to authenticated;
grant execute on function public.get_public_order_status(text) to service_role;
grant execute on function public.claim_event_outbox(text, text) to service_role;
grant execute on function public.complete_event_outbox(uuid) to service_role;
grant execute on function public.fail_event_outbox(uuid, text) to service_role;

comment on function public.claim_print_job(text) is 'Claims one pending print job atomically; failed or uncertain jobs require explicit reprint.';
comment on function public.get_public_order_status(text) is 'Returns a PII-free order snapshot only for a high-entropy tracking token.';
comment on function public.claim_event_outbox(text, text) is 'Claims one downstream effect atomically with bounded retry attempts.';

commit;
