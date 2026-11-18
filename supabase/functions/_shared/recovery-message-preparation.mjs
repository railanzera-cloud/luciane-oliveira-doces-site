import {assembleRecoveryEvaluation} from './recovery-snapshot.mjs';
import {privateRecoveryObservations} from './recovery-observation-store.mjs';
import {buildRecoveryMessage} from './recovery-message.mjs';
// Server-only preview, disabled by default. No route, reservation or delivery IO.
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v);
const deny=reason=>({mode:'preview',state:'blocked',reason,send_authorized:false});
export async function prepareRecoveryMessage(client,{enabled=false,conversationId,followUpId,authorizedPhones=[],
 rollout={},clock=()=>new Date().toISOString()}={}, {evaluate=assembleRecoveryEvaluation}={}){
 if(!enabled)return {mode:'preview',state:'disabled',send_authorized:false};
 if(!uuid(conversationId)||!uuid(followUpId)||!Array.isArray(authorizedPhones)||authorizedPhones.length!==1||
  !/^55[1-9][0-9]{9,10}$/.test(authorizedPhones[0])||rollout.context_permission_enabled!==true)return deny('scope_unavailable');
 try{
  async function one(table,columns,id){const r=await client.from(table).select(columns).eq('id',id).range(0,1);
   if(r.error||r.count!==1||!Array.isArray(r.data)||r.data.length!==1)throw Error('source_unavailable');return r.data[0];}
  async function scope(now){
   const clockAt=Date.parse(now);if(!Number.isFinite(clockAt))throw Error('clock_invalid');
   const f=await one('crm_follow_ups','id,conversation_id,status,due_at,sent_at',followUpId);
   const c=await one('crm_conversations','id,customer_id',conversationId);
   const u=await one('crm_customers','id,phone_e164',c.customer_id);
   if(f.conversation_id!==conversationId||f.status!=='pending'||f.sent_at!==null||
    !(Date.parse(f.due_at)<=clockAt&&Date.parse(f.due_at)>clockAt-86400000)||
    u.phone_e164!==authorizedPhones[0])throw Error('scope_invalid');
   return JSON.stringify([f,c,u]);
  }
  const now=clock(),initialScope=await scope(now);
  const options=now=>({conversationId,now,rollout:{...rollout,message_preparation_enabled:true},observationStore:privateRecoveryObservations(client)});
  const first=await buildRecoveryMessage(await evaluate(client,options(now)),{now});
  if(first.state!=='prepared')return deny(first.reason);
  const checkedAt=clock();
  if(!(Date.parse(checkedAt)>=Date.parse(now)&&Date.parse(checkedAt)<Date.parse(first.context.valid_until)))return deny('preview_expired');
  const second=await buildRecoveryMessage(await evaluate(client,options(checkedAt)),{now:checkedAt});
  if(second.state!=='prepared')return deny(second.reason);
  if(initialScope!==await scope(checkedAt)||first.context.source_fingerprint!==second.context.source_fingerprint||
   first.context.interest_message_id!==second.context.interest_message_id||first.context.offer_message_id!==second.context.offer_message_id||
   first.content_digest!==second.content_digest)return deny('snapshot_changed_during_preparation');
  const finishedAt=Date.parse(clock());
  if(!(finishedAt>=Date.parse(checkedAt)&&finishedAt<Date.parse(first.context.valid_until)))return deny('preview_expired');
  // Hash/projection only leaves the process on explicit review. Caller must never
  // mistake this optimistic check for an atomic claim or a send authorization.
  return {...second,context:{...second.context,valid_until:first.context.valid_until},follow_up_id:followUpId};
 }catch{return deny('preparation_unavailable');}
}
