-- Pending application: payment retries and fenced outbox recovery.
-- Does not touch catalog, store settings, users, Auth or existing availability RLS.
begin;

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
  if v_order.order_status = 'cancelled' or v_order.payment_status = 'refunded' then
    raise exception using errcode = 'P0001', message = 'order_not_payable';
  end if;
  if p_method not in ('mercado_pago_pix', 'mercado_pago_card') or p_method <> v_order.payment_method then
    raise exception using errcode = '22023', message = 'invalid_payment_method';
  end if;

  if v_order.payment_status = 'paid' then
    select * into v_attempt from public.payment_attempts
    where order_uuid = p_order_uuid and mercado_pago_order_id = v_order.mercado_pago_order_id
      and status = 'processed' for update;
    if found then return to_jsonb(v_attempt) || jsonb_build_object('reused', true); end if;
    raise exception using errcode = 'P0001', message = 'order_already_paid';
  end if;

  select * into v_attempt from public.payment_attempts where order_uuid = p_order_uuid order by attempt_number desc limit 1 for update;
  if found and v_attempt.status in ('created', 'requesting', 'pending', 'processing', 'unknown', 'retry_wait', 'processed') then
    return to_jsonb(v_attempt) - 'safe_response' || jsonb_build_object('safe_response', v_attempt.safe_response, 'reused', true);
  end if;
  if found and not p_new_attempt then
    raise exception using errcode = 'P0001', message = 'new_payment_attempt_required';
  end if;

  if v_order.payment_status = 'paid' then
    raise exception using errcode = 'P0001', message = 'order_already_paid';
  end if;

  select coalesce(max(attempt_number), 0) + 1 into v_next from public.payment_attempts where order_uuid = p_order_uuid;
  insert into public.payment_attempts (order_uuid, attempt_number, method, idempotency_key)
  values (p_order_uuid, v_next, p_method, gen_random_uuid()::text)
  returning * into v_attempt;

  -- The failed attempt retains its gateway identifiers and complete history.
  update public.orders set payment_status = 'pending', mercado_pago_order_id = null,
    mercado_pago_payment_id = null, gateway_status = null, gateway_status_detail = null
  where id = p_order_uuid;

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
  v_attempt public.payment_attempts%rowtype;
  v_latest_attempt_id uuid;
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
  -- Bind an event to its actual attempt, never blindly to the latest row.
  select * into v_attempt from public.payment_attempts
  where order_uuid = v_order.id and mercado_pago_order_id = p_mp_order_id for update;
  if not found then
    -- A verified webhook can arrive before the create response is persisted.
    select * into v_attempt from public.payment_attempts
    where order_uuid = v_order.id and mercado_pago_order_id is null
      and status in ('requesting', 'unknown', 'retry_wait')
    order by attempt_number desc limit 1 for update;
    if not found then
      raise exception using errcode = '22023', message = 'gateway_attempt_not_found';
    end if;
  end if;
  select id into v_latest_attempt_id from public.payment_attempts
  where order_uuid = v_order.id order by attempt_number desc limit 1;

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

  if v_attempt.status = 'refunded' then v_target_payment := 'refunded'; end if;
  if v_attempt.status = 'processed' and v_target_payment not in ('paid', 'refunded') then v_target_payment := 'paid'; end if;
  if v_attempt.status in ('failed', 'cancelled') and v_target_payment = 'pending' then
    v_target_payment := v_attempt.status::public.lod_payment_status;
  end if;

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
    safe_response = safe_response || jsonb_build_object(
      'status', p_gateway_status, 'status_detail', p_gateway_status_detail,
      'payment', coalesce(safe_response->'payment', '{}'::jsonb) || coalesce(p_sanitized_payload->'payment', '{}'::jsonb)),
    gateway_status = p_gateway_status,
    gateway_status_detail = p_gateway_status_detail,
    completed_at = case when v_target_payment in ('paid', 'failed', 'cancelled', 'refunded') then now() else completed_at end
  where id = v_attempt.id;

  -- A late rejection/cancellation from an older attempt cannot replace the
  -- current attempt. Refunds only affect the attempt that funded this order.
  if (v_attempt.id <> v_latest_attempt_id and v_target_payment <> 'paid'
      and not (v_target_payment = 'refunded' and v_order.mercado_pago_order_id = p_mp_order_id))
     or (v_target_payment <> 'paid' and v_order.payment_status = 'paid'
         and v_order.mercado_pago_order_id is distinct from p_mp_order_id) then
    update public.payment_events set processing_status = 'sent', processed_at = now()
    where id = v_event_id;
    return jsonb_build_object('duplicate', false, 'ignored_old_attempt', true,
      'order_id', v_order.order_id, 'payment_status', v_order.payment_status,
      'order_status', v_order.order_status, 'changed_to_paid', false);
  end if;

  if v_target_payment = 'paid' and v_order.payment_status = 'paid'
     and v_order.mercado_pago_order_id is distinct from p_mp_order_id then
    update public.payment_events set processing_status = 'failed', processed_at = now(),
      last_error = 'multiple_accredited_payments_requires_review'
    where id = v_event_id;
    return jsonb_build_object('duplicate', false, 'requires_manual_review', true,
      'order_id', v_order.order_id, 'payment_status', v_order.payment_status,
      'order_status', v_order.order_status, 'changed_to_paid', false);
  end if;

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
  where event_type = p_event_type and attempts < 10
    and ((status in ('pending', 'failed') and available_at <= now())
      or (status = 'processing' and locked_at < now() - interval '2 minutes'))
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

create or replace function public.complete_event_outbox(p_job_id uuid, p_worker_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.event_outbox%rowtype;
begin
  update public.event_outbox set status = 'sent', sent_at = now(), locked_at = null, locked_by = null, last_error = null
  where id = p_job_id and status = 'processing' and locked_by = p_worker_id returning * into v_job;
  if not found then raise exception using errcode = 'P0001', message = 'outbox_job_not_processing'; end if;
  if v_job.event_type = 'meta_purchase' then
    update public.orders set meta_purchase_status = 'sent', meta_purchase_sent_at = now(), meta_purchase_attempts = v_job.attempts
    where id = v_job.order_uuid;
  end if;
  return jsonb_build_object('id', v_job.id, 'status', v_job.status, 'sent_at', v_job.sent_at);
end;
$$;

create or replace function public.fail_event_outbox(p_job_id uuid, p_error text, p_worker_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.event_outbox%rowtype;
  v_delay integer;
begin
  select * into v_job from public.event_outbox where id = p_job_id and status = 'processing' and locked_by = p_worker_id for update;
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

revoke all on function public.complete_event_outbox(uuid, text) from public, anon, authenticated;
revoke all on function public.fail_event_outbox(uuid, text, text) from public, anon, authenticated;
grant execute on function public.complete_event_outbox(uuid, text) to service_role;
grant execute on function public.fail_event_outbox(uuid, text, text) to service_role;

-- Retire unfenced variants. Requires the matching process-order-effects source.
drop function if exists public.complete_event_outbox(uuid);
drop function if exists public.fail_event_outbox(uuid, text);

commit;
