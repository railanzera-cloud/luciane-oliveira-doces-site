-- COZINHA / IMPRESSAO 58 MM — SOMENTE PREPARACAO; NAO APLICAR EM PRODUCAO.
-- Impacto quando futuramente aplicada: alteracoes de fila, sem abrir impressao.
-- Ativacao exige notebook/driver/QZ e homologacao fisica autorizada.
begin;

create table if not exists public.kitchen_print_control (
  control_id boolean primary key default true check (control_id = true),
  enabled boolean not null default false,
  accept_new_after timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.kitchen_print_control(control_id, enabled, accept_new_after)
values (true, false, now()) on conflict (control_id) do nothing;

alter table public.kitchen_print_control enable row level security;
revoke all on public.kitchen_print_control from public, anon, authenticated;
grant select, insert, update on public.kitchen_print_control to service_role;

-- Regra independente do estado da loja: fechá-la não invalida pedidos já aceitos.
-- Pix manual: pago E aceito; dinheiro/cartão presencial: aceito;
-- pagamento online: aprovação oficial de pagamento.
create or replace function public.lod_kitchen_print_eligible(p_order public.orders)
returns boolean language sql stable
set search_path = public, pg_temp
as $policy$
  select p_order.order_status in ('new','confirmed','preparing','ready','ready_for_pickup','out_for_delivery')
    and p_order.payment_status not in ('failed','cancelled','refunded')
    and (
      (p_order.sales_channel = 'site'
       and p_order.payment_method in ('mercado_pago_pix','mercado_pago_card')
       and p_order.payment_status = 'paid')
      or
      (p_order.sales_channel = 'whatsapp'
       and p_order.payment_method = 'manual_pix'
       and p_order.payment_status = 'paid'
       and p_order.order_status in ('confirmed','preparing','ready','ready_for_pickup','out_for_delivery'))
      or
      (p_order.sales_channel = 'whatsapp'
       and p_order.payment_method in ('cash','card_on_delivery')
       and p_order.order_status in ('confirmed','preparing','ready','ready_for_pickup','out_for_delivery'))
    );
$policy$;

-- Cada evento elegivel tenta inserir apenas uma comanda inicial.
-- Tambem funciona quando o pagamento e o aceite ocorrem em qualquer ordem.
create or replace function public.lod_queue_kitchen_print_on_order_change()
returns trigger language plpgsql security definer
set search_path = public, pg_temp
as $trigger$
declare
  v_after timestamptz;
begin
  select c.accept_new_after into v_after
  from public.kitchen_print_control c
  where c.control_id = true and c.enabled = true;
  if v_after is null or new.created_at < v_after
     or not public.lod_kitchen_print_eligible(new) then
    return new;
  end if;
  insert into public.print_jobs(order_uuid, job_key, kind)
  values (new.id, 'initial:' || new.order_id, 'initial')
  on conflict (job_key) do nothing;
  return new;
end;
$trigger$;

drop trigger if exists kitchen_print_on_order_change on public.orders;
create trigger kitchen_print_on_order_change
after insert or update of order_status, payment_status on public.orders
for each row execute function public.lod_queue_kitchen_print_on_order_change();

-- Esta funcao nao oferece mudanca de configuracao ao cliente.
-- Somente usuarios autorizados podem consultar a disponibilidade da fila.
create or replace function public.admin_get_kitchen_print_control()
returns jsonb language plpgsql security definer
set search_path = public, auth, pg_temp
as $admin$
begin
  perform public.lod_require_authenticated_staff();
  return coalesce(
    (select jsonb_build_object('enabled', enabled, 'accept_new_after', accept_new_after)
     from public.kitchen_print_control where control_id = true),
    jsonb_build_object('enabled', false)
  );
end;
$admin$;

-- Habilitacao futura em operacao: uma chamada consciente estabelece NOVO corte.
-- Nunca importa o backlog anterior.
create or replace function public.admin_set_kitchen_print_enabled(p_enabled boolean)
returns jsonb language plpgsql security definer
set search_path = public, auth, pg_temp
as $admin$
declare
  v_actor uuid := public.lod_require_authenticated_staff();
  v_enabled boolean;
  v_cutoff timestamptz;
begin
  if p_enabled is null then
    raise exception using errcode='22023', message='invalid_print_toggle';
  end if;
  update public.kitchen_print_control
  set enabled = p_enabled,
      accept_new_after = case when p_enabled and not enabled then now() else accept_new_after end,
      updated_at = now()
  where control_id = true
  returning enabled, accept_new_after into v_enabled, v_cutoff;
  if not found then
    raise exception using errcode='P0002', message='kitchen_print_control_missing';
  end if;
  return jsonb_build_object('enabled', v_enabled, 'accept_new_after', v_cutoff, 'changed_by', v_actor);
end;
$admin$;

-- Mantem assinatura e autorizacao atuais, mas nunca entrega trabalho antigo,
-- cancelado, não pago ou não aceito para impressão.
CREATE OR REPLACE FUNCTION public.claim_print_job(p_worker_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_actor uuid := public.lod_require_authenticated_staff();
  v_job public.print_jobs%rowtype;
  v_token uuid := gen_random_uuid();
begin
  if p_worker_id is null or char_length(trim(p_worker_id)) not between 8 and 120 then
    raise exception using errcode = '22023', message = 'invalid_worker_id';
  end if;

  -- Só a fila explicitamente habilitada e pedidos elegíveis após a ativação.
  -- O corte temporal neutraliza qualquer comanda antiga, sem apagar o histórico.
  select j.* into v_job
  from public.print_jobs j
  join public.orders o on o.id = j.order_uuid
  join public.kitchen_print_control c on c.control_id = true
  where c.enabled = true
    and j.status = 'pending'
    and j.created_at >= c.accept_new_after
    and (
      (j.kind = 'initial' and o.created_at >= c.accept_new_after
       and public.lod_kitchen_print_eligible(o))
      or
      (j.kind = 'reprint' and j.requested_by is not null
       and o.order_status not in ('cancelled','payment_pending')
       and o.payment_status not in ('refunded','failed','cancelled')
       and exists (
         select 1 from public.print_jobs previous
         where previous.order_uuid = o.id and previous.kind = 'initial'
           and previous.status = 'printed'
       ))
    )
  order by j.created_at
  for update of j skip locked
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
        'customer_name', o.customer_name, 'customer_phone', o.customer_phone, 'notes', o.notes,
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
$function$;

-- Segunda validação, imediatamente antes de entregar bytes ao QZ Tray.
-- Se a comanda foi cancelada/refundada depois do claim, impedir envio.
create or replace function public.admin_verify_print_claim(p_job_id uuid, p_claim_token uuid)
returns boolean language plpgsql security definer
set search_path = public, auth, pg_temp
as $guard$
begin
  perform public.lod_require_authenticated_staff();
  return exists (
    select 1 from public.print_jobs j
    join public.orders o on o.id = j.order_uuid
    join public.kitchen_print_control c on c.control_id = true
    where j.id = p_job_id and j.claim_token = p_claim_token and j.status = 'printing'
      and c.enabled = true and j.created_at >= c.accept_new_after
      and (
        (j.kind = 'initial' and o.created_at >= c.accept_new_after
         and public.lod_kitchen_print_eligible(o))
        or
        (j.kind = 'reprint' and j.requested_by is not null
         and o.order_status not in ('cancelled','payment_pending')
         and o.payment_status not in ('refunded','failed','cancelled')
         and exists (
           select 1 from public.print_jobs previous
           where previous.order_uuid = o.id and previous.kind = 'initial'
             and previous.status = 'printed'
         ))
      )
  );
end;
$guard$;

revoke all on function public.lod_kitchen_print_eligible(public.orders) from public, anon, authenticated;
revoke all on function public.lod_queue_kitchen_print_on_order_change() from public, anon, authenticated;
revoke all on function public.admin_verify_print_claim(uuid,uuid) from public, anon;
revoke all on function public.admin_get_kitchen_print_control() from public, anon;
revoke all on function public.admin_set_kitchen_print_enabled(boolean) from public, anon;
grant execute on function public.admin_verify_print_claim(uuid,uuid) to authenticated, service_role;
grant execute on function public.admin_get_kitchen_print_control() to authenticated, service_role;
grant execute on function public.admin_set_kitchen_print_enabled(boolean) to authenticated, service_role;

commit;
