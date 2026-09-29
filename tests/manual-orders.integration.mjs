// Local PostgreSQL (PGlite) integration; never connects to Supabase or payment providers.
// PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js node --test tests/manual-orders.integration.mjs
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { receiptCardQuote } from '../supabase/functions/_shared/receipt-card.mjs';
import { quoteCartItems, quoteFulfillment } from '../supabase/functions/_shared/commerce-catalog.mjs';
const modulePath = process.env.PGLITE_MODULE;
if (!modulePath) throw new Error('Set PGLITE_MODULE to a local PGlite installation. No remote database is used.');
const { PGlite } = await import(modulePath);
const { pgcrypto } = await import(new URL('./contrib/pgcrypto.js', `file://${modulePath}`).href);
const db = new PGlite({ extensions: { pgcrypto } });
await db.exec(`create role anon; create role authenticated; create role service_role;
create schema extensions; create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('test.user',true),'')::uuid $$;
grant usage on schema public, auth to authenticated, service_role;
insert into auth.users values ('11111111-1111-4111-8111-111111111111');`);
for (const name of ['20260912123000_phase2_orders.sql','20260912154500_phase2_operations.sql','20260912183000_phase2_retry_safety.sql','20260928210000_manual_pix_method.sql','20260928210100_whatsapp_orders.sql','20260929180000_receipt_card_fee.sql']) {
  if (name === '20260929180000_receipt_card_fee.sql') await db.exec("insert into orders(order_id,order_number,request_hash,customer_name,customer_phone,fulfillment_type,subtotal,total,payment_method) values ('LOD-TEST-0000-9999',999,repeat('c',64),'Cliente antigo','5591999999999','pickup',25,25,'card_on_delivery')");
  await db.exec(await readFile(new URL(`../supabase/migrations/${name}`,import.meta.url),'utf8'));
}
await db.exec("create table public.store_settings(key text primary key,value boolean); insert into public.store_settings values('orders_open',true); create table public.menu_availability(item_key text primary key,status text);");
let handler, open = true, unavailable = false, nextId = 1;
const source = (await readFile(new URL('../supabase/functions/create-whatsapp-order/index.ts',import.meta.url),'utf8')).replace(/^import .*?;$/gm,'');
const requests = [];
const sandbox = {
  Request, Response, TextEncoder, Headers, URL, DOMException, AbortController, setTimeout, clearTimeout,
  crypto: webcrypto, console, quoteCartItems, quoteFulfillment, receiptCardQuote,
  Deno: { env: { get: k => ({ SUPABASE_URL:'https://local.invalid', SUPABASE_SERVICE_ROLE_KEY:'local-secret', SUPABASE_PUBLISHABLE_KEYS:'{"default":"public-test"}' })[k] }, serve: h => { handler=h; } },
  fetch: async (url, init) => {
    requests.push(url);
    assert.ok(url.startsWith('https://local.invalid/rest/v1/'), 'No gateway, Meta, WhatsApp or remote requests');
    const path = url.split('/rest/v1/')[1];
    if (path.startsWith('store_settings?')) return Response.json([{value:open}]);
    if (path.startsWith('menu_availability?')) {
      const rows=decodeURIComponent(path.match(/in\.\((.*)\)/)[1]).split(',').map(item_key=>({item_key,status:unavailable?'sold_out':'available'}));
      for(const row of rows) await db.query("insert into public.menu_availability values($1,$2) on conflict(item_key) do update set status=excluded.status",[row.item_key,row.status]);
      return Response.json(rows);
    }
    assert.match(path,/^rpc\/(create_whatsapp_store_order|recover_whatsapp_order)$/);
    const body=JSON.parse(init.body); const keys=Object.keys(body);
    try {
      const result=await db.query(`select public.${path.slice(4)}(${keys.map((k,i)=>`${k} => $${i+1}`).join(',')}) as value`,Object.values(body));
      return Response.json(result.rows[0].value);
    } catch(e) { return Response.json({code:e.code,message:e.message},{status:400}); }
  },
};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText,sandbox);
function input(method='manual_pix',delivery=false) {
  const id=(nextId++).toString().padStart(4,'0');
  return {client_order_id:`LOD-TEST-0000-${id}`,request_key:'a'.repeat(64),customer:{name:'Maria Oliveira',phone:''},
    items:[{product_id:'pipoca-gourmet',variant_id:'500ml',option_ids:['leitinho'],quantity:1}],
    fulfillment:delivery?{type:'delivery',zone_id:'cidade',neighborhood:'Centro',street:'Rua A',number:'12'}:{type:'pickup'},
    payment:{method},notes:'Entregar na portaria.',expected_total:delivery?'33.00':'25.00',
    attribution:{utm_source:'instagram',parameters:{utm_source:['instagram'],custom:['a','b']},first_touch:{url:'https://site/?utm_source=facebook'},current_visit:{url:'https://site/?utm_source=instagram',path:'/',parameters:{utm_source:['instagram']}}}};
}
async function send(body) { const response=await handler(new Request('https://local.invalid/functions/v1/create-whatsapp-order',{method:'POST',headers:{apikey:'public-test',origin:'https://lucianeoliveiradoces.pages.dev'},body:JSON.stringify(body)}));return {status:response.status,...await response.json()}; }
async function rpc(name,args){return (await db.query(`select public.${name}(${args.map((_,i)=>`$${i+1}`).join(',')}) as value`,args)).rows[0].value;}

test('local manual order lifecycle, security, totals and attribution', async t=>{
  let first, original;
  await t.test('migration preserves preexisting historical card values and zero fee',async()=>{
    const row=(await db.query('select * from orders where order_number=999')).rows[0];
    assert.equal(Number(row.total),25);assert.equal(row.card_mode,null);assert.equal(Number(row.card_fee),0);assert.equal(row.card_basis_points,0);assert.equal(row.payment_method,'card_on_delivery');
  });
  await t.test('name required; whitespace, oversize notes and online payment rejected',async()=>{
    for(const name of ['', '   ','A']){const i=input();i.customer.name=name;assert.equal((await send(i)).status,400);}
    const i=input();i.notes='x'.repeat(501);assert.equal((await send(i)).status,400);
    assert.equal((await send(input('mercado_pago_pix'))).status,400);
  });
  await t.test('pickup, manual Pix, persisted name/items/notes/source, real number and token',async()=>{
    original=input();first=await send(original);assert.equal(first.status,201);assert.equal(first.order.order_number,1001);assert.equal(first.order.payment_status,'pending');assert.equal(first.order.order_status,'new');assert.match(first.order.tracking_token,/^[a-f0-9]{48}$/);
    const row=(await db.query('select * from orders where id=$1',[first.order.id])).rows[0];assert.equal(row.customer_name,'Maria Oliveira');assert.equal(row.customer_phone,null);assert.equal(row.sales_channel,'whatsapp');assert.equal(row.notes,original.notes);assert.deepEqual(row.source_parameters.custom,['a','b']);assert.equal(row.attribution_snapshot.current_visit.parameters.utm_source[0],'instagram');
  });
  await t.test('retry recovers same number/token even after closure; changed payload/key cannot recover',async()=>{
    open=false;const retried=await send({...original,attribution:{utm_source:'different-cookie'}});assert.equal(retried.order.order_number,first.order.order_number);assert.equal(retried.order.tracking_token,first.order.tracking_token);assert.equal((await send({...original,request_key:'b'.repeat(64)})).status,409);assert.equal((await send({...original,notes:'Changed'})).status,409);assert.equal((await send(input())).status,409);open=true;
  });
  await t.test('authoritative availability, delivery fees, prices, cash change and sequential numbers',async()=>{
    unavailable=true;assert.equal((await send(input())).status,409);unavailable=false;
    const tampered=input();tampered.items[0].unit_price=0.01;tampered.expected_total='0.01';assert.equal((await send(tampered)).status,409);
    const card=await send(input('card_on_delivery',true));assert.equal(card.status,201);assert.equal(Number(card.order.total),33);assert.equal(card.order.order_number,1002);
    const cash=input('cash');cash.payment.change_for='20.00';assert.equal((await send(cash)).status,400);cash.payment.change_for='50.00';cash.notes='';const c=await send(cash);assert.equal(c.status,201);assert.equal(c.order.order_number,1003);
    const row=(await db.query('select cash_change_for,notes from orders where id=$1',[c.order.id])).rows[0];assert.equal(Number(row.cash_change_for),50);assert.equal(row.notes,null);
  });
  await t.test('simultaneous duplicate submissions produce one stored request', async()=>{
    const i=input();const results=await Promise.all([send(i),send(i)]);
    assert.equal(results[0].order.id,results[1].order.id);
    assert.equal((await db.query('select count(*)::int as n from orders where order_id=$1',[i.client_order_id])).rows[0].n,1);
  });
  await t.test('transaction recheck rejects store closure between quote and insert', async()=>{
    await db.exec("update store_settings set value=false where key='orders_open'");
    assert.equal((await send(input())).status,409);
    await db.exec("update store_settings set value=true where key='orders_open'");
  });
  await t.test('safe individual tracking and no anonymous access to private tables/RPC',async()=>{
    assert.equal(await rpc('get_public_order_status',['1001']),null);assert.equal(await rpc('get_public_order_status',['f'.repeat(48)]),null);
    const status=await rpc('get_public_order_status',[first.order.tracking_token]);assert.equal(status.items[0].name,'Pipoca Gourmet');for(const key of ['customer_name','street','notes','tracking_token','attribution_snapshot','fbclid'])assert.ok(!(key in status));
    await db.exec('set role anon');await assert.rejects(db.query('select * from public.orders'));await assert.rejects(rpc('recover_whatsapp_order',[original.client_order_id,'a'.repeat(64)]));await db.exec('reset role');
  });
  await t.test('staff required, acceptance/payment separate, complete and cancel without Purchase or printing',async()=>{
    await assert.rejects(rpc('admin_transition_order',[first.order.id,'confirmed']));
    await db.exec("select set_config('test.user','11111111-1111-4111-8111-111111111111',false)");
    await assert.rejects(rpc('admin_transition_order',[first.order.id,'preparing']));
    await rpc('admin_transition_order',[first.order.id,'confirmed']);let s=await rpc('get_public_order_status',[first.order.tracking_token]);assert.equal(s.payment_status,'pending');assert.ok(s.confirmed_at);
    await rpc('admin_confirm_offline_payment',[first.order.id]);await rpc('admin_confirm_offline_payment',[first.order.id]);
    for(const status of ['preparing','ready_for_pickup','completed'])await rpc('admin_transition_order',[first.order.id,status]);
    const card=(await db.query("select * from orders where payment_method='card_on_delivery' and sales_channel='whatsapp'")).rows[0];
    for(const status of ['confirmed','preparing','out_for_delivery','completed'])await rpc('admin_transition_order',[card.id,status]);
    const cash=(await db.query("select * from orders where payment_method='cash'")).rows[0];await rpc('admin_transition_order',[cash.id,'cancelled']);await assert.rejects(rpc('admin_confirm_offline_payment',[cash.id]));
    assert.equal((await db.query('select count(*)::int as n from event_outbox')).rows[0].n,0);assert.equal((await db.query('select count(*)::int as n from print_jobs')).rows[0].n,0);
  });
  await t.test('database idempotency lock and conflict preserve single request',async()=>{
    const row=(await db.query('select * from orders where id=$1',[first.order.id])).rows[0];
    const result=await rpc('create_store_order',[{...row,request_hash:row.request_hash},[{anything:'not inserted'}]]);assert.equal(result.idempotent,true);assert.equal(result.order_number,first.order.order_number);
    await assert.rejects(rpc('create_store_order',[{...row,request_hash:'b'.repeat(64)},[{}]]));
  });
  await t.test('card quotes persist authoritative mode, fee, total and public snapshot; remain pending and idempotent', async()=>{
    for(const mode of ['credit_single','debit']) {
      const body=input('card_on_delivery',true);body.payment.card_mode=mode;
      const q=receiptCardQuote(3300,mode);body.expected_total=(q.totalCents/100).toFixed(2);
      body.payment.card_fee='0.01';body.payment.card_basis_points=1;
      const result=await send(body);assert.equal(result.status,201,JSON.stringify(result));
      const row=(await db.query('select * from orders where id=$1',[result.order.id])).rows[0];
      assert.equal(row.card_mode,mode);assert.equal(Number(row.card_fee),q.feeCents/100);assert.equal(Number(row.total),q.totalCents/100);assert.equal(row.card_basis_points,q.basisPoints);assert.equal(row.payment_status,'pending');
      const tracked=await rpc('get_public_order_status',[result.order.tracking_token]);assert.equal(tracked.card_mode,mode);assert.equal(Number(tracked.total),Number(row.total));
      const retry=await send(body);assert.equal(retry.order.order_number,result.order.order_number);assert.equal(retry.order.card_mode,mode);
      const bad=input('card_on_delivery',true);bad.payment.card_mode=mode;assert.equal((await send(bad)).status,409);
      await assert.rejects(db.query('update orders set card_fee=0 where id=$1',[result.order.id]));
    }
    const bad=input();bad.payment.card_mode='debit';assert.equal((await send(bad)).status,400);
    assert.equal((await db.query('select count(*)::int as n from event_outbox')).rows[0].n,0);
    const old=input('card_on_delivery');const legacy=await send(old);assert.equal(legacy.status,201);assert.equal(legacy.order.card_mode,null);assert.equal(Number(legacy.order.card_fee),0);
  });
  await db.close();
});
