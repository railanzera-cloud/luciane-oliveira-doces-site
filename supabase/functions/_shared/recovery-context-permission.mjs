import {normalizeSignedRecoveryWebhook} from './recovery-meta-observation.mjs';

// Draft wording for a FUTURE reviewed flow. This module cannot send it.
export const CONTEXT_PERMISSION_VERSION='context-recovery-1';
export const CONTEXT_PERMISSION_OFFER='Luciane Oliveira Doces: se quiser ajuda para concluir este pedido, responda PODE LEMBRAR. Podemos te chamar uma única vez por aqui nas próximas 24 horas. Para cancelar esse lembrete, escreva CANCELAR LEMBRETE.';
const normalized=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const mid=s=>typeof s==='string'&&/^wamid\.[A-Za-z0-9=+/_-]{3,290}$/.test(s);

// Only recognizes protocol evidence, never permission by itself. SQL must link
// offer, explicit reply, official events and the same current interest episode.
export async function inspectSignedContextPermission(raw,config={}) {
 const base={state:'scope_rejected',events:[],send_authorized:false};
 const expected=config.expectedConversationKey;
 if(typeof expected!=='string'||!/^\d+:\d+:55[1-9][0-9]{9,10}$/.test(expected)||
  !expected.startsWith(`${config.wabaId}:${config.phoneNumberId}:`))return base;
 const source=await normalizeSignedRecoveryWebhook(raw,config);
 if(!source.accepted)return {...base,state:'signature_or_identity_rejected'};
 const ids=new Set(),events=[];
 for(const entry of JSON.parse(raw).entry)for(const change of Array.isArray(entry?.changes)?entry.changes:[]) {
  if(String(entry.id)!==config.wabaId||String(change?.value?.metadata?.phone_number_id)!==config.phoneNumberId||
   !['messages','smb_message_echoes'].includes(change?.field))continue;
  const echo=change.field==='smb_message_echoes';
  const messages=echo?change.value.message_echoes:change.value.messages;
  for(const m of Array.isArray(messages)?messages:[]) {
   if(!mid(m?.id))continue;
   if(ids.has(m.id))return {...base,state:'event_identity_conflict'};
   ids.add(m.id);
   if(`${config.wabaId}:${config.phoneNumberId}:${echo?m.to:m.from}`!==expected||m.type!=='text'||
    typeof m.text?.body!=='string'||m.text.body.length>4096||m.context?.forwarded||m.context?.frequently_forwarded)continue;
   const event=source.events.find(e=>e.id===m.id&&e.conversation_key===expected&&
    e.direction===(echo?'business_outbound':'inbound'));
   const at=Date.parse(event?.occurred_at),clock=Date.parse(config.receivedAt);
   if(!Number.isFinite(at)||at>clock||at<=clock-86400000)continue;
   const t=normalized(m.text.body);
   const kind=echo&&!m.context?.id&&t===normalized(CONTEXT_PERMISSION_OFFER)?'offer':
    !echo&&/^pode lembrar[.!]?$/.test(t)?'accept':!echo&&/^cancelar lembrete[.!]?$/.test(t)?'revoke':null;
   if(!kind)continue;
   if(m.context?.id&&!mid(m.context.id))continue;
   events.push({message_id:m.id,occurred_at:event.occurred_at,kind,
    reply_to:m.context?.id??null,policy_version:CONTEXT_PERMISSION_VERSION});
  }
 }
 events.sort((a,b)=>Date.parse(a.occurred_at)-Date.parse(b.occurred_at));
 return {state:'inspected',events,send_authorized:false};
}

export function privateContextPermissions(client) {
 return {
  async capture(conversationId,event) {
   if(!mid(event?.message_id)||!['offer','accept','revoke'].includes(event.kind)||
    event.policy_version!==CONTEXT_PERMISSION_VERSION||!Number.isFinite(Date.parse(event.occurred_at))||
    !(event.reply_to===null||mid(event.reply_to)))throw Error('context_permission_event_invalid');
   const r=await client.rpc('crm_recovery_store_context_permission',{p_conversation_id:conversationId,
    p_message_id:event.message_id,p_occurred_at:event.occurred_at,p_kind:event.kind,p_reply_to:event.reply_to,
    p_policy_version:event.policy_version});
   if(r.error||!['stored','duplicate','ineligible'].includes(r.data))throw Error('context_permission_store_failed');
   return r.data;
  },
  async read(conversationId) {
   const r=await client.rpc('crm_recovery_read_context_permission',{p_conversation_id:conversationId});
   const v=r.data;
   if(r.error||!v||Object.keys(v).some(k=>!['state','verified','scope','scoped','version','valid_until','markers','send_authorized'].includes(k))||
    !['missing','pending','granted','revoked','expired','used','scope_changed','disabled'].includes(v.state)||typeof v.scoped!=='boolean'||
    v.verified&&v.scoped!==true||
    typeof v.verified!=='boolean'||v.verified!==(v.state==='granted')||v.scope!=='one_context_follow_up'||
    v.version!==CONTEXT_PERMISSION_VERSION||v.send_authorized!==false||
    !(v.valid_until===null||typeof v.valid_until==='string'&&Number.isFinite(Date.parse(v.valid_until)))||
    v.verified&&v.valid_until===null||!Array.isArray(v.markers)||v.markers.length>1000||
    v.verified&&(!v.markers.some(e=>e.kind==='offer')||!v.markers.some(e=>e.kind==='accept')))throw Error('context_permission_read_failed');
   const ids=new Set();
   for(const e of v.markers) {
    if(Object.keys(e).sort().join(',')!=='kind,message_id,occurred_at'||!mid(e.message_id)||ids.has(e.message_id)||
     !['offer','accept','revoke'].includes(e.kind)||!Number.isFinite(Date.parse(e.occurred_at)))throw Error('context_permission_marker_invalid');
    ids.add(e.message_id);
   }
   return v;
  }
 };
}
