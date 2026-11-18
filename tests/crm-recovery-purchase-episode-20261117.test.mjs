import test from 'node:test';
import assert from 'node:assert/strict';
import {assessRecoveryPurchaseEpisode as assess} from '../supabase/functions/_shared/recovery-purchase-episode.mjs';
const now='2026-11-17T23:30:00Z';
const interest={id:'synthetic-interest',conversation_key:'synthetic-conversation',verified:true,
 intent:'interest',time_basis:'provider_timestamp',occurred_at:'2026-11-17T22:00:00Z',received_at:'2026-11-17T22:00:01Z'};
const signal=(at,extra={})=>({id:'synthetic-purchase',conversation_key:interest.conversation_key,
 verified:true,kind:'purchase_stage',receipt_time_basis:'server_received_at',received_at:at,...extra});
const run=signals=>assess({now,interest,signals});
test('previous-week purchase does not describe the new buying episode or authorize sending',()=>{
 const r=run([signal('2026-11-10T22:00:00Z')]);
 assert.equal(r.relation,'historical_only');assert.equal(r.historical_count,1);
 assert.equal(r.send_authorized,false);assert.equal(r.payment_confirmed,false);
 assert.equal(r.purchase_coverage_verified,false);
});
test('new purchase evidence, even a delayed manual update claiming an older date, needs reconciliation',()=>{
 const r=run([signal('2026-11-17T22:01:00Z',{observed_at:'2026-11-10T22:00:00Z',stage_label:'Comprou',sale_amount:27.5})]);
 assert.equal(r.relation,'current_or_ambiguous');assert.equal(r.reason,'purchase_reconciliation_required');
 assert.equal(r.current_or_ambiguous_count,1);assert.ok(!JSON.stringify(r).includes('27.5'));
});
test('equal timestamps remain ambiguous and both past/current reports are preserved',()=>{
 const r=run([signal('2026-11-10T22:00:00Z'),signal(interest.occurred_at,{id:'second'})]);
 assert.equal(r.historical_count,1);assert.equal(r.current_or_ambiguous_count,1);
 assert.equal(r.relation,'current_or_ambiguous');
});
test('silence, greetings or expired interest cannot open a new buying episode',()=>{
 for(const override of [{intent:'unknown'},{verified:false},{time_basis:'received_at'},
  {occurred_at:'2026-11-16T23:30:00Z'},{received_at:'2026-11-17T21:00:00Z'},
  {received_at:'2026-11-18T00:00:00Z'},{conversation_key:''}])
  assert.equal(assess({now,interest:{...interest,...override},signals:[]}).relation,'unresolved');
});
test('missing evidence never certifies no purchase or enables follow-up',()=>{
 const r=run([]);assert.equal(r.relation,'no_purchase_evidence');
 assert.equal(r.reason,'absence_is_not_purchase_coverage');assert.equal(r.send_authorized,false);
 assert.equal(r.purchase_coverage_verified,false);
});
test('unknown origin, cross-contact evidence and invalid/future receipt times fail closed',()=>{
 for(const override of [{verified:false},{conversation_key:'other'},{received_at:null},
  {received_at:'2026-11-18T00:00:00Z'},{kind:'receipt_image'},{id:''},{receipt_time_basis:'provider_updated_at'}]) {
  const r=run([signal('2026-11-10T22:00:00Z',override)]);
  assert.equal(r.relation,'unresolved');assert.equal(r.reason,'purchase_evidence_unverified');
 }
});
test('duplicate receipts count once; conflicting duplicate identity never establishes history',()=>{
 const old=signal('2026-11-10T22:00:00Z');
 assert.equal(run([old,old]).historical_count,1);
 const r=run([old,signal('2026-11-17T22:01:00Z')]);
 assert.equal(r.relation,'unresolved');assert.equal(r.reason,'purchase_evidence_conflict');
});
