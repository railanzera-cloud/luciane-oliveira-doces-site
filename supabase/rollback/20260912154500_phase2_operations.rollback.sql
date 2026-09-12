begin;

-- Do not relabel or erase refunded attempts to fit the older constraint.
do $$
begin
  if exists (select 1 from public.payment_attempts where status = 'refunded') then
    raise exception 'rollback_blocked_refunded_attempts: preserve the current payment history and review this rollback manually';
  end if;
end;
$$;

drop function if exists public.admin_transition_order(uuid, public.lod_order_status);
drop function if exists public.admin_confirm_offline_payment(uuid);
drop function if exists public.admin_create_reprint(uuid);
drop function if exists public.claim_print_job(text);
drop function if exists public.complete_print_job(uuid, uuid);
drop function if exists public.fail_print_job(uuid, uuid, text);
drop function if exists public.get_public_order_status(text);
drop function if exists public.claim_event_outbox(text, text);
drop function if exists public.complete_event_outbox(uuid);
drop function if exists public.fail_event_outbox(uuid, text);
drop function if exists public.lod_require_authenticated_staff();

alter table public.payment_attempts
  drop constraint if exists payment_attempts_status_check;
alter table public.payment_attempts
  add constraint payment_attempts_status_check check (
    status in ('created', 'requesting', 'pending', 'processing', 'processed', 'failed', 'cancelled', 'unknown', 'retry_wait')
  );

-- Restore the payment event implementation installed by the base Phase 2 migration.
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
    return jsonb_build_object('duplicate', true, 'order_id', v_order.order_id,
      'order_number', v_order.order_number, 'changed_to_paid', false);
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
    values (v_order.id, 'meta_purchase', 'meta_purchase:' || v_order.order_id,
      jsonb_build_object('order_id', v_order.order_id))
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

revoke all on function public.apply_mercadopago_order_event(text, text, text, text, text, text, text, text, text, numeric, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.apply_mercadopago_order_event(text, text, text, text, text, text, text, text, text, numeric, text, text, text, jsonb)
  to service_role;

commit;
