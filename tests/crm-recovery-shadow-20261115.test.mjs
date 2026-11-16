import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { classifyRecoveryInterest as classify, recoveryCatalog } from '../supabase/functions/_shared/recovery-interest.mjs';
import { evaluateRecoveryShadow as evaluate } from '../supabase/functions/_shared/recovery-shadow.mjs';
import { normalizeSignedRecoveryWebhook as normalize } from '../supabase/functions/_shared/recovery-meta-observation.mjs';
import { quoteCartItems } from '../supabase/functions/_shared/commerce-catalog.mjs';

const now = '2026-11-15T16:00:00Z';
const event = (id,direction,at,text) => ({id,direction,occurred_at:`2026-11-15T${at}:00Z`,
  conversation_key:'synthetic-episode',verified:true,time_basis:'provider_timestamp',content_origin:'customer_text',text});
const inbound = event('in','inbound','14:00','Quero um cascão de Prestígio');
const outbound = event('out','business_outbound','14:05');
const snapshot = () => ({now,events:[inbound,outbound],orders:[],consent_verified:true,
  store_open:true,order_check_complete:true,history_complete:true,
  availability:{category_cones:'available',cone_prestigio:'available'}});

test('homonymous flavors preserve category and cannot become a slice', () => {
  assert.equal(classify('Quero um cascão de Prestígio').candidates[0].product_id,'cone-trufado-prestigio');
  assert.equal(classify('Quero uma fatia de Prestígio').candidates[0].product_id,'fatia-prestigio');
  assert.equal(classify('Quero Prestígio').status,'ambiguous');
  assert.equal(classify('Tem pipoca gourmet Ninho com morango de 750ml?').status,'unconfirmed');
});
test('Gourmet composition preserves real flavors and size accepted by checkout', () => {
  const result = classify('Quero pipoca gourmet de 750 ml de Leitinho com Nutella');
  assert.equal(result.status,'resolved');
  assert.deepEqual(result.option_ids,['leitinho','nutella']);
  const quote = quoteCartItems([{product_id:'pipoca-gourmet',variant_id:result.variant_ids[0],
    option_ids:result.option_ids,quantity:1}]);
  assert.ok(quote);
  assert.ok(result.availability_keys.includes('popcorn_size_750ml'));
});
test('unknown combinations, alternative choices and size limits remain unresolved', () => {
  for (const text of ['Quero pipoca gourmet de Leitinho',
    'Quero pipoca gourmet 750ml Leitinho com morango',
    'Quero pipoca gourmet 750ml Leitinho ou Nutella',
    'Quero pipoca gourmet 500ml Leitinho com Nutella e Ovomaltine'])
    assert.notEqual(classify(text).status,'resolved',text);
});
test('customization, incompatible sizes and mixed categories cannot resolve silently', () => {
  for (const text of ['Quero cascão Prestígio sem coco','Quero cascão Prestígio 750ml',
    'Quero cascão Prestígio e pipoca gourmet']) assert.notEqual(classify(text).status,'resolved');
});
test('packaged popcorn keeps product and per-size SKU', () => {
  const r = classify('Quero pipoca trufada de Paçoca pacote M');
  assert.equal(r.status,'resolved');
  assert.equal(r.candidates[0].item_key,'trufada_pacoca_m');
  assert.equal(classify('Quero pipoca trufada de Paçoca').status,'partial');
});
test('every canonical non-retired product is discoverable from its category', () => {
  const prefix = {slice:'fatia',cone:'cascão',christmas:'chocottone',package:'pipoca trufada pacote P',gourmet:'pipoca gourmet 750ml',drink:'refrigerante'};
  for (const p of recoveryCatalog()) {
    const r = classify(`Quero ${prefix[p.category]} ${p.name}`);
    assert.equal(r.status,'resolved',`${p.category} ${p.name}`);
    assert.ok(r.candidates.some(c => c.product_id === p.product_id));
  }
});
test('catalog adapter can classify an injected future product without editing rules', () => {
  const extra = {category:'slice',product_id:'synthetic-new',item_key:'synthetic_new',name:'Sabor Futuro',variant_id:'fatia'};
  assert.equal(classify('Quero fatia Sabor Futuro',[...recoveryCatalog(),extra]).candidates[0].product_id,'synthetic-new');
});
test('decline, opt-out, purchase statement, casual text and links are not product interest', () => {
  assert.equal(classify('Não quero Prestígio, mas quero Ferrero').intent,'declined');
  assert.equal(classify('Não me mande mensagens').intent,'opt_out');
  assert.equal(classify('Já paguei o Pix').intent,'possible_purchase');
  assert.equal(classify('Vi Prestígio').intent,'unknown');
  assert.equal(classify('Quero Prestígio https://example.invalid').status,'unconfirmed');
});
test('complete qualified episode produces only a shadow candidate without changing input', () => {
  const s = snapshot(), copy = JSON.stringify(s), r = evaluate(s);
  assert.equal(r.classification,'shadow_candidate');
  assert.equal(r.send_authorized,false);
  assert.equal(r.due_at,'2026-11-15T14:50:00.000Z');
  assert.equal(JSON.stringify(s),copy);
  assert.ok(!JSON.stringify(r).includes('synthetic-episode'));
});
test('no store response or later customer reply is pending service, not abandonment', () => {
  assert.equal(evaluate({...snapshot(),events:[inbound]}).classification,'pending_service');
  const reply = event('in2','inbound','15:00','Ainda tem?');
  assert.equal(evaluate({...snapshot(),events:[inbound,outbound,reply]}).classification,'pending_service');
});
test('delay is configurable and does not authorize sending', () => {
  assert.ok(evaluate({...snapshot(),follow_up_minutes:120}).blockers.includes('not_due'));
  assert.equal(evaluate({...snapshot(),follow_up_minutes:0}).classification,'insufficient_evidence');
});
test('paid verified order suppresses; candidate or pending order requires reconciliation', () => {
  const order = {conversation_key:'synthetic-episode',identity_basis:'verified',payment_status:'paid'};
  assert.equal(evaluate({...snapshot(),orders:[order]}).classification,'suppressed');
  for (const o of [{...order,identity_basis:'candidate'},{...order,payment_status:'pending'}])
    assert.ok(evaluate({...snapshot(),orders:[o]}).blockers.includes('purchase_or_order_requires_reconciliation'));
  assert.equal(evaluate({...snapshot(),orders:[{...order,conversation_key:'other'}]}).classification,'shadow_candidate');
});
test('cancellation, opt-out and client purchase statement prevent recovery', () => {
  assert.equal(evaluate({...snapshot(),opt_out:true}).classification,'suppressed');
  assert.equal(evaluate({...snapshot(),events:[{...inbound,text:'Não quero mais'},outbound]}).classification,'suppressed');
  const decline = event('no','inbound','14:10','Não tenho interesse');
  assert.equal(evaluate({...snapshot(),events:[inbound,outbound,decline,event('out2','business_outbound','14:15')]}).classification,'suppressed');
  assert.equal(evaluate({...snapshot(),orders:[{conversation_key:'synthetic-episode',identity_basis:'verified',status:'canceled'}]}).classification,'suppressed');
  assert.ok(evaluate({...snapshot(),events:[{...inbound,text:'Já paguei'},outbound]}).blockers.includes('purchase_or_order_requires_reconciliation'));
});
test('missing snapshots, permissions, closed store and category availability fail closed', () => {
  for (const [key,reason] of [['consent_verified','permission_unverified'],['store_open','store_not_verified_open'],
    ['order_check_complete','order_check_incomplete'],['history_complete','conversation_history_incomplete']])
    assert.ok(evaluate({...snapshot(),[key]:false}).blockers.includes(reason));
  assert.ok(evaluate({...snapshot(),availability:{cone_prestigio:'available'}}).blockers.includes('availability_unverified:category_cones'));
  assert.ok(evaluate({...snapshot(),recovery_contacted_at:'2026-11-15T14:55:00Z'}).blockers.includes('already_contacted_since_reply'));
});
test('provider time, identity, replay ordering and window are handled conservatively', () => {
  assert.deepEqual(evaluate({...snapshot(),events:[outbound,inbound,inbound]}),evaluate(snapshot()));
  assert.ok(evaluate({...snapshot(),events:[{...inbound,time_basis:'webhook_received'},outbound]}).blockers.includes('unverified_or_invalid_event'));
  assert.ok(evaluate({...snapshot(),events:[{...inbound,conversation_key:'other'},outbound]}).blockers.includes('conversation_identity_unresolved'));
  assert.ok(evaluate({...snapshot(),now:'2026-11-16T14:00:00Z'}).blockers.includes('outside_service_window'));
  assert.ok(evaluate({...snapshot(),events:[{...inbound,content_origin:'ad_referral'},outbound]}).blockers.includes('interest_unconfirmed'));
  assert.ok(evaluate({...snapshot(),events:[inbound,{...inbound,text:'Quero outra coisa'},outbound]}).blockers.includes('unverified_or_invalid_event'));
});

const secret = 'synthetic-local-fixture-secret';
function envelope(field='messages', messages=[{id:'wamid.synthetic123',from:'5591999999999',timestamp:'1794751200',type:'text',text:{body:'Quero um cascão de Prestígio'}}]) {
  return {object:'whatsapp_business_account',entry:[{id:'101',changes:[{field,value:{metadata:{phone_number_id:'202'},[field === 'messages' ? 'messages' : 'message_echoes']:messages}}]}]};
}
function signed(payload) {const raw = JSON.stringify(payload);return [raw,{signature:'sha256='+createHmac('sha256',secret).update(raw).digest('hex'),
  appSecret:secret,wabaId:'101',phoneNumberId:'202',receivedAt:now}];}
test('signed Meta input reaches shadow evaluator end to end without persisting text', async () => {
  const normalized = await normalize(...signed(envelope()));
  assert.equal(normalized.accepted,true);
  assert.equal(normalized.events[0].time_basis,'provider_timestamp');
  const r = evaluate({...snapshot(),events:normalized.events});
  assert.equal(r.classification,'pending_service');
  assert.equal(r.interest.candidates[0].product_id,'cone-trufado-prestigio');
  assert.ok(!JSON.stringify(r).includes('5591999999999'));
});
test('signed inbound and app echo can form a complete shadow-only episode', async () => {
  const incoming = await normalize(...signed(envelope()));
  const echo = await normalize(...signed(envelope('smb_message_echoes',[
    {id:'wamid.synthetic789',to:'5591999999999',timestamp:'1794751500'}])));
  const r = evaluate({...snapshot(),events:[...incoming.events,...echo.events]});
  assert.equal(r.classification,'shadow_candidate');
  assert.equal(r.send_authorized,false);
});
test('signature and tenant mismatch do not admit messages', async () => {
  const [raw,config] = signed(envelope());
  assert.equal((await normalize(raw+' ',config)).reason,'signature_invalid');
  assert.equal((await normalize(raw,{...config,wabaId:'303'})).events.length,0);
  assert.equal((await normalize(raw,{...config,phoneNumberId:'303'})).events.length,0);
});
test('echoes preserve direction; forwarded or quoted text cannot confirm product', async () => {
  const echo = await normalize(...signed(envelope('smb_message_echoes',[{id:'wamid.synthetic456',to:'5591999999999',timestamp:'1794751500'}])));
  assert.equal(echo.events[0].direction,'business_outbound');
  const p = envelope();p.entry[0].changes[0].value.messages[0].context = {forwarded:true};
  assert.equal((await normalize(...signed(p))).events[0].text,null);
});
test('CLI replay emits only decisions and rejects malformed input without echoing it', () => {
  const run = input => spawnSync(process.execPath,['scripts/recovery-shadow-replay.mjs'],{input,encoding:'utf8'});
  const r = run(JSON.stringify(snapshot()));
  assert.equal(r.status,0);
  assert.equal(JSON.parse(r.stdout).classification,'shadow_candidate');
  assert.ok(!r.stdout.includes('Quero um'));
  const bad = run('PRIVATE_INVALID_INPUT');
  assert.equal(bad.status,1);assert.ok(!bad.stderr.includes('PRIVATE_INVALID_INPUT'));
});
