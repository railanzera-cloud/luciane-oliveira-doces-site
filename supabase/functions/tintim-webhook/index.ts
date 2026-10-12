import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { normalizeTintimPayload, extractOrderReferenceFromTintim } from "./core.mjs";
const EXPECTED_TOKEN_SHA256="c00669ce4b78a66371b6864b5f6cb31f850a7bb8ec7fb2b1a8a70ac0cde65c32";
const headers={"content-type":"application/json; charset=utf-8","cache-control":"no-store"};
const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers});
async function digest(data){const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(data));return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,"0")).join("");}
function equal(a,b){if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0;}
Deno.serve(async req=>{
 try{
  if(req.method!=="POST")return reply(405,{ok:false,error:"method_not_allowed"});
  const provided=new URL(req.url).searchParams.get("key")??"";
  if(provided.length<43||provided.length>160||!equal(await digest(provided),EXPECTED_TOKEN_SHA256))return reply(401,{ok:false,error:"unauthorized"});
  if(!req.headers.get("content-type")?.toLowerCase().includes("application/json"))return reply(415,{ok:false,error:"json_required"});
  const raw=await req.text();
  if(new TextEncoder().encode(raw).length>64000)return reply(413,{ok:false,error:"payload_too_large"});
  let payload;try{payload=JSON.parse(raw)}catch{return reply(400,{ok:false,error:"invalid_json"});}
  const eventType=String(payload?.event_type??payload?.eventType??payload?.type??payload?.event??"").toLowerCase().replaceAll(".","_").replaceAll("-","_");
  const isMessage=eventType==="message_create";
  const data=isMessage?extractOrderReferenceFromTintim(payload):normalizeTintimPayload(payload);
  if(data.ignored)return reply(200,{ok:true,ignored:data.reason});
  const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!key)return reply(503,{ok:false,error:"service_unavailable"});
  const procedure=isMessage?"record_tintim_order_reference":"record_tintim_webhook_event_v2";
  const argumentsForRpc=isMessage?{
   p_fingerprint:await digest(raw),p_account_key:data.account_key,p_lead_key:data.lead_key,
   p_phone_digits:data.phone_digits,p_order_number:data.order_number,p_observed_at:data.observed_at
  }:{
   p_fingerprint:await digest(raw),p_account_key:data.account_key,p_lead_key:data.lead_key,
   p_event_type:data.event_type,p_observed_at:data.observed_at,p_summary:data.summary
  };
  let r;try{
   r=await fetch(url+"/rest/v1/rpc/"+procedure,{
    method:"POST",headers:{"apikey":key,"Authorization":"Bearer "+key,"Content-Type":"application/json"},
    body:JSON.stringify(argumentsForRpc),
    signal:AbortSignal.timeout(8000)
   });
  }catch{return reply(503,{ok:false,error:"temporary_backend_error"});}
  if(!r.ok)return reply(503,{ok:false,error:"temporary_backend_error"});
  const result=await r.json().catch(()=>({}));
  return reply(200,{ok:true,duplicate:result?.duplicate===true, ...(isMessage?{order_candidate_linked:result?.linked===true}:{lead_linked:result?.conversation_upserted===true})});
 }catch{return reply(400,{ok:false,error:"invalid_request"});}
});