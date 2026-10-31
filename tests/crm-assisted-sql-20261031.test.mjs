import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const read = name => fs.readFileSync(new URL('../supabase/migrations/'+name, import.meta.url),'utf8');
const staff='11111111-1111-4111-8111-111111111111';
const db = new PGlite();
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claim.role',true),''),'authenticated') $$;
CREATE TABLE tintim_conversations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),phone_digits text,contact_name text,source_label text,stage_label text,campaign_name text,last_observed_at timestamptz DEFAULT now());
CREATE TABLE orders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),customer_phone text,payment_status text,order_status text,created_at timestamptz DEFAULT now());
CREATE TABLE tintim_order_links(conversation_id uuid,order_uuid uuid,status text);
`);
await db.exec(read('20261026203000_crm_followups_assistidos.sql'));
await db.exec(`

CREATE TABLE crm_whatsapp_message_events(conversation_id uuid,direction text,occurred_at timestamptz);
CREATE TABLE crm_automation_settings(singleton boolean,automatic_sends_enabled boolean,follow_up_minutes integer DEFAULT 45);
INSERT INTO crm_automation_settings(singleton,automatic_sends_enabled) VALUES(true,false);
INSERT INTO auth.users VALUES('${staff}'); INSERT INTO crm_staff_access VALUES('${staff}',now());
SET request.jwt.claim.sub='${staff}';
`);
await db.exec(read('20261027001000_crm_tintim_message_observe.sql'));
await db.exec(read('20261027003000_crm_tintim_receipt_time.sql'));
await db.exec("UPDATE crm_tintim_observation_settings SET apply_to_followups=true");
await db.exec(read('20261027004000_crm_followup_send_preflight.sql'));
await db.exec(read('20261027006000_crm_confirm_interest.sql'));
await db.exec(read('20261031175609_crm_assisted_followup_guard.sql'));
async function fixture() {
 const {rows:[{id:customer}]}=await db.query("INSERT INTO crm_customers(phone_e164,display_name,consent_status,consent_evidence,consent_at) VALUES('5591999999999','Contato de teste','granted','Autorizou acompanhamento na conversa',now()) RETURNING id");
 const {rows:[{id:conversation}]}=await db.query("INSERT INTO crm_conversations(customer_id,status,interest_label,interest_basis,last_inbound_at,last_outbound_at) VALUES($1,'waiting_customer','Prestígio','staff_confirmed',now()-interval '2 hours',now()-interval '1 hour') RETURNING id",[customer]);
 const {rows:[{id:follow}]}=await db.query("INSERT INTO crm_follow_ups(conversation_id,due_at) VALUES($1,now()-interval '15 minutes') RETURNING id",[conversation]);
 await db.query("INSERT INTO crm_tintim_message_events(conversation_id,direction,time_basis,occurred_at,fingerprint,phone_e164) VALUES($1,'inbound','provider_timestamp',now()-interval '2 hours',repeat('a',64),'5591999999999')",[conversation]);
 return {customer,conversation,follow};
}
async function review(id) {return (await db.query('SELECT crm_assisted_followup_review($1) AS result',[id])).rows[0].result;}
async function scenario(name,fn) {
 await test(name,async()=>{
  await db.exec('BEGIN');
  try {await fn(await fixture());} finally {await db.exec('ROLLBACK');}
 });
}
await scenario('SQL: elegível para assistência com envio automático desligado; revisão não grava',async({follow})=>{
 const before=(await db.query('SELECT count(*) FROM crm_events')).rows[0].count;
 const automatic=(await db.query('SELECT crm_followup_send_preflight($1) AS result',[follow])).rows[0].result;
 assert.equal(automatic.ready,false); assert.deepEqual(automatic.reasons,['sender_disabled']);
 const r=await review(follow); assert.equal(r.eligible,true);assert.equal(r.phone_e164,'5591999999999');assert.equal(r.interest_label,'Prestígio');
 assert.equal((await db.query('SELECT count(*) FROM crm_events')).rows[0].count,before);
});
for (const [name,sql,reason] of [
 ['sem autorização',"UPDATE crm_customers SET consent_status='unknown'",'consent_not_verified'],
 ['sem evidência',"UPDATE crm_customers SET consent_evidence=NULL",'consent_not_verified'],
 ['opt-out',"UPDATE crm_customers SET commercial_opt_out=true",'commercial_opt_out'],
 ['produto não confirmado',"UPDATE crm_conversations SET interest_basis='unknown'",'product_not_confirmed'],
 ['sem produto',"UPDATE crm_conversations SET interest_label=NULL",'product_not_confirmed'],
 ['horário de recebimento não é horário original',"UPDATE crm_tintim_message_events SET time_basis='webhook_received'",'inbound_timestamp_unverified'],
 ['janela vencida',"UPDATE crm_conversations SET last_inbound_at=now()-interval '25 hours'",'outside_verified_service_window'],
 ['horário futuro',"UPDATE crm_conversations SET last_inbound_at=now()+interval '2 minutes'",'outside_verified_service_window'],
 ['resposta antes do lembrete',"UPDATE crm_conversations SET last_inbound_at=now(),status='in_progress'",'not_waiting_customer'],
 ['encerrado',"UPDATE crm_conversations SET status='closed'",'not_waiting_customer'],
 ['possível compra Tintim',"INSERT INTO tintim_conversations(phone_digits,stage_label) VALUES('91999999999','Comprou')",'purchase_signal_review'],
 ['pedido pago',"INSERT INTO orders(customer_phone,payment_status) VALUES('5591999999999','paid')",'purchase_signal_review'],
 ['ainda não venceu',"UPDATE crm_follow_ups SET due_at=now()+interval '10 minutes'",'not_due'],
]) await scenario('SQL bloqueia '+name,async({follow})=>{
 await db.exec(sql); const r=await review(follow);assert.equal(r.eligible,false);assert.ok(r.reasons.includes(reason));assert.equal(r.phone_e164,null);
 await assert.rejects(db.query("SELECT crm_assisted_record_send($1,'5591999999999','Prestígio')",[follow]),/crm_assisted_review_required/);
});
await scenario('SQL: abrir não registra; envio manual é único e impede novo lembrete sem nova resposta',async({follow,conversation})=>{
 await review(follow);assert.equal((await db.query('SELECT status FROM crm_follow_ups WHERE id=$1',[follow])).rows[0].status,'pending');
 await db.query("SELECT crm_assisted_record_send($1,'5591999999999','Prestígio')",[follow]);
 assert.equal((await db.query('SELECT status FROM crm_follow_ups WHERE id=$1',[follow])).rows[0].status,'sent_manually');
 assert.equal((await db.query("SELECT count(*) FROM crm_events WHERE event_type='sent_manually'")).rows[0].count,1);
 const {rows:[{id:next}]}=await db.query("INSERT INTO crm_follow_ups(conversation_id,due_at) VALUES($1,now()-interval '1 minute') RETURNING id",[conversation]);
 assert.ok((await review(next)).reasons.includes('already_contacted_since_reply'));
 await assert.rejects(db.query("SELECT crm_record_action($1,'sent_manually')",[conversation]),/crm_assisted_review_required/);
});
await scenario('SQL: registro manual repetido rejeitado',async({follow})=>{
 await db.query("SELECT crm_assisted_record_send($1,'5591999999999','Prestígio')",[follow]);
 await assert.rejects(db.query("SELECT crm_assisted_record_send($1,'5591999999999','Prestígio')",[follow]),/crm_assisted_review_required/);
});
await scenario('SQL: destino ou produto divergente rejeita registro',async({follow})=>{
 await assert.rejects(db.query("SELECT crm_assisted_record_send($1,'5591888888888','Prestígio')",[follow]),/crm_assisted_review_required/);
});
await scenario('SQL: resposta posterior cancela lembrete e bloqueia registro antigo',async({follow,conversation})=>{
 await db.query("SELECT crm_record_action($1,'replied')",[conversation]);
 assert.equal((await db.query('SELECT status FROM crm_follow_ups WHERE id=$1',[follow])).rows[0].status,'canceled');
 assert.equal((await review(follow)).eligible,false);
 await assert.rejects(db.query("SELECT crm_assisted_record_send($1,'5591999999999','Prestígio')",[follow]),/crm_assisted_review_required/);
});
await scenario('SQL: legado também bloqueia envio com possível compra',async({conversation})=>{
 await db.exec("INSERT INTO tintim_conversations(phone_digits,stage_label) VALUES('5591999999999','Comprou')");
 await assert.rejects(db.query("SELECT crm_record_action($1,'sent_manually')",[conversation]),/crm_assisted_review_required/);
});
await scenario('SQL: atualização não duplica pendentes; índice único',async({conversation})=>{
 await assert.rejects(db.query("INSERT INTO crm_follow_ups(conversation_id,due_at) VALUES($1,now())",[conversation]),/duplicate key/);
});
await scenario('SQL: usuário sem acesso específico é rejeitado',async({follow})=>{
 await db.exec("SET request.jwt.claim.sub='22222222-2222-4222-8222-222222222222'");
 await assert.rejects(review(follow),/crm_access_denied/);
});
await scenario('SQL + Tintim real: resposta do cliente cancela lembrete e retry não duplica evento',async({follow})=>{
 await db.exec("SET request.jwt.claim.role='service_role'");
 const record=()=>db.query("SELECT crm_record_tintim_message(repeat('b',64),'5591999999999','inbound',now(),'2c956a42-229f-4d21-ade6-4442f8c048ed') AS result");
 assert.equal((await record()).rows[0].result.accepted,true);
 assert.equal((await record()).rows[0].result.duplicate,true);
 assert.equal((await db.query('SELECT status FROM crm_follow_ups WHERE id=$1',[follow])).rows[0].status,'canceled');
 assert.equal((await review(follow)).eligible,false);
});
await scenario('SQL + Tintim real: envio observado depois do registro não libera repetição',async({follow,conversation})=>{
 await db.query("SELECT crm_assisted_record_send($1,'5591999999999','Prestígio')",[follow]);
 await db.exec("SET request.jwt.claim.role='service_role'");
 await db.query("SELECT crm_record_tintim_message(repeat('c',64),'5591999999999','business_outbound',now()+interval '1 second','2c956a42-229f-4d21-ade6-4442f8c048ed')");
 const next=(await db.query("SELECT id FROM crm_follow_ups WHERE conversation_id=$1 AND status='pending'",[conversation])).rows[0].id;
 assert.ok((await review(next)).reasons.includes('already_contacted_since_reply'));
 assert.equal((await db.query("SELECT count(*) FROM crm_follow_ups WHERE status='sent_manually'")).rows[0].count,1);
});
await test('SQL: ACL não expõe core, anon ou tabelas CRM',async()=>{
 for (const fn of ['crm_assisted_followup_review(uuid)','crm_assisted_record_send(uuid,text,text)']) {
  assert.equal((await db.query('SELECT has_function_privilege(\'anon\',$1,\'EXECUTE\') AS allowed',[fn])).rows[0].allowed,false);
  assert.equal((await db.query('SELECT has_function_privilege(\'authenticated\',$1,\'EXECUTE\') AS allowed',[fn])).rows[0].allowed,true);
 }
 assert.equal((await db.query("SELECT has_function_privilege('authenticated','crm_record_action_core(uuid,text,text,integer,text)','EXECUTE') AS allowed")).rows[0].allowed,false);
 assert.equal((await db.query("SELECT has_table_privilege('authenticated','crm_customers','SELECT') AS allowed")).rows[0].allowed,false);
});
await db.close();
