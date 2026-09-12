-- Transaction-only test: no gateway calls, no committed orders or alerts.
-- Run with the SQL editor after the three Phase 2 migrations. Rolls back all
-- fixtures; the human-readable sequence can have a gap, as with any rollback.
begin;
do $test$
declare
  fixture jsonb;
  again jsonb;
  attempt jsonb;
  outcome jsonb;
  snapshot jsonb;
  oid uuid;
  public_token text;
begin
  fixture := public.create_store_order(
    jsonb_build_object('order_id','LOD-TEST-0000-0001','request_hash',repeat('a',64),
      'customer_name','Homologacao transacional','customer_phone','91999999999',
      'customer_email','fixture@example.invalid','fulfillment_type','pickup',
      'subtotal',20,'delivery_fee',0,'total',20,'payment_method','mercado_pago_pix',
      'gateway_environment','test'),
    '[{"item_key":"slice_prestigio","product_id":"fatia-prestigio","category_key":"category_fatias","item_type":"slice","name":"Prestígio","variant_id":"fatia","quantity":1,"unit_price":20,"line_total":20}]'::jsonb);
  oid := (fixture->>'id')::uuid;
  public_token := fixture->>'tracking_token';
  if fixture->>'order_status' <> 'payment_pending' then raise exception 'pending_order_entered_kitchen'; end if;
  if public_token !~ '^[0-9a-f]{48}$' then raise exception 'weak_tracking_token'; end if;
  if public.get_public_order_status(fixture->>'order_number') is not null then raise exception 'order_number_enumeration'; end if;
  snapshot := public.get_public_order_status(public_token);
  if snapshot->>'total' <> '20.00' then raise exception 'incorrect_public_total'; end if;
  if snapshot ?| array['customer_name','customer_phone','customer_email','street','fbclid'] then raise exception 'public_pii'; end if;

  attempt := public.get_or_create_payment_attempt(oid,'mercado_pago_pix',false);
  again := public.get_or_create_payment_attempt(oid,'mercado_pago_pix',false);
  if attempt->>'id' <> again->>'id' or attempt->>'idempotency_key' <> again->>'idempotency_key' then raise exception 'duplicated_attempt'; end if;
  update public.payment_attempts set status='requesting' where id=(attempt->>'id')::uuid;
  outcome := public.apply_mercadopago_order_event(
    'fixture-event-paid', 'fixture-request', 'order', 'order.updated',
    'fixture-mp-order', 'fixture-mp-payment', 'LOD-TEST-0000-0001',
    'processed','accredited',20,'BRL','test',repeat('b',64),'{}');
  if outcome->>'changed_to_paid' <> 'true' then raise exception 'payment_not_applied'; end if;
  if not exists(select 1 from public.orders where id=oid and payment_status='paid' and order_status='new') then raise exception 'paid_order_missing_in_kitchen'; end if;
  outcome := public.apply_mercadopago_order_event(
    'fixture-event-paid', 'fixture-request', 'order', 'order.updated',
    'fixture-mp-order', 'fixture-mp-payment', 'LOD-TEST-0000-0001',
    'processed','accredited',20,'BRL','test',repeat('b',64),'{}');
  if outcome->>'duplicate' <> 'true' then raise exception 'event_not_deduplicated'; end if;
  if (select count(*) from public.event_outbox where order_uuid=oid and event_type='meta_purchase') <> 1 then raise exception 'duplicate_purchase_outbox'; end if;
  if (select count(*) from public.event_outbox where order_uuid=oid and event_type='kitchen_order_actionable') <> 1 then raise exception 'duplicate_kitchen_outbox'; end if;
  if exists(select 1 from pg_class where relnamespace='public'::regnamespace
    and relname in ('orders','order_items','payment_attempts','payment_events','order_status_history','event_outbox','print_jobs','menu_availability','store_settings') and not relrowsecurity) then raise exception 'rls_disabled'; end if;
  if has_table_privilege('anon','public.orders','select') then raise exception 'anonymous_private_table_access'; end if;
end;
$test$;
rollback;
select 'PASS: payment state, kitchen, token privacy, idempotence, RLS; fixtures rolled back' as result;
