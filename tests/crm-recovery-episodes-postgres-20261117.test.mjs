import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {classifyRecoveryInterest} from '../supabase/functions/_shared/recovery-interest.mjs';
const cid='00000000-0000-4000-8000-000000000001',uid='00000000-0000-4000-8000-000000000002',fid='00000000-0000-4000-8000-000000000003';
const tid='00000000-0000-4000-8000-000000000004',phone='5591000000000';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('PostgreSQL episode integration: scope, official interest, guards, holds, preflight, stale lease and rollback',async()=>{
 const db=new PGlite();try{
 // Reuse the existing due-queue fixture contract, not a replacement SQL evaluator.
 const source=read('tests/crm-recovery-due-postgres-20261116.test.mjs');
 const bootstrap=source.slice(source.indexOf('await db.exec(`')+15,source.indexOf('`);',source.indexOf('await db.exec(`')));
 await db.exec(bootstrap.replaceAll('${uid}',uid).replaceAll('${cid}',cid).replaceAll('${fid}',fid).replaceAll('${phone}',phone));
 await db.exec(`ALTER TABLE crm_customers ADD display_name text,ADD UNIQUE(phone_e164);
 ALTER TABLE crm_customers ALTER id SET DEFAULT gen_random_uuid();
 ALTER TABLE tintim_order_links ADD status text;
 ALTER TABLE crm_conversations ADD source_label text,ADD UNIQUE(tintim_conversation_id);
 ALTER TABLE crm_follow_ups ALTER id SET DEFAULT gen_random_uuid();
 ALTER TABLE crm_follow_ups ALTER status SET DEFAULT 'pending';
 ALTER TABLE crm_follow_ups ADD created_at timestamptz DEFAULT now();
 ALTER TABLE crm_follow_ups ADD resolved_at timestamptz,ADD resolution_reason text;
 ALTER TABLE crm_whatsapp_message_events ADD message_id text,ADD direction text,ADD phone_e164 text,ADD received_at timestamptz;
 ALTER TABLE crm_whatsapp_message_events ADD provider text DEFAULT 'meta';
 ALTER TABLE crm_whatsapp_message_events ALTER id SET DEFAULT gen_random_uuid();
 ALTER TABLE crm_whatsapp_message_events ALTER received_at SET DEFAULT now();
 ALTER TABLE crm_whatsapp_message_events ADD UNIQUE(provider,message_id,direction);
 ALTER TABLE crm_tintim_message_events ADD direction text,ADD time_basis text;
 ALTER TABLE tintim_conversations ADD account_key text,ADD external_lead_id text,ADD identity_basis text,
 ADD created_at timestamptz,ADD updated_at timestamptz,ADD last_observed_at timestamptz,ADD contact_name text,ADD source_label text;
 CREATE TABLE tintim_webhook_receipts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),account_key text,lead_key text,summary jsonb,received_at timestamptz DEFAULT now());
 CREATE TABLE crm_events(id uuid DEFAULT gen_random_uuid(),conversation_id uuid,event_type text,event_origin text,summary text,provider_event_id text,occurred_at timestamptz);
 CREATE FUNCTION public.crm_require_staff() RETURNS void LANGUAGE plpgsql AS $$BEGIN
 IF auth.role() IS DISTINCT FROM 'authenticated' THEN RAISE EXCEPTION 'staff_only'; END IF;END$$;
 ALTER TABLE crm_automation_settings ADD automatic_sends_enabled boolean DEFAULT false;
 INSERT INTO crm_automation_settings VALUES(true,45,false);
 CREATE TABLE crm_automation_queue(follow_up_id uuid PRIMARY KEY,conversation_id uuid,due_at timestamptz,queue_state text,blockers text[],evaluated_at timestamptz);
 CREATE TABLE crm_automation_monitor(singleton boolean PRIMARY KEY,last_evaluated_at timestamptz,examined int,scheduled int,blocked int,finished int,review_required int);
 INSERT INTO crm_automation_monitor(singleton) VALUES(true);`);
 const normalizer=read('supabase/migrations/20261026203000_crm_followups_assistidos.sql');
 const normalizerStart=normalizer.indexOf('CREATE FUNCTION public.crm_normalize_br_phone(');
 await db.exec(normalizer.slice(normalizerStart,normalizer.indexOf('$$;',normalizerStart)+3));
 await db.exec(read('supabase/prepared/recovery-private-observations.sql'));
 await db.exec(read('supabase/migrations/20261116155426_crm_recovery_due_shadow.sql'));
 await db.exec(read('supabase/migrations/20261116164957_crm_recovery_scheduler_auth.sql'));
 await db.exec(read('supabase/migrations/20261117234453_crm_recovery_purchase_episodes.sql'));
 await db.exec('ALTER TABLE orders ADD order_number bigint');
 await db.exec(read('supabase/migrations/20261118010932_crm_recovery_official_order_references.sql'));
 await db.exec(read('supabase/migrations/20261118070703_crm_recovery_site_purchase_episodes.sql'));
 await db.exec(`CREATE TRIGGER guard BEFORE INSERT OR UPDATE OF status,due_at ON crm_follow_ups
 FOR EACH ROW EXECUTE FUNCTION crm_protect_purchase_signal_followup();
 CREATE TRIGGER live_sync AFTER UPDATE OF stage_label,last_observed_at ON tintim_conversations
 FOR EACH ROW EXECUTE FUNCTION crm_ingest_tintim_on_change();
 SET request.jwt.claim.role='service_role';`);
 await db.query(`insert into tintim_conversations values($1,$2,'Comprou','synthetic-account','synthetic-lead','tintim_lead_id',
 now()-interval '8 days',now()-interval '7 days',now()-interval '7 days',null,null)`,[tid,phone]);
 await db.query('update crm_conversations set tintim_conversation_id=$1 where id=$2',[tid,cid]);
 await db.query(`insert into tintim_webhook_receipts(account_key,lead_key,summary,received_at)
 values('synthetic-account','synthetic-lead',$1,now()-interval '7 days 1 minute')`,[JSON.stringify({stage:'Comprou',phone_digits:phone})]);
 const review=async()=> (await db.query('select crm_recovery_private.tintim_episode_requires_review($1) value',[cid])).rows[0].value;
 const preflight=async()=> (await db.query('select crm_followup_send_preflight($1) value',[fid])).rows[0].value;
 const insert=()=>db.query("insert into crm_follow_ups(conversation_id,status,due_at) values($1,'pending',now()-interval '1 minute')",[cid]);
 assert.equal(await review(),true); // no rollout scope: legacy protection unchanged
 await assert.rejects(insert(),/crm_possible_purchase_review_required/);
 await db.query('insert into crm_recovery_private.episode_scope(conversation_id,enabled) values($1,true)',[cid]);
 assert.equal(await review(),true); // no semantic interest
 await db.query(`insert into crm_whatsapp_message_events(id,conversation_id,occurred_at,message_id,direction,phone_e164,received_at) values(gen_random_uuid(),$1,now()-interval '1 hour',
 'wamid.synthetic_episode','inbound',$2,now()-interval '59 minutes')`,[cid,phone]);
 await db.query("select crm_recovery_store_observation($1,'wamid.synthetic_episode',(select occurred_at from crm_whatsapp_message_events where message_id='wamid.synthetic_episode'),$2)",[cid,JSON.stringify(classifyRecoveryInterest('Quero cascão de Prestígio'))]);
 assert.equal(await review(),false);
 // Uncertain identity and current server updates cannot be labeled historical.
 await db.exec("update tintim_conversations set identity_basis='phone_provisional'");
 assert.equal(await review(),true);
 await db.exec("update tintim_conversations set identity_basis='tintim_lead_id'");
 await db.exec("update crm_whatsapp_message_events set phone_e164='5591000000001'");
 assert.equal(await review(),true);
 await db.exec("update crm_whatsapp_message_events set phone_e164='5591000000000'");
 assert.equal(await review(),false);
 await db.query("update crm_follow_ups set due_at=now()-interval '1 minute' where id=$1",[fid]);
 await db.exec("set request.jwt.claim.role='authenticated'");
 assert.equal((await db.query('select crm_hold_tintim_purchase_signals() value')).rows[0].value,0);
 await db.exec("set request.jwt.claim.role='service_role'");
 const p=await preflight();assert.equal(p.ready,false);assert.ok(p.reasons.includes('sender_disabled'));
 assert.ok(!p.reasons.includes('purchase_signal_review'));
 await db.query('select crm_automation_evaluate_pending()');
 assert.ok(!(await db.query('select blockers from crm_automation_queue where follow_up_id=$1',[fid])).rows[0].blockers.includes('possible_purchase'));
 // Both SQL consumers agree on historical completed site purchases. The public
 // send preflight is still disabled; this is not financial confirmation.
 const siteOrder='00000000-0000-4000-8000-000000000010';
 await db.query(`insert into orders(id,customer_phone,created_at,paid_at,updated_at,payment_status,order_status)
 values($1,$2,now()-interval '2 hours',now()-interval '110 minutes',now()-interval '100 minutes','paid','completed')`,[siteOrder,phone]);
 await db.query("insert into tintim_order_links(id,conversation_id,order_uuid,status) values(gen_random_uuid(),$1,$2,'candidate')",[tid,siteOrder]);
 const siteReview=async()=> (await db.query('select crm_recovery_private.site_order_requires_review($1,$2) value',[siteOrder,cid])).rows[0].value;
 assert.equal(await siteReview(),false);
 assert.ok(!(await preflight()).reasons.includes('purchase_signal_review'));
 await db.query('select crm_automation_evaluate_pending()');
 assert.ok(!(await db.query('select blockers from crm_automation_queue where follow_up_id=$1',[fid])).rows[0].blockers.includes('possible_purchase'));
 for(const change of ["updated_at=now()","paid_at=null","customer_phone=null","order_status='confirmed'"]){
  await db.query(`update orders set ${change} where id=$1`,[siteOrder]);
  assert.equal(await siteReview(),true);assert.ok((await preflight()).reasons.includes('purchase_signal_review'));
  await db.query('select crm_automation_evaluate_pending()');
  assert.ok((await db.query('select blockers from crm_automation_queue where follow_up_id=$1',[fid])).rows[0].blockers.includes('possible_purchase') || change==='customer_phone=null');
  await db.query(`update orders set customer_phone=$2,paid_at=now()-interval '110 minutes',updated_at=now()-interval '100 minutes',order_status='completed' where id=$1`,[siteOrder,phone]);
 }
 assert.equal((await db.query("select has_function_privilege('service_role','crm_recovery_private.site_order_requires_review(uuid,uuid)','execute') value")).rows[0].value,false);
 await db.query('delete from tintim_order_links where order_uuid=$1',[siteOrder]);
 await db.query('delete from orders where id=$1',[siteOrder]);
 const revision=(await db.query('select crm_recovery_private.source_revision($1) value',[fid])).rows[0].value;
 const lease=(await db.query('select * from crm_recovery_claim_due($1)',[[phone]])).rows[0];assert.ok(lease?.lease_token);
 // A newly received manual report with no trustworthy sale date must invalidate
 // an in-flight decision BEFORE relying on any contact-stage update.
 await db.query(`insert into tintim_webhook_receipts(account_key,lead_key,summary)
 values('synthetic-account','synthetic-lead',$1)`,[JSON.stringify({stage:'Comprou',phone_digits:phone,observed_at:'2026-01-01'})]);
 assert.notEqual((await db.query('select crm_recovery_private.source_revision($1) value',[fid])).rows[0].value,revision);
 assert.equal(await review(),true);
 assert.equal((await db.query('select crm_recovery_finish_due($1,$2,$3,$4,$5,false) value',
 [fid,lease.lease_token,lease.revision,'shadow_candidate',[]])).rows[0].value,'stale');
 assert.ok((await preflight()).reasons.includes('purchase_signal_review'));
 await db.exec("set request.jwt.claim.role='authenticated'");
 assert.equal((await db.query('select crm_hold_tintim_purchase_signals() value')).rows[0].value,1);
 assert.equal((await db.query('select status from crm_follow_ups where id=$1',[fid])).rows[0].status,'canceled');
 await assert.rejects(insert(),/crm_possible_purchase_review_required/);
 // Remove only synthetic late evidence to exercise the independent live-sync
 // branch with the real AFTER UPDATE trigger and its current-command snapshot.
 await db.exec("delete from tintim_webhook_receipts where received_at>now()-interval '1 day'");
 assert.equal(await review(),false);
 await insert();
 await db.exec("update tintim_conversations set stage_label='Comprou',updated_at=now(),last_observed_at=now()-interval '7 days'");
 assert.equal((await db.query("select count(*)::int n from crm_follow_ups where status='pending'")).rows[0].n,0);
 await assert.rejects(insert(),/crm_possible_purchase_review_required/);
 // Scope cannot expand to a second contact/conversation.
 await assert.rejects(db.query('insert into crm_recovery_private.episode_scope(conversation_id) values($1)',[cid]));
 // RPC and private configuration are inaccessible to public browser roles.
 assert.equal((await db.query("select has_function_privilege('anon','public.crm_recovery_purchase_episode(uuid)','execute') value")).rows[0].value,false);
 assert.equal((await db.query("select has_table_privilege('service_role','crm_recovery_private.episode_scope','update') value")).rows[0].value,false);
 assert.equal((await db.query("select has_function_privilege('service_role','crm_recovery_private.tintim_episode_requires_review(uuid)','execute') value")).rows[0].value,false);
 await db.exec("set request.jwt.claim.role='service_role'");
 const dto=(await db.query('select crm_recovery_purchase_episode($1) value',[cid])).rows[0].value;
 assert.equal(dto.send_authorized,false);assert.equal(dto.payment_confirmed,false);assert.ok(!JSON.stringify(dto).includes(phone));
 await db.exec("set request.jwt.claim.role='authenticated'");
 await assert.rejects(db.query('select crm_recovery_purchase_episode($1)',[cid]),/provider_only/);
 await db.exec("set request.jwt.claim.role='service_role'");
 // Expiry restores legacy behavior even without changing any timestamp on a customer.
 await db.exec("update crm_recovery_private.episode_scope set enabled_at=now()-interval '2 hours',expires_at=now()-interval '1 hour'");
 assert.equal(await review(),true);
 // Rollback is disable, not reopening old follow-ups or inventing payment.
 await db.exec('update crm_recovery_private.episode_scope set enabled=false');
 assert.equal(await review(),true);
 assert.equal((await db.query('select count(*)::int n from orders')).rows[0].n,0);
 assert.equal((await db.query('select sent_at from crm_follow_ups where id=$1',[fid])).rows[0].sent_at,null);
 // Real official app_echo ingress can create a NEW pending follow-up for this
 // current interest, without reviving any canceled historical follow-up.
 const meta=read('supabase/migrations/20261026213000_crm_observabilidade_meta_preparo.sql');
 const start=meta.indexOf('CREATE FUNCTION public.crm_record_meta_message(');
 await db.exec(meta.slice(start,meta.indexOf('$$;',start)+3));
 await db.exec("update tintim_conversations set updated_at=now()-interval '7 days'");
 await db.exec("update crm_recovery_private.episode_scope set enabled=true,enabled_at=now(),expires_at=now()+interval '24 hours'");
 assert.equal(await review(),false);
 await db.query("select crm_record_meta_message($1,'wamid.synthetic_new_echo','app_echo',now()-interval '1 minute')",[phone]);
 const pending=(await db.query("select id,due_at>now() future from crm_follow_ups where status='pending'")).rows;
 assert.equal(pending.length,1);assert.notEqual(pending[0].id,fid);assert.equal(pending[0].future,true);
 assert.equal((await db.query('select status from crm_follow_ups where id=$1',[fid])).rows[0].status,'canceled');
 assert.equal((await db.query('select count(*)::int n from orders')).rows[0].n,0);

 // Structural rollback compiles against the full current schema, preserves
 // payment records, and restores the pre-cut SQL bodies with finite scope OFF.
 await db.query(`insert into orders(id,customer_phone,created_at,paid_at,updated_at,payment_status,order_status)
 values($1,$2,now()-interval '2 hours',now()-interval '110 minutes',now()-interval '100 minutes','paid','completed')`,[siteOrder,phone]);
 assert.equal(await siteReview(),false);
 await db.exec('update crm_recovery_private.episode_scope set enabled=false');
 assert.equal(await siteReview(),true);
 await db.exec(read('supabase/prepared/recovery-site-episodes-restore-functions.sql'));
 assert.ok((await preflight()).reasons.includes('purchase_signal_review'));
 assert.equal((await db.query('select payment_status from orders where id=$1',[siteOrder])).rows[0].payment_status,'paid');
 await db.query('delete from orders where id=$1',[siteOrder]);
 await db.exec(read('docs/edge-release/rollback/20261117-recovery-episodes/restore-functions.sql'));
 await assert.rejects(insert(),/crm_possible_purchase_review_required/);
 }finally{await db.close();}
});
