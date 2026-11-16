import {TRUFADAS_ACTIVE_ITEM_KEYS} from './trufadas-variants.mjs';
// Reuse stock after active reservations, exactly as the public storefront does.
export async function recoveryAvailability(client,rows) {
 const availability=Object.fromEntries(rows.map(r=>[r.item_key,r.status]));
 let stock=null;
 try {const r=await client.rpc('public_crocante_inventory');if(!r.error&&Array.isArray(r.data))stock=r.data;}catch{}
 for(const key of TRUFADAS_ACTIVE_ITEM_KEYS){
  const matches=stock?.filter(r=>r.item_key===key)??[],n=matches[0]?.available;
  if(matches.length!==1||!Number.isSafeInteger(n)||n<0)availability[key]='unverified';
  else if(n===0)availability[key]='sold_out';
 }
 return availability;
}
