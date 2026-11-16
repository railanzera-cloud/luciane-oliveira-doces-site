import { extractOfficialMessageEvents } from '../crm-whatsapp-webhook/core.mjs';

// Local/pre-deployment adapter. Never wired into the active webhook by import.
// Returned text is ephemeral input to the shadow evaluator, not a storage record.
export async function normalizeSignedRecoveryWebhook(raw,{signature,appSecret,
  phoneNumberId,wabaId,receivedAt}={}) {
  const reject = reason => ({accepted:false,reason,events:[]});
  if (typeof raw !== 'string' || new TextEncoder().encode(raw).length > 131072)
    return reject('payload_invalid');
  if (typeof appSecret !== 'string' || appSecret.length < 16 ||
    !/^sha256=[a-f0-9]{64}$/i.test(signature ?? '') ||
    !/^\d+$/.test(phoneNumberId ?? '') || !/^\d+$/.test(wabaId ?? '') ||
    !Number.isFinite(Date.parse(receivedAt))) return reject('configuration_invalid');
  const key = await crypto.subtle.importKey('raw',new TextEncoder().encode(appSecret),
    {name:'HMAC',hash:'SHA-256'},false,['verify']);
  const bytes = Uint8Array.from(signature.slice(7).match(/../g),h => parseInt(h,16));
  if (!await crypto.subtle.verify('HMAC',key,bytes,new TextEncoder().encode(raw)))
    return reject('signature_invalid');
  let payload;
  try {payload = JSON.parse(raw);} catch {return reject('json_invalid');}
  if (payload?.object !== 'whatsapp_business_account' || !Array.isArray(payload.entry))
    return reject('envelope_invalid');
  const entry = payload.entry.filter(e => String(e?.id) === wabaId);
  const validated = {...payload,entry};
  const events = extractOfficialMessageEvents(validated,phoneNumberId);
  const textById = new Map();
  for (const e of entry) for (const change of (Array.isArray(e.changes) ? e.changes : [])) {
    if (change?.field !== 'messages' || String(change?.value?.metadata?.phone_number_id) !== phoneNumberId) continue;
    for (const m of (Array.isArray(change.value.messages) ? change.value.messages : [])) {
      if (m.type === 'text' && typeof m.text?.body === 'string' &&
        !m.context?.forwarded && !m.context?.frequently_forwarded && !m.context?.id)
        textById.set(m.id,m.text.body);
    }
  }
  return {accepted:true,reason:events.length ? 'observed' : 'no_supported_messages',events:events.map(e => ({
    id:e.message_id,conversation_key:`${wabaId}:${phoneNumberId}:${e.phone}`,
    direction:e.direction === 'app_echo' ? 'business_outbound' : 'inbound',
    occurred_at:e.occurred_at,received_at:receivedAt,time_basis:'provider_timestamp',
    verified:true,source:'meta',content_origin:textById.has(e.message_id) ? 'customer_text' : 'unsupported',
    text:textById.get(e.message_id) ?? null,
  }))};
}
