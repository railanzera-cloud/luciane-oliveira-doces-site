import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {classifyRecoveryInterest} from '../supabase/functions/_shared/recovery-interest.mjs';
import {buildRecoveryMessage} from '../supabase/functions/_shared/recovery-message.mjs';
import {prepareRecoveryMessage} from '../supabase/functions/_shared/recovery-message-preparation.mjs';
const now='2026-11-18T16:00:00Z',cid='00000000-0000-4000-8000-000000000001',fid='00000000-0000-4000-8000-000000000003',uid='00000000-0000-4000-8000-000000000002',phone='5591000000000';
function decision(text='Quero cascão de Prestígio') {return {version:'shadow-1',mode:'shadow',send_authorized:false,classification:'shadow_candidate',blockers:[],
 interest:classifyRecoveryInterest(text),permission_basis:'signed_context_permission',consistency:'optimistic_shadow_only',
 commerce_checks:{external_purchase_coverage:true,site_orders_read:true,store_open:true,unattributed_orders:false},
 preparation_context:{version:'message-context-1',source_fingerprint:'a'.repeat(64),interest_message_id:'wamid.synthetic_interest',
  interest_at:'2026-11-18T15:00:00Z',offer_message_id:'wamid.synthetic_offer',valid_until:'2026-11-18T16:00:30Z'}};}
const build=d=>buildRecoveryMessage(d,{now});
test('draft distinguishes identical flavors across categories, preserves variants and fixes exact content hash',async()=>{
 for(const [text,label] of [
  ['Quero Coca-Cola Zero','Refrigerante — Coca-Cola Zero (Lata 220 ml)'],
  ['Quero fatia de Prestígio','Fatia artesanal — Prestígio'],
  ['Quero cascão de Prestígio','Cascão Trufado — Prestígio'],
  ['Quero fatia de chocottone Ferrero Rocher','Fatia de Chocottone — Ferrero Rocher'],
  ['Quero pipoca trufada Coco Queimado pacote M','Pipoca Trufada — Coco Queimado (Pacote M)'],
  ['Quero pipoca gourmet Leitinho com Kinder Bueno 750 ml','Pipoca Gourmet de pote — Leitinho + Kinder Bueno (750 ml)'],
  ['Quero pipoca gourmet Leitinho com Choco Nute e Nutella 1l','Pipoca Gourmet de pote — Leitinho + Choco Nute + Nutella (1 litro)'],
 ]){
  const d=decision(text),r=await build(d);assert.equal(r.state,'prepared',JSON.stringify({text,d,r}));
  assert.ok(r.body.includes(label));assert.equal(r.content_digest,createHash('sha256').update(r.body).digest('hex'));
  assert.equal(r.send_authorized,false);assert.ok(r.body.includes('https://lucianeoliveiradoces.com.br'));
  assert.ok(!/R\$|esgotando|últimas|seu pedido está|pagamento confirmado/.test(r.body));
  assert.ok(r.body.includes('CANCELAR LEMBRETE'));
 }
});
test('catalog identity, canonical name, variant, complete availability and combination limit must all agree',async()=>{
 const variants=[d=>{d.interest.candidates[0].name='Promoção inventada https://example.invalid';},
  d=>{d.interest.candidates[0].product_id='cone-trufado-dois-amores';},
  d=>{d.interest.candidates[0].variant_id='750ml';},d=>{d.interest.availability_keys=[];},
  d=>{d.interest.catalog_version='old';},d=>{d.interest.candidates[0].extra='arbitrary';},
  d=>{d.interest.option_ids=['nutella'];},d=>{d.interest.categories=['future'];},
  d=>{d.interest.candidates.push(structuredClone(d.interest.candidates[0]));}];
 for(const alter of variants){const d=decision();alter(d);const r=await build(d);assert.equal(r.state,'blocked');assert.ok(!('body'in r));}
 const over=decision('Quero pipoca gourmet Leitinho com Choco Nute e Nutella 1l');
 over.interest.variant_ids=['500ml'];assert.equal((await build(over)).state,'blocked');
 for(const text of ['Quero Prestígio','Quero pipoca gourmet de Leitinho','Quero fatia de Prestígio ou Bombom de Uva'])assert.equal((await build(decision(text))).state,'blocked');
});
test('commercial blockers or missing/scoped permission prevent any message body',async()=>{
 for(const blocker of ['paid_order','purchase_or_order_requires_reconciliation','order_check_incomplete','outside_service_window','permission_unverified','opt_out','store_closed','not_due','store_response_pending']){
  const d=decision();d.blockers=[blocker];const r=await build(d);assert.equal(r.state,'blocked');assert.ok(!('body'in r));
 }
 for(const change of [{classification:'blocked'},{send_authorized:true},{permission_basis:'staff_evidence_audited'},
  {preparation_context:null},{commerce_checks:{store_open:true}}])assert.equal((await build({...decision(),...change})).state,'blocked');
 for(const until of [now,'2026-11-18T16:01:00Z']){const d=decision();d.preparation_context.valid_until=until;assert.equal((await build(d)).state,'blocked');}
});
function clientFixture(){
 const rows={crm_follow_ups:{id:fid,conversation_id:cid,status:'pending',due_at:'2026-11-18T15:50:00Z',sent_at:null},crm_conversations:{id:cid,customer_id:uid},crm_customers:{id:uid,phone_e164:phone}};
 const calls=[];return {rows,calls,from(table){calls.push(table);return {select(){return this;},eq(){return this;},range:async()=>({data:[{...rows[table]}],count:1,error:null})};},rpc(){throw Error('preview_must_not_reserve_or_send');}};
}
const options={enabled:true,conversationId:cid,followUpId:fid,authorizedPhones:[phone],rollout:{context_permission_enabled:true},clock:()=>now};
test('preview rereads a trusted snapshot, scopes a pending due follow-up and never reserves or sends',async()=>{
 const client=clientFixture();let evaluated=0;
 const r=await prepareRecoveryMessage(client,options,{evaluate:async(_,o)=>{evaluated++;assert.equal(o.rollout.message_preparation_enabled,true);return decision();}});
 assert.equal(r.state,'prepared');assert.equal(evaluated,2);assert.equal(r.follow_up_id,fid);assert.equal(r.send_authorized,false);
 assert.ok(!JSON.stringify(r).includes(phone));
 const disabled=clientFixture();assert.equal((await prepareRecoveryMessage(disabled)).state,'disabled');assert.equal(disabled.calls.length,0);
});
test('same product with changed sources, a new episode, payment or withdrawal invalidates preparation',async()=>{
 for(const alter of [d=>{d.preparation_context.source_fingerprint='b'.repeat(64);},d=>{d.preparation_context.interest_message_id='wamid.new_interest';},
  d=>{d.preparation_context.offer_message_id='wamid.new_offer';},d=>{d.classification='suppressed';d.blockers=['paid_order'];},
  d=>{d.blockers=['permission_unverified'];},d=>{d.blockers=['store_closed'];}]){
  let n=0;const r=await prepareRecoveryMessage(clientFixture(),options,{evaluate:async()=>{const d=decision();if(++n===2)alter(d);return d;}});
  assert.equal(r.state,'blocked');assert.ok(!('body'in r));
 }
});
test('scope, follow-up, identity, clock and failed reads fail closed without leaking source errors',async()=>{
 for(const opt of [{authorizedPhones:[]},{authorizedPhones:[phone,'5591000000001']},{rollout:{}},{followUpId:'bad'}])assert.equal((await prepareRecoveryMessage(clientFixture(),{...options,...opt})).state,'blocked');
 for(const mutate of [c=>{c.rows.crm_customers.phone_e164='5591000000001';},c=>{c.rows.crm_follow_ups.sent_at=now;},c=>{c.rows.crm_follow_ups.status='canceled';},c=>{c.rows.crm_follow_ups.due_at='2026-11-18T17:00:00Z';}]){
  const c=clientFixture();mutate(c);let n=0;assert.equal((await prepareRecoveryMessage(c,options,{evaluate:async()=>{n++;return decision();}})).state,'blocked');assert.equal(n,0);
 }
 let n=0;const expired=await prepareRecoveryMessage(clientFixture(),{...options,clock:()=>++n===1?now:'2026-11-18T16:00:30Z'},{evaluate:async()=>decision()});assert.equal(expired.reason,'preview_expired');
 let lastClock=0;const lateReturn=await prepareRecoveryMessage(clientFixture(),{...options,clock:()=>++lastClock<3?now:'2026-11-18T16:00:30Z'},{evaluate:async()=>decision()});assert.equal(lateReturn.reason,'preview_expired');
 const changedIdentity=clientFixture();let read=0;const moved=await prepareRecoveryMessage(changedIdentity,options,{evaluate:async()=>{if(++read===2)changedIdentity.rows.crm_customers.phone_e164='5591000000001';return decision();}});assert.equal(moved.state,'blocked');assert.ok(!('body' in moved));
 const failed=await prepareRecoveryMessage(clientFixture(),options,{evaluate:async()=>{throw Error('private customer data');}});assert.ok(!JSON.stringify(failed).includes('private customer'));
});
