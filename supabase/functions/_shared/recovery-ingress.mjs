import { normalizeSignedRecoveryWebhook } from './recovery-meta-observation.mjs';
import { assembleRecoveryEvaluation } from './recovery-snapshot.mjs';
import { privateRecoveryObservations } from './recovery-observation-store.mjs';

// Internal post-ingress observer; NEVER an HTTP endpoint or send worker.
/**
 * @param {any} client
 * @param {{raw?:string,signature?:string|null,metaConfig?:any,now?:string,enabled?:boolean,retentionReady?:boolean,authorizedPhones?:string[],rollout?:any}} options
 * @param {{evaluate?:any,makeStore?:any}} dependencies
 */
export async function observeRecoveryIngress(client,{raw,signature,metaConfig,now,
  enabled=false,retentionReady=false,authorizedPhones=[],rollout={}}={},
  {evaluate=assembleRecoveryEvaluation,makeStore=privateRecoveryObservations}={}) {
  const base={mode:'shadow',send_authorized:false,processed:0,skipped:0,counts:{}};
  if (enabled !== true) return {...base,state:'disabled'};
  if (retentionReady !== true || !authorizedPhones.length || authorizedPhones.length>5) return {...base,state:'rollout_blocked'};
  try {
    const observed=await normalizeSignedRecoveryWebhook(raw,{...metaConfig,signature,receivedAt:now});
    if (!observed.accepted) return {...base,state:'signature_or_identity_rejected'};
    const phones=[...new Set(observed.events.map(e=>e.conversation_key.split(':').at(-1)))];
    const allowed=phones.filter(p=>authorizedPhones.includes(p));
    if (!allowed.length) return {...base,state:'outside_authorized_scope',skipped:phones.length};
    // A bounded purge is additional defense, not a substitute for hourly retention.
    const purge=await client.rpc('crm_recovery_purge_expired');
    if (purge.error || !Number.isInteger(purge.data) || purge.data<0 || purge.data>=1000)
      return {...base,state:'retention_check_failed'};
    const store=makeStore(client);
    for (const phone of allowed.slice(0,5)) {
      const customers=await client.from('crm_customers').select('id').eq('phone_e164',phone).limit(2);
      if (customers.error || customers.data?.length!==1) {base.skipped++;continue;}
      const conversations=await client.from('crm_conversations').select('id').eq('customer_id',customers.data[0].id)
        .in('status',['in_progress','waiting_customer']).limit(2);
      if (conversations.error || conversations.data?.length!==1) {base.skipped++;continue;}
      const decision=await evaluate(client,{conversationId:conversations.data[0].id,now,
        signedWebhook:{raw,signature},metaConfig,rollout,observationStore:store});
      base.counts[decision.classification]=(base.counts[decision.classification] ?? 0)+1;
      base.processed++;
    }
    base.skipped+=phones.length-allowed.length+Math.max(0,allowed.length-5);
    return {...base,state:'observed'};
  } catch {return {...base,state:'observation_failed'};}
}
