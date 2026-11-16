import { normalizeSignedRecoveryWebhook } from './recovery-meta-observation.mjs';
import { assembleRecoveryEvaluation } from './recovery-snapshot.mjs';
import { privateRecoveryObservations } from './recovery-observation-store.mjs';
const classifications=new Set(['blocked','shadow_candidate','suppressed','pending_service','insufficient_evidence']);
const interestStates=new Set(['resolved','partial','ambiguous','unconfirmed']);
const reasons=new Set(['invalid_clock_or_delay','unverified_or_invalid_event','order_check_incomplete',
  'conversation_history_incomplete','conversation_identity_unresolved','opt_out','paid_order','canceled_order',
  'purchase_or_order_requires_reconciliation','declined','no_verified_inbound','store_response_pending',
  'outside_service_window','interest_unconfirmed','permission_unverified','store_closed','store_not_verified_open',
  'availability_unverified','product_or_variant_unresolved','not_due','already_contacted_since_reply',
  'snapshot_configuration_invalid','conversation_unavailable','conversation_time_invalid','customer_identity_unavailable',
  'automation_settings_unavailable','tintim_time_unverified','signed_observation_rejected',
  'signed_observation_identity_mismatch','message_identity_conflict','conversation_activity_not_covered',
  'linked_order_unavailable','unattributed_orders_in_window','snapshot_changed_during_read',
  'conversation_not_active','inbound_content_unverified','snapshot_source_unavailable_or_incomplete']);

// Internal post-ingress observer; NEVER an HTTP endpoint or send worker.
/**
 * @param {any} client
 * @param {{raw?:string,signature?:string|null,metaConfig?:any,now?:string,enabled?:boolean,retentionReady?:boolean,authorizedPhones?:string[],rollout?:any}} options
 * @param {{evaluate?:any,makeStore?:any}} dependencies
 */
export async function observeRecoveryIngress(client,{raw,signature,metaConfig,now,
  enabled=false,retentionReady=false,authorizedPhones=[],rollout={}}={},
  {evaluate=assembleRecoveryEvaluation,makeStore=privateRecoveryObservations}={}) {
  const base={mode:'shadow',send_authorized:false,processed:0,skipped:0,counts:{},interest_counts:{},blocker_counts:{}};
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
      const classification=classifications.has(decision.classification)?decision.classification:'insufficient_evidence';
      base.counts[classification]=(base.counts[classification] ?? 0)+1;
      if (interestStates.has(decision.interest?.status)) {
        const state=decision.interest.status;
        base.interest_counts[state]=(base.interest_counts[state] ?? 0)+1;
      }
      for (const rawReason of decision.blockers ?? []) {
        const prefix=typeof rawReason==='string'?rawReason.split(':')[0]:null;
        const reason=reasons.has(prefix)?prefix:'other';
        base.blocker_counts[reason]=(base.blocker_counts[reason] ?? 0)+1;
      }
      base.processed++;
    }
    base.skipped+=phones.length-allowed.length+Math.max(0,allowed.length-5);
    return {...base,state:'observed'};
  } catch {return {...base,state:'observation_failed'};}
}
