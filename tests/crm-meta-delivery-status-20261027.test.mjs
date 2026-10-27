import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {extractOfficialStatusEvents} from "../supabase/functions/crm-whatsapp-webhook/status-core.mjs";
const read=p=>fs.readFileSync(new URL("../"+p,import.meta.url),"utf8");
const mk=(list,opts={})=>({object:"whatsapp_business_account",entry:[{
 id:opts.waba??"ownerWaba123",changes:[{field:opts.field??"messages",value:{
   messaging_product:"whatsapp",metadata:{phone_number_id:opts.phone??"number123"},
   statuses:list
 }}]}]});
const mid="wamid.HBgNTE1OTEyMzQ1Njc4OQ==";
test("only valid signed-account-bound statuses map to ID and provider time",()=>{
 const statuses=[
 {id:mid,status:"sent",timestamp:"1793100000",recipient_id:"5591999999999"},
 {id:mid,status:"delivered",timestamp:"1793100002"},
 {id:mid,status:"read",timestamp:"1793100003"},
 {id:mid,status:"failed",timestamp:"1793100004"}
 ];
 const events=extractOfficialStatusEvents(mk(statuses),"number123","ownerWaba123");
 assert.equal(events.length,4);
 assert.deepEqual(events.map(x=>x.status),["sent","delivered","read","failed"]);
 assert.ok(events.every(x=>!Object.hasOwn(x,"recipient_id")));
 assert.ok(events.every(x=>Number.isFinite(Date.parse(x.occurred_at))));
});
test("unknown WABA, phone or event are never attributed",()=>{
 const d={id:mid,status:"delivered",timestamp:"1793100002"};
 assert.deepEqual(extractOfficialStatusEvents(mk([d],{waba:"other"}),"number123","ownerWaba123"),[]);
 assert.deepEqual(extractOfficialStatusEvents(mk([d],{phone:"wrong"}),"number123","ownerWaba123"),[]);
 assert.deepEqual(extractOfficialStatusEvents(mk([d],{field:"account_update"}),"number123","ownerWaba123"),[]);
});
test("reject invalid status IDs, timestamps and any unrecognized type",()=>{
 const events=extractOfficialStatusEvents(mk([
  {id:"notid",status:"delivered",timestamp:"1793100002"},
  {id:mid,status:"queued",timestamp:"1793100002"},
  {id:mid,status:"sent",timestamp:"oops"},
  {id:mid,status:"read",timestamp:"1793100003"}]),"number123","ownerWaba123");
 assert.equal(events.length,1);
 assert.equal(events[0].status,"read");
});
test("official signed webhook routes statuses to dedicated service-only RPC",()=>{
 const index=read("supabase/functions/crm-whatsapp-webhook/index.ts");
 assert.match(index,/validSignature\(raw,req\.headers\.get\("x-hub-signature-256"\),appSecret\)/);
 assert.match(index,/extractOfficialStatusEvents\(validatedPayload,phoneId,businessId\)/);
 assert.match(index,/crm_record_meta_delivery_status/);
 assert.match(index,/res\.ok/);
 assert.match(index,/temporary_storage_failure/);
 assert.match(index,/statusProcessed/);
 assert.doesNotMatch(index,/crm_follow_ups.*status.*sent|graph\.facebook\.com.*\/messages/);
});
test("receipt state machine recognizes only known provider wamid; never touches revenue",()=>{
 const sql=read("supabase/migrations/20261027195000_crm_meta_delivery_status.sql");
 assert.match(sql,/CREATE TABLE public\.crm_delivery_attempts/);
 assert.match(sql,/provider_message_id text UNIQUE/);
 assert.match(sql,/ON CONFLICT DO NOTHING/);
 assert.match(sql,/FOR UPDATE/);
 assert.match(sql,/unrecognized_message_id/);
 assert.match(sql,/v_new_rank>v_old_rank/);
 assert.match(sql,/v_old_state IN \('accepted','sent'\)/);
 assert.match(sql,/PERFORM public\.crm_require_staff\(\)/);
 assert.match(sql,/ALTER TABLE public\.crm_delivery_attempts ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/ALTER TABLE public\.crm_delivery_status_events ENABLE ROW LEVEL SECURITY/);
 assert.doesNotMatch(sql,/UPDATE public\.crm_follow_ups|UPDATE public\.orders|payment_status='paid'|automatic_sends_enabled\s*=\s*true/i);
});
