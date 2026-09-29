import test from 'node:test';
import assert from 'node:assert/strict';
import { receiptCardQuote, RECEIPT_CARD_RATES } from '../supabase/functions/_shared/receipt-card.mjs';
const tariff=(gross,rate)=>Number((BigInt(gross)*BigInt(rate)+9999n)/10000n);
test('reverse quotes match all terminal examples and are minimal',()=>{
 for(const [base,credit,debit] of [[2500,2579,2515],[3000,3095,3018],[3300,3404,3319],[4900,5055,4929]]) {
  for(const [mode,expected] of [['credit_single',credit],['debit',debit]]) {
   const q=receiptCardQuote(base,mode);assert.equal(q.totalCents,expected);
   assert.equal(q.totalCents-tariff(q.totalCents,q.basisPoints),base);
   assert.ok(q.totalCents-1-tariff(q.totalCents-1,q.basisPoints)<base);
  }
 }
 for(const [gross,credit,debit] of [[2500,77,15],[3000,92,18],[3300,101,19]]) {assert.equal(tariff(gross,305),credit);assert.equal(tariff(gross,57),debit);}
});
test('changed items, delivery and payment recompute once over entire base',()=>{
 for(const products of [1800,2500,3000,3300,2500+3000,2500+1800*3]) for(const delivery of [0,800,1000]) {
  const base=products+delivery;
  for(const mode of ['credit_single','debit',null]) {
   const q=receiptCardQuote(base,mode);assert.equal(q.baseCents,base);assert.equal(q.feeCents+base,q.totalCents);
   if(mode===null)assert.equal(q.feeCents,0);
   else {assert.equal(q.totalCents-tariff(q.totalCents,RECEIPT_CARD_RATES[mode]),base);assert.ok(q.totalCents-1-tariff(q.totalCents-1,RECEIPT_CARD_RATES[mode])<base);}
  }
 }
 assert.equal(receiptCardQuote(2500+800,'credit_single').totalCents,3404);
 assert.equal(receiptCardQuote(2500+800,'debit').totalCents,3319);
 assert.equal(receiptCardQuote(3000+800,'credit_single').totalCents,3920);
});
test('invalid modes and noninteger amounts cannot be quoted',()=>{
 for(const mode of ['installments','credit_installments','unknown'])assert.throws(()=>receiptCardQuote(2500,mode));
 for(const base of [-1,1.2,NaN,Infinity])assert.throws(()=>receiptCardQuote(base,'debit'));
});
