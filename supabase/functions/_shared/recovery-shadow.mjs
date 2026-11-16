import { classifyRecoveryInterest, RECOVERY_VERSION } from './recovery-interest.mjs';

// Trusted normalized observations only; callers must verify source identity/signature.
// This evaluator cannot authorize a send. No DB/network dependency or side effect.
export function evaluateRecoveryShadow({events=[],now,follow_up_minutes=45,
  orders=[],consent_verified=false,opt_out=false,store_open=null,availability={},recovery_contacted_at=null,
  order_check_complete=false,history_complete=false}={}) {
  const result = {version:RECOVERY_VERSION,mode:'shadow',send_authorized:false,
    classification:'insufficient_evidence',blockers:[],interest:null,due_at:null};
  const clock = Date.parse(now);
  if (!Number.isFinite(clock) || !Number.isInteger(follow_up_minutes) ||
    follow_up_minutes < 15 || follow_up_minutes > 2880)
    return {...result,blockers:['invalid_clock_or_delay']};
  const seen = new Map();
  const accepted = [];
  let invalid = false;
  for (const e of events) {
    const at = Date.parse(e.occurred_at);
    if (e.verified !== true || e.time_basis !== 'provider_timestamp' ||
      !['inbound','business_outbound'].includes(e.direction) || !e.id ||
      typeof e.conversation_key !== 'string' || !e.conversation_key ||
      !Number.isFinite(at) || at > clock || (e.received_at &&
        (!Number.isFinite(Date.parse(e.received_at)) || Date.parse(e.received_at) < at))) {
      invalid = true; continue;
    }
    const key = `${e.conversation_key}:${e.direction}:${e.id}`;
    const fingerprint = JSON.stringify([e.occurred_at,e.text,e.content_origin]);
    if (seen.has(key) && seen.get(key) !== fingerprint) invalid = true;
    if (!seen.has(key)) {seen.set(key,fingerprint);accepted.push({...e,at});}
  }
  if (invalid) result.blockers.push('unverified_or_invalid_event');
  if (!order_check_complete) result.blockers.push('order_check_incomplete');
  if (!history_complete) result.blockers.push('conversation_history_incomplete');
  if (new Set(accepted.map(e => e.conversation_key)).size !== 1)
    return {...result,blockers:[...result.blockers,'conversation_identity_unresolved']};
  accepted.sort((a,b) => a.at-b.at || a.id.localeCompare(b.id));
  const inbound = accepted.filter(e => e.direction === 'inbound');
  const outgoing = accepted.filter(e => e.direction === 'business_outbound');
  const lastIn = inbound.at(-1), lastOut = outgoing.at(-1);
  let declined = false, possiblePurchase = false;
  for (const e of inbound) {
    // Referral, forwarded content and quoted messages cannot confirm interest.
    if (!['customer_text','private_semantic'].includes(e.content_origin)) continue;
    const observation = e.content_origin === 'private_semantic' ? e.semantic_interest : classifyRecoveryInterest(e.text);
    if (!observation || observation.version !== RECOVERY_VERSION) continue;
    if (observation.intent === 'opt_out') opt_out = true;
    if (observation.intent === 'possible_purchase') possiblePurchase = true;
    if (observation.intent === 'declined') {declined = true;result.interest = null;}
    if (observation.intent === 'interest') {declined = false;result.interest = observation;}
  }
  if (opt_out) return {...result,classification:'suppressed',blockers:['opt_out']};
  const same = orders.filter(o => o.conversation_key === accepted[0]?.conversation_key);
  if (same.some(o => o.identity_basis === 'verified' && o.payment_status === 'paid'))
    return {...result,classification:'suppressed',blockers:['paid_order']};
  if (same.some(o => o.identity_basis === 'verified' && o.status === 'canceled'))
    return {...result,classification:'suppressed',blockers:['canceled_order']};
  if (possiblePurchase || same.some(o => o.identity_basis === 'candidate' ||
    o.identity_basis === 'verified' && o.payment_status !== 'paid'))
    result.blockers.push('purchase_or_order_requires_reconciliation');
  if (declined) return {...result,classification:'suppressed',blockers:['declined']};
  if (!lastIn) return {...result,blockers:[...result.blockers,'no_verified_inbound']};
  if (!lastOut || lastOut.at <= lastIn.at)
    return {...result,classification:'pending_service',blockers:[...result.blockers,'store_response_pending']};
  if (clock-lastIn.at >= 24*3600000) result.blockers.push('outside_service_window');
  if (!result.interest) result.blockers.push('interest_unconfirmed');
  if (!consent_verified) result.blockers.push('permission_unverified');
  if (store_open === false) result.blockers.push('store_closed');
  else if (store_open !== true) result.blockers.push('store_not_verified_open');
  for (const key of result.interest?.availability_keys ?? [])
    if (availability[key] !== 'available') result.blockers.push(`availability_unverified:${key}`);
  if (result.interest?.status !== 'resolved') result.blockers.push('product_or_variant_unresolved');
  const due = lastOut.at+follow_up_minutes*60000;
  result.due_at = new Date(due).toISOString();
  if (due > clock) result.blockers.push('not_due');
  if (recovery_contacted_at && (!Number.isFinite(Date.parse(recovery_contacted_at)) ||
    Date.parse(recovery_contacted_at) >= lastIn.at))
    result.blockers.push('already_contacted_since_reply');
  result.blockers = [...new Set(result.blockers)];
  return {...result,classification:result.blockers.length ? 'blocked' : 'shadow_candidate'};
}
