import {signSchedulerRequest,boundedText,publicGatewayKey,schedulerTarget} from '../../supabase/functions/_shared/recovery-scheduler-auth.mjs';
// Cron only. No customer facts, phones or privileged Supabase credentials here.
export async function runRecoverySchedule(controller,env,{fetchImpl=fetch,now=()=>Date.now()}={}){
 if(env.RECOVERY_SCHEDULER_ENABLED!=='true')return {state:'disabled'};
 if(controller.cron!=='*/5 * * * *'||!Number.isSafeInteger(controller.scheduledTime)||
  env.SUPABASE_SERVICE_ROLE_KEY||env.SUPABASE_SECRET_KEYS||env.SUPABASE_DB_URL)return {state:'configuration_invalid'};
 // ScheduledController uses milliseconds. Log event metadata may display seconds;
 // never guess units or replace the event time with Date.now().
 const currentTime=now(),scheduledTime=controller.scheduledTime;
 if(!Number.isSafeInteger(currentTime)||scheduledTime<1000000000000||
  scheduledTime<currentTime-600000||scheduledTime>currentTime+30000)
  return {state:'configuration_invalid',reason:'schedule_time_invalid'};
 // A dispatch may carry seconds within its five-minute slot. The protocol and
 // server replay key identify the slot, not the dispatch second.
 const scheduledAt=Math.floor(scheduledTime/300000)*300;
 if(scheduledAt*1000<currentTime-600000)return {state:'configuration_invalid',reason:'schedule_time_expired'};
 try{schedulerTarget(env.RECOVERY_PROJECT_URL);}catch{return {state:'configuration_invalid',reason:'project_url_invalid'};}
 if(!publicGatewayKey(env.RECOVERY_PUBLIC_GATEWAY_KEY))return {state:'configuration_invalid',reason:'gateway_key_invalid'};
 if(typeof env.RECOVERY_SCHEDULER_SECRET!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(env.RECOVERY_SCHEDULER_SECRET))
  return {state:'configuration_invalid',reason:'hmac_format_invalid'};
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),30000);
 let stage='sign';
 try{
  const req=await signSchedulerRequest({projectUrl:env.RECOVERY_PROJECT_URL,gatewayKey:env.RECOVERY_PUBLIC_GATEWAY_KEY,
   secret:env.RECOVERY_SCHEDULER_SECRET,now:currentTime,scheduledAt});
  stage='fetch';
  const response=await fetchImpl(req,{signal:abort.signal,redirect:'manual'});
  if(response.status>=300&&response.status<400)return {state:'edge_redirect_rejected',status:response.status};
  if(!response.ok)return {state:'edge_rejected',status:response.status};
  stage='read';
  const r=JSON.parse(await boundedText(response.body,2048));
  if(r.mode!=='shadow'||r.send_authorized!==false)return {state:'unexpected_response'};
  if(r.state==='evaluated'&&!['claimed','recorded','stale','failed'].every(k=>Number.isInteger(r[k])&&r[k]>=0&&r[k]<=5))return {state:'unexpected_response'};
  const summary={state:r.state==='disabled'?'edge_disabled':r.state==='evaluated'?'evaluated':'edge_unavailable'};
  for(const name of ['claimed','recorded','stale','failed'])if(Number.isInteger(r[name])&&r[name]>=0&&r[name]<=5)summary[name]=r[name];
  if(summary.failed>0)summary.state='edge_unavailable';
  return summary;
 }catch{return {state:'scheduler_unavailable',stage};}
 finally{clearTimeout(timer);abort.abort();}
}
export default {
 async scheduled(controller,env){
  const result=await runRecoverySchedule(controller,env);
  console.info('recovery_scheduler',JSON.stringify(result));
  if(!['disabled','edge_disabled','evaluated'].includes(result.state))throw Error('recovery_scheduler_failed');
 },
 fetch(){return new Response('not_found',{status:404});},
};
