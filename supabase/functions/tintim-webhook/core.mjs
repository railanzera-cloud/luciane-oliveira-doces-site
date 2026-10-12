// ID público da conta Tintim da loja, também presente no link rastreável do site.
// Eventos de mensagem podem omitir a conta; nunca inventar outro tenant nesses casos.
const DEFAULT_TINTIM_ACCOUNT_KEY="2c956a42-229f-4d21-ade6-4442f8c048ed";
const obj=x=>x&&typeof x==="object"&&!Array.isArray(x)?x:{};
const safe=(v,n=160)=>typeof v==="number"&&Number.isFinite(v)?String(v).slice(0,n):typeof v==="string"?v.trim().slice(0,n):"";
const first=(...v)=>{const n=typeof v.at(-1)==="number"?v.pop():160;return v.map(x=>safe(x,n)).find(Boolean)??"";};
const get=(o,...keys)=>keys.map(k=>obj(o)[k]).find(x=>x!==undefined&&x!==null);
const paramNames=["utm_source","utm_medium","utm_campaign","utm_content","utm_term","tintim_fbid","fbclid","ctwa_clid"];
const params=(visit)=>{const v=obj(visit),p=obj(v.parameters),q=obj(v.params);let url={};const u=first(v.url,v.landing_url,v.link,2048);try{if(u)url=Object.fromEntries(new URL(u).searchParams.entries());}catch{}const out={};for(const k of paramNames){let x=get(p,k)??get(q,k)??get(v,k)??get(url,k);if(Array.isArray(x))x=x[0];const val=safe(x,k==="fbclid"?450:180);if(val)out[k]=val;}return out;};
function dateValue(x,nowIso){let d=null;if(typeof x==="number")d=new Date(x<1e11?x*1000:x);else if(typeof x==="string"&&x)d=new Date(x);const n=new Date(nowIso);if(!d||!Number.isFinite(d.getTime())||d.getTime()>n.getTime()+300000)return n.toISOString();return d.toISOString();}
export function normalizeTintimPayload(input,nowIso=new Date().toISOString()){
 if(!input||typeof input!=="object"||Array.isArray(input))throw new Error("invalid_payload");
 const type=first(input.event_type,input.eventType,input.type,input.event,100).toLowerCase().replaceAll(".","_").replaceAll("-","_");
 if(type==="message_create")return {ignored:true,reason:"message_disabled"};
 if(!["lead_create","lead_update","lead_source_update"].includes(type))return {ignored:true,reason:"unsupported_event_type"};
 const lead=obj(input.lead),account=obj(input.account),ad=obj(input.ad??lead.ad),camp=obj(ad.campaign),adset=obj(ad.adset??ad.ad_set),stage=obj(input.stage??lead.stage??input.funnel_stage),visit=obj(input.visit??lead.visit);
 const phone=first(lead.phone,input.phone,lead.whatsapp,input.customer_phone,100).replace(/\D/g,"");
 const conversation=obj(input.conversation);const externalId=first(lead.id,lead.uuid,lead.lead_id,input.lead_id,input.lead_uuid,input.leadId,input.conversation_id,conversation.id,conversation.uuid,160);
 const src=obj(input.source??lead.source);
 return {
  ignored:false,event_type:type,
  account_key:first(account.code,account.id,input.account_code,input.account_id,DEFAULT_TINTIM_ACCOUNT_KEY,100),
  lead_key:externalId||null,
  observed_at:dateValue(get(input,"updated_at","created_at","date","timestamp","datetime")??get(lead,"updated_at","created_at"),nowIso),
  summary:{
   contact_name:first(lead.name,input.name,input.customer_name,150),
   phone_digits:phone.length>=10&&phone.length<=15?phone:"",
   source:first(src.name,src.title,input.source,lead.source,input.origin,100),
   stage:first(stage.name,lead.stage_name,input.stage_name,input.status,100),
   campaign_id:first(ad.campaign_id,camp.id,input.campaign_id,100),
   campaign_name:first(ad.campaign_name,camp.name,input.campaign_name,150),
   adset_id:first(ad.adset_id,ad.ad_set_id,adset.id,input.adset_id,100),
   adset_name:first(ad.adset_name,ad.ad_set_name,adset.name,input.adset_name,150),
   ad_id:first(ad.ad_id,ad.id,input.ad_id,100),
   ad_name:first(ad.ad_name,ad.name,input.ad_name,150),
   visit_parameters:params(visit)
  }
 };
}

// Reconciliação opcional de pedido: extrai somente uma referência padronizada.
// Não persiste o texto da conversa, não deduz pagamento nem atribui campanha.
export function extractOrderReferenceFromTintim(input,nowIso=new Date().toISOString()){
 if(!input||typeof input!=="object"||Array.isArray(input))return {ignored:true,reason:"invalid_message"};
 const type=first(input.event_type,input.eventType,input.type,input.event,100).toLowerCase().replaceAll(".","_").replaceAll("-","_");
 if(type!=="message_create")return {ignored:true,reason:"not_message"};
 const lead=obj(input.lead),account=obj(input.account),conversation=obj(input.conversation),message=obj(input.message);
 const fromMe=get(message,"from_me","fromMe") ?? get(input,"from_me","fromMe");
 // Apenas mensagens recebidas de clientes, e somente quando o webhook confirma a direção.
 if(fromMe!==false && fromMe!=="false")return {ignored:true,reason:"not_verified_inbound"};
 const content=typeof input.message==="string"?input.message:first(message.text,message.body,message.message,input.body,input.text,16000);
 if(!content)return {ignored:true,reason:"no_text"};
 const normalized=content.replace(/\r\n?/g,"\n").replace(/[\u200b-\u200f\u2060\ufeff]/g,"");
 const matched=/^Olá! Finalizei meu pedido pelo site da Luciane Oliveira Doces\.\n\n\*PEDIDO #([1-9][0-9]{0,9})\*(?:\n|$)/u.exec(normalized);
 if(!matched)return {ignored:true,reason:"not_site_order_message"};
 const orderNumber=Number(matched[1]);
 if(!Number.isSafeInteger(orderNumber))return {ignored:true,reason:"invalid_order_reference"};
 const digits=first(lead.phone,conversation.phone,input.phone,input.customer_phone,message.phone,100).replace(/\D/g,"");
 if(!/^[0-9]{10,15}$/.test(digits))return {ignored:true,reason:"no_reliable_phone"};
 const leadKey=first(lead.id,lead.uuid,lead.lead_id,input.lead_id,input.lead_uuid,input.leadId,input.conversation_id,conversation.id,conversation.uuid,160);
 return {
  ignored:false,event_type:"message_order_reference",
  account_key:first(account.code,account.id,input.account_code,input.account_id,DEFAULT_TINTIM_ACCOUNT_KEY,100),
  lead_key:leadKey||null,
  phone_digits:digits,
  order_number:orderNumber,
  observed_at:dateValue(get(message,"created_at","date","timestamp")??get(input,"created_at","date","timestamp"),nowIso)
 };
}
