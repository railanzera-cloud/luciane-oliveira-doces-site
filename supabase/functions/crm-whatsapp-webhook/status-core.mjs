// Meta official status receipts; no phone numbers, chat content or media.
const obj=v=>v && typeof v==="object" && !Array.isArray(v)?v:{};
const id=v=>typeof v==="string" && /^wamid\.[A-Za-z0-9=+/_-]{3,250}$/.test(v)?v:null;
const timestamp=v=>{
 const n=Number(v);
 return Number.isSafeInteger(n)&&n>=1700000000&&n<=4102444800
   ?new Date(n*1000).toISOString():null;
};
export function extractOfficialStatusEvents(payload,expectedPhoneNumberId,expectedWabaId){
 if(obj(payload).object!=="whatsapp_business_account" ||
 !expectedPhoneNumberId || !expectedWabaId)return [];
 const out=[];
 for(const entry of (Array.isArray(payload.entry)?payload.entry:[]).slice(0,15)){
  if(String(entry?.id)!==String(expectedWabaId))continue;
  for(const change of (Array.isArray(entry?.changes)?entry.changes:[]).slice(0,15)){
   if(change?.field!=="messages")continue;
   const val=obj(change.value);
   if(String(obj(val.metadata).phone_number_id)!==String(expectedPhoneNumberId))continue;
   if(val.messaging_product!=="whatsapp")continue;
   for(const raw of (Array.isArray(val.statuses)?val.statuses:[]).slice(0,100)){
    const msg=obj(raw);
    const message_id=id(msg.id);
    const status=msg.status;
    const occurred_at=timestamp(msg.timestamp);
    if(!message_id || !["sent","delivered","read","failed"].includes(status)
      || !occurred_at)continue;
    out.push({message_id,status,occurred_at});
    if(out.length>=100)return out;
   }
  }
 }
 return out;
}
