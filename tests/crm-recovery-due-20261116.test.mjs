import test from 'node:test';
import assert from 'node:assert/strict';
import {reevaluateDueRecovery} from '../supabase/functions/_shared/recovery-due.mjs';
import {recoveryPermission} from '../supabase/functions/_shared/recovery-permission.mjs';
const phone='5591000000000';
const scope={enabled:true,retentionReady:true,authorizedPhones:[phone]};
const job={follow_up_id:'synthetic-follow',conversation_id:'synthetic-conversation',lease_token:'synthetic-lease',revision:'synthetic-revision'};
function client(result='recorded'){
 const calls=[];
 return {calls,rpc:async(name,args)=>{
  calls.push({name,args});
  if(name==='crm_recovery_purge_expired')return {data:0};
  if(name==='crm_recovery_claim_due')return {data:[job]};
  if(name==='crm_recovery_finish_due')return {data:result};
  throw Error('unexpected_rpc');
 }};
}
test('due worker is OFF/unscoped by default and cannot expand scope from payload',async()=>{
 const c=client();assert.equal((await reevaluateDueRecovery(c)).claimed,0);
 await reevaluateDueRecovery(c,{...scope,authorizedPhones:[]});assert.equal(c.calls.length,0);
 await reevaluateDueRecovery(c,{...scope,authorizedPhones:Array(6).fill(phone)});assert.equal(c.calls.length,0);
});
test('due worker uses fresh assembler without new message and persists only a closed decision',async()=>{
 const c=client();let called=false;
 const result=await reevaluateDueRecovery(c,scope,{evaluate:async(_,o)=>{
  called=true;assert.equal(o.conversationId,job.conversation_id);assert.equal(o.signedWebhook,undefined);assert.ok(o.observationStore);
  return {classification:'blocked',blockers:['not_due','availability_unverified:synthetic_sku'],interest:{text:'PRIVATE'}};
 }});
 assert.equal(called,true);assert.equal(result.recorded,1);assert.equal(result.send_authorized,false);
 const finish=c.calls.at(-1).args;assert.deepEqual(finish.p_blockers,['not_due','availability_unverified']);
 assert.ok(!JSON.stringify(finish).includes('PRIVATE'));assert.ok(!JSON.stringify(result).includes(job.conversation_id));
});
test('stale revision is rejected; source failure asks for retry and crash leaves only a lease',async()=>{
 const stale=await reevaluateDueRecovery(client('stale'),scope,{evaluate:async()=>({classification:'blocked',blockers:[]})});
 assert.equal(stale.stale,1);assert.equal(stale.recorded,0);
 const retry=client('retry');await reevaluateDueRecovery(retry,scope,{evaluate:async()=>({classification:'insufficient_evidence',blockers:['snapshot_source_unavailable_or_incomplete']})});
 assert.equal(retry.calls.at(-1).args.p_retry,true);
 const crash=client();const r=await reevaluateDueRecovery(crash,scope,{evaluate:async()=>{throw Error('PRIVATE');}});
 assert.equal(r.failed,1);assert.equal(crash.calls.length,2);assert.ok(!JSON.stringify(r).includes('PRIVATE'));
});
test('permission requires preexisting grant and matching audit, no inference or mutation',async()=>{
 const now='2026-11-16T15:00:00Z',u={id:'synthetic',consent_status:'unknown',commercial_opt_out:false};
 let calls=0;const c={rpc:async(name)=>{calls++;assert.equal(name,'crm_recovery_permission_evidence');return {data:true};}};
 assert.equal((await recoveryPermission(c,u,now)).basis,'not_recorded');assert.equal(calls,0);
 const granted={...u,consent_status:'granted',consent_at:'2026-11-16T14:00:00Z',consent_evidence:'synthetic explicit permission'};
 assert.equal((await recoveryPermission(c,granted,now)).verified,true);
 assert.equal((await recoveryPermission({rpc:async()=>({data:false})},granted,now)).verified,false);
 assert.equal((await recoveryPermission(c,{...granted,commercial_opt_out:true},now)).basis,'revoked');
 assert.equal((await recoveryPermission(c,{...granted,consent_at:'2099-01-01'},now)).verified,false);
});

test('worker HTTP auth requires signed scheduler request; body cannot override server scope',async()=>{
 const {createRecoveryDueHandler}=await import('../supabase/functions/_shared/recovery-due-handler.mjs');
 const {signSchedulerRequest}=await import('../supabase/functions/_shared/recovery-scheduler-auth.mjs');
 const {authEnv,projectUrl,gatewayKey,secret,now,tick}=await import('./fixtures/recovery-scheduler.mjs');
 const config={...authEnv};let calls=0,consumed=true;
 const h=createRecoveryDueHandler({env:n=>config[n],now:()=>now,evaluate:async(_,o)=>{
  calls++;assert.deepEqual(o.authorizedPhones,[phone]);assert.equal(o.rollout.purchase_coverage_verified,false);
  return {mode:'shadow',send_authorized:false,state:'evaluated',failed:0};
 },makeClient:()=>({rpc:async(name)=>{assert.equal(name,'crm_recovery_consume_scheduler_nonce');return {data:consumed};}})});
 const request=()=>signSchedulerRequest({projectUrl,gatewayKey,secret,now,scheduledAt:tick});
 assert.equal((await h(new Request(projectUrl+'/functions/v1/crm-recovery-reevaluate',{method:'POST'}))).status,401);
 assert.equal((await(await h(await request())).json()).state,'disabled');assert.equal(calls,0);
 Object.assign(config,{CRM_RECOVERY_SHADOW_ENABLED:'true',CRM_RECOVERY_DUE_ENABLED:'true',CRM_RECOVERY_RETENTION_READY:'true',CRM_RECOVERY_AUTHORIZED_PHONES:phone});
 assert.equal((await h(await request())).status,200);assert.equal(calls,1);
 consumed=false;assert.equal((await h(await request())).status,409);assert.equal(calls,1);
});
test('packaged stock uses available units after reservations; missing stock cannot be guessed',async()=>{
 const {recoveryAvailability}=await import('../supabase/functions/_shared/recovery-availability.mjs');
 const rows=[{item_key:'trufada_ninho_p',status:'available'},{item_key:'cone_prestigio',status:'available'}];
 for(const [count,expected] of [[0,'sold_out'],[2,'available'],[-1,'unverified']]){
  const a=await recoveryAvailability({rpc:async()=>({data:[{item_key:'trufada_ninho_p',available:count}]})},rows);
  assert.equal(a.trufada_ninho_p,expected);assert.equal(a.cone_prestigio,'available');
 }
 const a=await recoveryAvailability({rpc:async()=>({error:{code:'unavailable'}})},rows);assert.equal(a.trufada_ninho_p,'unverified');
});
