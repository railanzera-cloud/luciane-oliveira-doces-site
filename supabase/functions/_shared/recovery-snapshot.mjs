// Server-only read model. No HTTP endpoint, writes, credentials or send capability.
import { evaluateRecoveryShadow } from './recovery-shadow.mjs';
import { normalizeSignedRecoveryWebhook } from './recovery-meta-observation.mjs';
import { recoveryPermission } from './recovery-permission.mjs';
import { classifyRecoveryInterest } from './recovery-interest.mjs';
import { recoveryAvailability } from './recovery-availability.mjs';
import { inspectSignedRecoveryPurchaseSignals } from './recovery-purchase-signal.mjs';
import {inspectSignedRecoveryOrderReferences} from './recovery-order-reference.mjs';
import {privateRecoveryOrderReferences} from './recovery-order-reference-store.mjs';
const classifyInterest=text=>classifyRecoveryInterest(text).intent==='interest';

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
  signedWebhook=null,metaConfig=null,rollout={},pageSize=200,maxRows=2000,observationStore=null}={}) {
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
    // A first official message may predate server creation by milliseconds.
    // Its conversation FK and provider time are the evidence, not receipt time.
    const since = new Date(rollout.order_references_enabled===true?clock-24*3600000:
      Math.max(Date.parse(c.created_at),clock-24*3600000)).toISOString();
    const dates = [['gte','occurred_at',since],['lte','occurred_at',now]];
    const [official,tintim,links,recentOrders,availability,settings,followups,stages,automation,recentPaidOrders] = await Promise.all([
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
        [['in','phone_digits',[customerPhone,customerPhone.slice(2)]],
          ...(rollout.purchase_episodes_enabled===true?[]:[['gte','last_observed_at',since],['lte','last_observed_at',now]])]),
      read('crm_automation_settings','singleton,follow_up_minutes',[['eq','singleton',true]],'singleton'),
      read('orders','id,customer_phone,created_at,payment_status,order_status,paid_at',
        [['gte','paid_at',since],['lte','paid_at',now]]),
    ]);
    if (automation.length !== 1) return failed('automation_settings_unavailable');
    const sourceProblems = [];
    const referenceStore=rollout.order_references_enabled===true?privateRecoveryOrderReferences(client):null;
    const events = official.map(e => ({id:e.message_id,conversation_key:conversationId,
      direction:e.direction === 'app_echo' ? 'business_outbound' : e.direction,
      occurred_at:e.occurred_at,received_at:e.received_at,time_basis:'provider_timestamp',
      verified:phone(e.phone_e164) === customerPhone,content_origin:'unsupported',text:null}));
    if (observationStore) {
      const saved = await observationStore.read(conversationId);
      for (const row of saved) {
        const e = events.find(e => e.verified && e.id === row.message_id &&
          (e.direction === 'inbound' || rollout.purchase_signals_enabled===true &&
            e.direction==='business_outbound' && (row.semantic?.intent==='possible_purchase' ||
              row.semantic?.intent==='unknown' && row.semantic?.reason==='no_evidence')) &&
          Date.parse(e.occurred_at) === Date.parse(row.occurred_at));
        if (e) Object.assign(e,{content_origin:'private_semantic',semantic_interest:row.semantic,
          service_unavailability:e.direction==='business_outbound' && row.semantic?.intent==='unknown' && row.semantic?.reason==='no_evidence'});
      }
    }
    // Receipt-time Tintim is retained separately, never upgraded to provider time.
    for (const e of tintim) {
      if (e.time_basis !== 'provider_timestamp') continue;
      events.push({id:'tintim:'+e.fingerprint,conversation_key:conversationId,direction:e.direction,
        occurred_at:e.occurred_at,received_at:e.received_at,time_basis:e.time_basis,
        verified:phone(e.phone_e164) === customerPhone,content_origin:'unsupported',text:null});
    }
    if (signedWebhook) {
      const incoming = await normalizeSignedRecoveryWebhook(signedWebhook.raw,
        {...metaConfig,signature:signedWebhook.signature,receivedAt:now});
      if (!incoming.accepted) return failed('signed_observation_rejected');
      const expected = `${metaConfig.wabaId}:${metaConfig.phoneNumberId}:${customerPhone}`;
      let matchedIdentity = false;
      for (const e of incoming.events) {
        // Meta can batch several customers in one signed envelope. Scope strictly
        // to this episode; never persist another customer's semantic observation.
        if (e.conversation_key !== expected) continue;
        matchedIdentity = true;
        if (Date.parse(e.occurred_at)<Date.parse(since)) continue;
        const old = events.find(x => x.id === e.id && x.direction === e.direction);
        if (old && Date.parse(old.occurred_at) !== Date.parse(e.occurred_at)) return failed('message_identity_conflict');
        if (observationStore) await observationStore.capture(conversationId,{...e,conversation_key:conversationId});
        if (old) Object.assign(old,{content_origin:e.content_origin,text:e.text});
        else events.push({...e,conversation_key:conversationId});
      }
      if (!matchedIdentity) return failed('signed_observation_identity_mismatch');
      if(referenceStore) {
        const inspected=await inspectSignedRecoveryOrderReferences(signedWebhook.raw,{
          ...metaConfig,signature:signedWebhook.signature,receivedAt:now,expectedConversationKey:expected});
        if(inspected.state!=='inspected')return failed('signed_observation_rejected');
        if(inspected.references.length && !observationStore)return failed('snapshot_source_unavailable_or_incomplete');
        for(const reference of inspected.references) await referenceStore.capture(conversationId,reference);
      }
      if(rollout.purchase_signals_enabled===true) {
        const inspected=await inspectSignedRecoveryPurchaseSignals(signedWebhook.raw,{
          ...metaConfig,signature:signedWebhook.signature,receivedAt:now,expectedConversationKey:expected});
        if(inspected.state!=='inspected')return failed('signed_observation_rejected');
        for(const signal of inspected.signals.filter(s=>s.direction==='business_outbound')) {
          const event=events.find(e=>e.verified && e.id===signal.message_id &&
            e.direction==='business_outbound' && Date.parse(e.occurred_at)===Date.parse(signal.occurred_at));
          if(!event || !observationStore?.capturePurchaseSignal)
            return failed('snapshot_source_unavailable_or_incomplete');
          await observationStore.capturePurchaseSignal(conversationId,{...event,
            content_origin:'verified_purchase_signal'});
          // Use the same persisted projection now and on the future timer read.
          const semantic=classifyRecoveryInterest('Já paguei');
          Object.assign(event,{content_origin:'private_semantic',semantic_interest:semantic});
        }
        for(const signal of inspected.service_unavailability) {
          const event=events.find(e=>e.verified && e.id===signal.message_id &&
            e.direction==='business_outbound' && Date.parse(e.occurred_at)===Date.parse(signal.occurred_at));
          if(!event || !observationStore?.captureServiceUnavailability)
            return failed('snapshot_source_unavailable_or_incomplete');
          await observationStore.captureServiceUnavailability(conversationId,{...event,
            content_origin:'verified_service_unavailability'});
          Object.assign(event,{content_origin:'private_semantic',semantic_interest:{...classifyRecoveryInterest(''),reason:'no_evidence'},service_unavailability:true});
        }
      }
    }
    const orderReferences=referenceStore?await referenceStore.read(conversationId):[];
    for(const r of orderReferences) {
      if(!events.some(e=>e.verified && e.direction==='inbound' && e.id===r.message_id &&
        Date.parse(e.occurred_at)===Date.parse(r.occurred_at)))return failed('snapshot_source_unavailable_or_incomplete');
    }
    // A newly observed interest starts a bounded episode. Older opaque history
    // cannot certify this episode, nor permanently contaminate its completeness.
    const interestStart=events.filter(e=>e.verified && e.direction==='inbound' &&
      (e.content_origin==='private_semantic'?e.semantic_interest?.intent==='interest':
       e.content_origin==='customer_text' && classifyInterest(e.text)))
      .map(e=>Date.parse(e.occurred_at)).sort((a,b)=>b-a)[0];
    const episodeStart=Number.isFinite(interestStart)?interestStart:Date.parse(since);
    const episodeEvents=events.filter(e=>Date.parse(e.occurred_at)>=episodeStart);
    if(episodeEvents.some(e=>e.direction==='inbound' && !['customer_text','private_semantic'].includes(e.content_origin)))
      sourceProblems.push('inbound_content_unverified');
    if(tintim.some(e=>e.time_basis!=='provider_timestamp' && Date.parse(e.received_at)>=episodeStart))
      sourceProblems.push('tintim_time_unverified');
    for (const [field,direction] of [['last_inbound_at','inbound'],['last_outbound_at','business_outbound']]) {
      const recorded = Date.parse(c[field]);
      const observed = Math.max(-Infinity,...events.filter(e => e.direction === direction && e.verified)
        .map(e => Date.parse(e.occurred_at)));
      if (Number.isFinite(recorded) && recorded>=Date.parse(since) && recorded>observed)
        sourceProblems.push('conversation_activity_not_covered');
    }
    const associatedIds = [...new Set([...links.filter(l => ['candidate','confirmed'].includes(l.status)).map(l => l.order_uuid),
      ...orderReferences.filter(r=>r.resolution_status==='matched').map(r=>r.order_uuid)])];
    const associatedOrders = associatedIds.length ? await read('orders',
      'id,customer_phone,created_at,payment_status,order_status,paid_at',[['in','id',associatedIds]]) : [];
    if (associatedIds.some(id => !associatedOrders.some(o => o.id === id))) sourceProblems.push('linked_order_unavailable');
    const orders = new Map();
    if(orderReferences.some(r=>r.resolution_status!=='matched'))orders.set('unresolved_reference',{
      conversation_key:conversationId,identity_basis:'candidate',payment_status:'unknown'});
    for (const o of [...recentOrders,...recentPaidOrders,...associatedOrders]) {
      const inWindow = [o.created_at,o.paid_at].some(t=>Date.parse(t)>=Date.parse(since) && Date.parse(t)<=clock);
      const direct = inWindow && phone(o.customer_phone) === customerPhone;
      const linked = associatedIds.includes(o.id);
      if (direct || linked) orders.set(o.id,{conversation_key:conversationId,
        identity_basis:direct ? 'verified' : 'candidate',payment_status:o.payment_status,status:o.order_status});
    }
    // Unattributed orders cannot prove that this contact did not buy.
    if ([...recentOrders,...recentPaidOrders].some(o => !phone(o.customer_phone) && !associatedIds.includes(o.id)))
      sourceProblems.push('unattributed_orders_in_window');
    let purchaseEpisode=null;
    const readEpisode=async()=>{
      const r=await client.rpc('crm_recovery_purchase_episode',{p_conversation_id:conversationId});
      if(r.error || !r.data || typeof r.data.review_required!=='boolean' || typeof r.data.scoped!=='boolean' ||
        r.data.send_authorized!==false || r.data.payment_confirmed!==false) throw Error('episode_source_invalid');
      return {review_required:r.data.review_required,scoped:r.data.scoped,send_authorized:false,payment_confirmed:false};
    };
    if(rollout.purchase_episodes_enabled===true) purchaseEpisode=await readEpisode();
    if (purchaseEpisode?.review_required===true || stages.some(t =>
      ['comprou','convertido','vendido','venda realizada'].includes(String(t.stage_label).trim().toLowerCase())) &&
      !(purchaseEpisode?.scoped===true && purchaseEpisode.review_required===false))
      orders.set('stage',{conversation_key:conversationId,identity_basis:'candidate',payment_status:'unknown'});
    // Recheck versions: optimistic consistency for a shadow-only read, not a send claim.
    const [currentC,currentU] = await Promise.all([
      read('crm_conversations','id,updated_at',[['eq','id',c.id]]),
      read('crm_customers','id,updated_at',[['eq','id',customer.id]]),
    ]);
    if(referenceStore && JSON.stringify(orderReferences)!==JSON.stringify(await referenceStore.read(conversationId)))
      return failed('snapshot_changed_during_read');
    if(purchaseEpisode && JSON.stringify(purchaseEpisode)!==JSON.stringify(await readEpisode()))
      return failed('snapshot_changed_during_read');
    if (currentC[0]?.updated_at !== c.updated_at || currentU[0]?.updated_at !== customer.updated_at)
      return failed('snapshot_changed_during_read');
    if (!['in_progress','waiting_customer'].includes(c.status)) return failed('conversation_not_active');
    const lastSent = followups.filter(f => ['sent','sent_manually'].includes(f.status) && Number.isFinite(Date.parse(f.sent_at)))
      .sort((a,b) => Date.parse(b.sent_at)-Date.parse(a.sent_at))[0]?.sent_at ?? null;
    const permission=await recoveryPermission(client,customer,now);
    const storeOpen=settings.length===1 && typeof settings[0].value==='boolean'?settings[0].value:null;
    const result = evaluateRecoveryShadow({now,events,orders:[...orders.values()],
      follow_up_minutes:automation[0].follow_up_minutes,
      consent_verified:permission.verified,
      opt_out:customer.commercial_opt_out !== false,
      store_open:storeOpen,
      availability:await recoveryAvailability(client,availability),
      recovery_contacted_at:lastSent,
      history_complete:rollout.channel_identity_verified === true &&
        Number.isFinite(Date.parse(rollout.channel_verified_since)) &&
        Date.parse(rollout.channel_verified_since)<=episodeStart && !sourceProblems.some(p =>
        ['tintim_time_unverified','conversation_activity_not_covered','inbound_content_unverified'].includes(p)),
      order_check_complete:rollout.purchase_coverage_verified === true && !sourceProblems.some(p => p.includes('order')),
    });
    if (sourceProblems.length) {
      result.blockers = [...new Set([...result.blockers,...sourceProblems])];
      if (result.classification === 'shadow_candidate') result.classification = 'blocked';
    }
    const journey_state=result.blockers.includes('paid_order')?'purchase_confirmed':
      result.blockers.includes('purchase_or_order_requires_reconciliation')?'purchase_reconciliation':
      result.classification==='pending_service'?'pending_service':
      result.interest?.status==='resolved'?'conversation_opportunity':'insufficient_evidence';
    return {...result,...(purchaseEpisode?{purchase_episode:purchaseEpisode}:{}),journey_state,snapshot_scope:'recent_24h',permission_basis:permission.basis,
      commerce_checks:{site_orders_read:true,official_order_references_read:!!referenceStore,unattributed_orders:sourceProblems.includes('unattributed_orders_in_window'),
        external_purchase_coverage:rollout.purchase_coverage_verified===true,
        store_basis:'checkout_orders_open',store_open:storeOpen},
      source_counts:{official:official.length,tintim:tintim.length},
      consistency:'optimistic_shadow_only'};
  } catch {return failed('snapshot_source_unavailable_or_incomplete');}
}
