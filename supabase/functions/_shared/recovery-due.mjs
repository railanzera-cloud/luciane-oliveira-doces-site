import {assembleRecoveryEvaluation} from './recovery-snapshot.mjs';
import {privateRecoveryObservations} from './recovery-observation-store.mjs';
// No route, no sends. DB leases/deduplication own scheduling; snapshots are reread.
/** @param {any} client
 * @param {{enabled?:boolean,retentionReady?:boolean,authorizedPhones?:string[],rollout?:any,clock?:()=>string}} options
 * @param {{evaluate?:any}} dependencies */
export async function reevaluateDueRecovery(client,{enabled=false,retentionReady=false,
 authorizedPhones=[],rollout={},clock=()=>new Date().toISOString()}={},
 {evaluate=assembleRecoveryEvaluation}={}) {
 const summary={mode:'shadow',send_authorized:false,claimed:0,recorded:0,stale:0,failed:0};
 if(!enabled || !retentionReady || authorizedPhones.length<1 || authorizedPhones.length>5 ||
   authorizedPhones.some(p=>!/^55[0-9]{10,11}$/.test(p)))return {...summary,state:'disabled_or_unscoped'};
 const purge=await client.rpc('crm_recovery_purge_expired');
 if(purge.error || !Number.isInteger(purge.data)||purge.data<0||purge.data>=1000)return {...summary,state:'retention_failed'};
 const claimed=await client.rpc('crm_recovery_claim_due',{p_authorized_phones:authorizedPhones});
 if(claimed.error || !Array.isArray(claimed.data)||claimed.data.length>5)return {...summary,state:'claim_failed'};
 for(const job of claimed.data){
  summary.claimed++;
  try {
   const decision=await evaluate(client,{conversationId:job.conversation_id,now:clock(),rollout,
    observationStore:privateRecoveryObservations(client)});
   const retry=decision.classification==='insufficient_evidence';
   // Only a bounded, closed projection is accepted by SQL. Never persist interest
   // text, arbitrary JSON, customer IDs/phones or the complete snapshot.
   const blockers=[...new Set((decision.blockers??[]).map(s=>typeof s==='string'?s.split(':')[0]:'invalid_decision'))];
   const r=await client.rpc('crm_recovery_finish_due',{p_follow_up_id:job.follow_up_id,
    p_lease_token:job.lease_token,p_revision:job.revision,p_classification:decision.classification,
    p_blockers:blockers,p_retry:retry});
   if(r.error){summary.failed++;continue;}
   if(r.data==='recorded')summary.recorded++;else if(r.data==='stale')summary.stale++;else summary.failed++;
  }catch{summary.failed++;} // Lease expires; no private exception logging.
 }
 return {...summary,state:'evaluated'};
}
