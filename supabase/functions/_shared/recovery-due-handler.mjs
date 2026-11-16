import {createRecoveryServerClient} from './recovery-server-client.mjs';
import {reevaluateDueRecovery} from './recovery-due.mjs';
const equal=(a,b)=>{
 if(!a||!b||a.length!==b.length)return false;
 let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0;
};
/** Server configuration only. Request body cannot control identity, scope or flags. */
/** @param {{env:(name:string)=>string|undefined,makeClient?:any,evaluate?:any,log?:(tag:string,summary:string)=>void}} options */
export function createRecoveryDueHandler({env,makeClient=createRecoveryServerClient,evaluate=reevaluateDueRecovery,log=()=>{}}){
 return async(req)=>{
  const key=env('SUPABASE_SERVICE_ROLE_KEY')??'';
  if(!key||!equal(req.headers.get('authorization')??'','Bearer '+key))return new Response('unauthorized',{status:401});
  if(req.method!=='POST')return new Response('method_not_allowed',{status:405});
  const enabled=env('CRM_RECOVERY_DUE_ENABLED')==='true' && env('CRM_RECOVERY_SHADOW_ENABLED')==='true';
  if(!enabled)return Response.json({mode:'shadow',send_authorized:false,state:'disabled'});
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
  try{
   const client=makeClient(env('SUPABASE_URL')??'',key,{signal:controller.signal,allowDueRpc:true});
   const result=await evaluate(client,{enabled,
    retentionReady:env('CRM_RECOVERY_RETENTION_READY')==='true',
    authorizedPhones:(env('CRM_RECOVERY_AUTHORIZED_PHONES')??'').split(',').map(p=>p.trim()).filter(Boolean),
    rollout:{channel_identity_verified:true,channel_verified_since:env('CRM_RECOVERY_CHANNEL_VERIFIED_SINCE'),purchase_coverage_verified:false}});
   log('recovery_due',JSON.stringify(result));
   return Response.json(result,{status:result.failed>0||['claim_failed','retention_failed'].includes(result.state)?503:200});
  }catch{return Response.json({mode:'shadow',send_authorized:false,state:'unavailable'},{status:503});}
  finally{clearTimeout(timer);controller.abort();}
 };
}
