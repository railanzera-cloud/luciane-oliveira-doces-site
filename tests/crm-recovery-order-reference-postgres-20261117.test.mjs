import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHmac} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {assembleRecoveryEvaluation as assemble} from '../supabase/functions/_shared/recovery-snapshot.mjs';
import {privateRecoveryObservations} from '../supabase/functions/_shared/recovery-observation-store.mjs';
import {classifyRecoveryInterest} from '../supabase/functions/_shared/recovery-interest.mjs';
const cid='00000000-0000-4000-8000-000000000001',uid='00000000-0000-4000-8000-000000000002',fid='00000000-0000-4000-8000-000000000003';
const oid='00000000-0000-4000-8000-000000000004',phone='5591000000000';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const migration='supabase/migrations/20261118010932_crm_recovery_official_order_references.sql';
// Exercise the actual SELECT/RPC SQL in PGlite, not replacement decision logic.
function clientFor(db){
 const calls=[],errors=[];const name=n=>{assert.match(n,/^[a-z_][a-z0-9_]*$/);return '"'+n+'"';};
 return {calls,errors,async rpc(fn,args={}){
  calls.push(fn);try{const entries=Object.entries(args),sqlArgs=entries.map(([k],i)=>name(k)+'=> $'+(i+1)).join(',');
   const table=['crm_recovery_read_order_references','crm_recovery_read_observations'].includes(fn);
   const q=table?'select * from public.'+name(fn)+'('+sqlArgs+')':'select public.'+name(fn)+'('+sqlArgs+') value';
   const r=await db.query(q,entries.map(([,v])=>v));return {data:JSON.parse(JSON.stringify(table?r.rows:r.rows[0].value)),error:null};
  }catch(e){errors.push({fn,message:e.message});return {data:null,error:{code:e.code??'query_failed'}};}
 },from(table){
  let columns=[],conditions=[],values=[],offset=0,limit=200,key='id';
  const add=(k,op,v)=>{values.push(v);conditions.push(name(k)+op+'$'+values.length);return q;};
  const q={select(c){columns=c.split(',').map(name);return q;},eq(k,v){return add(k,'=',v);},
   in(k,v){values.push(v);conditions.push(name(k)+'=any($'+values.length+')');return q;},
   gte(k,v){return add(k,'>=',v);},lte(k,v){return add(k,'<=',v);},
   order(k){key=k;return q;},range(a,b){offset=a;limit=b-a+1;return q;},
   then(resolve,reject){const where=conditions.length?' where '+conditions.join(' and '):'';
    return (async()=>{try{const total=await db.query('select count(*)::int n from public.'+name(table)+where,values);
     const rows=await db.query('select '+columns.join(',')+' from public.'+name(table)+where+' order by '+name(key)+' limit '+limit+' offset '+offset,values);
     // Native PostgREST serializes timestamps as strings.
     return {data:JSON.parse(JSON.stringify(rows.rows)),count:total.rows[0].n,error:null};
    }catch(e){errors.push({table,message:e.message});return {data:null,count:null,error:{code:e.code??'query_failed'}};}})().then(resolve,reject);
   }};return q;
 }};
}

test('real PostgreSQL + signed webhook -> candidate reference -> periodic read, stale lease, ACL and retention',async()=>{
 const db=new PGlite();try{
 const fixture=read('tests/crm-recovery-due-postgres-20261116.test.mjs');
 const start=fixture.indexOf('await db.exec(`')+15;
 const bootstrap=fixture.slice(start,fixture.indexOf('`);',start));
 await db.exec(bootstrap.replaceAll('${uid}',uid).replaceAll('${cid}',cid).replaceAll('${fid}',fid).replaceAll('${phone}',phone));
 await db.exec(`ALTER TABLE orders ADD order_number bigint;
 ALTER TABLE menu_availability ADD updated_at timestamptz;
 ALTER TABLE store_settings ADD updated_at timestamptz;
 ALTER TABLE crm_tintim_message_events ADD fingerprint text,ADD phone_e164 text,ADD direction text,ADD received_at timestamptz,ADD time_basis text;
 ALTER TABLE tintim_order_links ADD status text,ADD created_at timestamptz;
 ALTER TABLE crm_whatsapp_message_events ADD message_id text,ADD direction text,ADD phone_e164 text,ADD received_at timestamptz;
 ALTER TABLE tintim_conversations ADD account_key text,ADD external_lead_id text,ADD last_observed_at timestamptz;
 CREATE TABLE tintim_webhook_receipts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),account_key text,lead_key text,received_at timestamptz,summary jsonb);
 ALTER TABLE crm_automation_settings ADD automatic_sends_enabled boolean DEFAULT false;
 INSERT INTO crm_automation_settings VALUES(true,45,false);
 INSERT INTO store_settings(id,key,value) VALUES(1,'orders_open','false');
 INSERT INTO menu_availability(id,item_key,status) VALUES(1,'category_cones','available'),(2,'cone_prestigio','available');`);
 await db.exec(read('supabase/prepared/recovery-private-observations.sql'));
 await db.exec(read('supabase/migrations/20261116155426_crm_recovery_due_shadow.sql'));
 await db.exec(read('supabase/migrations/20261116164957_crm_recovery_scheduler_auth.sql'));
 // The new source revision depends on the already-installed finite pilot scope.
 await db.exec(`CREATE TABLE crm_recovery_private.episode_scope(singleton boolean,conversation_id uuid,enabled boolean,enabled_at timestamptz,expires_at timestamptz);`);
 await db.exec(read(migration));await db.exec("set request.jwt.claim.role='service_role'");
 const at=new Date((await db.query("select date_trunc('second',now()-interval '1 hour') at")).rows[0].at).toISOString();
 const out=new Date(Date.parse(at)+60000).toISOString();
 await db.query(`insert into orders(id,created_at,updated_at,customer_phone,payment_status,order_status,paid_at,order_number)
 values($1,now()-interval '2 hours',now(),null,'pending','confirmed',null,70001)`,[oid]);
 await db.query('insert into crm_whatsapp_message_events values(gen_random_uuid(),$1,$2,$3,$4,$5,$2)',[cid,at,'wamid.synthetic_order','inbound',phone]);
 await db.query('insert into crm_whatsapp_message_events values(gen_random_uuid(),$1,$2,$3,$4,$5,$2)',[cid,out,'wamid.synthetic_reply','app_echo',phone]);
 await db.query(`update crm_conversations set last_inbound_at=$2,last_outbound_at=$3,created_at=$2::timestamptz+interval '500 milliseconds' where id=$1`,[cid,at,out]);
 await db.query("update crm_follow_ups set due_at=now()-interval '1 minute' where id=$1",[fid]);
 const text='Olá! Finalizei meu pedido pelo site da Luciane Oliveira Doces.\n\n*PEDIDO #70001*\n\nCliente: Synthetic Person\n1x Cascão Trufado — Prestígio\nTotal: R$ 18,00';
 await db.query('select crm_recovery_store_observation($1,$2,$3,$4)',[cid,'wamid.synthetic_order',at,JSON.stringify(classifyRecoveryInterest(text))]);
 const lease=(await db.query('select * from crm_recovery_claim_due($1)',[[phone]])).rows[0];assert.ok(lease?.lease_token);
 const client=clientFor(db),secret='synthetic-reference-integration-secret';
 const raw=JSON.stringify({object:'whatsapp_business_account',entry:[{id:'101',changes:[{field:'messages',value:{metadata:{phone_number_id:'202'},messages:[{id:'wamid.synthetic_order',from:phone,timestamp:String(Date.parse(at)/1000),type:'text',text:{body:text}}]}}]}]});
 const opts={conversationId:cid,now:new Date().toISOString(),metaConfig:{appSecret:secret,wabaId:'101',phoneNumberId:'202'},
  signedWebhook:{raw,signature:'sha256='+createHmac('sha256',secret).update(raw).digest('hex')},
  observationStore:privateRecoveryObservations(client),rollout:{order_references_enabled:true,channel_identity_verified:true,channel_verified_since:at,purchase_coverage_verified:false}};
 const decision=await assemble(client,opts);
 assert.equal(decision.send_authorized,false);assert.equal(decision.commerce_checks?.official_order_references_read,true,JSON.stringify({decision,errors:client.errors,calls:client.calls}));
 assert.ok(decision.blockers.includes('purchase_or_order_requires_reconciliation'));
 const refs=(await db.query('select * from crm_recovery_private.order_references')).rows;assert.equal(refs.length,1);assert.equal(refs[0].reference_status,'candidate');
 assert.equal((await db.query('select customer_phone,payment_status from orders where id=$1',[oid])).rows[0].customer_phone,null);
 assert.equal((await db.query('select payment_status from orders where id=$1',[oid])).rows[0].payment_status,'pending');
 const finish=(await db.query('select crm_recovery_finish_due($1,$2,$3,$4,$5,false) value',[fid,lease.lease_token,lease.revision,'shadow_candidate',[]])).rows[0].value;
 assert.equal(finish,'stale'); // Reference alone changed the leased sources.
 const expires=refs[0].expires_at;
 assert.equal((await client.rpc('crm_recovery_store_order_reference',{p_conversation_id:cid,p_message_id:'wamid.synthetic_order',p_occurred_at:at,p_order_number:70001})).data,'duplicate');
 assert.equal(new Date((await db.query('select expires_at from crm_recovery_private.order_references')).rows[0].expires_at).getTime(),new Date(expires).getTime());
 // A paid order with only a candidate association never becomes confirmed payment for this contact.
 await db.query("update orders set payment_status='paid',paid_at=now(),updated_at=now() where id=$1",[oid]);
 const periodic=await assemble(client,{...opts,now:new Date().toISOString(),signedWebhook:null});
 assert.ok(periodic.blockers.includes('purchase_or_order_requires_reconciliation'));
 assert.ok(!periodic.blockers.includes('paid_order'));assert.equal(periodic.send_authorized,false);
 // OFF does not read/capture references and cannot certify absent purchases.
 const n=client.calls.length;
 const off=await assemble(client,{...opts,signedWebhook:null,rollout:{...opts.rollout,order_references_enabled:false}});
 assert.ok(!client.calls.slice(n).some(x=>x.includes('order_reference')));assert.equal(off.commerce_checks?.official_order_references_read,false);
 assert.ok(off.blockers.includes('order_check_incomplete'));
 await db.query(`insert into orders(id,created_at,updated_at,payment_status,order_status,order_number) values(gen_random_uuid(),now()-interval '2 hours',now(),'pending','new',70002)`);
 const args={p_conversation_id:cid,p_message_id:'wamid.synthetic_order',p_occurred_at:at};
 assert.equal((await client.rpc('crm_recovery_store_order_reference',{...args,p_order_number:70002})).data,'identity_conflict');
 async function referenceFor(number,suffix,c=cid,ph=phone){
  const mid='wamid.ref_'+suffix;
  await db.query("insert into crm_whatsapp_message_events values(gen_random_uuid(),$1,$2,$3,'inbound',$4,$2)",[c,at,mid,ph]);
  await db.query('select crm_recovery_store_observation($1,$2,$3,$4)',[c,mid,at,JSON.stringify(classifyRecoveryInterest(''))]);
  assert.equal((await client.rpc('crm_recovery_store_order_reference',{p_conversation_id:c,p_message_id:mid,p_occurred_at:at,p_order_number:number})).data,'stored');
  return (await db.query('select resolution_status,order_uuid from crm_recovery_private.order_references where conversation_id=$1 and message_id=$2',[c,mid])).rows[0];
 }
 assert.equal((await referenceFor(99999,'missing_order')).resolution_status,'unmatched');
 // Provider second precision is a bound, not a changed event timestamp.
 for(const [number,delta,expected] of [[70003,'500 milliseconds','matched'],[70004,'1 second','unmatched'],[70005,'-25 hours','unmatched']]){
  await db.query("insert into orders(id,created_at,updated_at,payment_status,order_status,order_number) values(gen_random_uuid(),$1::timestamptz+$2::interval,now(),'pending','new',$3)",[at,delta,number]);
  assert.equal((await referenceFor(number,'time_'+number)).resolution_status,expected);
 }
 const otherC='00000000-0000-4000-8000-000000000006',otherU='00000000-0000-4000-8000-000000000005';
 await db.query("insert into crm_customers(id,phone_e164) values($1,'5592000000000')",[otherU]);
 await db.query("insert into crm_conversations(id,customer_id,created_at,updated_at) values($1,$2,now()-interval '2 hours',now())",[otherC,otherU]);
 assert.equal((await referenceFor(70001,'foreign',otherC,'5592000000000')).resolution_status,'conflict');
 assert.ok((await client.rpc('crm_recovery_store_order_reference',{...args,p_message_id:'wamid.missing',p_order_number:70001})).error);
 await db.query('update orders set customer_phone=$2 where id=$1',[oid,'5592000000000']);
 assert.equal((await referenceFor(70001,'phone_conflict')).resolution_status,'conflict');
 await db.query('update orders set customer_phone=null where id=$1',[oid]);
 // Removing a synthetic order cannot silently erase the reference evidence.
 await db.query('delete from orders where order_number=$1',[70003]);
 const lost=(await client.rpc('crm_recovery_read_order_references',{p_conversation_id:cid})).data.find(r=>r.message_id==='wamid.ref_time_70003');
 assert.equal(lost.order_uuid,null);assert.equal(lost.resolution_status,'unmatched');
 for(const role of ['anon','authenticated']){
  assert.equal((await db.query("select has_function_privilege($1,'public.crm_recovery_store_order_reference(uuid,text,timestamptz,bigint)','execute') v",[role])).rows[0].v,false);
  assert.equal((await db.query("select has_table_privilege($1,'crm_recovery_private.order_references','select') v",[role])).rows[0].v,false);
 }
 await db.exec("set request.jwt.claim.role='authenticated'");assert.ok((await client.rpc('crm_recovery_read_order_references',{p_conversation_id:cid})).error);
 await db.exec("set request.jwt.claim.role='service_role'");
 // Expurgo touches only expired private observations, never order/payment state.
 // Missing/conflicting references survive timer reads without raw message text.
 await db.exec("update crm_recovery_private.order_references set expires_at=now()-interval '1 second' where resolution_status='matched'");
 const unresolved=await assemble(client,{...opts,now:new Date().toISOString(),signedWebhook:null});
 assert.ok(unresolved.blockers.includes('purchase_or_order_requires_reconciliation'));
 await db.exec("update crm_recovery_private.order_references set expires_at=now()-interval '1 second'");
 assert.deepEqual((await client.rpc('crm_recovery_read_order_references',{p_conversation_id:cid})).data,[]);
 const purge=await client.rpc('crm_recovery_purge_expired');assert.equal(purge.error,null);assert.ok(purge.data>=1);
 assert.equal((await db.query('select count(*)::int n from crm_recovery_private.order_references')).rows[0].n,0);
 assert.equal((await db.query('select payment_status from orders where id=$1',[oid])).rows[0].payment_status,'paid');
 assert.ok(!(await db.query('select sent_at from crm_follow_ups where id=$1',[fid])).rows[0].sent_at);
 // Real SQL scope/RPC + snapshot: a completed earlier site purchase is distinct
 // from a current purchase; delayed updates remain ambiguous. All data synthetic.
 const episodeSql=read('supabase/migrations/20261117234453_crm_recovery_purchase_episodes.sql');
 await db.exec(episodeSql.slice(episodeSql.indexOf('CREATE FUNCTION crm_recovery_private.tintim_episode_requires_review'),
  episodeSql.indexOf('CREATE OR REPLACE FUNCTION public.crm_protect_purchase_signal_followup')));
 await db.exec(read('supabase/migrations/20261118070703_crm_recovery_site_purchase_episodes.sql'));
 await db.query("insert into crm_recovery_private.episode_scope values(true,$1,true,now()-interval '1 minute',now()+interval '1 hour')",[cid]);
 await db.query(`update orders set customer_phone=$2,created_at=$3::timestamptz-interval '30 minutes',
  paid_at=$3::timestamptz-interval '20 minutes',updated_at=$3::timestamptz-interval '10 minutes',order_status='completed' where id=$1`,[oid,phone,at]);
 const scoped={...opts,signedWebhook:null,now:new Date().toISOString(),rollout:{...opts.rollout,purchase_episodes_enabled:true}};
 const beforeRead=(await db.query('select row_to_json(o) value from orders o where id=$1',[oid])).rows[0].value;
 const historical=await assemble(client,scoped);
 assert.equal(historical.site_purchase_episode?.historical_paid_records,1,JSON.stringify({historical,errors:client.errors}));
 assert.ok(!historical.blockers.includes('paid_order'));assert.equal(historical.send_authorized,false);
 assert.deepEqual((await db.query('select row_to_json(o) value from orders o where id=$1',[oid])).rows[0].value,beforeRead);
 assert.equal((await db.query('select crm_recovery_private.site_order_requires_review($1,$2) value',[oid,cid])).rows[0].value,false);
 await db.exec("update crm_recovery_private.due_checks set next_check_at=now(),valid_until=now()-interval '1 second'");
 const dateLease=(await db.query('select * from crm_recovery_claim_due($1)',[[phone]])).rows[0];assert.ok(dateLease?.lease_token);
 const createdRevision=(await db.query('select crm_recovery_private.source_revision($1) value',[fid])).rows[0].value;
 await db.query("update orders set created_at=created_at-interval '1 minute' where id=$1",[oid]);
 assert.notEqual((await db.query('select crm_recovery_private.source_revision($1) value',[fid])).rows[0].value,createdRevision);
 assert.equal((await db.query('select crm_recovery_finish_due($1,$2,$3,$4,$5,false) value',
  [fid,dateLease.lease_token,dateLease.revision,'blocked',['order_check_incomplete']])).rows[0].value,'stale');
 const revision=(await db.query('select crm_recovery_private.source_revision($1) value',[fid])).rows[0].value;
 await db.query('update orders set updated_at=now() where id=$1',[oid]);
 assert.notEqual((await db.query('select crm_recovery_private.source_revision($1) value',[fid])).rows[0].value,revision);
 const delayed=await assemble(client,scoped);
 assert.equal(delayed.site_purchase_episode?.ambiguous_paid_records,1);
 assert.ok(delayed.blockers.includes('purchase_or_order_requires_reconciliation'));
 assert.equal((await db.query('select crm_recovery_private.site_order_requires_review($1,$2) value',[oid,cid])).rows[0].value,true);
 await db.query(`update orders set created_at=$2::timestamptz+interval '10 minutes',paid_at=$2::timestamptz+interval '11 minutes',
  updated_at=$2::timestamptz+interval '12 minutes',order_status='confirmed' where id=$1`,[oid,at]);
 assert.ok((await assemble(client,scoped)).blockers.includes('paid_order'));
 await db.query(`update orders set created_at=$2::timestamptz-interval '30 minutes',paid_at=$2::timestamptz-interval '20 minutes',
  updated_at=$2::timestamptz-interval '10 minutes',order_status='completed' where id=$1`,[oid,at]);
 await db.exec("update crm_recovery_private.episode_scope set expires_at=now()-interval '1 second'");
 const expired=await assemble(client,scoped);assert.equal(expired.site_purchase_episode?.scoped,false);
 assert.ok(expired.blockers.includes('paid_order'));assert.equal(expired.send_authorized,false);
 }finally{await db.close();}
});
