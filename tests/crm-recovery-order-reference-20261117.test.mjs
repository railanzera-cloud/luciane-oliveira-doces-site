import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {parseRecoveryOrderNumber as parse,inspectSignedRecoveryOrderReferences as inspect} from '../supabase/functions/_shared/recovery-order-reference.mjs';
const phone='5591000000000',foreign='5592000000000';
const config={appSecret:'synthetic-order-reference-test-secret',wabaId:'101',phoneNumberId:'202',
 receivedAt:'2026-11-17T21:00:00Z',expectedConversationKey:`101:202:${phone}`};
const body='Olá! Finalizei meu pedido pelo site da Luciane Oliveira Doces.\n\n*PEDIDO #70001*\n\nCliente: Synthetic Person\n1x Cascão Trufado — Prestígio\nTotal: R$ 18,00';
const stamp=String(Date.parse('2026-11-17T20:59:00Z')/1000);
function payload(){return {object:'whatsapp_business_account',entry:[{id:'101',changes:[{field:'messages',value:{metadata:{phone_number_id:'202'},messages:[{id:'wamid.synthetic_reference',from:phone,timestamp:stamp,type:'text',text:{body}}]}}]}]};}
async function run(p=payload(),override={}){const raw=JSON.stringify(p),signature='sha256='+createHmac('sha256',config.appSecret).update(raw).digest('hex');return inspect(raw,{...config,signature,...override});}
test('only the current generated header identifies a candidate number',()=>{
 assert.equal(parse(body),70001);assert.equal(parse(body.replaceAll('\n','\r\n')),70001);
 for(const t of ['Pedido #70001','Já paguei o pedido #70001','Anúncio: '+body,'"'+body+'"',body+'\n*PEDIDO #70002*',body.replace('#70001','#0'),body.replace('#70001','#070001'),body.replace('#70001','#12345678901'),'x'.repeat(4097)])assert.equal(parse(t),null);
});
test('signed direct inbound is scoped and redacted; never confirms payment or ownership',async()=>{
 const r=await run();assert.equal(r.state,'inspected');assert.equal(r.references.length,1);
 assert.equal(r.references[0].order_number,70001);assert.equal(r.references[0].reference_status,'candidate');
 assert.equal(r.references[0].occurred_at,'2026-11-17T20:59:00.000Z');
 assert.equal(r.send_authorized,false);assert.equal(r.payment_confirmed,false);assert.equal(r.purchase_coverage_verified,false);
 for(const v of [phone,'Synthetic Person','R$ 18,00',config.appSecret,'Cascão'])assert.ok(!JSON.stringify(r).includes(v));
});
test('signature, assets, scope and malformed envelopes cannot create references',async()=>{
 assert.equal((await run(payload(),{signature:'sha256='+'0'.repeat(64)})).references.length,0);
 assert.equal((await run(payload(),{expectedConversationKey:'101:202:'+foreign})).references.length,0);
 for(const mutate of [p=>p.entry[0].id='999',p=>p.entry[0].changes[0].value.metadata.phone_number_id='999',p=>p.entry[0].changes[0].value.messages[0]=null]){
  const p=payload();mutate(p);assert.equal((await run(p)).references.length,0);
 }
});
test('forwarded, quoted, media, outgoing and duplicate/cross-contact IDs stay untrusted',async()=>{
 for(const context of [{forwarded:true},{frequently_forwarded:true},{id:'wamid.quoted'}]){
  const p=payload();p.entry[0].changes[0].value.messages[0].context=context;assert.equal((await run(p)).references.length,0);
 }
 const media=payload();media.entry[0].changes[0].value.messages[0].type='image';assert.equal((await run(media)).references.length,0);
 const echo=payload(),c=echo.entry[0].changes[0];c.field='smb_message_echoes';c.value.message_echoes=c.value.messages.map(m=>({...m,to:phone}));delete c.value.messages;assert.equal((await run(echo)).references.length,0);
 const cross=payload();cross.entry[0].changes.push({field:'smb_message_echoes',value:{metadata:{phone_number_id:'202'},message_echoes:[{id:'wamid.synthetic_reference',to:phone,timestamp:stamp,type:'text',text:{body}}]}});assert.equal((await run(cross)).references.length,0);
 for(const other of [phone,foreign]){const p=payload(),ms=p.entry[0].changes[0].value.messages;ms.push({...ms[0],from:other});assert.equal((await run(p)).references.length,0);}
});
test('original timestamps control the 24h boundary; no receipt-time substitution',async()=>{
 for(const at of [Date.parse(config.receivedAt)/1000+1,Date.parse(config.receivedAt)/1000-86400,'invalid']){
  const p=payload();p.entry[0].changes[0].value.messages[0].timestamp=String(at);assert.equal((await run(p)).references.length,0);
 }
});
