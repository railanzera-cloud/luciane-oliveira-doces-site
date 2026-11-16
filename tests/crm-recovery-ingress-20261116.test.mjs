import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import fs from 'node:fs';
import { observeRecoveryIngress as observe } from '../supabase/functions/_shared/recovery-ingress.mjs';
const secret='synthetic-ingress-signing-secret', phone='5591000000000';
function options(){
 const raw=JSON.stringify({object:'whatsapp_business_account',entry:[{id:'101',changes:[{field:'messages',value:{metadata:{phone_number_id:'202'},messages:[{id:'wamid.synthetic_ingress',from:phone,timestamp:'1794834000',type:'text',text:{body:'Quero cascão Prestígio'}}]}}]}]});
 return {raw,signature:'sha256='+createHmac('sha256',secret).update(raw).digest('hex'),
  metaConfig:{appSecret:secret,phoneNumberId:'202',wabaId:'101'},now:'2026-11-16T15:00:00Z',enabled:true,retentionReady:true,authorizedPhones:[phone]};
}
function client({purge=0,ambiguous=false}={}){
 return {rpc:async()=>({data:purge}),from:table=>({select(){return this;},eq(){return this;},in(){return this;},
  limit:async()=>({data:ambiguous ? [{id:'one'},{id:'two'}] : [{id:table==='crm_customers' ? 'customer' : 'conversation'}]})})};
}
test('disabled or retention-unready observer never queries or persists',async()=>{
 const no={rpc(){throw Error('should not run');},from(){throw Error('should not run');}};
 assert.equal((await observe(no,{...options(),enabled:false})).state,'disabled');
 assert.equal((await observe(no,{...options(),retentionReady:false})).state,'rollout_blocked');
 assert.equal((await observe(no,{...options(),authorizedPhones:[]})).state,'rollout_blocked');
});
test('bad signature and foreign scope stop before any database access',async()=>{
 const no={rpc(){throw Error('unexpected database access');}};
 assert.equal((await observe(no,{...options(),raw:'invalid'})).state,'signature_or_identity_rejected');
 assert.equal((await observe(no,{...options(),authorizedPhones:['5592000000000']})).state,'outside_authorized_scope');
});
test('unique scoped episode reaches assembler with private store and no public output of identifiers',async()=>{
 let evaluations=0;
 const result=await observe(client(),options(),{makeStore:()=>({private:true}),evaluate:async(c,o)=>{
  evaluations++;assert.equal(o.conversationId,'conversation');assert.equal(o.observationStore.private,true);
  assert.equal(o.signedWebhook.raw,options().raw);return {classification:'blocked'};
 }});
 assert.equal(evaluations,1);assert.equal(result.processed,1);assert.equal(result.send_authorized,false);
 assert.equal(result.counts.blocked,1);
 for(const value of [phone,secret,'conversation','Quero'])assert.ok(!JSON.stringify(result).includes(value));
});
test('retention backlog and ambiguous identity cannot reach evaluation',async()=>{
 let calls=0;const deps={evaluate:async()=>{calls++;}};
 assert.equal((await observe(client({purge:1000}),options(),deps)).state,'retention_check_failed');
 assert.equal((await observe(client({ambiguous:true}),options(),deps)).skipped,1);assert.equal(calls,0);
});
test('observer failures are contained without propagating payloads or credentials',async()=>{
 const r=await observe(client(),options(),{makeStore:()=>({}),evaluate:async()=>{throw Error('PRIVATE');}});
 assert.equal(r.state,'observation_failed');assert.ok(!JSON.stringify(r).includes('PRIVATE'));
});
test('candidate webhook hooks observer after core persistence; no send endpoint or public extra response',()=>{
 const s=fs.readFileSync(new URL('../supabase/functions/crm-whatsapp-webhook/index.ts',import.meta.url),'utf8');
 assert.ok(s.indexOf('const summary=await observeRecoveryIngress')>s.indexOf('crm_record_meta_message'));
 assert.match(s,/CRM_RECOVERY_SHADOW_ENABLED/);assert.match(s,/CRM_RECOVERY_RETENTION_READY/);
 assert.match(s,/EdgeRuntime.waitUntil/);assert.match(s,/25000/);
 assert.match(s,/return answer\(200,\{ok:true,processed,statusProcessed\}\)/);
 assert.doesNotMatch(s,/graph\.facebook\.com/);
});
