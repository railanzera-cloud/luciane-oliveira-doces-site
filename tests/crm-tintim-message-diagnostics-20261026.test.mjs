import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {tintimMessageFieldFlags,extractTintimMessageSignal,extractOrderReferenceFromTintim} from "../supabase/functions/tintim-webhook/core.mjs";
const read=p=>fs.readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("diagnostico nao guarda valores sensiveis, somente presenca de campos",()=>{
 const base={event_type:"message_create",message:{from_me:false,created_at:new Date().toISOString(),text:"Texto privado A"},lead:{phone:"5591999991234"}};
 const first=tintimMessageFieldFlags(base);
 assert.match(first,/^[01]{16}$/);
 assert.equal(first,tintimMessageFieldFlags({...base,message:{...base.message,text:"Conteudo B"},lead:{phone:"5591991114321"}}));
 assert.doesNotMatch(first,/Texto|5591/);
});
test("campo event-type tambem e reconhecido pelo extrator sem perder pedidos",()=>{
 const p={"event-type":"message.create",message:{from_me:false,created_at:new Date().toISOString(),text:"Oi"},lead:{phone:"5591999991234"}};
 const s=extractTintimMessageSignal(p);
 assert.equal(s.ignored,false);
 assert.equal(s.direction,"inbound");
 assert.equal(extractOrderReferenceFromTintim(p).reason,"not_site_order_message");
});
test("diagnosticos exigem service role e formato seguro",()=>{
 const sql=read("supabase/migrations/20261027002000_crm_tintim_message_diagnostics.sql");
 const fn=read("supabase/functions/tintim-webhook/index.ts");
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/crm_provider_only/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.crm_record_tintim_message_diagnostic[\s\S]*TO service_role/);
 assert.match(sql,/field_flags ~ '\^\[01\]\{16\}\$'/);
 assert.match(fn,/crm_record_tintim_message_diagnostic/);
 assert.match(fn,/tintimMessageFieldFlags\(payload\)/);
 assert.match(fn,/A telemetria nunca deve interromper o webhook/);
 assert.match(fn,/record_tintim_order_reference/);
 assert.match(fn,/crm_record_tintim_message/);
 assert.match(fn,/EXPECTED_TOKEN_SHA256/);
 assert.doesNotMatch(sql,/message_body|message_text|customer_phone|message_id/);
});
