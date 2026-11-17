// Internal diagnostic for a new buying episode; no send/payment/queue capability.
// Callers must supply server-verified identity and immutable ingestion timestamps.
// A Tintim stage/update timestamp is deliberately NOT a sale timestamp.
export function assessRecoveryPurchaseEpisode({now,interest,signals=[]}={}) {
  const result={mode:'shadow',send_authorized:false,payment_confirmed:false,
    purchase_coverage_verified:false,relation:'unresolved',historical_count:0,
    current_or_ambiguous_count:0,reason:'episode_unverified'};
  const clock=Date.parse(now),start=Date.parse(interest?.occurred_at);
  const received=Date.parse(interest?.received_at);
  if(!Number.isFinite(clock) || !Number.isFinite(start) || !Number.isFinite(received) ||
    start>clock || received<start || received>clock || clock-start>=86400000 ||
    interest?.verified!==true || interest?.time_basis!=='provider_timestamp' ||
    interest?.intent!=='interest' || !interest?.conversation_key || !interest?.id ||
    !Array.isArray(signals)) return result;
  const seen=new Map();
  for(const signal of signals) {
    // Unknown identities and timing must never silently disappear from coverage.
    const at=Date.parse(signal?.received_at);
    if(!signal?.id || signal.verified!==true ||
      signal.conversation_key!==interest.conversation_key ||
      signal.receipt_time_basis!=='server_received_at' ||
      !Number.isFinite(at) || at>clock ||
      !['purchase_stage','purchase_statement'].includes(signal.kind))
      return {...result,reason:'purchase_evidence_unverified'};
    const fingerprint=JSON.stringify([at,signal.kind]);
    if(seen.has(signal.id) && seen.get(signal.id)!==fingerprint)
      return {...result,reason:'purchase_evidence_conflict'};
    if(seen.has(signal.id))continue;
    seen.set(signal.id,fingerprint);
    // Receipt BEFORE the new official interest only proves prior knowledge.
    // Receipt at/after interest may be a delayed sale update: keep ambiguous.
    if(at<start)result.historical_count++;
    else result.current_or_ambiguous_count++;
  }
  return {...result,
    relation:result.current_or_ambiguous_count?'current_or_ambiguous':
      result.historical_count?'historical_only':'no_purchase_evidence',
    reason:result.current_or_ambiguous_count?'purchase_reconciliation_required':
      result.historical_count?'new_interest_after_purchase_evidence':'absence_is_not_purchase_coverage'};
}
