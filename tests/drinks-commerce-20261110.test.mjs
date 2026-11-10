import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import ts from 'typescript';
import { PRODUCTS, DRINKS } from '../app/catalog.ts';
import { DRINKS as SERVER_DRINKS } from '../supabase/functions/_shared/drinks-catalog.mjs';
import { quoteCartItems, quoteFulfillment } from '../supabase/functions/_shared/commerce-catalog.mjs';
const sql=readFileSync('supabase/migrations/20261110124038_refrigerantes_complementos.sql','utf8');

test('four exact presentations, price parity, historical IDs never repurposed',()=>{
 assert.equal(DRINKS.length,4);
 assert.deepEqual(DRINKS.map(d=>[d.id,d.variants[0].price]),[['coca-cola-zero-220',4],['fanta-laranja-220',4],['guarana-antarctica-200',3],['coca-cola-350',6]]);
 for(const d of DRINKS){
  const server=SERVER_DRINKS[d.id],v=d.variants[0];
  const q=quoteCartItems([{product_id:d.id,variant_id:v.id,quantity:99,option_ids:[],unit_price:0.01}]);
  assert.equal(q.subtotalCents,v.price*9900);
  assert.equal(q.items[0].name,d.name);assert.equal(q.items[0].size_label,v.label);
  assert.equal(q.items[0].item_type,'drink');assert.deepEqual(q.availabilityKeys,[server.itemKey]);
  for(const bad of [{variant_id:'350ml-wrong'},{option_ids:['calda-ninho']},{quantity:100},{quantity:0}])
   assert.throws(()=>quoteCartItems([{product_id:d.id,variant_id:v.id,quantity:1,option_ids:[],...bad}]));
 }
 for(const id of ['coca-cola-220','fanta-laranja-350']){
  assert.equal(PRODUCTS.find(d=>d.id===id).available,false);
  assert.throws(()=>quoteCartItems([{product_id:id,variant_id:'350ml',quantity:1}]));
 }
});

test('mixed subtotal + delivery and pickup never include invented beverage fee',()=>{
 const q=quoteCartItems([{product_id:'fatia-prestigio',variant_id:'fatia',quantity:2,option_ids:['sem-calda']},{product_id:'guarana-antarctica-200',variant_id:'200ml',quantity:3,option_ids:[]}]);
 assert.equal(q.subtotalCents,4900);
 assert.equal(q.subtotalCents+quoteFulfillment({type:'pickup'}).delivery_fee_cents,4900);
 const delivery=quoteFulfillment({type:'delivery',zone_id:'cidade',locality_id:'promissao-ii',neighborhood:'Promissão II',street:'Rua Teste',number:'1'});
 assert.equal(q.subtotalCents+delivery.delivery_fee_cents,5700);
});

test('SQL migration is idempotent, hidden by default, allows drink and preserves old rows',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`CREATE TYPE public.item_status AS ENUM ('available','sold_out','hidden');
 CREATE TABLE public.menu_availability(item_key text PRIMARY KEY,name text,item_type text,category_key text,status public.item_status);
 CREATE TABLE public.order_items(item_type text,item_key text,CONSTRAINT order_items_type_check CHECK(item_type IN ('popcorn','slice','cone')));
 INSERT INTO public.menu_availability VALUES ('old','Histórico','product','category_fatias','available');
 INSERT INTO public.order_items VALUES ('slice','old');`);
 await db.exec(sql);await db.exec(sql);
 assert.equal((await db.query("SELECT count(*)::int n FROM menu_availability WHERE status='hidden'")).rows[0].n,4);
 await assert.rejects(db.exec("INSERT INTO order_items VALUES ('drink','drink_fanta_laranja_220')"),/menu_changed/);
 await db.exec("UPDATE menu_availability SET status='available' WHERE item_key='drink_fanta_laranja_220'; INSERT INTO order_items VALUES ('drink','drink_fanta_laranja_220')");
 await db.exec(sql); // re-run never hides an operator-approved item
 assert.equal((await db.query("SELECT status FROM menu_availability WHERE item_key='drink_fanta_laranja_220'")).rows[0].status,'available');
 for(const status of ['sold_out','hidden']){
  await db.exec(`UPDATE menu_availability SET status='${status}' WHERE item_key='drink_fanta_laranja_220'`);
  await assert.rejects(db.exec("INSERT INTO order_items VALUES ('drink','drink_fanta_laranja_220')"),/menu_changed/);
 }
 await assert.rejects(db.exec("INSERT INTO order_items VALUES ('drink','unknown')"),/menu_changed/);
 assert.equal((await db.query("SELECT count(*)::int n FROM order_items WHERE item_type='slice'")).rows[0].n,1);
 assert.match(sql,/FOR SHARE/);assert.doesNotMatch(sql,/SECURITY DEFINER/);
 }finally{await db.close();}
});

test('admin and POS-58 render actual drink name, packaging and units, independent of payment',async()=>{
 const source=readFileSync('lib/qz-print-client.ts','utf8');
 const tree=ts.createSourceFile('qz.ts',source,ts.ScriptTarget.ES2022,true);
 const funcs=new Map(tree.statements.filter(n=>ts.isFunctionDeclaration(n)&&n.name).map(n=>[n.name.text,n.getText(tree)]));
 const js=ts.transpileModule(['plain','wrap','money','paymentLine','receipt'].map(n=>funcs.get(n)).join('\n')+'\nexport {receipt};',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
 const {receipt}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
 const raw=receipt({job:{kind:'initial'},order:{order_number:123,created_at:'2026-11-10T12:00:00Z',fulfillment_type:'pickup',payment_method:'manual_pix',payment_status:'pending',customer_name:'Cliente Teste',total:'8.00'},items:[{name:'Coca-Cola Zero',size_label:'Lata 220 ml',quantity:2,option_names:[]}]});
 assert.match(raw,/2x Coca-Cola Zero Lata 220 ml/);assert.doesNotMatch(raw,/PIX CONFIRMADO/);
 const adminSource=readFileSync('lib/admin-order-item-display.ts','utf8');
 const adminJs=ts.transpileModule(adminSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
 const {formatAdminOrderItem}=await import('data:text/javascript;base64,'+Buffer.from(adminJs).toString('base64'));
 assert.deepEqual(formatAdminOrderItem({name:'Guaraná Antarctica',size_label:'Garrafa 200 ml',quantity:2,option_names:[]}),{title:'2x Guaraná Antarctica — Garrafa 200 ml',detail:null});
});

test('all 58 previous package images remain byte-identical in source',()=>{
 const assets=JSON.parse(readFileSync('docs/approved-assets-20261110.json','utf8'));
 assert.equal(assets.length,58);
 for(const a of assets)assert.equal(createHash('sha256').update(readFileSync('public/'+a.path)).digest('hex'),a.sha256,a.path);
});

test('missing, offline, hidden and sold-out drink rows never become available by fallback',async()=>{
 const source=readFileSync('app/menu-availability.ts','utf8');
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText
  .replaceAll('@/app/catalog',new URL('../app/catalog.ts',import.meta.url).href)
  .replaceAll('../supabase/functions/_shared/trufadas-variants.mjs',new URL('../supabase/functions/_shared/trufadas-variants.mjs',import.meta.url).href)
  .replaceAll('../supabase/functions/_shared/drinks-catalog.mjs',new URL('../supabase/functions/_shared/drinks-catalog.mjs',import.meta.url).href);
 const {createFallbackAvailability,mergeRemoteAvailability,drinkStatus}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
 for(const d of DRINKS){
  assert.equal(drinkStatus(createFallbackAvailability(),d.id),'hidden');
  assert.equal(drinkStatus(mergeRemoteAvailability([],true),d.id),'hidden');
  for(const status of ['available','sold_out','hidden'])assert.equal(drinkStatus(mergeRemoteAvailability([{item_key:SERVER_DRINKS[d.id].itemKey,status}],true),d.id),status);
 }
 assert.equal(drinkStatus(mergeRemoteAvailability([],true),'coca-cola-220'),'hidden');
});
