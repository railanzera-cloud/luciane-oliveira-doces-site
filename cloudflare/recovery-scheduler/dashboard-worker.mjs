// GENERATED: node scripts/build-recovery-scheduler-dashboard.mjs
// No secrets. Default OFF; production fetch is always 404.
// Shared Web Crypto protocol. Contains no project/admin key or customer data.
const SCHEDULER_ACTION='reevaluate_due_shadow';
const SCHEDULER_PATH='/functions/v1/crm-recovery-reevaluate';
const encoder=new TextEncoder();
function schedulerTarget(projectUrl){
 const u=new URL(projectUrl);
 if(u.protocol!=='https:'||!/^[a-z0-9]{20}\.supabase\.co$/.test(u.hostname)||u.port||
  u.username||u.password||u.search||u.hash||!['','/'].includes(u.pathname))throw Error('scheduler_configuration_invalid');
 return u.origin+SCHEDULER_PATH;
}
// Classification only; JWT cryptographic verification remains in the gateway.
// Reject accidental use of service/admin credentials, including legacy JWTs.
function publicGatewayKey(key){
 if(typeof key!=='string')return false;
 if(/^sb_publishable_[A-Za-z0-9_-]{12,220}$/.test(key))return true;
 try{
  const parts=key.split('.');if(parts.length!==3||key.length>1800)return false;
  const claims=JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')));
  return claims.role==='anon';
 }catch{return false;}
}
function keyBytes(secret){
 if(typeof secret!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(secret))throw Error('scheduler_configuration_invalid');
 const bytes=Uint8Array.from(atob(secret.replace(/-/g,'+').replace(/_/g,'/')+'='),c=>c.charCodeAt(0));
 if(bytes.length!==32)throw Error('scheduler_configuration_invalid');return bytes;
}
const message=(target,timestamp,nonce,raw)=>encoder.encode(`recovery-scheduler-v1\nPOST\n${target}\n${timestamp}\n${nonce}\n${raw}`);
async function boundedText(stream,max=512,timeoutMs=5000){
 if(!stream)return '';
 const reader=stream.getReader(),chunks=[];let size=0,timer;
 const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('body_timeout')),timeoutMs);});
 try{
  while(true){const {done,value}=await Promise.race([reader.read(),timeout]);if(done)break;size+=value.byteLength;
   if(size>max){await reader.cancel();throw Error('body_too_large');}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return new TextDecoder('utf-8',{fatal:true,ignoreBOM:false}).decode(bytes);
 }catch(error){await reader.cancel().catch(()=>{});throw error;}
 finally{clearTimeout(timer);reader.releaseLock();}
}
async function signSchedulerRequest({projectUrl,gatewayKey,secret,now=Date.now(),scheduledAt,nonce=crypto.randomUUID()}){
 const target=schedulerTarget(projectUrl);
 if(!publicGatewayKey(gatewayKey)||!Number.isSafeInteger(now)||!Number.isSafeInteger(scheduledAt)||
  scheduledAt%300!==0||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(nonce))throw Error('scheduler_configuration_invalid');
 const timestamp=String(Math.floor(now/1000));
 const raw=JSON.stringify({v:1,action:SCHEDULER_ACTION,scheduled_at:scheduledAt});
 const key=await crypto.subtle.importKey('raw',keyBytes(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signature=Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,message(target,timestamp,nonce,raw))),b=>b.toString(16).padStart(2,'0')).join('');
 return new Request(target,{method:'POST',headers:{'content-type':'application/json',apikey:gatewayKey,
  'x-recovery-timestamp':timestamp,'x-recovery-nonce':nonce,'x-recovery-signature':signature},body:raw,redirect:'manual'});
}
async function verifySchedulerRequest(req,{projectUrl,gatewayKey,secret,now=Date.now()}){
 try{
  if(req.method!=='POST'||!Number.isSafeInteger(now)||!publicGatewayKey(gatewayKey)||req.headers.get('apikey')!==gatewayKey)return {ok:false};
  if(![SCHEDULER_PATH,'/crm-recovery-reevaluate'].includes(new URL(req.url).pathname))return {ok:false};
  const target=schedulerTarget(projectUrl),timestamp=req.headers.get('x-recovery-timestamp')??'',nonce=req.headers.get('x-recovery-nonce')??'',signature=req.headers.get('x-recovery-signature')??'';
  if(!/^\d{10}$/.test(timestamp)||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(nonce)||
   !/^[a-f0-9]{64}$/.test(signature)||Number(timestamp)*1000<now-90000||Number(timestamp)*1000>now+30000)return {ok:false};
  const raw=await boundedText(req.body),body=JSON.parse(raw),tick=body?.scheduled_at;
  if(!body||Array.isArray(body)||Object.keys(body).sort().join(',')!=='action,scheduled_at,v'||body.v!==1||body.action!==SCHEDULER_ACTION||
   !Number.isSafeInteger(tick)||tick%300!==0||tick*1000<now-600000||tick*1000>now+30000)return {ok:false};
  const key=await crypto.subtle.importKey('raw',keyBytes(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  const bytes=Uint8Array.from(signature.match(/../g),h=>parseInt(h,16));
  if(!await crypto.subtle.verify('HMAC',key,bytes,message(target,timestamp,nonce,raw)))return {ok:false};
  return {ok:true,nonce,signedAt:new Date(Number(timestamp)*1000).toISOString(),tick};
 }catch{return {ok:false};}
}

// Cron only. No customer facts, phones or privileged Supabase credentials here.
async function runRecoverySchedule(controller,env,{fetchImpl=fetch,now=()=>Date.now()}={}){
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
