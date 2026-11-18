import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {classifyRecoveryInterest} from '../supabase/functions/_shared/recovery-interest.mjs';
const cid='00000000-0000-4000-8000-000000000001',uid='00000000-0000-4000-8000-000000000002',fid='00000000-0000-4000-8000-000000000003';
const phone='5591000000000';
test('PostgreSQL due leases: due time, scope, stale sources, replay, retry, expiry and ACL',async()=>{
 const db=new PGlite();try{
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
 CREATE SCHEMA auth;CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$select nullif(current_setting('request.jwt.claim.role',true),'')$$;
 CREATE TABLE public.crm_customers(id uuid primary key,phone_e164 text,updated_at timestamptz,consent_status text,consent_at timestamptz,consent_evidence text,commercial_opt_out boolean);
 CREATE TABLE public.crm_conversations(id uuid primary key,customer_id uuid,tintim_conversation_id uuid,status text,created_at timestamptz,updated_at timestamptz,last_inbound_at timestamptz,last_outbound_at timestamptz);
 CREATE TABLE public.crm_follow_ups(id uuid primary key,conversation_id uuid,status text,due_at timestamptz,sent_at timestamptz);
 CREATE TABLE public.crm_whatsapp_message_events(id uuid primary key,conversation_id uuid,occurred_at timestamptz);
 CREATE TABLE public.crm_tintim_message_events(id uuid primary key,conversation_id uuid,occurred_at timestamptz);
 CREATE TABLE public.orders(id uuid primary key,created_at timestamptz,updated_at timestamptz,customer_phone text,payment_status text,order_status text,paid_at timestamptz);
 CREATE TABLE public.menu_availability(id integer primary key,item_key text,status text);
 CREATE FUNCTION public.public_crocante_inventory() RETURNS jsonb LANGUAGE sql STABLE AS $$select '[]'::jsonb$$;
 CREATE TABLE public.store_settings(id integer primary key,key text,value jsonb);
 CREATE TABLE public.tintim_order_links(id uuid primary key,conversation_id uuid,order_uuid uuid);
 CREATE TABLE public.tintim_conversations(id uuid primary key,phone_digits text,stage_label text);
 CREATE TABLE public.crm_consent_audit(id uuid primary key,customer_id uuid,actor_user_id uuid,new_status text,new_opt_out boolean,new_evidence text,new_consent_at timestamptz,recorded_at timestamptz);
 CREATE TABLE public.crm_automation_settings(singleton boolean,follow_up_minutes integer);
 INSERT INTO public.crm_customers VALUES('${uid}','${phone}',now(),'unknown',NULL,NULL,false);
 INSERT INTO public.crm_conversations VALUES('${cid}','${uid}',NULL,'waiting_customer',now()-interval '2 hours',now(),now()-interval '1 hour',now()-interval '55 minutes');
 INSERT INTO public.crm_follow_ups VALUES('${fid}','${cid}','pending',now()+interval '5 minutes',NULL);`);
 await db.exec(fs.readFileSync(new URL('../supabase/prepared/recovery-private-observations.sql',import.meta.url),'utf8'));
 await db.exec(fs.readFileSync(new URL('../supabase/migrations/20261116155426_crm_recovery_due_shadow.sql',import.meta.url),'utf8'));
 await db.exec("set request.jwt.claim.role='service_role'");
 await db.query('select public.crm_recovery_store_observation($1,$2,now()-interval \'1 hour\',$3)',[cid,'wamid.syntheticdue',JSON.stringify(classifyRecoveryInterest('Quero cascão de Prestígio'))]);
 const claim=async()=> (await db.query('select * from public.crm_recovery_claim_due($1)',[[phone]])).rows;
 const finish=async(j,classification='blocked',blockers=['permission_unverified'],retry=false)=>(await db.query('select public.crm_recovery_finish_due($1,$2,$3,$4,$5,$6) value',[j.follow_up_id,j.lease_token,j.revision,classification,blockers,retry])).rows[0].value;
 assert.equal((await claim()).length,0); // no early timer
 await db.exec(`update public.crm_follow_ups set due_at=now()-interval '1 minute'`);
 assert.equal((await db.query('select * from public.crm_recovery_claim_due($1)',[['5591000000001']])).rows.length,0);
 let j=(await claim())[0];assert.ok(j.lease_token);assert.equal((await claim()).length,0);
 // A payment arriving during the JS snapshot invalidates completion.
 await db.exec(`insert into public.orders values(gen_random_uuid(),now(),now(),'${phone}','paid','accepted',now())`);
 assert.equal(await finish(j,'shadow_candidate',[]),'stale');
 j=(await claim())[0];assert.ok(j);
 await assert.rejects(finish(j,'blocked',['PRIVATE customer message']));
 await assert.rejects(finish(j,'shadow_candidate',['permission_unverified']));
 assert.equal(await finish(j),'recorded');assert.equal(await finish(j),'stale');
 const read=async()=> (await db.query('select * from public.crm_recovery_read_due($1)',[[phone]])).rows;
 assert.equal((await read())[0].classification,'blocked');
 await db.exec("update public.orders set order_status='completed'");
 assert.equal((await read())[0].classification,'insufficient_evidence');
 assert.equal((await read())[0].valid_until,null);
 // Restore the exact input to continue the identical-revision deduplication test.
 await db.exec("update public.orders set order_status='accepted'");
 assert.equal((await claim()).length,0);
 // Even with next_check_at due, a still-valid identical revision is deduped.
 await db.exec('update crm_recovery_private.due_checks set next_check_at=now()');
 assert.equal((await claim()).length,0);
 await db.exec("update crm_recovery_private.due_checks set valid_until=now()-interval '1 second'");
 j=(await claim())[0];assert.ok(j);
 assert.equal(await finish(j,'insufficient_evidence',['snapshot_source_unavailable_or_incomplete'],true),'retry');
 assert.equal((await claim()).length,0);
 await db.exec("update crm_recovery_private.due_checks set next_check_at=now(),lease_until=now()-interval '1 second'");
 j=(await claim())[0];assert.ok(j);
 await db.exec("update crm_recovery_private.due_checks set lease_until=now()-interval '1 second'");
 const replacement=(await claim())[0];assert.notEqual(replacement.lease_token,j.lease_token);assert.equal(await finish(j),'stale');
 // Other source changes invalidate a leased decision, not only payments.
 for(const mutation of [
  `update public.crm_customers set commercial_opt_out=true`,
  `insert into public.menu_availability values(1,'cone_prestigio','sold_out')`,
  `update public.crm_conversations set last_inbound_at=now()`,
  `update public.crm_follow_ups set status='canceled'`,
 ]){
  const leased=(await db.query('select * from crm_recovery_private.due_checks')).rows[0];
  await db.exec(mutation);
  assert.equal(await finish({...leased,follow_up_id:fid}),'stale');
  if(!mutation.includes("status='canceled'"))await claim();
 }
 // Real staff grant needs matching audit; stale evidence cannot confer permission.
 await db.exec(`update public.crm_customers set commercial_opt_out=false,consent_status='granted',consent_at=now()-interval '1 minute',consent_evidence='synthetic explicit authorization'`);
 const allowed=async()=> (await db.query('select public.crm_recovery_permission_evidence($1) value',[uid])).rows[0].value;
 assert.equal(await allowed(),false);
 await db.exec(`insert into public.crm_consent_audit select gen_random_uuid(),id,gen_random_uuid(),'granted',false,consent_evidence,consent_at,now() from public.crm_customers`);
 assert.equal(await allowed(),true);
 await db.exec("update public.crm_customers set consent_evidence='synthetic other authorization'");assert.equal(await allowed(),false);
 for(const role of ['anon','authenticated']){
  assert.equal((await db.query("select has_function_privilege($1,'public.crm_recovery_claim_due(text[])','execute') allowed",[role])).rows[0].allowed,false);
  await db.exec(`set role ${role}`);await assert.rejects(db.query('select * from crm_recovery_private.due_checks'));await db.exec('reset role');
 }
 await db.exec('set role service_role');
 await assert.rejects(db.query('select * from crm_recovery_private.due_checks'));
 assert.equal((await db.query('select * from public.crm_recovery_claim_due($1)',[[phone]])).rows.length,0);
 await db.exec('reset role');
 await db.exec('begin');
 await db.exec('revoke execute on function public.crm_recovery_claim_due(text[]) from service_role');
 assert.equal((await db.query("select has_function_privilege('service_role','public.crm_recovery_claim_due(text[])','execute') ok")).rows[0].ok,false);
 await db.exec('rollback');
 assert.equal((await db.query("select has_function_privilege('service_role','public.crm_recovery_claim_due(text[])','execute') ok")).rows[0].ok,true);
 await db.exec("set request.jwt.claim.role='authenticated'");await assert.rejects(claim());
 await db.exec("set request.jwt.claim.role='service_role';update crm_recovery_private.due_checks set expires_at=now()-interval '1 second'");
 assert.equal((await db.query('select public.crm_recovery_purge_expired() n')).rows[0].n,1);
 assert.equal((await db.query('select count(*)::int n from crm_recovery_private.due_checks')).rows[0].n,0);
 }finally{await db.close();}
});
