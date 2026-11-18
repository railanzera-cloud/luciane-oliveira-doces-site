import {createRecoveryServerClient} from './recovery-server-client.mjs';
import {reevaluateDueRecovery} from './recovery-due.mjs';
import {verifySchedulerRequest} from './recovery-scheduler-auth.mjs';
// Candidate auth cut only. Gateway verify_jwt stays TRUE; HMAC is mandatory too.
// Public gateway key is not caller authorization; no service-key bearer bypass.
/** @param {{env:(name:string)=>string|undefined,makeClient?:any,evaluate?:any,log?:(tag:string,summary:string)=>void,now?:()=>number}} options */
export function createRecoveryDueHandler({env,makeClient=createRecoveryServerClient,evaluate=reevaluateDueRecovery,log=()=>{},now=()=>Date.now()}){
 return async(req)=>{
  if(req.method!=='POST')return new Response('method_not_allowed',{status:405});
  if(env('CRM_RECOVERY_AUTH_MODE')!=='scheduler_hmac_v1')return new Response('unavailable',{status:503});
  const verified=await verifySchedulerRequest(req,{projectUrl:env('SUPABASE_URL'),
   gatewayKey:env('CRM_RECOVERY_PUBLIC_GATEWAY_KEY'),secret:env('CRM_RECOVERY_SCHEDULER_SECRET'),now:now()});
  if(!verified.ok)return new Response('unauthorized',{status:401});
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
  try{
   const key=env('SUPABASE_SERVICE_ROLE_KEY')??'';
   const client=makeClient(env('SUPABASE_URL')??'',key,{signal:controller.signal,allowDueRpc:true});
   const consumed=await client.rpc('crm_recovery_consume_scheduler_nonce',{
    p_nonce:verified.nonce,p_signed_at:verified.signedAt,p_tick:verified.tick});
   if(consumed.error)return new Response('unavailable',{status:503});
   if(consumed.data!==true)return new Response('replay_rejected',{status:409});
   const enabled=env('CRM_RECOVERY_DUE_ENABLED')==='true' && env('CRM_RECOVERY_SHADOW_ENABLED')==='true';
   if(!enabled)return Response.json({mode:'shadow',send_authorized:false,state:'disabled'});
   const result=await evaluate(client,{enabled,
    retentionReady:env('CRM_RECOVERY_RETENTION_READY')==='true',
    authorizedPhones:(env('CRM_RECOVERY_AUTHORIZED_PHONES')??'').split(',').map(p=>p.trim()).filter(Boolean),
    rollout:{channel_identity_verified:true,channel_verified_since:env('CRM_RECOVERY_CHANNEL_VERIFIED_SINCE'),
     order_references_enabled:env('CRM_RECOVERY_ORDER_REFERENCES_ENABLED')==='true',
     purchase_episodes_enabled:env('CRM_RECOVERY_EPISODES_ENABLED')==='true',
     purchase_signals_enabled:env('CRM_RECOVERY_PURCHASE_SIGNALS_ENABLED')==='true',purchase_coverage_verified:false}});
   log('recovery_due',JSON.stringify(result));
   return Response.json(result,{status:result.failed>0||['claim_failed','retention_failed'].includes(result.state)?503:200});
  }catch{return Response.json({mode:'shadow',send_authorized:false,state:'unavailable'},{status:503});}
  finally{clearTimeout(timer);controller.abort();}
 };
}
