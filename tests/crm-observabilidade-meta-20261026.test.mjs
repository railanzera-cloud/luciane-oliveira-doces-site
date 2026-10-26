import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { extractOfficialMessageEvents } from "../supabase/functions/crm-whatsapp-webhook/core.mjs";
const read = path => fs.readFileSync(new URL("../"+path,import.meta.url),"utf8");
const msgid="wamid.ABCDE12345678";
test("Meta inbound: identifica por numero e nao preserva texto privado",()=>{
 const payload={object:"whatsapp_business_account",entry:[{id:"waba-test",changes:[{
  field:"messages",value:{metadata:{phone_number_id:"phone-test"},messages:[{
   from:"5591999999999",id:msgid,timestamp:"1793032000",type:"text",text:{body:"Tem Chocolatudo?"}
  }]}
 }]}]};
 const events=extractOfficialMessageEvents(payload,"phone-test");
 assert.equal(events.length,1);
 assert.equal(events[0].direction,"inbound");
 assert.equal(events[0].phone,"5591999999999");
 assert.equal(events[0].message_id,msgid);
 assert.doesNotMatch(JSON.stringify(events),/Chocolatudo/);
 assert.equal(extractOfficialMessageEvents(payload,"invalid-phone").length,0);
});
test("Coexistence echo: mensagem de aplicativo vira outbound sem corpo",()=>{
 const payload={object:"whatsapp_business_account",entry:[{id:"waba-test",changes:[{
  field:"smb_message_echoes",value:{metadata:{phone_number_id:"phone-test"},message_echoes:[{
   from:"5591998765432",to:"5591999999999",id:"wamid.ABCDE87654321",
   timestamp:"1793032300",type:"text",text:{body:"Oi querida!"}
  }]}
 }]}]};
 const events=extractOfficialMessageEvents(payload,"phone-test");
 assert.equal(events.length,1);
 assert.equal(events[0].direction,"app_echo");
 assert.equal(events[0].phone,"5591999999999");
 assert.doesNotMatch(JSON.stringify(events),/Oi querida/);
});
test("Observabilidade independente de checkout, pagamentos e envios",()=>{
 const sql=read("supabase/migrations/20261026213000_crm_observabilidade_meta_preparo.sql");
 const handler=read("supabase/functions/crm-whatsapp-webhook/index.ts");
 const panel=read("components/admin-crm-panel.tsx");
 assert.match(sql,/crm_record_meta_message/);
 assert.match(sql,/customer_replied/);
 assert.match(sql,/commercial_opt_out/);
 assert.match(sql,/crm_cancel_customer_followups_on_conversion/);
 assert.match(sql,/automatic_sends_enabled boolean NOT NULL DEFAULT false/);
 assert.doesNotMatch(sql,/INSERT INTO public\.orders\b|UPDATE public\.orders\b|INSERT INTO public\.payment/i);
 assert.match(handler,/x-hub-signature-256/);
 assert.match(handler,/META_APP_SECRET/);
 assert.match(handler,/META_WHATSAPP_BUSINESS_ID/);
 assert.doesNotMatch(handler,/graph\.facebook\.com\/v\d+.*\/messages/);
 assert.match(panel,/crm_sync_recent_tintim/);
 assert.match(panel,/document\.visibilityState/);
});
