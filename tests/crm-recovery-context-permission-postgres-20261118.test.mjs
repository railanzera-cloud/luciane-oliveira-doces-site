import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHmac} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {clientFor} from './fixtures/recovery-postgres-client.mjs';
import {assembleRecoveryEvaluation as assemble} from '../supabase/functions/_shared/recovery-snapshot.mjs';
import {privateRecoveryObservations} from '../supabase/functions/_shared/recovery-observation-store.mjs';
import {CONTEXT_PERMISSION_OFFER,privateContextPermissions} from '../supabase/functions/_shared/recovery-context-permission.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const cid='00000000-0000-4000-8000-000000000001',uid='00000000-0000-4000-8000-000000000002',fid='00000000-0000-4000-8000-000000000003',phone='5591000000000';
test('real signed permission protocol, private ledger, periodic snapshot, SQL guards, revocation, usage, scope and retention',async()=>{
 const db=new PGlite();try{
 const fixture=read('tests/crm-recovery-due-postgres-20261116.test.mjs');
 const start=fixture.indexOf('await db.exec(`')+15;
 await db.exec(fixture.slice(start,fixture.indexOf('`);',start)).replaceAll('${uid}',uid).replaceAll('${cid}',cid).replaceAll('${fid}',fid).replaceAll('${phone}',phone));
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
 INSERT INTO store_settings(id,key,value) VALUES(1,'orders_open','true');
 INSERT INTO menu_availability(id,item_key,status) VALUES(1,'category_cones','available'),(2,'cone_prestigio','available');
 ALTER TABLE crm_follow_ups ADD created_at timestamptz DEFAULT now();
 CREATE TABLE crm_automation_queue(follow_up_id uuid PRIMARY KEY,conversation_id uuid,due_at timestamptz,queue_state text,blockers text[],evaluated_at timestamptz);
 CREATE TABLE crm_automation_monitor(singleton boolean PRIMARY KEY,last_evaluated_at timestamptz,examined int,scheduled int,blocked int,finished int,review_required int);
 INSERT INTO crm_automation_monitor(singleton) VALUES(true);`);
 await db.exec(read('supabase/prepared/recovery-private-observations.sql'));
 await db.exec(read('supabase/migrations/20261116155426_crm_recovery_due_shadow.sql'));
 await db.exec(read('supabase/migrations/20261116164957_crm_recovery_scheduler_auth.sql'));
 const episodeSql=read('supabase/migrations/20261117234453_crm_recovery_purchase_episodes.sql');
 await db.exec(episodeSql.slice(episodeSql.indexOf('CREATE TABLE crm_recovery_private.episode_scope'),episodeSql.indexOf('CREATE OR REPLACE FUNCTION public.crm_protect_purchase_signal_followup')));
 await db.exec(read('supabase/migrations/20261118010932_crm_recovery_official_order_references.sql'));
 await db.exec(read('supabase/migrations/20261118070703_crm_recovery_site_purchase_episodes.sql'));
 await db.exec(read('supabase/migrations/20261118090540_crm_recovery_context_permissions.sql'));
 await db.exec("set request.jwt.claim.role='service_role'");
 const zero=new Date((await db.query("select date_trunc('second',now()-interval '2 hours') t")).rows[0].t).getTime();
 const at=m=>new Date(zero+m*60000).toISOString();
 const client=clientFor(db),secret='synthetic-permission-integration-secret',store=privateRecoveryObservations(client);
 const options=()=>({conversationId:cid,now:new Date().toISOString(),observationStore:store,
  metaConfig:{appSecret:secret,wabaId:'101',phoneNumberId:'202'},
  rollout:{context_permission_enabled:true,order_references_enabled:true,channel_identity_verified:true,channel_verified_since:at(-1),purchase_coverage_verified:false}});
 async function event(id,minute,echo,text,reply=null){
  await db.query('insert into crm_whatsapp_message_events(id,conversation_id,message_id,direction,occurred_at,received_at,phone_e164) values(gen_random_uuid(),$1,$2,$3,$4,$4,$5)',[cid,id,echo?'app_echo':'inbound',at(minute),phone]);
  await db.query(`update crm_conversations set ${echo?'last_outbound_at':'last_inbound_at'}=$2,updated_at=now() where id=$1`,[cid,at(minute)]);
  const raw=JSON.stringify({object:'whatsapp_business_account',entry:[{id:'101',changes:[{
   field:echo?'smb_message_echoes':'messages',value:{metadata:{phone_number_id:'202'},[echo?'message_echoes':'messages']:[{
    id,...(echo?{to:phone}:{from:phone}),timestamp:String(Date.parse(at(minute))/1000),type:'text',text:{body:text},...(reply?{context:{id:reply}}:{})}]},
  }]}]});
  return {raw,signature:'sha256='+createHmac('sha256',secret).update(raw).digest('hex')};
 }
 const state=()=>privateContextPermissions(client).read(cid);
 const run=async signedWebhook=>{const r=await assemble(client,{...options(),signedWebhook});
  assert.ok(!r.blockers.includes('snapshot_source_unavailable_or_incomplete'),JSON.stringify({r,errors:client.errors}));return r;};
 const initial=await event('wamid.permission_interest',0,false,'Quero cascão de Prestígio');
 await db.query("update crm_conversations set created_at=$2::timestamptz+interval '500 milliseconds' where id=$1",[cid,at(0)]);
 await run(initial);assert.equal((await state()).state,'disabled');
 // Flag OFF never calls the new API, even with a valid signed question.
 const question=await event('wamid.permission_offer',1,true,CONTEXT_PERMISSION_OFFER);
 let index=client.calls.length;
 await assemble(client,{...options(),signedWebhook:question,rollout:{...options().rollout,context_permission_enabled:false}});
 assert.ok(!client.calls.slice(index).some(n=>n.includes('context_permission')));
 assert.equal((await db.query('select count(*)::int n from crm_recovery_private.context_permission_events')).rows[0].n,0);
 await db.query("insert into crm_recovery_private.context_permission_scope(conversation_id,enabled) values($1,true)",[cid]);
 // All public events already exist: private permission capture alone invalidates lease.
 await db.exec("update crm_follow_ups set due_at=now()-interval '1 minute'");
 const lease=(await db.query('select * from crm_recovery_claim_due($1)',[[phone]])).rows[0];assert.ok(lease?.lease_token);
 const asked=await run(question);assert.equal((await state()).state,'pending');
 assert.equal(asked.classification,'pending_service'); // asking permission is not answering product query
 assert.equal((await db.query('select crm_recovery_finish_due($1,$2,$3,$4,$5,false) value',[fid,lease.lease_token,lease.revision,'blocked',['permission_unverified']])).rows[0].value,'stale');
 const answer=await event('wamid.permission_accept',2,false,'PODE LEMBRAR');
 const agreed=await run(answer);assert.equal((await state()).verified,true);
 assert.equal(agreed.permission_basis,'signed_context_permission');assert.equal(agreed.classification,'pending_service');
 await run(await event('wamid.permission_ack',3,true,'Combinado'));
 const periodic=await run(null);assert.ok(!periodic.blockers.includes('permission_unverified'));
 assert.ok(periodic.blockers.includes('order_check_incomplete'));assert.equal(periodic.send_authorized,false);
 const hypothetical=await assemble(client,{...options(),rollout:{...options().rollout,purchase_coverage_verified:true}});
 assert.equal(hypothetical.classification,'shadow_candidate');assert.equal(hypothetical.send_authorized,false);
 const preflight=()=>client.rpc('crm_followup_send_preflight',{p_follow_up_id:fid});
 let p=await preflight();assert.equal(p.error,null);assert.ok(!p.data.reasons.includes('consent_not_verified'));
 assert.ok(p.data.reasons.includes('sender_disabled'));
 await db.query('select crm_automation_evaluate_pending()');
 let q=(await db.query('select blockers from crm_automation_queue where follow_up_id=$1',[fid])).rows[0].blockers;
 assert.ok(!q.includes('consent_unverified'));assert.ok(q.includes('provider_not_certified'));
 // A general in-chat opt-out wins even before summary fields or staff audits
 // catch up. Roll back only this synthetic branch to test independent cases.
 await db.exec('BEGIN');
 const stopped=await run(await event('wamid.permission_global_stop',4,false,'Não quero receber mensagens'));
 assert.ok(stopped.blockers.includes('opt_out'));assert.equal((await state()).state,'revoked');
 assert.ok((await preflight()).data.reasons.includes('consent_not_verified'));
 await db.exec('ROLLBACK');
 // Idempotence does not refresh retention or permit a different meaning for an ID.
 const rows=(await db.query('select * from crm_recovery_private.context_permission_events')).rows;
 const until=rows.find(r=>r.kind==='accept').expires_at;
 await run(answer);assert.equal(new Date((await db.query("select expires_at from crm_recovery_private.context_permission_events where kind='accept'")).rows[0].expires_at).getTime(),new Date(until).getTime());
 const invalid=await client.rpc('crm_recovery_store_context_permission',{p_conversation_id:cid,p_message_id:'wamid.permission_accept',p_occurred_at:at(2),p_kind:'revoke',p_reply_to:null,p_policy_version:'context-recovery-1'});assert.ok(invalid.error);
 // A later off-chat withdrawal audit cannot be ignored merely because a
 // customer's current summary fields were not updated at the same instant.
 await db.query("insert into crm_consent_audit(id,customer_id,new_status,new_opt_out,recorded_at) values(gen_random_uuid(),$1,'denied',true,$2)",[uid,at(9)]);
 assert.equal((await state()).state,'revoked');
 assert.equal((await db.query('select crm_recovery_private.context_permission_legacy_check($1,true) value',[cid])).rows[0].value,false);
 await run(await event('wamid.permission_revoke',10,false,'CANCELAR LEMBRETE'));
 assert.equal((await state()).state,'revoked');assert.equal((await run(null)).permission_basis,'context_permission_revoked');
 assert.equal((await db.query('select crm_recovery_private.context_permission_legacy_check($1,true) value',[cid])).rows[0].value,false);
 p=await preflight();assert.ok(p.data.reasons.includes('consent_not_verified'));
 // A new offer alone does not override a withdrawal; an unquoted answer after
 // another business question cannot silently attach to the offer.
 await run(await event('wamid.permission_offer2',11,true,CONTEXT_PERMISSION_OFFER));
 assert.equal((await state()).state,'revoked');
 await run(await event('wamid.permission_other_question',11.5,true,'Qual a forma de pagamento?'));
 await run(await event('wamid.permission_unquoted',11.75,false,'PODE LEMBRAR'));
 assert.equal((await state()).state,'revoked');
 assert.equal((await db.query("select count(*)::int n from crm_recovery_private.context_permission_events where message_id='wamid.permission_unquoted'")).rows[0].n,0);
 await run(await event('wamid.permission_quoted',12,false,'PODE LEMBRAR','wamid.permission_offer2'));
 assert.equal((await state()).verified,true);
 await run(await event('wamid.permission_ack2',13,true,'Combinado'));
 const quotedTimer=await run(null);assert.ok(!quotedTimer.blockers.includes('inbound_content_unverified'));
 assert.ok(!quotedTimer.blockers.includes('permission_unverified'));
 // One follow-up uses this authority, including a manually recorded follow-up.
 await db.query("update crm_follow_ups set status='sent_manually',sent_at=$2 where id=$1",[fid,at(15)]);
 assert.equal((await state()).state,'used');assert.equal((await run(null)).permission_basis,'context_permission_used');
 await db.query("update crm_follow_ups set status='canceled' where id=$1",[fid]);
 assert.equal((await state()).state,'used'); // later status changes cannot restore one-use authority
 await run(await event('wamid.permission_new_interest',20,false,'Quero uma fatia de Prestígio'));
 assert.equal((await state()).verified,false);assert.equal((await state()).state,'scope_changed');
 // New context needs new evidence; old authority and old follow-up cannot leak.
 await run(await event('wamid.permission_offer3',21,true,CONTEXT_PERMISSION_OFFER));
 await run(await event('wamid.permission_accept3',22,false,'PODE LEMBRAR'));
 assert.equal((await state()).verified,true);
 // Deleting or changing an original official event invalidates the proof.
 await db.exec("update crm_whatsapp_message_events set phone_e164='5592000000000' where message_id='wamid.permission_accept3'");
 assert.equal((await state()).verified,false);
 await db.exec("update crm_whatsapp_message_events set phone_e164='5591000000000' where message_id='wamid.permission_accept3'");
 assert.equal((await state()).verified,true);
 const revision=(await db.query('select crm_recovery_private.source_revision($1) value',[fid])).rows[0].value;
 await db.exec("update crm_recovery_private.context_permission_scope set enabled_at=now()-interval '2 hours',expires_at=now()-interval '1 hour'");
 assert.equal((await state()).state,'disabled');assert.equal((await state()).verified,false);
 assert.notEqual((await db.query('select crm_recovery_private.source_revision($1) value',[fid])).rows[0].value,revision);
 // ACL, retention and no global permission/payment changes.
 for(const role of ['anon','authenticated','service_role']){
  assert.equal((await db.query("select has_table_privilege($1,'crm_recovery_private.context_permission_events','select') value",[role])).rows[0].value,false);
  assert.equal((await db.query("select has_function_privilege($1,'crm_recovery_private.context_permission_state(uuid)','execute') value",[role])).rows[0].value,false);
  assert.equal((await db.query("select has_table_privilege($1,'crm_recovery_private.context_permission_scope','update') value",[role])).rows[0].value,false);
 }
 for(const role of ['anon','authenticated'])assert.equal((await db.query("select has_function_privilege($1,'public.crm_recovery_read_context_permission(uuid)','execute') value",[role])).rows[0].value,false);
 assert.equal((await db.query("select bool_and(relrowsecurity) value from pg_class where oid in('crm_recovery_private.context_permission_events'::regclass,'crm_recovery_private.context_permission_scope'::regclass)")).rows[0].value,true);
 await db.exec("set request.jwt.claim.role='authenticated'");await assert.rejects(state());
 await db.exec("set request.jwt.claim.role='service_role'");
 await db.exec("update crm_recovery_private.context_permission_events set expires_at=now()-interval '1 second'");
 const purge=await client.rpc('crm_recovery_purge_expired');assert.equal(purge.error,null);assert.ok(purge.data>=5);
 assert.equal((await db.query('select count(*)::int n from crm_recovery_private.context_permission_events')).rows[0].n,0);
 assert.equal((await db.query('select consent_status from crm_customers where id=$1',[uid])).rows[0].consent_status,'unknown');
 assert.equal((await db.query("select count(*)::int n from crm_consent_audit where new_status='granted'")).rows[0].n,0);
 assert.equal((await db.query('select count(*)::int n from orders')).rows[0].n,0);
 }finally{await db.close();}
});
