import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {CONTEXT_PERMISSION_OFFER as offer,inspectSignedContextPermission as inspect,privateContextPermissions} from '../supabase/functions/_shared/recovery-context-permission.mjs';
import {recoveryPermission} from '../supabase/functions/_shared/recovery-permission.mjs';
import {classifyRecoveryInterest} from '../supabase/functions/_shared/recovery-interest.mjs';
const phone='5591000000000',secret='synthetic-context-permission-test-secret',now='2026-11-18T15:00:00Z';
const config={appSecret:secret,wabaId:'101',phoneNumberId:'202',receivedAt:now,expectedConversationKey:'101:202:'+phone};
function payload(text=offer,echo=true){return {object:'whatsapp_business_account',entry:[{id:'101',changes:[{
 field:echo?'smb_message_echoes':'messages',value:{metadata:{phone_number_id:'202'},[echo?'message_echoes':'messages']:[{
 id:'wamid.synthetic_protocol',...(echo?{to:phone}:{from:phone}),timestamp:String(Date.parse('2026-11-18T14:00:00Z')/1000),type:'text',text:{body:text}}]},
}]}]};}
async function run(p,change={}){const raw=JSON.stringify(p);return inspect(raw,{...config,signature:'sha256='+createHmac('sha256',secret).update(raw).digest('hex'),...change});}
test('exact shop question and explicit client response produce protocol evidence, never a grant or send',async()=>{
 assert.equal((await run(payload())).events[0].kind,'offer');
 for(const [text,kind] of [['PODE LEMBRAR','accept'],['Cancelar lembrete!','revoke']]) {
  const p=payload(text,false);p.entry[0].changes[0].value.messages[0].context={id:'wamid.synthetic_offer'};
  const r=await run(p);assert.equal(r.events[0].kind,kind);assert.equal(r.events[0].reply_to,'wamid.synthetic_offer');
  assert.equal(r.send_authorized,false);assert.ok(!('verified'in r));
 }
});
test('a loose yes, product interest, old purchase and modified offer never create consent',async()=>{
 for(const text of ['Sim','Pode','Quero Prestígio','Já comprei','Pode lembrar?','Não pode lembrar','Meu amigo disse PODE LEMBRAR','"PODE LEMBRAR"'])
  assert.deepEqual((await run(payload(text,false))).events,[],text);
 for(const text of [offer+' Também mandaremos promoções.',offer.replace('uma única vez','sempre'),offer.replace('24 horas','30 dias')])
  assert.deepEqual((await run(payload(text))).events,[]);
 assert.deepEqual((await run(payload('PODE LEMBRAR'))).events,[]);
 assert.deepEqual((await run(payload(offer,false))).events,[]);
});
test('standard stop words are opt-out evidence, never commercial interest or consent',()=>{
 for(const word of ['PARAR','SAIR','STOP'])assert.equal(classifyRecoveryInterest(word).intent,'opt_out');
 assert.notEqual(classifyRecoveryInterest('Quero cascão de Prestígio').intent,'opt_out');
});
test('HMAC, assets, foreign recipients, duplicates, forwarding and media fail closed',async()=>{
 assert.deepEqual((await run(payload(),{signature:'sha256='+'0'.repeat(64)})).events,[]);
 for(const change of ['asset','phone','forwarded','image','duplicate']){
  const p=payload(),v=p.entry[0].changes[0].value,m=v.message_echoes[0];
  if(change==='asset')v.metadata.phone_number_id='999';if(change==='phone')m.to='5592000000000';
  if(change==='forwarded')m.context={forwarded:true};if(change==='image')m.type='image';
  if(change==='duplicate')v.message_echoes.push({...m,to:'5592000000000'});
  assert.deepEqual((await run(p)).events,[],change);
 }
});
test('permission evidence retains original time, bounded window and no text, phone or secret',async()=>{
 const r=await run(payload());assert.equal(r.events[0].occurred_at,'2026-11-18T14:00:00.000Z');
 for(const value of [offer,phone,secret])assert.ok(!JSON.stringify(r).includes(value));
 for(const date of ['2026-11-17T15:00:00Z','2026-11-18T15:00:01Z']){
  const p=payload();p.entry[0].changes[0].value.message_echoes[0].timestamp=String(Date.parse(date)/1000);
  assert.deepEqual((await run(p)).events,[]);
 }
});
const context=()=>({state:'granted',verified:true,scoped:true,scope:'one_context_follow_up',version:'context-recovery-1',
 send_authorized:false,valid_until:'2026-11-18T16:00:00Z',markers:[{message_id:'wamid.synthetic_offer',occurred_at:'2026-11-18T14:00:00Z',kind:'offer'},
 {message_id:'wamid.synthetic_reply',occurred_at:'2026-11-18T14:01:00Z',kind:'accept'}]});
test('scoped explicit permission can qualify unknown global consent without changing customer data',async()=>{
 const c={id:'synthetic',consent_status:'unknown',commercial_opt_out:false},before=structuredClone(c);
 const r=await recoveryPermission({},c,now,context());assert.equal(r.verified,true);assert.equal(r.basis,'signed_context_permission');
 assert.deepEqual(c,before);
 for(const change of [{commercial_opt_out:true},{consent_status:'denied'}])assert.equal((await recoveryPermission({}, {...c,...change},now,context())).verified,false);
});
test('withdrawal, used permission, broken scope and expiry cannot fall back to a general staff grant',async()=>{
 const c={id:'synthetic',consent_status:'granted',consent_at:'2026-11-18T12:00:00Z',consent_evidence:'synthetic-audit',commercial_opt_out:false};
 const client={rpc:async()=>({data:true})};
 for(const state of ['revoked','used','scope_changed'])assert.equal((await recoveryPermission(client,c,now,{...context(),state,verified:false})).verified,false);
 for(const valid_until of ['2026-11-18T15:00:00Z','2026-11-20T15:00:00Z','invalid'])assert.equal((await recoveryPermission(client,c,now,{...context(),valid_until})).verified,false);
 assert.equal((await recoveryPermission(client,c,now)).verified,true);
});
test('private adapter rejects expanded/malformed grant payloads, missing markers and failed RPCs',async()=>{
 for(const data of [{...context(),phone},{...context(),markers:[]},{...context(),state:'missing'},
  {...context(),markers:[...context().markers,context().markers[0]]}]) {
  await assert.rejects(privateContextPermissions({rpc:async()=>({data})}).read('synthetic'));
 }
 await assert.rejects(privateContextPermissions({rpc:async()=>({error:{code:'fail'}})}).read('synthetic'));
 const accepted=await privateContextPermissions({rpc:async()=>({data:context()})}).read('synthetic');
 assert.equal(accepted.verified,true);
});
