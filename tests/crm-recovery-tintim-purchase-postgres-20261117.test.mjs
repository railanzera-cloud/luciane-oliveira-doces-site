import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {normalizeTintimPayload} from '../supabase/functions/tintim-webhook/core.mjs';

const read=p=>fs.readFileSync(new URL('../supabase/migrations/'+p,import.meta.url),'utf8');
function functionSql(source,name) {
 const start=source.search(new RegExp('CREATE (?:OR REPLACE )?FUNCTION public\\.'+name+'\\('));
 assert.ok(start>=0);const end=source.indexOf('$$;',start);assert.ok(end>start);
 return source.slice(start,end+3);
}

test('real PostgreSQL: late manual Tintim purchase holds follow-up without chat trigger or financial mutation',async()=>{
 const db=new PGlite();
 try {
  await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
   CREATE TABLE public.crm_customers(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),phone_e164 text UNIQUE,display_name text,updated_at timestamptz DEFAULT now());
   CREATE TABLE public.crm_conversations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),customer_id uuid,tintim_conversation_id uuid UNIQUE,source_label text);
   CREATE TABLE public.crm_follow_ups(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),conversation_id uuid,status text,due_at timestamptz,sent_at timestamptz,resolved_at timestamptz,resolution_reason text);
   CREATE TABLE public.crm_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),conversation_id uuid,event_type text,event_origin text,summary text);
   CREATE TABLE public.tintim_conversations(id uuid PRIMARY KEY,phone_digits text,contact_name text,source_label text,stage_label text,last_observed_at timestamptz);
   CREATE TABLE public.tintim_webhook_receipts(id uuid PRIMARY KEY,event_type text,observed_at timestamptz,summary jsonb);
   CREATE TABLE public.orders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),payment_status text);
   INSERT INTO public.orders(payment_status) VALUES('pending');`);
  await db.exec(functionSql(read('20261026203000_crm_followups_assistidos.sql'),'crm_normalize_br_phone'));
  const uid='00000000-0000-4000-8000-000000000001',cid='00000000-0000-4000-8000-000000000002';
  const tid='00000000-0000-4000-8000-000000000003',rid='00000000-0000-4000-8000-000000000004';
  await db.query("insert into public.crm_customers(id,phone_e164,display_name) values($1,'5591000000000','Synthetic')",[uid]);
  await db.query('insert into public.crm_conversations(id,customer_id,tintim_conversation_id) values($1,$2,$3)',[cid,uid,tid]);
  // Local-format phone normalizes to the existing customer exactly.
  await db.query("insert into public.tintim_conversations values($1,'91000000000','Synthetic','synthetic','Em atendimento',now()-interval '2 days')",[tid]);
  await db.query("insert into public.crm_follow_ups(conversation_id,status,due_at) values($1,'pending',now()+interval '10 minutes')",[cid]);
  await db.exec(read('20261012235500_tintim_commercial_observations.sql'));
  await db.exec(read('20261026235500_crm_tintim_live_sync.sql'));
  const guard=read('20261026231500_crm_tintim_purchase_signal_guard.sql');
  await db.exec(functionSql(guard,'crm_protect_purchase_signal_followup'));
  await db.exec(`CREATE TRIGGER crm_purchase_signal_before_followup BEFORE INSERT OR UPDATE OF status,due_at
   ON public.crm_follow_ups FOR EACH ROW EXECUTE FUNCTION public.crm_protect_purchase_signal_followup();`);
  const e=normalizeTintimPayload({event_type:'lead.update',lead:{id:'synthetic-lead',phone:'91000000000'},
   status:{name:'Comprou'},sale_amount:27.50},new Date().toISOString());
  assert.equal(e.summary.sale_amount_from_message,null);
  await db.query('insert into public.tintim_webhook_receipts values($1,$2,$3,$4)',[rid,e.event_type,e.observed_at,JSON.stringify(e.summary)]);
  await db.query('update public.tintim_conversations set stage_label=$2,last_observed_at=$3 where id=$1',[tid,e.summary.stage,e.observed_at]);
  const f=(await db.query('select status,resolution_reason,sent_at from public.crm_follow_ups')).rows[0];
  assert.deepEqual(f,{status:'canceled',resolution_reason:'tintim_purchase_signal',sent_at:null});
  assert.equal((await db.query('select count(*)::int n from public.crm_events')).rows[0].n,1);
  const o=(await db.query('select reported_amount_source,review_status from public.tintim_commercial_observations')).rows[0];
  assert.deepEqual(o,{reported_amount_source:'manual_or_default',review_status:'unverified'});
  assert.equal((await db.query('select payment_status from public.orders')).rows[0].payment_status,'pending');
  // Document the existing limit: the guard does not know the actual sale date
  // and still blocks a later pending follow-up while the stage stays Comprou.
  await db.query("update public.tintim_conversations set last_observed_at=now()-interval '2 days' where id=$1",[tid]);
  await assert.rejects(db.query("insert into public.crm_follow_ups(conversation_id,status,due_at) values($1,'pending',now()+interval '1 hour')",[cid]),/crm_possible_purchase_review_required/);
  assert.equal((await db.query('select count(*)::int n from public.crm_follow_ups')).rows[0].n,1);
  // Both values may coexist; do not invent precedence or aggregate revenue.
  const second='00000000-0000-4000-8000-000000000005';
  await db.query("insert into public.tintim_webhook_receipts values($1,'lead_update',now(),$2)",[second,JSON.stringify({stage:'Comprou',sale_amount:27.50,sale_amount_from_message:27.50})]);
  const ambiguous=(await db.query('select reported_amount_source,reported_sale_amount from public.tintim_commercial_observations where receipt_id=$1',[second])).rows[0];
  assert.deepEqual(ambiguous,{reported_amount_source:'ambiguous_both_fields',reported_sale_amount:null});
 } finally {await db.close();}
});
