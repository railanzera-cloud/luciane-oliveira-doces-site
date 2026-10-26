import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { extractOfficialMessageEvents } from "./core.mjs";

// NAO ativar no Meta antes de validar WABA, Coexistence e evento real.
// Segredos somente no ambiente da Edge Function.
const answer=(status,body)=>new Response(typeof body==="string"?body:JSON.stringify(body),{
  status,headers:{"content-type":typeof body==="string"?"text/plain; charset=utf-8":"application/json; charset=utf-8","cache-control":"no-store"}
});
const safeEqual=(a,b)=>{
  if (typeof a!=="string" || typeof b!=="string" || a.length!==b.length) return false;
  let equal=0;for(let i=0;i<a.length;i++)equal|=a.charCodeAt(i)^b.charCodeAt(i);
  return equal===0;
};
async function validSignature(raw,provided,secret) {
  if (!secret || !/^sha256=[a-fA-F0-9]{64}$/.test(provided||"")) return false;
  const cryptoKey=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const data=await crypto.subtle.sign("HMAC",cryptoKey,new TextEncoder().encode(raw));
  const digest=Array.from(new Uint8Array(data),v=>v.toString(16).padStart(2,"0")).join("");
  return safeEqual("sha256="+digest,provided.toLowerCase());
}
Deno.serve(async(req)=>{
  const url=new URL(req.url);
  const verifyToken=Deno.env.get("META_WEBHOOK_VERIFY_TOKEN")??"";
  if(req.method==="GET"){
    const challenge=url.searchParams.get("hub.challenge")??"";
    if(url.searchParams.get("hub.mode")==="subscribe" &&
      verifyToken.length>=16 && safeEqual(verifyToken,url.searchParams.get("hub.verify_token")??"") &&
      /^[A-Za-z0-9_-]{1,180}$/.test(challenge)) return answer(200,challenge);
    return answer(403,"verification_failed");
  }
  if(req.method!=="POST")return answer(405,{ok:false,error:"method_not_allowed"});
  const appSecret=Deno.env.get("META_APP_SECRET")??"";
  const phoneId=Deno.env.get("META_WHATSAPP_PHONE_NUMBER_ID")??"";
  const businessId=Deno.env.get("META_WHATSAPP_BUSINESS_ID")??"";
  const projectUrl=Deno.env.get("SUPABASE_URL")??"";
  const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
  if(!appSecret||!phoneId||!businessId||!projectUrl||!serviceKey)
    return answer(503,{ok:false,error:"configuration_missing"});
  const contentLength=Number(req.headers.get("content-length")??"0");
  if(contentLength>131072)return answer(413,{ok:false,error:"payload_too_large"});
  let raw="";
  try {
    raw=await req.text();
    if(new TextEncoder().encode(raw).length>131072)return answer(413,{ok:false,error:"payload_too_large"});
    if(!await validSignature(raw,req.headers.get("x-hub-signature-256"),appSecret))
      return answer(401,{ok:false,error:"bad_signature"});
  }catch{return answer(401,{ok:false,error:"bad_signature"});}
  let payload;
  try{payload=JSON.parse(raw);}catch{return answer(400,{ok:false,error:"invalid_json"});}
  if(payload?.object!=="whatsapp_business_account")return answer(200,{ok:true,ignored:"not_waba"});
  const allowedEntries=Array.isArray(payload?.entry)?payload.entry.filter(x=>String(x?.id)==businessId):[];
  const events=extractOfficialMessageEvents({...payload,entry:allowedEntries},phoneId);
  if(!events.length)return answer(200,{ok:true,processed:0});
  let processed=0;
  for(const event of events){
    let res;
    try{
      res=await fetch(projectUrl+"/rest/v1/rpc/crm_record_meta_message",{
        method:"POST",
        headers:{"apikey":serviceKey,"Authorization":"Bearer "+serviceKey,"Content-Type":"application/json"},
        body:JSON.stringify({
          p_phone:event.phone,p_message_id:event.message_id,
          p_direction:event.direction,p_occurred_at:event.occurred_at
        }),
        signal:AbortSignal.timeout(7000)
      });
    }catch{return answer(503,{ok:false,error:"temporary_storage_failure",processed});}
    if(!res.ok)return answer(503,{ok:false,error:"temporary_storage_failure",processed});
    processed++;
  }
  return answer(200,{ok:true,processed});
});
