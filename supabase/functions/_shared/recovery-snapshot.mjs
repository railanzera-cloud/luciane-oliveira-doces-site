// Server-only read model. No HTTP endpoint, writes, credentials or send capability.
import { evaluateRecoveryShadow } from './recovery-shadow.mjs';
import { normalizeSignedRecoveryWebhook } from './recovery-meta-observation.mjs';

const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
const phone = value => {
  const digits = String(value ?? '').replace(/[^0-9]/g,'');
  const normalized = [10,11].includes(digits.length) ? '55'+digits : digits;
  return /^55[1-9][0-9]{9,10}$/.test(normalized) ? normalized : null;
};
const failed = reason => ({mode:'shadow',send_authorized:false,classification:'insufficient_evidence',blockers:[reason]});

/** Fully page SELECTs, detect truncation, duplicate IDs and count drift. */
async function readRows(client,table,columns,filters,{pageSize,maxRows,idKey='id'}) {
  const rows = [], ids = new Set();
  let total = null;
  for (let offset=0;offset<maxRows;offset+=pageSize) {
    let query = client.from(table).select(columns,{count:'exact'});
    for (const [method,key,value] of filters) query = query[method](key,value);
    const response = await query.order(idKey,{ascending:true}).range(offset,Math.min(offset+pageSize,maxRows)-1);
    if (response.error || !Array.isArray(response.data) || !Number.isSafeInteger(response.count) ||
      response.count<0 || response.count>maxRows || total !== null && response.count !== total)
      throw new Error('incomplete_source');
    total = response.count;
    for (const row of response.data) {
      if (!row[idKey] || ids.has(row[idKey])) throw new Error('unstable_source');
      ids.add(row[idKey]);rows.push(row);
    }
    if (rows.length === total) return rows;
    if (response.data.length !== pageSize || rows.length>total) throw new Error('truncated_source');
  }
  throw new Error('source_limit');
}

/**
 * Call only from a trusted server with a scoped privileged Supabase client.
 * rollout flags are server configuration, NEVER request body or browser input.
 * No caller-supplied normalized event/permission/order facts are accepted.
 * Signed text remains in memory; only the redacted evaluation is returned.
 */
export async function assembleRecoveryEvaluation(client,{conversationId,now,
  signedWebhook=null,metaConfig=null,rollout={},pageSize=200,maxRows=2000}={}) {
  if (!uuid(conversationId) || !Number.isFinite(Date.parse(now)) || !client?.from ||
    !Number.isInteger(pageSize) || pageSize<1 || pageSize>500 ||
    !Number.isInteger(maxRows) || maxRows<pageSize || maxRows>10000)
    return failed('snapshot_configuration_invalid');
  const limit = {pageSize,maxRows};
  const read = (table,columns,filters=[],idKey='id') => readRows(client,table,columns,filters,{...limit,idKey});
  try {
    const conversations = await read('crm_conversations',
      'id,customer_id,tintim_conversation_id,status,created_at,updated_at,last_inbound_at,last_outbound_at',
      [['eq','id',conversationId]]);
    if (conversations.length !== 1) return failed('conversation_unavailable');
    const c = conversations[0];
    if (!Number.isFinite(Date.parse(c.created_at))) return failed('conversation_time_invalid');
    const customers = await read('crm_customers',
      'id,phone_e164,consent_status,consent_evidence,consent_at,commercial_opt_out,updated_at',
      [['eq','id',c.customer_id]]);
    if (customers.length !== 1 || !phone(customers[0].phone_e164)) return failed('customer_identity_unavailable');
    const customer = customers[0], customerPhone = phone(customer.phone_e164), clock = Date.parse(now);
    // Bounded recent episode, not a claim of complete lifetime chat history.
    const since = new Date(Math.max(Date.parse(c.created_at),clock-24*3600000)).toISOString();
    const dates = [['gte','occurred_at',since],['lte','occurred_at',now]];
    const [official,tintim,links,recentOrders,availability,settings,followups,stages,automation] = await Promise.all([
      read('crm_whatsapp_message_events','id,message_id,conversation_id,phone_e164,direction,occurred_at,received_at',
        [['eq','conversation_id',conversationId],...dates]),
      read('crm_tintim_message_events','id,fingerprint,conversation_id,phone_e164,direction,occurred_at,received_at,time_basis',
        [['eq','conversation_id',conversationId],...dates]),
      c.tintim_conversation_id ? read('tintim_order_links','id,order_uuid,conversation_id,status,created_at',
        [['eq','conversation_id',c.tintim_conversation_id],['gte','created_at',since],['lte','created_at',now]]) : Promise.resolve([]),
      read('orders','id,customer_phone,created_at,payment_status,order_status,paid_at',
        [['gte','created_at',since],['lte','created_at',now]]),
      read('menu_availability','id,item_key,status,updated_at'),
      read('store_settings','id,key,value,updated_at',[['eq','key','orders_open']]),
      read('crm_follow_ups','id,conversation_id,status,sent_at',
        [['eq','conversation_id',conversationId],['gte','sent_at',since],['lte','sent_at',now]]),
      read('tintim_conversations','id,phone_digits,stage_label,last_observed_at',
        [['in','phone_digits',[customerPhone,customerPhone.slice(2)]],['gte','last_observed_at',since],['lte','last_observed_at',now]]),
      read('crm_automation_settings','singleton,follow_up_minutes',[['eq','singleton',true]],'singleton'),
    ]);
    if (automation.length !== 1) return failed('automation_settings_unavailable');
    const sourceProblems = [];
    const events = official.map(e => ({id:e.message_id,conversation_key:conversationId,
      direction:e.direction === 'app_echo' ? 'business_outbound' : e.direction,
      occurred_at:e.occurred_at,received_at:e.received_at,time_basis:'provider_timestamp',
      verified:phone(e.phone_e164) === customerPhone,content_origin:'unsupported',text:null}));
    // Receipt-time Tintim is retained as a blocking coverage signal, not upgraded.
    for (const e of tintim) {
      if (e.time_basis !== 'provider_timestamp') {sourceProblems.push('tintim_time_unverified');continue;}
      events.push({id:'tintim:'+e.fingerprint,conversation_key:conversationId,direction:e.direction,
        occurred_at:e.occurred_at,received_at:e.received_at,time_basis:e.time_basis,
        verified:phone(e.phone_e164) === customerPhone,content_origin:'unsupported',text:null});
    }
    if (signedWebhook) {
      const incoming = await normalizeSignedRecoveryWebhook(signedWebhook.raw,
        {...metaConfig,signature:signedWebhook.signature,receivedAt:now});
      if (!incoming.accepted) return failed('signed_observation_rejected');
      const expected = `${metaConfig.wabaId}:${metaConfig.phoneNumberId}:${customerPhone}`;
      for (const e of incoming.events) {
        if (e.conversation_key !== expected) return failed('signed_observation_identity_mismatch');
        if (Date.parse(e.occurred_at)<Date.parse(since)) continue;
        const old = events.find(x => x.id === e.id && x.direction === e.direction);
        if (old && Date.parse(old.occurred_at) !== Date.parse(e.occurred_at)) return failed('message_identity_conflict');
        if (old) Object.assign(old,{content_origin:e.content_origin,text:e.text});
        else events.push({...e,conversation_key:conversationId});
      }
    }
    for (const [field,direction] of [['last_inbound_at','inbound'],['last_outbound_at','business_outbound']]) {
      const recorded = Date.parse(c[field]);
      const observed = Math.max(-Infinity,...events.filter(e => e.direction === direction && e.verified)
        .map(e => Date.parse(e.occurred_at)));
      if (Number.isFinite(recorded) && recorded>=Date.parse(since) && recorded>observed)
        sourceProblems.push('conversation_activity_not_covered');
    }
    const associatedIds = [...new Set(links.filter(l => ['candidate','confirmed'].includes(l.status)).map(l => l.order_uuid))];
    const associatedOrders = associatedIds.length ? await read('orders',
      'id,customer_phone,created_at,payment_status,order_status,paid_at',[['in','id',associatedIds]]) : [];
    if (associatedIds.some(id => !associatedOrders.some(o => o.id === id))) sourceProblems.push('linked_order_unavailable');
    const orders = new Map();
    for (const o of [...recentOrders,...associatedOrders]) {
      const inWindow = Date.parse(o.created_at)>=Date.parse(since) && Date.parse(o.created_at)<=clock;
      const direct = inWindow && phone(o.customer_phone) === customerPhone;
      const linked = associatedIds.includes(o.id);
      if (direct || linked) orders.set(o.id,{conversation_key:conversationId,
        identity_basis:direct ? 'verified' : 'candidate',payment_status:o.payment_status,status:o.order_status});
    }
    // Unattributed orders cannot prove that this contact did not buy.
    if (recentOrders.some(o => !phone(o.customer_phone) && !associatedIds.includes(o.id)))
      sourceProblems.push('unattributed_orders_in_window');
    if (stages.some(t => ['comprou','convertido','vendido','venda realizada'].includes(String(t.stage_label).trim().toLowerCase())))
      orders.set('stage',{conversation_key:conversationId,identity_basis:'candidate',payment_status:'unknown'});
    // Recheck versions: optimistic consistency for a shadow-only read, not a send claim.
    const [currentC,currentU] = await Promise.all([
      read('crm_conversations','id,updated_at',[['eq','id',c.id]]),
      read('crm_customers','id,updated_at',[['eq','id',customer.id]]),
    ]);
    if (currentC[0]?.updated_at !== c.updated_at || currentU[0]?.updated_at !== customer.updated_at)
      return failed('snapshot_changed_during_read');
    if (!['in_progress','waiting_customer'].includes(c.status)) return failed('conversation_not_active');
    const lastSent = followups.filter(f => ['sent','sent_manually'].includes(f.status) && Number.isFinite(Date.parse(f.sent_at)))
      .sort((a,b) => Date.parse(b.sent_at)-Date.parse(a.sent_at))[0]?.sent_at ?? null;
    const result = evaluateRecoveryShadow({now,events,orders:[...orders.values()],
      follow_up_minutes:automation[0].follow_up_minutes,
      consent_verified:customer.consent_status === 'granted' &&
        Boolean(customer.consent_evidence?.trim()) && Number.isFinite(Date.parse(customer.consent_at)) && Date.parse(customer.consent_at)<=clock,
      opt_out:customer.commercial_opt_out !== false,
      store_open:settings.length === 1 && settings[0].value === true,
      availability:Object.fromEntries(availability.map(a => [a.item_key,a.status])),
      recovery_contacted_at:lastSent,
      history_complete:rollout.channel_identity_verified === true &&
        Number.isFinite(Date.parse(rollout.channel_verified_since)) &&
        Date.parse(rollout.channel_verified_since)<=Date.parse(since) && !sourceProblems.some(p =>
        ['tintim_time_unverified','conversation_activity_not_covered'].includes(p)),
      order_check_complete:rollout.purchase_coverage_verified === true && !sourceProblems.some(p => p.includes('order')),
    });
    if (sourceProblems.length) {
      result.blockers = [...new Set([...result.blockers,...sourceProblems])];
      if (result.classification === 'shadow_candidate') result.classification = 'blocked';
    }
    return {...result,snapshot_scope:'recent_24h',source_counts:{official:official.length,tintim:tintim.length},
      consistency:'optimistic_shadow_only'};
  } catch {return failed('snapshot_source_unavailable_or_incomplete');}
}
