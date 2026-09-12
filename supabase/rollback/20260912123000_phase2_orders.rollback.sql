begin;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders') then
      execute 'alter publication supabase_realtime drop table public.orders';
    end if;
    if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'order_items') then
      execute 'alter publication supabase_realtime drop table public.order_items';
    end if;
    if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'print_jobs') then
      execute 'alter publication supabase_realtime drop table public.print_jobs';
    end if;
  end if;
end
$$;

drop function if exists public.apply_mercadopago_order_event(text, text, text, text, text, text, text, text, text, numeric, text, text, text, jsonb);
drop function if exists public.get_or_create_payment_attempt(uuid, public.lod_payment_method, boolean);
drop function if exists public.create_store_order(jsonb, jsonb);

drop table if exists public.print_jobs;
drop table if exists public.event_outbox;
drop table if exists public.order_status_history;
drop table if exists public.payment_events;
drop table if exists public.payment_attempts;
drop table if exists public.order_items;
drop table if exists public.orders;

drop function if exists public.lod_touch_updated_at();
drop sequence if exists public.lod_order_number_seq;
drop type if exists public.lod_print_status;
drop type if exists public.lod_job_status;
drop type if exists public.lod_order_status;
drop type if exists public.lod_payment_status;
drop type if exists public.lod_payment_method;
drop type if exists public.lod_fulfillment_type;

commit;
