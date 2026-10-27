import test from "node:test";
import assert from "node:assert/strict";
import {createWhatsAppTextRequest,sendOfficialWhatsAppText}
 from "../supabase/functions/crm-delivery-dispatch/transport.mjs";
const config=()=>({
 accessToken:"TEST_ONLY_TOKEN_NOT_VALID_123456",phoneNumberId:"1234567890123",
 apiVersion:"v25.0",to:"5591999999999",body:"Oi, tudo bem?",
 certified:true,serverApproved:true
});
test("fail closed: no HTTP without BOTH independent approvals",async()=>{
 let calls=0;
 const fetchImpl=async()=>{calls++;throw Error("should not happen")};
 for(const input of [
  {...config(),certified:false},{...config(),serverApproved:false},
  {...config(),accessToken:""},{...config(),phoneNumberId:"invalid"},
  {...config(),apiVersion:"invalid"},{...config(),body:""},
  {...config(),to:"not a phone"}
 ]) {
   const r=await sendOfficialWhatsAppText(input,{fetchImpl});
   assert.equal(r.ok,false);
 }
 assert.equal(calls,0);
});
test("authorized transport composes exact Meta Cloud API payload",async()=>{
 let called;
 const r=await sendOfficialWhatsAppText(config(),{fetchImpl:async(url,init)=>{
   called={url,init};return {ok:true,json:async()=>({
     messages:[{id:"wamid.HBgNTE1OTEyMzQ1Njc4OQ=="}]
   })};
 }});
 assert.equal(r.ok,true);
 assert.equal(r.code,"provider_accepted");
 assert.equal(called.url,"https://graph.facebook.com/v25.0/1234567890123/messages");
 assert.equal(called.init.method,"POST");
 assert.equal(called.init.headers.Authorization,"Bearer TEST_ONLY_TOKEN_NOT_VALID_123456");
 const p=JSON.parse(called.init.body);
 assert.equal(p.messaging_product,"whatsapp");
 assert.equal(p.recipient_type,"individual");
 assert.equal(p.to,"5591999999999");
 assert.equal(p.text.body,"Oi, tudo bem?");
 assert.equal(p.text.preview_url,false);
});
test("provider accepted != delivered, opaque failures never expose PII",async()=>{
 const rejected=await sendOfficialWhatsAppText(config(),{fetchImpl:async()=>({ok:false,status:400})});
 assert.deepEqual(rejected,{ok:false,code:"provider_rejected",httpStatus:400});
 const unstable=await sendOfficialWhatsAppText(config(),{fetchImpl:async()=>({ok:false,status:503})});
 assert.deepEqual(unstable,{ok:false,code:"uncertain_or_retryable",httpStatus:503});
 const unknown=await sendOfficialWhatsAppText(config(),{fetchImpl:async()=>{throw Error("timeout with sensitive data")}});
 assert.deepEqual(unknown,{ok:false,code:"unknown_provider_outcome"});
 const noId=await sendOfficialWhatsAppText(config(),{fetchImpl:async()=>({ok:true,json:async()=>({messages:[]})})});
 assert.equal(noId.code,"unconfirmed_receipt");
});
