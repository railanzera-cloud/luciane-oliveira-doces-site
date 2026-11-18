// Internal read-only chronology. A public reference is never an identity proof.
// updated_at bounds when the stored record was known; it is NOT the sale time.
export function classifyRecoverySitePurchaseEpisode({order,identityBasis,interestAt,now}={}) {
  const unresolved={state:'requires_reconciliation',send_authorized:false,payment_confirmed:false};
  const time=value=>typeof value==='string' && value.trim()?Date.parse(value):NaN;
  const clock=time(now),start=time(interestAt);
  if(identityBasis!=='verified' || order?.payment_status!=='paid' ||
    !Number.isFinite(clock) || !Number.isFinite(start) || start>clock || start<=clock-86400000)
    return unresolved;
  const created=time(order.created_at),paid=time(order.paid_at),known=time(order.updated_at);
  if(![created,paid,known].every(Number.isFinite) || created>paid || paid>known || known>clock)
    return unresolved;
  // Conflicting commercial state cannot be discarded as a historical purchase.
  if(!['new','confirmed','preparing','ready','ready_for_pickup','out_for_delivery','delivered','completed'].includes(order.order_status))
    return unresolved;
  if(known<start && ['completed','delivered'].includes(order.order_status))
    return {...unresolved,state:'historical_paid_record'};
  // Payment of an older order or a delayed/backdated update remains ambiguous.
  if(created>=start) return {...unresolved,state:'current_paid_record'};
  return unresolved;
}
