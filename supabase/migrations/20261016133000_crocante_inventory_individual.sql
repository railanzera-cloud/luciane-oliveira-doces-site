-- LUCIANE OLIVEIRA DOCES — reserva atomica individual dos Copos Crocantes.
-- Ponto de partida de seguranca: Ninho e Chocolate com 0 unidades.
-- Aplicar somente apos ensaio em PostgreSQL descartavel; nao altera pedidos historicos.
begin;

create table public.crocante_inventory (
  item_key text primary key check (item_key in ('crocante_copo_ninho', 'crocante_copo_chocolate')),
  total_stock integer not null default 0 check (total_stock >= 0),
  is_enabled boolean not null default true,
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  installed_at timestamptz not null default now()
);
insert into public.crocante_inventory(item_key,total_stock,is_enabled) values
  ('crocante_copo_ninho',0,true),
  ('crocante_copo_chocolate',0,true);

create table public.crocante_inventory_holds (
  order_uuid uuid not null references public.orders(id),
  item_key text not null references public.crocante_inventory(item_key),
  quantity integer not null check (quantity between 1 and 99),
  state text not null default 'held' check (state in ('held','committed','released','shortage')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(order_uuid,item_key)
);
create index crocante_holds_active_idx on public.crocante_inventory_holds(item_key,expires_at)
where state = 'held';

alter table public.crocante_inventory enable row level security;
alter table public.crocante_inventory_holds enable row level security;
revoke all on public.crocante_inventory from public,anon,authenticated;
revoke all on public.crocante_inventory_holds from public,anon,authenticated;
grant all on public.crocante_inventory to service_role;
grant all on public.crocante_inventory_holds to service_role;

-- Publico somente tem acesso aos contadores agregados, sem dados pessoais.
create function public.public_crocante_inventory()
returns jsonb language sql stable security definer set search_path = public, pg_temp
as $public$
  select coalesce(jsonb_agg(jsonb_build_object(
    'item_key', c.item_key,
    'available', case when c.is_enabled then greatest(c.total_stock - coalesce((
      select sum(h.quantity)::integer from public.crocante_inventory_holds h
      where h.item_key = c.item_key and h.state = 'held' and h.expires_at > now()
    ),0),0) else 0 end
  ) order by c.item_key), '[]'::jsonb) from public.crocante_inventory c;
$public$;

create function public.admin_get_crocante_inventory()
returns jsonb language plpgsql stable security definer set search_path = public, auth, pg_temp
as $admin$
begin
  perform public.lod_require_authenticated_staff();
  return (select coalesce(jsonb_agg(jsonb_build_object(
    'item_key',c.item_key, 'total',c.total_stock, 'enabled',c.is_enabled,
    'version',c.version,
    'reserved', coalesce((select sum(h.quantity)::integer from public.crocante_inventory_holds h
      where h.item_key=c.item_key and h.state='held' and h.expires_at>now()),0),
    'available', case when c.is_enabled then greatest(c.total_stock-coalesce((
      select sum(h.quantity)::integer from public.crocante_inventory_holds h
      where h.item_key=c.item_key and h.state='held' and h.expires_at>now()),0),0) else 0 end,
    'shortages', (select count(*)::integer from public.crocante_inventory_holds h
      where h.item_key=c.item_key and h.state='shortage')
  ) order by c.item_key),'[]'::jsonb) from public.crocante_inventory c);
end;
$admin$;

-- Operador altera saldo fisico ainda existente, nunca estoque vendido.
-- Controle de versao previne salvamento duplo em rede instavel.
create function public.admin_set_crocante_inventory(
  p_item_key text, p_total integer, p_version bigint, p_enabled boolean
)
returns jsonb language plpgsql security definer set search_path = public,auth,pg_temp
as $admin$
declare
  v_rec public.crocante_inventory%rowtype;
  v_held integer;
begin
  perform public.lod_require_authenticated_staff();
  if p_item_key not in ('crocante_copo_ninho','crocante_copo_chocolate')
     or p_total is null or p_total < 0 or p_total > 100000
     or p_version is null or p_enabled is null then
    raise exception using errcode='22023',message='crocante_inventory_invalid';
  end if;
  select * into v_rec from public.crocante_inventory
    where item_key=p_item_key for update;
  if not found then raise exception using errcode='P0002',message='crocante_inventory_missing'; end if;
  if v_rec.version <> p_version then
    raise exception using errcode='40001',message='crocante_inventory_conflict_reload';
  end if;
  select coalesce(sum(quantity)::integer,0) into v_held
    from public.crocante_inventory_holds
    where item_key=p_item_key and state='held' and expires_at>now();
  if p_total < v_held then
    raise exception using errcode='22023',message='crocante_inventory_below_reserved';
  end if;
  update public.crocante_inventory
     set total_stock=p_total,is_enabled=p_enabled,version=version+1,updated_at=now()
     where item_key=p_item_key;
  update public.menu_availability
     set status=case when p_enabled and p_total>0 then 'available'::public.item_status
                      else 'sold_out'::public.item_status end,
         updated_at=now()
     where item_key=p_item_key and item_type='product';
  return public.admin_get_crocante_inventory();
end;
$admin$;

-- A ordem esta gravada, mas a transacao inteira ainda nao foi confirmada:
-- falha na reserva reverte order e itens, inclusive em carrinhos mistos.
create function public.lod_hold_crocante_on_item_insert()
returns trigger language plpgsql security definer set search_path=public,pg_temp
as $reserve$
declare
  v_inventory public.crocante_inventory%rowtype;
  v_held integer;
  v_status public.item_status;
begin
  if new.item_key not in ('crocante_copo_ninho','crocante_copo_chocolate') then
    return new;
  end if;
  select * into v_inventory from public.crocante_inventory
    where item_key=new.item_key for update;
  if not found or not v_inventory.is_enabled then
    raise exception using errcode='23514',message='crocante_sem_estoque';
  end if;
  select status into v_status from public.menu_availability where item_key=new.item_key;
  if v_status is distinct from 'available'::public.item_status then
    raise exception using errcode='23514',message='crocante_sem_estoque';
  end if;
  select coalesce(sum(quantity)::integer,0) into v_held
    from public.crocante_inventory_holds
    where item_key=new.item_key and state='held' and expires_at>now();
  if v_inventory.total_stock - v_held < new.quantity then
    raise exception using errcode='23514',message='crocante_sem_estoque';
  end if;
  insert into public.crocante_inventory_holds(order_uuid,item_key,quantity,state,expires_at)
    values(new.order_uuid,new.item_key,new.quantity,'held',now()+interval '30 minutes')
  on conflict(order_uuid,item_key) do update
    set quantity=public.crocante_inventory_holds.quantity+excluded.quantity,
        updated_at=now();
  return new;
end;
$reserve$;
create trigger crocante_hold_on_order_item
after insert on public.order_items for each row
execute function public.lod_hold_crocante_on_item_insert();

-- Pagamento confirmado ou aceite presencial consome saldo fisico.
-- Pix nao pago fica reservado por ate 30min; apos expirar volta
-- automaticamente ao disponivel por calculo (sem cron).
-- Se pagamento entrar apos a expiracao e acabar o saldo,
-- pagamento continua registrado, mas o pedido exige acao humana.
create function public.lod_reconcile_crocante_on_order_status()
returns trigger language plpgsql security definer set search_path=public,pg_temp
as $reconcile$
declare
  v_hold public.crocante_inventory_holds%rowtype;
  v_inventory public.crocante_inventory%rowtype;
  v_other_held integer;
  v_payable boolean;
begin
  v_payable := new.payment_status='paid'
     or (new.payment_method in ('cash','card_on_delivery')
         and new.order_status in ('confirmed','preparing','ready','ready_for_pickup','out_for_delivery','completed'));
  for v_hold in
    select * from public.crocante_inventory_holds
    where order_uuid=new.id and state in ('held','shortage') order by item_key
  loop
    select * into v_inventory from public.crocante_inventory
      where item_key=v_hold.item_key for update;
    if new.order_status='cancelled' or new.payment_status in ('cancelled','failed','refunded') then
      update public.crocante_inventory_holds
      set state='released',updated_at=now()
      where order_uuid=v_hold.order_uuid and item_key=v_hold.item_key;
    elsif v_payable then
      select coalesce(sum(quantity)::integer,0) into v_other_held
      from public.crocante_inventory_holds
      where item_key=v_hold.item_key and state='held'
        and expires_at>now() and order_uuid<>new.id;
      if v_inventory.total_stock-v_other_held >= v_hold.quantity then
        update public.crocante_inventory set total_stock=total_stock-v_hold.quantity,
          version=version+1,updated_at=now()
          where item_key=v_hold.item_key;
        update public.crocante_inventory_holds set state='committed',updated_at=now()
          where order_uuid=v_hold.order_uuid and item_key=v_hold.item_key;
        update public.menu_availability
          set status=case when (v_inventory.total_stock-v_hold.quantity)>0 and v_inventory.is_enabled
            then 'available'::public.item_status else 'sold_out'::public.item_status end,
              updated_at=now() where item_key=v_hold.item_key;
      else
        update public.crocante_inventory_holds set state='shortage',updated_at=now()
          where order_uuid=v_hold.order_uuid and item_key=v_hold.item_key;
      end if;
    end if;
  end loop;
  return new;
end;
$reconcile$;
create trigger a_crocante_resolve_after_payment
after update of order_status,payment_status on public.orders
for each row execute function public.lod_reconcile_crocante_on_order_status();

-- Pedidos criados depois da instalacao, com copos, so sao elegiveis
-- para cozinha quando todas as unidades foram efetivamente alocadas.
create function public.lod_crocante_print_allocation_ready(p_order_uuid uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp
as $ready$
  select not exists (
    select 1 from public.order_items i
    join public.orders o on o.id=i.order_uuid
    join public.crocante_inventory c on c.item_key=i.item_key
    where i.order_uuid=p_order_uuid
      -- Pedidos anteriores ao controle de estoque preservam reimpressoes historicas.
      and o.created_at >= c.installed_at
      and not exists (
        select 1 from public.crocante_inventory_holds h
        where h.order_uuid=i.order_uuid and h.item_key=i.item_key and h.state='committed'
      )
  );
$ready$;

create or replace function public.lod_kitchen_print_eligible(p_order public.orders)
returns boolean language sql stable set search_path=public,pg_temp
as $policy$
  select p_order.order_status in ('new','confirmed','preparing','ready','ready_for_pickup','out_for_delivery')
    and p_order.payment_status not in ('failed','cancelled','refunded')
    and public.lod_crocante_print_allocation_ready(p_order.id)
    and (
      (p_order.sales_channel='site'
       and p_order.payment_method in ('mercado_pago_pix','mercado_pago_card')
       and p_order.payment_status='paid')
      or
      (p_order.sales_channel='whatsapp'
       and p_order.payment_method='manual_pix'
       and p_order.payment_status='paid'
       and p_order.order_status in ('confirmed','preparing','ready','ready_for_pickup','out_for_delivery'))
      or
      (p_order.sales_channel='whatsapp'
       and p_order.payment_method in ('cash','card_on_delivery')
       and p_order.order_status in ('confirmed','preparing','ready','ready_for_pickup','out_for_delivery'))
    );
$policy$;

revoke all on function public.public_crocante_inventory() from public;
grant execute on function public.public_crocante_inventory() to anon,authenticated,service_role;
revoke all on function public.admin_get_crocante_inventory() from public;
revoke all on function public.admin_set_crocante_inventory(text,integer,bigint,boolean) from public;
grant execute on function public.admin_get_crocante_inventory() to authenticated,service_role;
grant execute on function public.admin_set_crocante_inventory(text,integer,bigint,boolean) to authenticated,service_role;
revoke all on function public.lod_crocante_print_allocation_ready(uuid) from public;
grant execute on function public.lod_crocante_print_allocation_ready(uuid) to service_role,postgres;

-- Nao muda a categoria nem outros tamanhos/sabores.
update public.menu_availability
set status='sold_out'::public.item_status,updated_at=now()
where item_key in ('crocante_copo_ninho','crocante_copo_chocolate')
  and item_type='product';

commit;
