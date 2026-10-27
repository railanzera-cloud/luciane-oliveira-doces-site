// LOD CRM future Meta Cloud API transport.
// NOT DEPLOYED, NOT called by pg_cron or existing webhook.
// Never invoke without a separately certified provider, consent, and an
// atomic server-side claim of a single delivery intent.
const digits=v=>typeof v==="string" && /^\d{10,15}$/.test(v);
const version=v=>typeof v==="string" && /^v\d{2}\.\d{1,2}$/.test(v);
const result=(code,details={})=>({ok:false,code,...details});

export function createWhatsAppTextRequest({
  accessToken,phoneNumberId,apiVersion,to,body,certified=false,
  serverApproved=false
}={}) {
  if(certified!==true || serverApproved!==true) return result("not_authorized");
  if(typeof accessToken!=="string" || accessToken.length<24 ||
    !digits(phoneNumberId) || !version(apiVersion))
    return result("provider_not_configured");
  if(!digits(to) || typeof body!=="string" ||
     body.trim().length<1 || body.length>4096)
    return result("invalid_recipient_or_content");
  return {ok:true,
    url:"https://graph.facebook.com/"+apiVersion+"/"+phoneNumberId+"/messages",
    init:{
      method:"POST",
      headers:{"Authorization":"Bearer "+accessToken,
        "Content-Type":"application/json"},
      body:JSON.stringify({
        messaging_product:"whatsapp",recipient_type:"individual",
        to,type:"text",text:{preview_url:false,body}
      })
    }
  };
}

export async function sendOfficialWhatsAppText(config,{fetchImpl}={}) {
  const request=createWhatsAppTextRequest(config);
  if(!request.ok)return request;
  if(typeof fetchImpl!=="function")return result("no_transport");
  try{
    const response=await fetchImpl(request.url,{
      ...request.init,
      signal:AbortSignal.timeout(8000)
    });
    // Never log Graph's raw error payload: may contain recipient details.
    if(!response?.ok) {
      return result(response?.status===429||response?.status>=500
        ?"uncertain_or_retryable":"provider_rejected",
      {httpStatus:Number(response?.status||0)});
    }
    let payload;
    try{payload=await response.json()}catch{return result("unconfirmed_receipt")}
    const id=payload?.messages?.[0]?.id;
    if(typeof id!=="string" || !/^wamid\.[a-zA-Z0-9_.:=-]{10,300}$/.test(id))
      return result("unconfirmed_receipt");
    return {ok:true,code:"provider_accepted",providerMessageId:id};
  }catch{
    // Timeout may follow actual send. Never automatically retry on this result.
    return result("unknown_provider_outcome");
  }
}
