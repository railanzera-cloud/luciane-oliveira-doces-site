import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {Miniflare} from 'miniflare';
import {createRecoveryDueHandler} from '../supabase/functions/_shared/recovery-due-handler.mjs';
import {projectUrl,gatewayKey,secret,authEnv} from './fixtures/recovery-scheduler.mjs';

test('workerd: signed Cron command reaches OFF Edge, rejects redirects, and exposes no HTTP entry',async()=>{
 execFileSync(process.execPath,['scripts/build-recovery-scheduler-dashboard.mjs','--check']);
 const source=fs.readFileSync(new URL('../cloudflare/recovery-scheduler/dashboard-worker.mjs',import.meta.url),'utf8');
 // Loopback-only test harness. Not present in generated production artifact.
 const harness=source.replace('export default {','const productionEntry = {')+`
 export default {async fetch(req,env){
  const path=new URL(req.url).pathname;
  if(path==='/legacy'){
   try{new Request('https://example.invalid/',{redirect:'error'});return Response.json({throws:false});}
   catch(e){return Response.json({throws:e instanceof TypeError});}
  }
  if(path==='/production')return productionEntry.fetch(req,env);
  const controller={cron:'*/5 * * * *',scheduledTime:Math.floor(Date.now()/300000)*300000};
  return Response.json(await runRecoverySchedule(controller,path==='/off'?{}:env));
 }};`;
 let mode='edge',requests=0,consumed=0,evaluated=0;
 const edge=createRecoveryDueHandler({env:n=>authEnv[n],makeClient:()=>({rpc:async(name)=>{
  assert.equal(name,'crm_recovery_consume_scheduler_nonce');consumed++;return {data:true};
 }}),evaluate:async()=>{evaluated++;throw Error('OFF must not evaluate');}});
 const mf=new Miniflare({modules:true,script:harness,compatibilityDate:'2026-05-15',
  bindings:{RECOVERY_SCHEDULER_ENABLED:'true',RECOVERY_PROJECT_URL:projectUrl,RECOVERY_PUBLIC_GATEWAY_KEY:gatewayKey,RECOVERY_SCHEDULER_SECRET:secret},
  outboundService:async(req)=>{
   requests++;assert.equal(req.url,projectUrl+'/functions/v1/crm-recovery-reevaluate');
   assert.equal(req.headers.get('authorization'),null);
   if(mode==='redirect')return new Response(null,{status:307,headers:{location:'https://another-destination.invalid/private'}});
   return edge(new Request(req.url,{method:req.method,headers:req.headers,body:await req.text()}));
  }});
 try{
  assert.deepEqual(await (await mf.dispatchFetch('http://unit.local/legacy')).json(),{throws:true});
  assert.equal((await mf.dispatchFetch('http://unit.local/production')).status,404);
  assert.deepEqual(await (await mf.dispatchFetch('http://unit.local/off')).json(),{state:'disabled'});
  assert.equal(requests,0);
  assert.deepEqual(await (await mf.dispatchFetch('http://unit.local/run')).json(),{state:'edge_disabled'});
  assert.equal(requests,1);assert.equal(consumed,1);assert.equal(evaluated,0);
  mode='redirect';
  assert.deepEqual(await (await mf.dispatchFetch('http://unit.local/run')).json(),{state:'edge_redirect_rejected',status:307});
  assert.equal(requests,2);assert.equal(consumed,1);assert.equal(evaluated,0);
 }finally{await mf.dispose();}
});
