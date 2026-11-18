import {CATALOG_VERSION,CATEGORY_ITEM_KEYS,POPCORN_SIZES,CROCANTES} from './commerce-catalog.mjs';
import {DRINKS} from './drinks-catalog.mjs';
import {RECOVERY_VERSION,recoveryCatalog} from './recovery-interest.mjs';
// Draft wording, not approved or connected to a transport. No customer prose,
// price, scarcity, payment or inferred purchase is interpolated into this text.
export const RECOVERY_MESSAGE_VERSION='context-message-1';
const prefixes={slice:'Fatia artesanal',cone:'Cascão Trufado',christmas:'Fatia de Chocottone',package:'Pipoca Trufada',gourmet:'Pipoca Gourmet de pote',drink:'Refrigerante'};
const keys={slice:CATEGORY_ITEM_KEYS.fatias,cone:CATEGORY_ITEM_KEYS.cones,christmas:CATEGORY_ITEM_KEYS.natal,package:CATEGORY_ITEM_KEYS.pipocas,gourmet:CATEGORY_ITEM_KEYS.pipocas};
const fields=['category','product_id','item_key','name','variant_id','option_id'];
const sameSet=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.every(x=>typeof x==='string')&&
 new Set(a).size===a.length&&a.length===b.length&&[...a].sort().join('\n')===[...b].sort().join('\n');
export async function recoveryMessageDigest(text){
 if(typeof text!=='string'||text.length>200000)throw Error('message_digest_invalid');
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(b=>b.toString(16).padStart(2,'0')).join('');
}
const blocked=reason=>({mode:'preview',state:'blocked',reason,send_authorized:false});
export async function buildRecoveryMessage(decision,{now}={}){
 try{
  if(decision?.mode!=='shadow'||decision.send_authorized!==false||decision.version!==RECOVERY_VERSION||
   decision.classification!=='shadow_candidate'||!Array.isArray(decision.blockers)||decision.blockers.length||
   decision.permission_basis!=='signed_context_permission'||decision.consistency!=='optimistic_shadow_only'||
   decision.commerce_checks?.external_purchase_coverage!==true||decision.commerce_checks?.site_orders_read!==true||
   decision.commerce_checks?.store_open!==true||decision.commerce_checks?.unattributed_orders!==false)
   return blocked('commercial_checks_incomplete');
  const context=decision.preparation_context,clock=Date.parse(now);
  if(!context||context.version!=='message-context-1'||!Number.isFinite(clock)||
   !/^[a-f0-9]{64}$/.test(context.source_fingerprint)||!/^wamid\.[A-Za-z0-9=+/_-]{3,290}$/.test(context.interest_message_id)||
   !/^wamid\.[A-Za-z0-9=+/_-]{3,290}$/.test(context.offer_message_id)||
   !(Date.parse(context.interest_at)<=clock&&Date.parse(context.interest_at)>clock-86400000)||
   !(Date.parse(context.valid_until)>clock&&Date.parse(context.valid_until)<=clock+30000))return blocked('context_unavailable');
  const i=decision.interest;
  if(i?.version!==RECOVERY_VERSION||i.catalog_version!==CATALOG_VERSION||i.status!=='resolved'||i.intent!=='interest'||
   !Array.isArray(i.categories)||i.categories.length!==1||!prefixes[i.categories[0]]||
   !Array.isArray(i.candidates)||!i.candidates.length||i.candidates.length>3)return blocked('selection_unresolved');
  const category=i.categories[0],catalog=recoveryCatalog(),selected=[];
  for(const candidate of i.candidates){
   if(!candidate||Object.keys(candidate).some(k=>!fields.includes(k)))return blocked('catalog_mismatch');
   let canonical=catalog.find(p=>p.category===category&&p.product_id===candidate.product_id&&p.option_id===candidate.option_id);
   if(!canonical)return blocked('catalog_mismatch');
   canonical=Object.fromEntries(fields.map(k=>[k,canonical[k]]));
   if(category==='package'){
    const size=CROCANTES[canonical.product_id]?.sizes?.[candidate.variant_id];
    if(!size)return blocked('catalog_mismatch');
    canonical={...canonical,item_key:size.itemKey,variant_id:size.id};
   }
   if(fields.some(k=>candidate[k]!==canonical[k]))return blocked('catalog_mismatch');
   selected.push(canonical);
  }
  const identities=selected.map(p=>p.product_id+':'+p.option_id);
  if(new Set(identities).size!==identities.length)return blocked('selection_unresolved');
  let label,variantId,optionIds=[],availability;
  if(category==='gourmet'){
   if(!Array.isArray(i.variant_ids)||i.variant_ids.length!==1)return blocked('selection_unresolved');
   const size=POPCORN_SIZES[i.variant_ids[0]];
   if(!size||selected.length>size.maxOptions)return blocked('selection_unresolved');
   variantId=size.id;optionIds=selected.map(p=>p.option_id);
   if(!sameSet(i.option_ids,optionIds))return blocked('selection_unresolved');
   // Catalog order is canonical; a different input ordering cannot change a digest.
   selected.sort((a,b)=>catalog.findIndex(p=>p.option_id===a.option_id)-catalog.findIndex(p=>p.option_id===b.option_id));
   optionIds=selected.map(p=>p.option_id);
   label=`${prefixes[category]} — ${selected.map(p=>p.name).join(' + ')} (${size.label})`;
   availability=[keys[category],...selected.map(p=>p.item_key),size.itemKey];
  }else{
   if(selected.length!==1||!sameSet(i.option_ids,[]))return blocked('selection_unresolved');
   variantId=selected[0].variant_id;
   if(!sameSet(i.variant_ids,[variantId]))return blocked('selection_unresolved');
   label=`${prefixes[category]} — ${selected[0].name}`;
   if(category==='drink')label+=` (${DRINKS[selected[0].product_id].label})`;
   if(category==='package')label+=` (${CROCANTES[selected[0].product_id].sizes[variantId].label})`;
   availability=[keys[category],selected[0].item_key].filter(Boolean);
  }
  if(!sameSet(i.availability_keys,availability))return blocked('catalog_mismatch');
  const body=`Olá! Aqui é da Luciane Oliveira Doces. Você ainda tem interesse em ${label}? Posso te ajudar por aqui ou você pode fazer o pedido pelo site:\nhttps://lucianeoliveiradoces.com.br\n\nPara cancelar este lembrete, responda CANCELAR LEMBRETE.`;
  return {mode:'preview',state:'prepared',version:RECOVERY_MESSAGE_VERSION,purpose:'one_context_follow_up',
   catalog_version:CATALOG_VERSION,body,content_digest:await recoveryMessageDigest(body),
   selection:{category,product_ids:[...new Set(selected.map(p=>p.product_id))],variant_id:variantId,option_ids:optionIds},
   context:{...context},send_authorized:false};
 }catch{return blocked('preparation_unavailable');}
}
