import test from 'node:test';
import assert from 'node:assert/strict';
import {createRecoveryServerClient} from '../supabase/functions/_shared/recovery-server-client.mjs';
import {createHmac} from 'node:crypto';
import {assembleRecoveryEvaluation} from '../supabase/functions/_shared/recovery-snapshot.mjs';
import {privateRecoveryObservations} from '../supabase/functions/_shared/recovery-observation-store.mjs';
test('native REST adapter preserves exact count, paging and filters with SELECT-only table access',async()=>{
 const c=createRecoveryServerClient('https://example.invalid','synthetic-server-key',{fetchImpl:async(url,init)=>{
  const u=new URL(url);assert.equal(u.pathname,'/rest/v1/crm_conversations');
  assert.equal(u.searchParams.get('select'),'id,status');assert.equal(u.searchParams.get('offset'),'2');
  assert.equal(u.searchParams.get('limit'),'2');assert.equal(u.searchParams.get('status'),'in.(in_progress,waiting_customer)');
  assert.equal(init.method,'GET');assert.equal(init.redirect,'error');assert.ok(!url.includes('synthetic-server-key'));
  return new Response(JSON.stringify([{id:'synthetic'}]),{headers:{'content-range':'2-2/3'}});
 }});
 const r=await c.from('crm_conversations').select('id,status').in('status',['in_progress','waiting_customer']).order('id').range(2,3);
 assert.equal(r.count,3);assert.equal(r.data[0].id,'synthetic');
 assert.equal(c.from('orders').update,undefined);
 assert.throws(()=>c.from('auth.users'));assert.throws(()=>c.rpc('crm_record_action'));
 assert.throws(()=>c.from('orders').select('*'));
 assert.throws(()=>c.from('orders').select('id').eq('id','x),or(id.neq.x'));
});
test('real assembler and REST adapter reach private capture with phone_e164 columns',async()=>{
 const cid='00000000-0000-4000-8000-000000000001',uid='00000000-0000-4000-8000-000000000002';
 const phone='5591000000000',now='2026-11-16T15:00:00Z',secret='synthetic-adapter-fixture';
 const data={
  crm_conversations:[{id:cid,customer_id:uid,tintim_conversation_id:null,status:'waiting_customer',created_at:now,updated_at:now,last_inbound_at:now,last_outbound_at:now}],
  crm_customers:[{id:uid,phone_e164:phone,consent_status:'unknown',commercial_opt_out:false,updated_at:now}],
  crm_whatsapp_message_events:[{id:'1',message_id:'wamid.syntheticrest',conversation_id:cid,phone_e164:phone,direction:'inbound',occurred_at:now,received_at:now}],
  crm_automation_settings:[{singleton:true,follow_up_minutes:45}],
 };
 let saved=null;
 const client=createRecoveryServerClient('https://example.invalid','synthetic-key',{fetchImpl:async(url,init)=>{
  const u=new URL(url),path=u.pathname.replace('/rest/v1/','');
  if(path==='rpc/crm_recovery_read_observations')return Response.json([]);
  if(path==='rpc/crm_recovery_store_observation'){saved=JSON.parse(init.body);return Response.json(true);}
  assert.equal(init.method,'GET');
  const rows=data[path]??[];
  return Response.json(rows,{headers:{'content-range':`0-${Math.max(0,rows.length-1)}/${rows.length}`}});
 }});
 const raw=JSON.stringify({object:'whatsapp_business_account',entry:[{id:'101',changes:[{field:'messages',value:{metadata:{phone_number_id:'202'},messages:[{id:'wamid.syntheticrest',from:phone,timestamp:String(Date.parse(now)/1000),type:'text',text:{body:'Quero cascão de Prestígio'}}]}}]}]});
 const result=await assembleRecoveryEvaluation(client,{conversationId:cid,now,metaConfig:{appSecret:secret,wabaId:'101',phoneNumberId:'202'},signedWebhook:{raw,signature:'sha256='+createHmac('sha256',secret).update(raw).digest('hex')},observationStore:privateRecoveryObservations(client)});
 assert.equal(saved?.p_semantic?.candidates[0]?.product_id,'cone-trufado-prestigio');
 assert.ok(!JSON.stringify(saved).includes('Quero cascão'));
 assert.ok(!result.blockers.includes('snapshot_source_unavailable_or_incomplete'));
 assert.equal(result.send_authorized,false);
 for(const columns of ['id,,phone_e164','id,','164phone','id,phone_e164(*)','id,phone_e164;'])assert.throws(()=>client.from('crm_customers').select(columns));
});
test('only private RPCs can POST; errors are opaque and absent count stays unknown',async()=>{
 const calls=[];const c=createRecoveryServerClient('https://example.invalid','synthetic-server-key',{fetchImpl:async(url,init)=>{
  calls.push(init);return new Response('0');
 }});
 assert.equal((await c.rpc('crm_recovery_purge_expired')).data,0);assert.equal(calls[0].method,'POST');
 const r=await c.from('orders').select('id').limit(2);assert.equal(r.count,null);
 const bad=createRecoveryServerClient('https://example.invalid','synthetic-server-key',{fetchImpl:async()=>{throw Error('PRIVATE');}});
 assert.deepEqual(await bad.rpc('crm_recovery_purge_expired'),{data:null,error:{code:'source_request_failed'}});
 assert.throws(()=>createRecoveryServerClient('https://user:secret@example.invalid','key'));
});
