import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { normalizeTintimPayload, extractOrderReferenceFromTintim, extractTintimMessageSignal, tintimMessageFieldFlags } from "./core.mjs";
import { extractTintimProductMention } from "./product-hint.mjs";
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
  const eventType=String(payload?.event_type??payload?.["event-type"]??payload?.eventType??payload?.type??payload?.event??"").toLowerCase().replaceAll(".","_").replaceAll("-","_");
  const isMessage=eventType==="message_create";
  const data=isMessage?extractOrderReferenceFromTintim(payload):normalizeTintimPayload(payload);
  const signal=isMessage?extractTintimMessageSignal(payload):{ignored:true};
  const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  // Diagnostico passivo: apenas flags de presenca de campos e motivo da rejeicao.
  // Nunca registra texto, telefone, ID, chave da URL ou corpo da requisicao.
  const message=payload?.message;
  const looksLikeMessage=!!payload && (
    Object.prototype.hasOwnProperty.call(payload,"from_me") ||
    Object.prototype.hasOwnProperty.call(payload,"fromMe") ||
    (!!message && typeof message==="object" && (
      Object.prototype.hasOwnProperty.call(message,"from_me") ||
      Object.prototype.hasOwnProperty.call(message,"fromMe")
    ))
  );
  if((isMessage || looksLikeMessage) && url && key) {
    const allowedReasons=new Set(["direction_missing","phone_missing","timestamp_missing","timestamp_outside_window","invalid_payload"]);
    const reason=isMessage
      ? (signal.ignored?(allowedReasons.has(signal.reason)?signal.reason:"other"):"parsed")
      : "other";
    try{
      await fetch(url+"/rest/v1/rpc/crm_record_tintim_message_diagnostic",{
        method:"POST",
        headers:{"apikey":key,"Authorization":"Bearer "+key,"Content-Type":"application/json"},
        body:JSON.stringify({p_reason:reason,p_field_flags:tintimMessageFieldFlags(payload)}),
        signal:AbortSignal.timeout(2500)
      });
    }catch{ /* A telemetria nunca deve interromper o webhook da Tintim. */ }
  }
  if(data.ignored && signal.ignored)return reply(200,{ok:true,ignored:data.reason});
  if(!url||!key)return reply(503,{ok:false,error:"service_unavailable"});
  const fingerprint=await digest(raw);
  async function callRpc(procedure:string, args:Record<string,unknown>){
   let r;
   try{
    r=await fetch(url+"/rest/v1/rpc/"+procedure,{
      method:"POST",headers:{"apikey":key,"Authorization":"Bearer "+key,"Content-Type":"application/json"},
      body:JSON.stringify(args),signal:AbortSignal.timeout(8000)
    });
   }catch{throw new Error("temporary_backend_error");}
   if(!r.ok)throw new Error("temporary_backend_error");
   return await r.json().catch(()=>({}));
  }
  let result:any={}; let observation:any={};
  try{
   if(!data.ignored){
    const procedure=isMessage?"record_tintim_order_reference":"record_tintim_webhook_event_v2";
    const argumentsForRpc=isMessage?{
      p_fingerprint:fingerprint,p_account_key:data.account_key,p_lead_key:data.lead_key,
      p_phone_digits:data.phone_digits,p_order_number:data.order_number,p_observed_at:data.observed_at
    }:{
      p_fingerprint:fingerprint,p_account_key:data.account_key,p_lead_key:data.lead_key,
      p_event_type:data.event_type,p_observed_at:data.observed_at,p_summary:data.summary
    };
    result=await callRpc(procedure,argumentsForRpc);
   }
   if(isMessage && !signal.ignored){
     // Caminho independente: nunca armazena texto; nao altera reconciliacao de pedidos.
     observation=await callRpc("crm_record_tintim_message_v2",{
       p_fingerprint:fingerprint,p_phone:signal.phone,p_direction:signal.direction,
       p_occurred_at:signal.occurred_at,p_account_key:signal.account_key,
       p_time_basis:signal.time_basis
     });
   }
  }catch{return reply(503,{ok:false,error:"temporary_backend_error"});}
  // Apenas mensagem INBOUND de cliente. Um texto de checkout com referencia de
  // pedido não entra como novo sinal comercial: isso seria falso interesse.
  // A extração é efêmera; só envia product_id/fingerprint, nunca o corpo.
  if(isMessage && signal?.direction==="inbound" && !signal.ignored
     && data.ignored && observation?.accepted===true) {
    const mention=extractTintimProductMention(payload);
    if(!mention.ignored) {
      // Suplementar e fail-open apenas para os eventos existentes:
      // falha no detector NÃO interrompe o webhook de pedidos/mensagens.
      try {
        await callRpc("crm_record_tintim_product_mention",{
          p_fingerprint:fingerprint,p_product_id:mention.product_id,
          p_action:mention.action
        });
      } catch { /* Falha isolada: sem reprocessamento de pedidos */ }
    }
  }
  return reply(200,{ok:true,duplicate:result?.duplicate===true,
    ...(isMessage?{order_candidate_linked:result?.linked===true,
      crm_observed:observation?.accepted===true,
      crm_mode:observation?.mode??null}:{
      lead_linked:result?.conversation_upserted===true})});
 }catch{return reply(400,{ok:false,error:"invalid_request"});}
});