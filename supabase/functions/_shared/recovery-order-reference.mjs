import {normalizeSignedRecoveryWebhook} from './recovery-meta-observation.mjs';

// Site's current generated header. A public order number is a CANDIDATE only.
export function parseRecoveryOrderNumber(text) {
 if(typeof text!=='string'||text.length>4096)return null;
 const t=text.replace(/\r\n?/g,'\n');
 const m=/^Olá! Finalizei meu pedido pelo site da Luciane Oliveira Doces\.\n\n\*PEDIDO #([1-9][0-9]{0,9})\*(?:\n|$)/u.exec(t);
 if(!m||(t.match(/\*PEDIDO #[0-9]+\*/g)??[]).length!==1)return null;
 const n=Number(m[1]);return Number.isSafeInteger(n)?n:null;
}

// No HTTP endpoint: signature/assets/scope/original time, then direct inbound text.
// Raw text, phones, tokens, names and amounts never leave this inspector.
export async function inspectSignedRecoveryOrderReferences(raw,config={}) {
 const base={mode:'shadow',send_authorized:false,payment_confirmed:false,
  purchase_coverage_verified:false,references:[]};
 const expected=config.expectedConversationKey;
 if(typeof expected!=='string'||!/^\d+:\d+:55[1-9][0-9]{9,10}$/.test(expected)||
   !expected.startsWith(`${config.wabaId}:${config.phoneNumberId}:`))return {...base,state:'scope_rejected'};
 let observed,payload;
 try {observed=await normalizeSignedRecoveryWebhook(raw,config);if(!observed.accepted)return {...base,state:'source_rejected'};
  payload=JSON.parse(raw);}catch{return {...base,state:'source_rejected'};}
 const bodies=new Map(),duplicate=new Set();
 for(const entry of payload.entry)for(const c of Array.isArray(entry?.changes)?entry.changes:[]) {
  if(String(entry?.id)!==config.wabaId||c?.field!=='messages'||
    String(c.value?.metadata?.phone_number_id)!==config.phoneNumberId)continue;
  for(const m of Array.isArray(c.value?.messages)?c.value.messages:[]) {
   if(typeof m?.id!=='string')continue;
   if(bodies.has(m.id))duplicate.add(m.id);
   bodies.set(m.id,m);
  }
 }
 const seen=new Set();
 for(const e of observed.events){if(seen.has(e.id))duplicate.add(e.id);seen.add(e.id);}
 for(const e of observed.events) {
  if(e.conversation_key!==expected||e.direction!=='inbound')continue;
  if(duplicate.has(e.id))return {...base,state:'event_identity_conflict'};
  const m=bodies.get(e.id),at=Date.parse(e.occurred_at),clock=Date.parse(config.receivedAt);
  if(!m||`${config.wabaId}:${config.phoneNumberId}:${m.from}`!==expected||
   m.type!=='text'||m.context?.id||m.context?.forwarded||m.context?.frequently_forwarded||
   !Number.isFinite(at)||at>clock||at<=clock-86400000||Number(m.timestamp)*1000!==at)continue;
  const n=parseRecoveryOrderNumber(m.text?.body);
  if(n!==null)base.references.push({message_id:e.id,occurred_at:e.occurred_at,
    order_number:n,reference_status:'candidate'});
 }
 return {...base,state:'inspected'};
}
