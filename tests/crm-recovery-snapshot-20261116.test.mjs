import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { assembleRecoveryEvaluation as assemble } from '../supabase/functions/_shared/recovery-snapshot.mjs';
import { privateRecoveryObservations } from '../supabase/functions/_shared/recovery-observation-store.mjs';

const cid = '00000000-0000-4000-8000-000000000001';
const uid = '00000000-0000-4000-8000-000000000002';
const tid = '00000000-0000-4000-8000-000000000003';
// Generated fixture only; no phone, text, ID or secret copied from a customer.
const customerPhone = '5591000000000';
const now = '2026-11-16T15:00:00Z';
const time = hour => `2026-11-16T${hour}:00Z`;
const secret = 'synthetic-snapshot-fixture-secret';
function fixture() {return {
  crm_conversations:[{id:cid,customer_id:uid,tintim_conversation_id:tid,status:'waiting_customer',created_at:time('12:00'),updated_at:time('13:05'),last_inbound_at:time('13:00'),last_outbound_at:time('13:05')}],
  crm_customers:[{id:uid,phone_e164:customerPhone,consent_status:'granted',consent_at:time('12:00'),consent_evidence:'synthetic-permission',commercial_opt_out:false,updated_at:time('12:00')}],
  crm_whatsapp_message_events:[
    {id:'a',message_id:'wamid.synthetic_in',conversation_id:cid,phone_e164:customerPhone,direction:'inbound',occurred_at:time('13:00'),received_at:time('13:00')},
    {id:'b',message_id:'wamid.synthetic_out',conversation_id:cid,phone_e164:customerPhone,direction:'app_echo',occurred_at:time('13:05'),received_at:time('13:05')},
  ],
  crm_tintim_message_events:[],tintim_order_links:[],orders:[],crm_follow_ups:[],tintim_conversations:[],
  menu_availability:[{id:1,item_key:'category_cones',status:'available'},{id:2,item_key:'cone_prestigio',status:'available'}],
  store_settings:[{id:1,key:'orders_open',value:true}],
  crm_automation_settings:[{singleton:true,follow_up_minutes:45}],
};}
function signed(text='Quero um cascão de Prestígio',from=customerPhone) {
  const raw = JSON.stringify({object:'whatsapp_business_account',entry:[{id:'101',changes:[{field:'messages',value:{metadata:{phone_number_id:'202'},messages:[{
    id:'wamid.synthetic_in',from,timestamp:String(Date.parse(time('13:00'))/1000),type:'text',text:{body:text},
  }]}}]}]});
  return {raw,signature:'sha256='+createHmac('sha256',secret).update(raw).digest('hex')};
}
const options = () => ({conversationId:cid,now,pageSize:1,maxRows:100,
  signedWebhook:signed(),metaConfig:{appSecret:secret,phoneNumberId:'202',wabaId:'101'},
  rollout:{channel_identity_verified:true,channel_verified_since:time('12:00'),purchase_coverage_verified:true}});

// Supabase query contract fake: SELECT/filters/order/range only; no write methods.
function db(tables,hook=()=>{}) {
  const calls=[];
  return {calls,rpc:async(name)=>{assert.equal(name,'crm_recovery_permission_evidence');return {data:true,error:null};},from(table) {
    const filters=[];let columns,from=0,to=0,sortKey='id';
    const q={select(c,opts){columns=c;assert.equal(opts.count,'exact');return q;},
      eq(k,v){filters.push(r=>r[k]===v);return q;},in(k,vs){filters.push(r=>vs.includes(r[k]));return q;},
      gte(k,v){filters.push(r=>r[k]!=null && r[k]>=v);return q;},lte(k,v){filters.push(r=>r[k]!=null && r[k]<=v);return q;},
      order(k,o){assert.ok(['id','singleton'].includes(k));sortKey=k;assert.equal(o.ascending,true);return q;},
      range(a,b){from=a;to=b;return q;},then(resolve,reject){
        calls.push({table,columns,from,to});
        const rows=(tables[table] ?? []).filter(r=>filters.every(f=>f(r))).sort((a,b)=>String(a[sortKey]).localeCompare(String(b[sortKey])));
        const response={data:structuredClone(rows.slice(from,to+1)),count:rows.length,error:null};
        hook(table,response,calls);
        return Promise.resolve(response).then(resolve,reject);
      }};return q;
  }};
}
test('server assembles signed text, paged sources and permissions without returning PII',async()=>{
  const client=db(fixture()),r=await assemble(client,options());
  assert.equal(r.classification,'shadow_candidate');assert.equal(r.send_authorized,false);
  assert.equal(r.interest.candidates[0].product_id,'cone-trufado-prestigio');
  assert.ok(client.calls.some(c=>c.table==='crm_whatsapp_message_events' && c.from===1));
  const output=JSON.stringify(r);
  for(const value of [customerPhone,secret,'Quero um',cid,'synthetic-permission']) assert.ok(!output.includes(value));
  for(const call of client.calls) for(const forbidden of ['tracking_token','customer_name','customer_email','notes']) assert.ok(!call.columns.includes(forbidden));
});
test('no signed text means no manufactured interest from product hints or ad labels',async()=>{
  const tables=fixture();tables.crm_conversations[0].interest_label='Prestígio';
  const r=await assemble(db(tables),{...options(),signedWebhook:null});
  assert.ok(r.blockers.includes('interest_unconfirmed'));
});
test('follow-up delay comes from server settings; missing settings cannot use a silent default',async()=>{
  const tables=fixture();tables.crm_automation_settings[0].follow_up_minutes=180;
  assert.ok((await assemble(db(tables),options())).blockers.includes('not_due'));
  tables.crm_automation_settings=[];
  assert.ok((await assemble(db(tables),options())).blockers.includes('automation_settings_unavailable'));
});
test('receipt-time Tintim and absent rollout evidence cannot grant completeness',async()=>{
  const tables=fixture();tables.crm_tintim_message_events=[{id:'t',fingerprint:'t',conversation_id:cid,phone_e164:customerPhone,
    direction:'inbound',time_basis:'webhook_received',occurred_at:time('13:00'),received_at:time('13:00')}];
  const r=await assemble(db(tables),{...options(),rollout:{}});
  assert.ok(r.blockers.includes('tintim_time_unverified'));
  assert.ok(r.blockers.includes('conversation_history_incomplete'));
  assert.ok(r.blockers.includes('order_check_incomplete'));
});
test('a newly certified channel cannot certify older observations retroactively',async()=>{
  const config=options();config.rollout.channel_verified_since=time('14:00');
  assert.ok((await assemble(db(fixture()),config)).blockers.includes('conversation_history_incomplete'));
});
test('direct phone paid order suppresses; accepted/delivered is not invented payment',async()=>{
  const tables=fixture();tables.orders=[{id:'o',customer_phone:customerPhone,created_at:time('13:10'),payment_status:'paid',order_status:'accepted'}];
  assert.equal((await assemble(db(tables),options())).classification,'suppressed');
  tables.orders[0].payment_status='pending';tables.orders[0].order_status='delivered';
  assert.ok((await assemble(db(tables),options())).blockers.includes('purchase_or_order_requires_reconciliation'));
});
test('formatted local and international phones reconcile without fuzzy name matching',async()=>{
  const tables=fixture();tables.orders=[{id:'o',customer_phone:'(91) 00000-0000',created_at:time('13:10'),payment_status:'paid'}];
  assert.equal((await assemble(db(tables),options())).classification,'suppressed');
});
test('Tintim candidate paid link remains candidate, even with confirmed link label',async()=>{
  const tables=fixture();tables.orders=[{id:'o',customer_phone:null,created_at:time('13:10'),payment_status:'paid'}];
  tables.tintim_order_links=[{id:'l',conversation_id:tid,order_uuid:'o',created_at:time('13:10'),status:'confirmed'}];
  const r=await assemble(db(tables),options());
  assert.notEqual(r.classification,'suppressed');assert.ok(r.blockers.includes('purchase_or_order_requires_reconciliation'));
});
test('unknown phone orders, stage purchase and missing linked order block unsafe absence claims',async()=>{
  const tables=fixture();tables.orders=[{id:'o',customer_phone:null,created_at:time('13:10'),payment_status:'paid'}];
  assert.ok((await assemble(db(tables),options())).blockers.includes('unattributed_orders_in_window'));
  tables.orders=[];tables.tintim_order_links=[{id:'l',conversation_id:tid,order_uuid:'missing',created_at:time('13:10'),status:'candidate'}];
  assert.ok((await assemble(db(tables),options())).blockers.includes('linked_order_unavailable'));
  tables.tintim_order_links=[];tables.tintim_conversations=[{id:tid,phone_digits:customerPhone,stage_label:'Comprou',last_observed_at:time('13:10')}];
  assert.ok((await assemble(db(tables),options())).blockers.includes('purchase_or_order_requires_reconciliation'));
});
test('failed, truncated or over-limit reads never become empty successful snapshots',async()=>{
  for(const mode of ['error','count','truncated','limit']) {
    const client=db(fixture(),(table,r)=>{if(table==='crm_whatsapp_message_events') {
      if(mode==='error')r.error={message:'PRIVATE_RAW_ERROR'};
      if(mode==='count')r.count=null;
      if(mode==='truncated')r.data=[];
      if(mode==='limit')r.count=10001;
    }});
    const r=await assemble(client,options());
    assert.equal(r.classification,'insufficient_evidence');assert.ok(!JSON.stringify(r).includes('PRIVATE_RAW_ERROR'));
  }
});
test('versions, missing activity coverage and foreign signed identity prevent candidate',async()=>{
  const client=db(fixture(),(table,r,calls)=>{if(table==='crm_customers' && calls.filter(c=>c.table===table).length>1)r.data[0].updated_at=now;});
  assert.ok((await assemble(client,options())).blockers.includes('snapshot_changed_during_read'));
  const tables=fixture();tables.crm_conversations[0].last_inbound_at=time('14:00');
  assert.ok((await assemble(db(tables),options())).blockers.includes('conversation_activity_not_covered'));
  assert.ok((await assemble(db(fixture()),{...options(),signedWebhook:signed('Quero Prestígio','5592000000000')})).blockers.includes('signed_observation_identity_mismatch'));
});
test('opt-out and missing or future permission, closed store and prior recovery remain blocked',async()=>{
  const tables=fixture();tables.crm_customers[0].commercial_opt_out=true;
  assert.equal((await assemble(db(tables),options())).classification,'suppressed');
  tables.crm_customers[0].commercial_opt_out=false;tables.crm_customers[0].consent_at='2099-01-01T00:00:00Z';
  assert.ok((await assemble(db(tables),options())).blockers.includes('permission_unverified'));
  tables.store_settings[0].value=false;tables.crm_follow_ups=[{id:'f',conversation_id:cid,status:'sent_manually',sent_at:time('14:00')}];
  const r=await assemble(db(tables),options());
  assert.ok(r.blockers.includes('store_closed'));assert.ok(r.blockers.includes('already_contacted_since_reply'));
});
test('optional private store restores semantic history and capture requires a matching signed envelope',async()=>{
 const semantic=(await import('../supabase/functions/_shared/recovery-interest.mjs')).classifyRecoveryInterest('Quero cascão Prestígio');
 const saved=[{message_id:'wamid.synthetic_in',occurred_at:time('13:00'),semantic}];
 let captures=0;
 const store={read:async()=>saved,capture:async()=>{captures++;return {stored:true};}};
 const recovered=await assemble(db(fixture()),{...options(),signedWebhook:null,observationStore:store});
 assert.equal(recovered.classification,'shadow_candidate');assert.equal(captures,0);
 await assemble(db(fixture()),{...options(),observationStore:store});assert.equal(captures,1);
 await assemble(db(fixture()),{...options(),signedWebhook:signed('Quero Prestígio','5592000000000'),observationStore:store});
 assert.equal(captures,1);
});
test('signed batches isolate customers without rejecting a valid episode or persisting foreign text',async()=>{
 const payload=JSON.parse(signed().raw);
 payload.entry[0].changes[0].value.messages.push({id:'wamid.foreignsynthetic',from:'5592000000000',timestamp:String(Date.parse(time('13:00'))/1000),type:'text',text:{body:'Não me mande mensagens'}});
 const raw=JSON.stringify(payload),signature='sha256='+createHmac('sha256',secret).update(raw).digest('hex');
 const captured=[];
 const r=await assemble(db(fixture()),{...options(),signedWebhook:{raw,signature},observationStore:{read:async()=>[],capture:async(c,e)=>captured.push(e.id)}});
 assert.equal(r.classification,'shadow_candidate');assert.deepEqual(captured,['wamid.synthetic_in']);
});

test('new certified episode resolves old history gap; opaque later inbound still blocks',async()=>{
 const tables=fixture(),opts=options();opts.rollout.channel_verified_since=time('12:59');
 let r=await assemble(db(tables),opts);
 assert.ok(!r.blockers.includes('conversation_history_incomplete'));
 tables.crm_whatsapp_message_events.push({id:'c',message_id:'wamid.syntheticopaque',conversation_id:cid,phone_e164:customerPhone,direction:'inbound',occurred_at:time('13:01'),received_at:time('13:01')});
 r=await assemble(db(tables),opts);
 assert.ok(r.blockers.includes('inbound_content_unverified'));assert.ok(r.blockers.includes('conversation_history_incomplete'));
});
test('existing checkout closure and missing permission audit stay blocked while site reads succeed',async()=>{
 const tables=fixture();tables.store_settings[0].value=false;const c=db(tables);c.rpc=async()=>({data:false});
 const r=await assemble(c,options());
 assert.ok(r.blockers.includes('store_closed'));assert.ok(r.blockers.includes('permission_unverified'));
 assert.equal(r.commerce_checks.site_orders_read,true);assert.equal(r.permission_basis,'audit_unverified');
});

test('an older site order paid during the episode suppresses recovery',async()=>{
 const tables=fixture();tables.orders.push({id:'old-paid',customer_phone:customerPhone,created_at:'2026-11-01T10:00:00Z',paid_at:time('13:02'),payment_status:'paid',order_status:'accepted'});
 const r=await assemble(db(tables),options());assert.equal(r.classification,'suppressed');assert.deepEqual(r.blockers,['paid_order']);
});

test('gated signed shop confirmation persists semantics and blocks timer recovery without losing product',async()=>{
 const tables=fixture(),client=db(tables),saved=new Map();
 const permissionRpc=client.rpc;
 client.rpc=async(name,p)=>{
  if(name==='crm_recovery_store_observation') {
   if(saved.has(p.p_message_id))return {data:false};
   saved.set(p.p_message_id,{message_id:p.p_message_id,occurred_at:p.p_occurred_at,semantic:p.p_semantic});
   return {data:true};
  }
  if(name==='crm_recovery_read_observations')return {data:[...saved.values()]};
  return permissionRpc(name,p);
 };
 const store=privateRecoveryObservations(client);
 const opts={...options(),observationStore:store,rollout:{...options().rollout,purchase_signals_enabled:true}};
 await assemble(client,opts);
 const macro='Pedido confirmado ✅\nValor dos produtos: R$27,50\nEste valor corresponde somente aos produtos.\nObrigada pela preferência 😊';
 const raw=JSON.stringify({object:'whatsapp_business_account',entry:[{id:'101',changes:[{
  field:'smb_message_echoes',value:{metadata:{phone_number_id:'202'},message_echoes:[{
   id:'wamid.synthetic_out',to:customerPhone,timestamp:String(Date.parse(time('13:05'))/1000),type:'text',text:{body:macro},
  }]},
 }]}]});
 const signature='sha256='+createHmac('sha256',secret).update(raw).digest('hex');
 let r=await assemble(client,{...opts,signedWebhook:{raw,signature}});
 assert.equal(r.journey_state,'purchase_reconciliation');assert.equal(r.classification,'blocked');
 assert.equal(r.interest.candidates[0].product_id,'cone-trufado-prestigio');
 assert.ok(r.blockers.includes('purchase_or_order_requires_reconciliation'));
 assert.equal(saved.size,2);assert.equal(saved.get('wamid.synthetic_out').semantic.intent,'possible_purchase');
 assert.ok(!JSON.stringify([...saved.values()]).includes('27,50'));
 assert.ok(!JSON.stringify([...saved.values()]).includes('Pedido confirmado'));
 r=await assemble(client,{...opts,signedWebhook:null});
 assert.equal(r.journey_state,'purchase_reconciliation');assert.equal(r.send_authorized,false);
 // Rollback flag prevents both new captures and use of saved store signals.
 r=await assemble(client,{...opts,signedWebhook:null,rollout:{...opts.rollout,purchase_signals_enabled:false}});
 assert.ok(!r.blockers.includes('purchase_or_order_requires_reconciliation'));
 // A new explicit episode does not inherit the old shop statement.
 tables.crm_whatsapp_message_events.push({id:'c',message_id:'wamid.new_interest',conversation_id:cid,phone_e164:customerPhone,
  direction:'inbound',occurred_at:time('14:00'),received_at:time('14:00')},
 {id:'d',message_id:'wamid.new_reply',conversation_id:cid,phone_e164:customerPhone,direction:'app_echo',occurred_at:time('14:05'),received_at:time('14:05')});
 tables.crm_conversations[0].last_inbound_at=time('14:00');tables.crm_conversations[0].last_outbound_at=time('14:05');
 await store.capture(cid,{id:'wamid.new_interest',verified:true,direction:'inbound',time_basis:'provider_timestamp',
  content_origin:'customer_text',conversation_key:cid,occurred_at:time('14:00'),text:'Quero cascão de Prestígio'});
 r=await assemble(client,{...opts,signedWebhook:null});
 assert.ok(!r.blockers.includes('purchase_or_order_requires_reconciliation'));
 assert.equal(r.journey_state,'conversation_opportunity');
});

test('missing purchase persistence fails closed and flag OFF performs no extra capture',async()=>{
 const tables=fixture(),client=db(tables),opts=options();
 const raw=JSON.stringify({object:'whatsapp_business_account',entry:[{id:'101',changes:[{field:'smb_message_echoes',
 value:{metadata:{phone_number_id:'202'},message_echoes:[{id:'wamid.synthetic_out',to:customerPhone,
 timestamp:String(Date.parse(time('13:05'))/1000),type:'text',text:{body:'Recebi seu Pix'}}]}}]}]});
 const signature='sha256='+createHmac('sha256',secret).update(raw).digest('hex');
 const r=await assemble(client,{...opts,signedWebhook:{raw,signature},rollout:{...opts.rollout,purchase_signals_enabled:true}});
 assert.equal(r.classification,'insufficient_evidence');assert.equal(r.send_authorized,false);
 const off=await assemble(client,{...opts,signedWebhook:{raw,signature}});
 assert.ok(!off.blockers.includes('purchase_or_order_requires_reconciliation'));
});
test('closed-service macro survives persistence and does not count as answering customer interest',async()=>{
 const client=db(fixture()),saved=[];
 const permission=client.rpc;
 client.rpc=async(name,p)=>{
  if(name==='crm_recovery_store_observation') {
   const old=saved.find(r=>r.message_id===p.p_message_id);
   if(!old)saved.push({message_id:p.p_message_id,occurred_at:p.p_occurred_at,semantic:p.p_semantic});
   return {data:!old};
  }
  if(name==='crm_recovery_read_observations')return {data:saved};
  return permission(name,p);
 };
 const store=privateRecoveryObservations(client),opts={...options(),observationStore:store,
  rollout:{...options().rollout,purchase_signals_enabled:true}};
 await assemble(client,opts);
 const greeting='🍰 OLÁ! SEJA BEM-VINDO(A) À LUCIANE OLIVEIRA DOCES!\nNosso atendimento volta na quarta-feira, a partir das 12h, com muitas delícias esperando por vocês!\nAgradecemos imensamente pela preferência e pelo carinho de sempre.';
 const raw=JSON.stringify({object:'whatsapp_business_account',entry:[{id:'101',changes:[{field:'smb_message_echoes',
 value:{metadata:{phone_number_id:'202'},message_echoes:[{id:'wamid.synthetic_out',to:customerPhone,
 timestamp:String(Date.parse(time('13:05'))/1000),type:'text',text:{body:greeting}}]}}]}]});
 const signature='sha256='+createHmac('sha256',secret).update(raw).digest('hex');
 const first=await assemble(client,{...opts,signedWebhook:{raw,signature}});
 assert.equal(first.classification,'pending_service');assert.equal(first.journey_state,'pending_service');
 assert.equal(first.interest.candidates[0].product_id,'cone-trufado-prestigio');
 const later=await assemble(client,{...opts,signedWebhook:null});
 assert.equal(later.classification,'pending_service');assert.ok(later.blockers.includes('store_response_pending'));
 assert.equal(saved.length,2);assert.ok(!JSON.stringify(saved).includes('Nosso atendimento'));
});
