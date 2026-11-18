import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {classifyRecoveryPurchaseSignal as classify,
  inspectSignedRecoveryPurchaseSignals as inspect,isKnownServiceUnavailability} from '../supabase/functions/_shared/recovery-purchase-signal.mjs';

// Synthetic only. No customer data, account asset or real secret.
const phone='5591000000000', foreign='5592000000000';
const config={appSecret:'synthetic-purchase-signal-test-secret',wabaId:'101',
  phoneNumberId:'202',receivedAt:'2026-11-17T21:00:00Z',expectedConversationKey:`101:202:${phone}`};
const stamp=String(Date.parse('2026-11-17T20:59:00Z')/1000);
function payload(text='Recebi seu Pix') {
  return {object:'whatsapp_business_account',entry:[{id:'101',changes:[{
    field:'smb_message_echoes',value:{metadata:{phone_number_id:'202'},message_echoes:[{
      id:'wamid.synthetic_echo',to:phone,timestamp:stamp,type:'text',text:{body:text},
    }]},
  }]}]};
}
async function run(p=payload(),override={}) {
  const raw=JSON.stringify(p),signature='sha256='+createHmac('sha256',config.appSecret).update(raw).digest('hex');
  return inspect(raw,{...config,signature,...override});
}
test('statements only block reconciliation; never prove payment or authorize sending',()=>{
  for (const text of ['Recebi seu Pix','Pagamento recebido!','Seu pagamento foi confirmado.','Seu pedido já foi entregue','Seu pedido foi retirado, obrigada']) {
    const r=classify(text,'business_outbound');
    assert.equal(r.detected,true,text);assert.equal(r.payment_confirmed,false);
    assert.equal(r.send_authorized,false);assert.equal(r.blocker,'purchase_or_order_requires_reconciliation');
  }
  assert.equal(classify('Já paguei!','inbound').basis,'customer_purchase_statement');
  assert.equal(classify('Já paguei!','business_outbound').detected,false);
});
test('negatives, questions, future promises, third parties and simple acceptance stay unknown',()=>{
  for (const text of ['Não recebi seu Pix','Pagamento não recebido','Pagamento recebido?',
    'Quando o pagamento recebido aparecer eu aviso','Se receber seu pagamento, confirmo',
    'Seu pedido será entregue','Seu pedido foi confirmado','Recebi seu Pix de outro cliente',
    'Seu pagamento foi confirmado, mas foi estornado','"Pagamento recebido"',
    'Pagamento recebido https://example.test','Obrigado','Aguardando pagamento'])
    assert.equal(classify(text,'business_outbound').detected,false,text);
  for (const text of ['Não paguei','Ainda vou pagar','Já paguei?','Meu amigo já pagou'])
    assert.equal(classify(text,'inbound').detected,false,text);
});
test('signed app_echo is scoped to original identity and timestamp; output is redacted',async()=>{
  const r=await run();assert.equal(r.signals.length,1);
  assert.equal(r.signals[0].occurred_at,'2026-11-17T20:59:00.000Z');
  assert.equal(r.signals[0].basis,'business_payment_statement');
  assert.equal(r.purchase_coverage_verified,false);
  for (const value of [phone,config.appSecret,'Recebi seu Pix']) assert.ok(!JSON.stringify(r).includes(value));
});
test('bad signature, foreign scope and assets cannot become a purchase signal',async()=>{
  assert.equal((await run(payload(),{signature:'sha256='+'0'.repeat(64)})).signals.length,0);
  assert.equal((await run(payload(),{expectedConversationKey:'999:202:'+phone})).state,'scope_rejected');
  const p=payload();p.entry[0].id='999';assert.equal((await run(p)).signals.length,0);
  const q=payload();q.entry[0].changes[0].value.metadata.phone_number_id='999';
  assert.equal((await run(q)).signals.length,0);
});
test('foreign batch, forwarded, quoted, media and repeated IDs are not promoted',async()=>{
  for (const change of ['foreign','forwarded','quoted','media','duplicate']) {
    const p=payload(),list=p.entry[0].changes[0].value.message_echoes,m=list[0];
    if(change==='foreign')m.to=foreign;
    if(change==='forwarded')m.context={forwarded:true};
    if(change==='quoted')m.context={id:'wamid.syntheticquote'};
    if(change==='media')m.type='image';
    if(change==='duplicate')list.push({...m});
    assert.equal((await run(p)).signals.length,0,change);
  }
});
test('outdated and future provider times never use receipt time as a substitute',async()=>{
  for (const date of ['2026-11-16T20:59:00Z','2026-11-17T21:01:00Z']) {
    const p=payload();p.entry[0].changes[0].value.message_echoes[0].timestamp=String(Date.parse(date)/1000);
    assert.equal((await run(p)).signals.length,0);
  }
});
test('absence of supported signal never certifies that the customer did not buy',async()=>{
  const r=await run(payload('Tudo bem'));assert.equal(r.state,'inspected');
  assert.deepEqual(r.signals,[]);assert.equal(r.purchase_coverage_verified,false);
  assert.equal(r.payment_confirmed,false);assert.equal(r.send_authorized,false);
});
test('shop macro is a closing signal but never financial proof; incomplete text is not enough',async()=>{
  const macro='Pedido confirmado ✅\nValor dos produtos: R$27,50\nEste valor corresponde somente aos produtos.\nObrigada pela preferência 😊';
  for(const text of [macro,macro+'\nTempo de entrega de 15 a 20 minutos ✅',macro.replace('R$27,50','R$ 1.027,50')]) {
    const r=await run(payload(text));assert.equal(r.signals[0].basis,'business_order_confirmation');
    assert.equal(r.signals[0].payment_confirmed,false);assert.ok(!JSON.stringify(r).includes('27,50'));
  }
  for(const text of ['Pedido confirmado ✅',macro.replace('27,50','0,00'),
    macro.replace('27,50','27.50'),macro.replace('27,50','27,500'),
    macro.replace('Pedido confirmado','Pedido não confirmado'),macro+'\nAinda aguardando pagamento'])
    assert.equal((await run(payload(text))).signals.length,0,text);
});
test('signed inbound statements stay separate from store echo and foreign text with same ID',async()=>{
  const p=payload(),change=p.entry[0].changes[0];change.field='messages';
  change.value.messages=[{id:'wamid.synthetic_inbound',from:phone,timestamp:stamp,type:'text',text:{body:'Já paguei'}}];
  delete change.value.message_echoes;
  let r=await run(p);assert.equal(r.signals[0].basis,'customer_purchase_statement');
  change.value.messages[0].text.body='Ainda não paguei';
  change.value.messages.push({...change.value.messages[0],from:foreign,text:{body:'Já paguei'}});
  r=await run(p);assert.equal(r.signals.length,0);
});
test('known out-of-hours greeting is not a purchase or a substantive store response',async()=>{
 const greeting='🍰 OLÁ! SEJA BEM-VINDO(A) À LUCIANE OLIVEIRA DOCES!\nNosso atendimento volta na quarta-feira, a partir das 12h, com muitas delícias esperando por vocês!\nAgradecemos imensamente pela preferência e pelo carinho de sempre.';
 assert.equal(isKnownServiceUnavailability(greeting),true);
 const r=await run(payload(greeting));assert.equal(r.signals.length,0);assert.equal(r.service_unavailability.length,1);
 assert.equal(isKnownServiceUnavailability('Posso separar sua fatia para amanhã?'),false);
 assert.equal(isKnownServiceUnavailability(greeting+' Recebi seu Pix'),false);
});

const preparation='Recebemos o seu pedido!\nAgora é só aguardar. Nosso tempo de preparação é de aproximadamente 15 a 20 minutos. Em breve, seu pedido estará prontinho para chegar até você!';
test('actual dispatch, collection and preparation phrases require review without confirming payment',async()=>{
 for(const text of ['Já saiu','Já pode fazer a retirada',preparation]) {
  const r=await run(payload(text));assert.equal(r.signals.length,1,text);
  assert.equal(r.signals[0].basis,'business_fulfillment_statement');
  assert.equal(r.signals[0].blocker,'purchase_or_order_requires_reconciliation');
  assert.equal(r.signals[0].payment_confirmed,false);assert.equal(r.send_authorized,false);
  assert.equal(r.purchase_coverage_verified,false);
  assert.ok(!JSON.stringify(r).includes(text));
  assert.equal(classify(text,'inbound').detected,false);
 }
});
test('operational signal grammar rejects questions, future promises, quotes and generic order acceptance',async()=>{
 for(const text of ['Já saiu?','Ainda não saiu','O novo sabor já saiu','Se já saiu, avise',
  'Já saiu, mas falta pagar','Já pode fazer a retirada?','Ainda não pode fazer a retirada',
  'Vai poder fazer a retirada','"Já saiu"','Já saiu https://example.test',
  'Pedido confirmado','Recebemos seu pedido. Aguardando o comprovante para finalizar sua compra.',
  'Recebemos seu pedido 💛 Agora é só deixar com a gente.',preparation+' Aguardando pagamento',
  preparation.replace('15 a 20','20 a 15'),preparation.replace('15 a 20','0 a 20')])
  assert.equal((await run(payload(text))).signals.length,0,text);
});
test('new fulfillment phrases still reject foreign, quoted, forwarded and media envelopes',async()=>{
 for(const kind of ['foreign','quoted','forwarded','image','duplicate','bad_signature']) {
  const p=payload('Já pode fazer a retirada'),list=p.entry[0].changes[0].value.message_echoes,m=list[0];
  if(kind==='foreign')m.to=foreign;
  if(kind==='quoted')m.context={id:'wamid.synthetic_quote'};
  if(kind==='forwarded')m.context={forwarded:true};
  if(kind==='image')m.type='image';
  if(kind==='duplicate')list.push({...m});
  const r=await run(p,kind==='bad_signature'?{signature:'sha256='+'0'.repeat(64)}:{});
  assert.equal(r.signals.length,0,kind);assert.equal(r.payment_confirmed,false);
 }
});
