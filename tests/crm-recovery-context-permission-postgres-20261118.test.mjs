import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,createHash} from 'node:crypto';
import {prepareRecoveryMessage} from '../supabase/functions/_shared/recovery-message-preparation.mjs';
import {PGlite} from '@electric-sql/pglite';
import {setupContextPermissionDatabase} from './fixtures/recovery-permission-database.mjs';
import {clientFor} from './fixtures/recovery-postgres-client.mjs';
import {assembleRecoveryEvaluation as assemble} from '../supabase/functions/_shared/recovery-snapshot.mjs';
import {privateRecoveryObservations} from '../supabase/functions/_shared/recovery-observation-store.mjs';
import {CONTEXT_PERMISSION_OFFER,privateContextPermissions} from '../supabase/functions/_shared/recovery-context-permission.mjs';
const cid='00000000-0000-4000-8000-000000000001',uid='00000000-0000-4000-8000-000000000002',fid='00000000-0000-4000-8000-000000000003',phone='5591000000000';
test('real signed permission protocol, private ledger, periodic snapshot, SQL guards, revocation, usage, scope and retention',async()=>{
 const db=new PGlite();try{
 await setupContextPermissionDatabase(db,{cid,uid,fid,phone});
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
 // Actual full assembler -> canonical text -> second full read. Preview never
 // consumes the grant or records a delivery attempt, even on a valid candidate.
 const messageOptions={enabled:true,conversationId:cid,followUpId:fid,authorizedPhones:[phone],
  clock:()=>new Date().toISOString(),rollout:{...options().rollout,purchase_coverage_verified:true}};
 const incomplete=await prepareRecoveryMessage(client,{...messageOptions,rollout:options().rollout});
 assert.equal(incomplete.state,'blocked');assert.ok(!('body' in incomplete));
 const messagePlan=await prepareRecoveryMessage(client,messageOptions);
 assert.equal(messagePlan.state,'prepared',JSON.stringify({messagePlan,errors:client.errors}));
 assert.ok(messagePlan.body.includes('Cascão Trufado — Prestígio'));
 assert.equal(messagePlan.content_digest,createHash('sha256').update(messagePlan.body).digest('hex'));
 assert.equal(messagePlan.context.interest_message_id,'wamid.permission_interest');
 assert.equal(messagePlan.context.offer_message_id,'wamid.permission_offer');
 assert.equal(messagePlan.send_authorized,false);assert.equal((await state()).state,'granted');
 assert.equal((await db.query('select count(*)::int n from crm_recovery_private.context_permission_uses')).rows[0].n,0);
 for(const mutation of [
  async()=>db.query('update crm_customers set updated_at=clock_timestamp() where id=$1',[uid]),
  async()=>db.query("insert into orders(id,customer_phone,created_at,updated_at,payment_status,order_status,paid_at) values(gen_random_uuid(),$1,now(),now(),'paid','accepted',now())",[phone]),
  async()=>run(await event('wamid.preview_new_answer',119,true,'Combinado')),
  async()=>run(await event('wamid.preview_cancel',4,false,'CANCELAR LEMBRETE')),
 ]){
  await db.exec('BEGIN');let readCount=0;
  const changed=await prepareRecoveryMessage(client,messageOptions,{evaluate:async(c,o)=>{if(++readCount===2)await mutation();return assemble(c,o);}});
  assert.equal(changed.state,'blocked');assert.ok(!('body' in changed));await db.exec('ROLLBACK');
 }
 {
 // Private atomic preparation is not called by the real scheduler/sender.
 // All following mutations/clock cases are isolated synthetic data, rolled back.
 await db.exec('BEGIN');
 const preparationLease=(await db.query('select * from crm_recovery_claim_due($1)',[[phone]])).rows[0];
 assert.ok(preparationLease?.lease_token);
 assert.equal((await db.query('select crm_recovery_finish_due($1,$2,$3,$4,$5,false) result',
  [fid,preparationLease.lease_token,preparationLease.revision,hypothetical.classification,hypothetical.blockers])).rows[0].result,'recorded');
 const revision=preparationLease.revision,digest=messagePlan.content_digest;
 const reserve=async(change={})=>(await db.query('select crm_recovery_private.reserve_context_permission($1,$2,$3,$4,$5) result',
  [change.followUp??fid,change.offer??'wamid.permission_offer',change.revision??revision,
   change.purpose??'one_context_follow_up',change.digest??digest])).rows[0].result;
 assert.equal((await reserve({purpose:'promotions'})).state,'invalid_request');
 assert.equal((await reserve({digest:'bad'})).state,'invalid_request');
 assert.equal((await reserve({offer:'wamid.some_other_offer'})).state,'permission_unavailable');
 assert.equal((await reserve({revision:'b'.repeat(32)})).state,'decision_unavailable');
 async function deniedWith(sql,expected='decision_unavailable'){
  await db.exec('SAVEPOINT use_case');await db.exec(sql);
  assert.equal((await reserve()).state,expected);await db.exec('ROLLBACK TO use_case');
 }
 await deniedWith("update crm_recovery_private.due_checks set valid_until=now()-interval '1 second'");
 // Expired in real DB time but newer than this open transaction's now().
 await new Promise(resolve=>setTimeout(resolve,20));
 await deniedWith("update crm_recovery_private.due_checks set valid_until=clock_timestamp()-interval '1 millisecond'");
 await deniedWith("update crm_recovery_private.due_checks set lease_token=gen_random_uuid(),lease_until=now()+interval '1 minute'");
 await deniedWith("update crm_recovery_private.due_checks set classification='blocked',blockers=ARRAY['order_check_incomplete']");
 await deniedWith("update store_settings set value='false' where key='orders_open'");
 await deniedWith("update crm_customers set commercial_opt_out=true",'permission_unavailable');
 await deniedWith("update crm_recovery_private.context_permission_scope set enabled=false",'permission_unavailable');
 assert.equal((await db.query('select count(*)::int n from crm_recovery_private.context_permission_uses')).rows[0].n,0);
 // PGlite serializes requests: verifies two calls/unique constraints, NOT live
 // overlapping transactions on independent production PostgreSQL connections.
 const competing=await Promise.all([reserve(),reserve()]);
 assert.equal(competing.filter(r=>r.state==='reserved').length,1);
 assert.equal(competing.filter(r=>r.state==='already_reserved').length,1);
 assert.ok(competing.every(r=>r.send_authorized===false));
 assert.ok(!('reservation_id' in competing.find(r=>r.state==='already_reserved')));
 const use=(await db.query('select * from crm_recovery_private.context_permission_uses')).rows[0];
 assert.equal(use.content_digest,digest);assert.equal(use.source_revision,revision);
 assert.equal(use.anchor_message_id,'wamid.permission_interest');assert.equal(use.follow_up_id,fid);
 assert.ok(new Date(use.valid_until)-new Date(use.reserved_at)<=60000);
 assert.equal((await state()).state,'used');
 assert.notEqual((await db.query('select crm_recovery_private.source_revision($1) r',[fid])).rows[0].r,revision);
 assert.equal((await run(null)).permission_basis,'context_permission_used');
 assert.equal((await reserve({digest:'c'.repeat(64)})).state,'already_reserved');
 await db.exec("update crm_recovery_private.context_permission_uses set valid_until=reserved_at+interval '1 millisecond'");
 assert.equal((await state()).state,'used'); // no automatic token/permission recycling
 // Deleting an unsent follow-up cannot release the permission for another one.
 await db.query('delete from crm_follow_ups where id=$1',[fid]);
 assert.equal((await state()).state,'used');
 assert.equal((await db.query('select count(*)::int n from crm_recovery_private.context_permission_uses')).rows[0].n,1);
 // Same interest + newer explicit offer/accept is still one use, not another
 // delivery opportunity. A genuinely newer product interest is a new episode.
 await run(await event('wamid.permission_reoffer',4,true,CONTEXT_PERMISSION_OFFER));
 await run(await event('wamid.permission_reaccept',5,false,'PODE LEMBRAR'));
 assert.equal((await state()).state,'used');
 await run(await event('wamid.permission_new_interest',6,false,'Quero cascão de Prestígio'));
 await run(await event('wamid.permission_new_offer',7,true,CONTEXT_PERMISSION_OFFER));
 await run(await event('wamid.permission_new_accept',8,false,'PODE LEMBRAR'));
 assert.equal((await state()).state,'granted');
 // Offer retention already owns cleanup; no free-standing unbounded use ledger.
 await db.exec("update crm_recovery_private.context_permission_events set expires_at=now()-interval '1 day' where message_id='wamid.permission_offer'");
 await db.query('select crm_recovery_purge_expired()');
 assert.equal((await db.query('select count(*)::int n from crm_recovery_private.context_permission_uses')).rows[0].n,0);
 for(const role of ['anon','authenticated','service_role']){
  assert.equal((await db.query("select has_function_privilege($1,'crm_recovery_private.reserve_context_permission(uuid,text,text,text,text)','EXECUTE') permitted",[role])).rows[0].permitted,false);
  for(const privilege of ['SELECT','INSERT','UPDATE','DELETE'])assert.equal((await db.query("select has_table_privilege($1,'crm_recovery_private.context_permission_uses',$2) permitted",[role,privilege])).rows[0].permitted,false);
 }
 await db.exec('ROLLBACK');
 }
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
