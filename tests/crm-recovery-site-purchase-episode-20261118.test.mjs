import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyRecoverySitePurchaseEpisode as classify} from '../supabase/functions/_shared/recovery-site-purchase-episode.mjs';
const at=h=>`2026-11-18T${h}:00Z`;
const config=()=>({now:at('15:00'),interestAt:at('13:00'),identityBasis:'verified',order:{
  created_at:at('10:00'),paid_at:at('10:05'),updated_at:at('11:00'),payment_status:'paid',order_status:'completed'}});
test('a finished paid record known before a genuine new interest is historical, never a send grant',()=>{
  const r=classify(config());assert.equal(r.state,'historical_paid_record');
  assert.equal(r.send_authorized,false);assert.equal(r.payment_confirmed,false);
});
test('a paid record created within the current episode remains current',()=>{
  const c=config();Object.assign(c.order,{created_at:at('13:01'),paid_at:at('13:05'),updated_at:at('13:06'),order_status:'confirmed'});
  assert.equal(classify(c).state,'current_paid_record');
});
test('late bookkeeping and a payment for an older order do not prove a historical-only purchase',()=>{
  for(const change of [{updated_at:at('13:00')},{updated_at:at('14:00')},{paid_at:at('13:30'),updated_at:at('14:00')}]) {
    const c=config();Object.assign(c.order,change);assert.equal(classify(c).state,'requires_reconciliation');
  }
});
test('candidate references, missing interest and invalid episode window cannot ignore a purchase',()=>{
  for(const change of [{identityBasis:'candidate'},{identityBasis:null},{interestAt:null},{interestAt:at('16:00')},
    {interestAt:'2026-11-17T15:00:00Z'},{now:null}])
    assert.equal(classify({...config(),...change}).state,'requires_reconciliation');
});
test('missing, inconsistent and future order dates fail closed',()=>{
  for(const change of [{paid_at:null},{updated_at:null},{created_at:null},{paid_at:''},{updated_at:'invalid'},
    {created_at:at('10:10')},{updated_at:at('10:01')},{updated_at:at('16:00')}]) {
    const c=config();Object.assign(c.order,change);assert.equal(classify(c).state,'requires_reconciliation');
  }
});
test('unfinished, canceled, unknown or pending records cannot be discarded as finished history',()=>{
  for(const order_status of ['confirmed','preparing','ready_for_pickup','out_for_delivery','cancelled','canceled','unknown',null]) {
    const c=config();c.order.order_status=order_status;assert.equal(classify(c).state,'requires_reconciliation');
  }
  const c=config();c.order.payment_status='pending';assert.equal(classify(c).state,'requires_reconciliation');
});
test('diagnostic result contains no order, phone, amount or timestamps',()=>{
  const c=config();Object.assign(c.order,{customer_phone:'5591000000000',total:123.45,id:'synthetic-order'});
  const result=classify(c);assert.deepEqual(Object.keys(result).sort(),['payment_confirmed','send_authorized','state']);
  for(const value of ['5591000000000','123.45','synthetic-order','2026'])assert.ok(!JSON.stringify(result).includes(value));
});
