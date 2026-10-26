import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {extractTintimMessageSignal,extractOrderReferenceFromTintim} from "../supabase/functions/tintim-webhook/core.mjs";
const read=p=>fs.readFileSync(new URL("../"+p,import.meta.url),"utf8");
const iso=()=>new Date().toISOString();
test("formato real Tintim: mensagem string/from_me no topo e lead.phone sem timestamp",()=>{
 const payload={event_type:"message_create",from_me:false,lead:{phone:"(91) 99997-7833"},
   message:"Tenho interesse em fatia de chocolate"};
 const x=extractTintimMessageSignal(payload,iso());
 assert.equal(x.ignored,false);
 assert.equal(x.time_basis,"webhook_received");
 assert.equal(x.direction,"inbound");
 assert.equal(x.phone,"91999977833");
 assert.equal(x.occurred_at.length,24);
 assert.doesNotMatch(JSON.stringify(x),/chocolate|fatia|interesse/i);
 const outbound=extractTintimMessageSignal({...payload,from_me:true});
 assert.equal(outbound.direction,"business_outbound");
 assert.equal(outbound.time_basis,"webhook_received");
});
test("sem timestamp so habilitar formato observado: demais envelopes ignorados",()=>{
 const p={event_type:"message_create",from_me:false,lead:{phone:"5591999977833"},message:{text:"Oi"}};
 assert.equal(extractTintimMessageSignal(p).reason,"timestamp_missing");
 assert.equal(extractTintimMessageSignal({...p,message:"Oi",from_me:undefined}).reason,"direction_missing");
 assert.equal(extractTintimMessageSignal({...p,message:"Oi",lead:{phone:"123"}}).reason,"phone_missing");
 assert.equal(extractTintimMessageSignal({...p,message:"Oi"}, "2020-01-01T00:00:00Z").reason,"timestamp_missing");
});
test("quando existir horario do provedor, manter prioridade e origem confiavel",()=>{
 const p={event_type:"message_create",from_me:false,lead:{phone:"5591999977833"},
  message:"Olá",created_at:iso()};
 const x=extractTintimMessageSignal(p);
 assert.equal(x.ignored,false);
 assert.equal(x.time_basis,"provider_timestamp");
});
test("mensagem padrao de pedido continua reconciliavel com webhook sem horario",()=>{
 const msg="Olá! Finalizei meu pedido pelo site da Luciane Oliveira Doces.\n\n*PEDIDO #123*\n";
 const p={event_type:"message_create",from_me:false,lead:{phone:"5591999977833"},message:msg};
 assert.equal(extractOrderReferenceFromTintim(p).order_number,123);
 assert.equal(extractTintimMessageSignal(p).time_basis,"webhook_received");
 const index=read("supabase/functions/tintim-webhook/index.ts");
 assert.match(index,/record_tintim_order_reference/);
 assert.match(index,/crm_record_tintim_message_v2/);
 assert.match(index,/p_time_basis:signal\.time_basis/);
 assert.match(index,/EXPECTED_TOKEN_SHA256/);
});
test("sem horario o DB exige modo de observacao + ativacao separada antes de agendar",()=>{
 const sql=read("supabase/migrations/20261027003000_crm_tintim_receipt_time.sql");
 assert.match(sql,/allow_received_time_followups boolean NOT NULL DEFAULT false/);
 assert.match(sql,/received_time_enabled_at/);
 assert.match(sql,/apply_to_followups,allow_received_time_followups/);
 assert.match(sql,/interval '5 minutes'/);
 assert.match(sql,/observe_only_received_time/);
 assert.match(sql,/crm_provider_only/);
 assert.match(sql,/ENABLE ROW LEVEL SECURITY|ALTER TABLE public\.crm_tintim_message_events/);
 assert.doesNotMatch(sql,/UPDATE public\.orders|INSERT INTO public\.orders|automatic_sends_enabled\s*=\s*true|message_body|message_text/i);
});
