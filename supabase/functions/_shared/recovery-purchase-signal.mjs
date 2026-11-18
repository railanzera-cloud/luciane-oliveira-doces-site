import { normalizeSignedRecoveryWebhook } from './recovery-meta-observation.mjs';

// Candidate ingress is gated by a server-only rollout flag, OFF by default.
// A statement can only ADD a reconciliation blocker; never prove payment,
// certify absence of purchases, grant consent or authorize a delivery.
export function classifyRecoveryPurchaseSignal(text, direction) {
  const base = { detected:false, basis:'no_supported_statement',
    blocker:null, payment_confirmed:false, send_authorized:false };
  if (typeof text !== 'string' || !text.trim() || text.length > 4096 ||
    !['inbound','business_outbound'].includes(direction)) return base;
  // Whole-message grammar deliberately rejects questions, quotes, links,
  // conditionals, negations and third-party statements instead of matching
  // isolated payment words inside arbitrary prose.
  if (/[?"“”«»<>]/u.test(text) || /https?:\/\/|www\./i.test(text)) return base;
  const t = text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/[.!\s]+$/u,'').replace(/\s+/g,' ').trim();
  let basis = null;
  if (direction === 'business_outbound' && isStoreOrderConfirmation(text))
    basis = 'business_order_confirmation';
  if (direction === 'inbound' && /^ja (?:paguei|comprei)$/.test(t))
    basis = 'customer_purchase_statement';
  if (direction === 'business_outbound') {
    if (/^(?:(?:seu )?(?:pagamento|pix) (?:foi )?(?:recebido|confirmado)|(?:recebi|recebemos) (?:o )?seu (?:pagamento|pix))(?:[,.]? obrigad[oa])?$/.test(t))
      basis = 'business_payment_statement';
    if (/^seu pedido (?:ja )?(?:foi )?(?:entregue|retirado|finalizado)(?:[,.]? obrigad[oa])?$/.test(t))
      basis = 'business_fulfillment_statement';
    // Exact operational statements observed in the shop. These only ADD a
    // review hold; neither dispatch nor readiness proves receipt of money.
    if (/^(?:ja saiu|ja pode fazer a retirada)$/.test(t) || isStorePreparationUpdate(text))
      basis = 'business_fulfillment_statement';
  }
  return basis ? {...base,detected:true,basis,
    blocker:'purchase_or_order_requires_reconciliation'} : base;
}

function isStorePreparationUpdate(text) {
  const t=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/\s+/g,' ').trim();
  const m=t.match(/^recebemos o seu pedido!\s+agora e so aguardar\. nosso tempo de preparacao e de aproximadamente ([1-9]\d?) a ([1-9]\d?) minutos\. em breve, seu pedido estara prontinho para chegar ate voce!$/);
  return !!m && Number(m[1])<=Number(m[2]);
}

export function isKnownServiceUnavailability(text) {
  if(typeof text!=='string' || text.length>4096)return false;
  const normalized=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/[^a-z0-9]+/g,' ').trim();
  return /^ola seja bem vindo(?: a)? a luciane oliveira doces nosso atendimento volta (?:na|no) (?:segunda feira|terca feira|quarta feira|quinta feira|sexta feira|sabado|domingo) a partir das (?:[01]?\d|2[0-3])h com muitas delicias esperando por voces agradecemos imensamente pela preferencia e pelo carinho de sempre$/.test(normalized);
}

// Existing shop macro, not the generic phrase "pedido confirmado". Amount is
// validated only as syntax/context; never returned, summed or treated as paid.
function isStoreOrderConfirmation(text) {
  const lines=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\*/g,'')
    .toLowerCase().split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  if (lines.length<4 || lines.length>5) return false;
  if (!/^pedido confirmado\s*(?:✅|✔️?)?$/.test(lines[0])) return false;
  const money=lines[1].match(/^valor dos produtos:\s*r\$\s*((?:\d{1,3}(?:\.\d{3})+|\d{1,6}),\d{2})$/);
  if (!money || Number(money[1].replaceAll('.','').replace(',','.'))<=0) return false;
  if (!/^este valor corresponde somente aos produtos\.?$/.test(lines[2])) return false;
  if (!/^obrigad[oa] pela preferencia\s*[.!]?\s*(?:😊|🙂|❤️|💛)?$/.test(lines[3])) return false;
  return lines.length===4 || /^tempo de entrega de \d{1,3} a \d{1,3} minutos\s*✅?$/.test(lines[4]);
}

// Reuses real HMAC/envelope/asset validation. expectedConversationKey is private
// trusted server scope; it must come from the rollout allowlist, never a request.
// Results contain no text, phone, customer name, order or financial mutation.
export async function inspectSignedRecoveryPurchaseSignals(raw, config = {}) {
  const base = {mode:'shadow',send_authorized:false,payment_confirmed:false,
    purchase_coverage_verified:false,signals:[],service_unavailability:[]};
  const expected = config.expectedConversationKey;
  if (typeof expected !== 'string' || !/^\d+:\d+:55[1-9][0-9]{9,10}$/.test(expected) ||
    !expected.startsWith(`${config.wabaId}:${config.phoneNumberId}:`))
    return {...base,state:'scope_rejected'};
  const observed = await normalizeSignedRecoveryWebhook(raw, config);
  if (!observed.accepted) return {...base,state:'signature_or_identity_rejected'};
  const payload = JSON.parse(raw), bodies = new Map();
  for (const entry of payload.entry) {
    if (String(entry?.id) !== config.wabaId) continue;
    for (const change of Array.isArray(entry.changes) ? entry.changes : []) {
      if (!['messages','smb_message_echoes'].includes(change?.field) ||
        String(change.value?.metadata?.phone_number_id) !== config.phoneNumberId) continue;
      const echo = change.field === 'smb_message_echoes';
      const list = echo ? change.value.message_echoes : change.value.messages;
      const direction = echo ? 'business_outbound' : 'inbound';
      for (const m of Array.isArray(list) ? list : []) {
        if (`${config.wabaId}:${config.phoneNumberId}:${echo ? m?.to : m?.from}` !== expected ||
          typeof m?.id !== 'string') continue;
        const key = `${direction}:${m.id}`;
        // Repeated IDs are ambiguous even when one occurrence looks useful.
        if (bodies.has(key)) {bodies.set(key,null);continue;}
        bodies.set(key,m.type === 'text' && typeof m.text?.body === 'string' &&
          !m.context?.id && !m.context?.forwarded && !m.context?.frequently_forwarded
          ? {text:m.text.body,at:new Date(Number(m.timestamp)*1000).getTime()} : null);
      }
    }
  }
  const seen = new Set();
  for (const event of observed.events) {
    if (event.conversation_key !== expected) continue;
    if (seen.has(event.id)) return {...base,signals:[],service_unavailability:[],state:'event_identity_conflict'};
    seen.add(event.id);
    const at = Date.parse(event.occurred_at), received = Date.parse(config.receivedAt);
    if (!Number.isFinite(at) || at > received || at < received-24*3600000) continue;
    const body = bodies.get(`${event.direction}:${event.id}`);
    const text = body?.at === at ? body.text : null;
    const signal = classifyRecoveryPurchaseSignal(text,event.direction);
    if(event.direction==='business_outbound' && isKnownServiceUnavailability(text))
      base.service_unavailability.push({message_id:event.id,occurred_at:event.occurred_at,direction:event.direction});
    if (signal.detected) base.signals.push({message_id:event.id,
      occurred_at:event.occurred_at,direction:event.direction,...signal});
  }
  return {...base,state:'inspected'};
}
