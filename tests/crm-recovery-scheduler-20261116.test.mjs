import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {signSchedulerRequest,verifySchedulerRequest,publicGatewayKey,schedulerTarget,boundedText} from '../supabase/functions/_shared/recovery-scheduler-auth.mjs';
import {createRecoveryDueHandler} from '../supabase/functions/_shared/recovery-due-handler.mjs';
import worker,{runRecoverySchedule} from '../cloudflare/recovery-scheduler/worker.mjs';
import {projectUrl,gatewayKey,secret,now,tick,nonce,authEnv} from './fixtures/recovery-scheduler.mjs';
const options={projectUrl,gatewayKey,secret,now};
const signed=(extra={})=>signSchedulerRequest({...options,scheduledAt:tick,nonce,...extra});
const verify=(req,extra={})=>verifySchedulerRequest(req,{...options,...extra});
test('scheduler HMAC binds body, action, time, nonce, path and project without an admin key',async()=>{
 const r=await verify(await signed());assert.equal(r.ok,true);assert.equal(r.tick,tick);
 for(const modify of [
  async req=>{const h=new Headers(req.headers);h.set('x-recovery-nonce','00000000-0000-4000-8000-000000000002');return new Request(req,{headers:h});},
  async req=>new Request(req,{body:(await req.text()).replace('reevaluate_due_shadow','read_customers')}),
  async req=>new Request(req,{headers:{...Object.fromEntries(req.headers),'x-recovery-signature':'0'.repeat(64)}}),
  async req=>new Request(projectUrl+'/functions/v1/another-action',req),
 ])assert.equal((await verify(await modify(await signed()))).ok,false);
 assert.equal((await verify(await signed(),{projectUrl:'https://zyxwvutsrqponmlkjihg.supabase.co'})).ok,false);
 assert.equal((await verify(await signed(),{secret:Buffer.alloc(32,9).toString('base64url')})).ok,false);
 assert.equal((await verify(await signed(),{now:now+91000})).ok,false);
 assert.equal((await verify(await signed(),{now:now-31000})).ok,false);
});
test('public gateway credentials cannot authorize a business run; service bearer cannot bypass HMAC',async()=>{
 let clients=0;
 const h=createRecoveryDueHandler({env:n=>authEnv[n],now:()=>now,makeClient:()=>{clients++;throw Error('must not query');}});
 const url=schedulerTarget(projectUrl);
 for(const headers of [{apikey:gatewayKey},{authorization:'Bearer synthetic-edge-only-service-key'},
  {apikey:gatewayKey,authorization:'Bearer synthetic-edge-only-service-key'}]){
  assert.equal((await h(new Request(url,{method:'POST',headers,body:'{}'}))).status,401);
 }
 assert.equal(clients,0);
 assert.equal(publicGatewayKey('sb_secret_synthetic_admin_key'),false);
 const jwt=role=>['synthetic',Buffer.from(JSON.stringify({role})).toString('base64url'),'synthetic'].join('.');
 assert.equal(publicGatewayKey(jwt('service_role')),false);assert.equal(publicGatewayKey(jwt('authenticated')),false);
 assert.equal(publicGatewayKey(jwt('anon')),true); // classification only, not signature verification
 for(const url of ['http://abcdefghijklmnopqrst.supabase.co','https://example.invalid','https://u:p@abcdefghijklmnopqrst.supabase.co',projectUrl+'?redirect=1'])assert.throws(()=>schedulerTarget(url));
});
test('bounded body reader rejects excess bytes and never returns unchecked free payload',async()=>{
 await assert.rejects(boundedText(new Response('x'.repeat(513)).body));
 const original=await signed();const h=new Headers(original.headers);
 assert.equal((await verify(new Request(original,{headers:h,body:'x'.repeat(513)}))).ok,false);
});
test('Cron Worker is OFF by default, has no HTTP trigger and rejects privileged key bindings',async()=>{
 let calls=0;const fetchImpl=async()=>{calls++;throw Error('no network');};
 assert.equal((await runRecoverySchedule({cron:'*/5 * * * *',scheduledTime:tick*1000},{},{fetchImpl})).state,'disabled');
 assert.equal(calls,0);assert.equal(worker.fetch().status,404);
 const env={RECOVERY_SCHEDULER_ENABLED:'true',SUPABASE_SERVICE_ROLE_KEY:'synthetic-edge-only'};
 assert.equal((await runRecoverySchedule({cron:'*/5 * * * *',scheduledTime:tick*1000},env,{fetchImpl})).state,'configuration_invalid');
 assert.equal(calls,0);
});
test('Cron reaches unchanged due engine through HMAC and replay guard; response/logs omit private data',async()=>{
 const env={RECOVERY_SCHEDULER_ENABLED:'true',RECOVERY_PROJECT_URL:projectUrl,RECOVERY_PUBLIC_GATEWAY_KEY:gatewayKey,RECOVERY_SCHEDULER_SECRET:secret};
 const cfg={...authEnv,CRM_RECOVERY_DUE_ENABLED:'true',CRM_RECOVERY_SHADOW_ENABLED:'true',CRM_RECOVERY_RETENTION_READY:'true',CRM_RECOVERY_AUTHORIZED_PHONES:'5591000000000'};
 let calls=0;const ticks=new Set();
 const edge=createRecoveryDueHandler({env:n=>cfg[n],now:()=>now,makeClient:()=>({rpc:async(name,p)=>{
  assert.equal(name,'crm_recovery_consume_scheduler_nonce');if(ticks.has(p.p_tick))return {data:false};ticks.add(p.p_tick);return {data:true};
 }}),evaluate:async(_,o)=>{
  calls++;assert.equal(o.authorizedPhones.length,1);
  return {mode:'shadow',send_authorized:false,state:'evaluated',claimed:1,recorded:1,stale:0,failed:0,unexpected:'PRIVATE'};
 }});
 const fetchImpl=async(req,init)=>{assert.equal(req.redirect,'error');assert.equal(init.redirect,'error');assert.equal(req.headers.get('authorization'),null);return edge(req);};
 const controller={cron:'*/5 * * * *',scheduledTime:tick*1000};
 const result=await runRecoverySchedule(controller,env,{fetchImpl,now:()=>now});
 assert.equal(result.recorded,1);assert.equal(calls,1);assert.ok(!JSON.stringify(result).includes('PRIVATE'));
 const replay=await runRecoverySchedule(controller,env,{fetchImpl,now:()=>now});
 assert.equal(replay.status,409);assert.equal(calls,1);
});
test('unexpected response, redirect and fetch failure stay opaque without retrying',async()=>{
 const env={RECOVERY_SCHEDULER_ENABLED:'true',RECOVERY_PROJECT_URL:projectUrl,RECOVERY_PUBLIC_GATEWAY_KEY:gatewayKey,RECOVERY_SCHEDULER_SECRET:secret};
 const c={cron:'*/5 * * * *',scheduledTime:tick*1000};
 const unsafe=await runRecoverySchedule(c,env,{now:()=>now,fetchImpl:async()=>Response.json({mode:'shadow',send_authorized:true,customer:'PRIVATE'})});
 assert.equal(unsafe.state,'unexpected_response');
 const failed=await runRecoverySchedule(c,env,{now:()=>now,fetchImpl:async()=>{throw Error('PRIVATE');}});
 assert.deepEqual(failed,{state:'scheduler_unavailable'});
});

test('even a correctly signed envelope cannot carry scope, arbitrary fields or another action',async()=>{
 for(const body of [
  {v:1,action:'reevaluate_due_shadow',scheduled_at:tick,authorizedPhones:['synthetic-phone']},
  {v:1,action:'read_customers',scheduled_at:tick},
  {v:1,action:'reevaluate_due_shadow',scheduled_at:{text:'PRIVATE'}},
 ]){
  const raw=JSON.stringify(body),timestamp=String(Math.floor(now/1000));
  const signature=createHmac('sha256',Buffer.from(secret,'base64url')).update(`recovery-scheduler-v1\nPOST\n${schedulerTarget(projectUrl)}\n${timestamp}\n${nonce}\n${raw}`).digest('hex');
  const req=new Request(schedulerTarget(projectUrl),{method:'POST',headers:{apikey:gatewayKey,'x-recovery-timestamp':timestamp,'x-recovery-nonce':nonce,'x-recovery-signature':signature},body:raw});
  assert.equal((await verify(req)).ok,false);
 }
});
test('slow request bodies time out with cancellation',async()=>{
 let canceled=false;
 const stream=new ReadableStream({pull(){},cancel(){canceled=true;}});
 await assert.rejects(boundedText(stream,512,20),/body_timeout/);assert.equal(canceled,true);
});

test('missing nonce storage fails closed before evaluation; invalid key cannot start a signed request',async()=>{
 let evaluated=0;
 const cfg={...authEnv,CRM_RECOVERY_SHADOW_ENABLED:'true',CRM_RECOVERY_DUE_ENABLED:'true'};
 const h=createRecoveryDueHandler({env:n=>cfg[n],now:()=>now,makeClient:()=>({rpc:async()=>({error:{code:'source_http_failed'}})}),evaluate:async()=>{evaluated++;}});
 assert.equal((await h(await signed())).status,503);assert.equal(evaluated,0);
 await assert.rejects(signed({secret:'short-passphrase'}));
 await assert.rejects(signed({gatewayKey:'sb_secret_synthetic_admin_key'}));
});
