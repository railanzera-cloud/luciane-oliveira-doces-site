import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeTintimPayload, extractOrderReferenceFromTintim } from '../supabase/functions/tintim-webhook/core.mjs';
const t = '2026-10-12T12:00:00Z';
test('preserves campaign and source without message body', () => {
 const r=normalizeTintimPayload({event_type:'lead.update',lead:{phone:'(91) 99999-8888',name:'Teste'},ad:{campaign_id:'77'},visit:{url:'https://example.com/?utm_source=ig&fbclid=X'},message:'private'},t);
 assert.equal(r.summary.campaign_id,'77');assert.equal(r.summary.phone_digits,'91999998888');
 assert.equal(r.summary.visit_parameters.utm_source,'ig');
 assert.equal(r.lead_key,null);assert.ok(!JSON.stringify(r).includes('private'));
});
test('uses explicit conversation ID if present',()=>{
 const r=normalizeTintimPayload({event_type:'lead.update',lead:{phone:'91999998888'},conversation:{uuid:'uuid-123'}},t);
 assert.equal(r.lead_key,'uuid-123');
});
test('ignores message events',()=>{
 assert.equal(normalizeTintimPayload({event_type:'message.create',message:'body'},t).ignored,true);
});
const exampleText = 'Olá! Finalizei meu pedido pelo site da Luciane Oliveira Doces.\n\n*PEDIDO #1047*\n\nCliente: Teste';
const inbound = (overrides={}) => ({
 event_type:'message.create', from_me:false, phone:'(91) 99999-8888',
 account:{code:'luciane'}, message:{text:exampleText}, ...overrides,
});
test('extracts only the exact order number from verified incoming site message',()=>{
 const r=extractOrderReferenceFromTintim(inbound(),t);
 assert.equal(r.ignored,false);
 assert.equal(r.order_number,1047);
 assert.equal(r.phone_digits,'91999998888');
 assert.equal(r.lead_key,null);
 assert.ok(!JSON.stringify(r).includes('Cliente: Teste'));
});
test('normalizer rejects outbound and missing direction',()=>{
 assert.equal(extractOrderReferenceFromTintim(inbound({from_me:true}),t).ignored,true);
 assert.equal(extractOrderReferenceFromTintim(inbound({from_me:undefined}),t).ignored,true);
});
test('does not link arbitrary text mentioning an order number',()=>{
 assert.equal(extractOrderReferenceFromTintim(inbound({message:{text:'Gostaria de saber sobre PEDIDO #1047'}}),t).ignored,true);
});
test('does not accept synthetic order message without reliable phone',()=>{
 assert.equal(extractOrderReferenceFromTintim(inbound({phone:null}),t).ignored,true);
});
test('extracts lead id when supported, otherwise remains phone-only candidate',()=>{
 const r=extractOrderReferenceFromTintim(inbound({lead:{id:'tintim-abc',phone:'91999998888'}}),t);
 assert.equal(r.lead_key,'tintim-abc');
});
test('ignores messages unrelated to orders without persisting their content',()=>{
 const r=extractOrderReferenceFromTintim(inbound({message:{text:'CPF 000.000.000-00 senha privada'}}),t);
 assert.equal(r.ignored,true);assert.equal(JSON.stringify(r).includes('CPF'),false);
});
test('does not parse lead events as messages',()=>{
 assert.equal(extractOrderReferenceFromTintim({event_type:'lead.update',phone:'91999998888'},t).ignored,true);
});
