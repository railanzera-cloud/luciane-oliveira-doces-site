import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { extractTintimMessageSignal,extractOrderReferenceFromTintim,normalizeTintimPayload } from "../supabase/functions/tintim-webhook/core.mjs";
const read=p=>fs.readFileSync(new URL("../"+p,import.meta.url),"utf8");
const known="2c956a42-229f-4d21-ade6-4442f8c048ed";
const current=()=>new Date(Date.now()-60*1000).toISOString();
test("Tintim message_create inbound: extração só de metadados",()=>{
 const text="Oi, quero comprar a fatia de morango";
 const payload={event_type:"message_create",account:{code:known},lead:{phone:"(91) 99998-7766"},message:{from_me:false,created_at:current(),text}};
 const data=extractTintimMessageSignal(payload);
 assert.equal(data.ignored,false);
 assert.equal(data.direction,"inbound");
 assert.equal(data.phone,"91999987766");
 assert.equal(data.account_key,known);
 assert.doesNotMatch(JSON.stringify(data),/morango|fatia|comprar/i);
});
test("Tintim outgoing reconhecido só com direcao explícita, numero e horário",()=>{
 const payload={event_type:"message_create",lead:{phone:"5591999987766"},message:{fromMe:true,timestamp:Math.floor(Date.now()/1000)-45}};
 const data=extractTintimMessageSignal(payload);
 assert.equal(data.ignored,false);
 assert.equal(data.direction,"business_outbound");
 assert.ok(data.occurred_at);
 assert.equal(data.account_key,known);
});
test("Mensagens incompletas, ambíguas ou antigas jamais entram na fila",()=>{
 const payload={event_type:"message_create",lead:{phone:"5591999987766"},message:{timestamp:current()}};
 assert.equal(extractTintimMessageSignal(payload).reason,"direction_missing");
 assert.equal(extractTintimMessageSignal({...payload,message:{from_me:false}}).reason,"timestamp_missing");
 assert.equal(extractTintimMessageSignal({...payload,message:{from_me:true,timestamp:"2020-01-01T00:00:00Z"}}).reason,"timestamp_outside_window");
 assert.equal(extractTintimMessageSignal({...payload,message:{from_me:true,timestamp:current()},lead:{phone:"123"}}).reason,"phone_missing");
});
test("Reconciliação antiga do pedido segue independente da observação nova",()=>{
 const message="Olá! Finalizei meu pedido pelo site da Luciane Oliveira Doces.\n\n*PEDIDO #123*\n";
 const payload={event_type:"message_create",message:{from_me:false,text:message,created_at:current()},lead:{phone:"5591999987766"}};
 assert.equal(extractOrderReferenceFromTintim(payload).order_number,123);
 assert.equal(extractTintimMessageSignal(payload).direction,"inbound");
 assert.equal(normalizeTintimPayload(payload).reason,"message_disabled");
 const handler=read("supabase/functions/tintim-webhook/index.ts");
 assert.match(handler,/record_tintim_order_reference/);
 assert.match(handler,/crm_record_tintim_message/);
 assert.match(handler,/EXPECTED_TOKEN_SHA256/);
 assert.match(handler,/x-hub-signature-256|provided\.length<43/);
 assert.doesNotMatch(handler,/graph\.facebook\.com\/v\d+.*\/messages/);
});
test("Migração privada: snapshot sem texto, envio desativado e privilégio restrito",()=>{
 const sql=read("supabase/migrations/20261027001000_crm_tintim_message_observe.sql");
 assert.match(sql,/apply_to_followups boolean NOT NULL DEFAULT false/);
 assert.match(sql,/CREATE TABLE public\.crm_tintim_message_events/);
 assert.match(sql,/ALTER TABLE public\.crm_tintim_message_events ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.crm_record_tintim_message[\s\S]*TO service_role/);
 assert.match(sql,/crm_provider_only/);
 assert.match(sql,/tintim_customer_replied/);
 assert.match(sql,/crm_tintim_message_diagnostics/);
 assert.doesNotMatch(sql,/INSERT INTO public\.orders|UPDATE public\.orders|automatic_sends_enabled=true|message_body|text_body/i);
});
