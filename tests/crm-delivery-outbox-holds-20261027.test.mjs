import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read=p=>fs.readFileSync(new URL("../"+p,import.meta.url),"utf8");
const sql=read("supabase/migrations/20261027193000_crm_delivery_outbox_holds.sql");
const cron=read("supabase/migrations/20261027194000_crm_delivery_holds_cron.sql");
test("one hold per followup, no dispatchable state or PII",()=>{
 assert.match(sql,/follow_up_id uuid PRIMARY KEY REFERENCES public\.crm_follow_ups/);
 assert.match(sql,/CHECK \(state IN \('held','canceled'\)\)/);
 assert.match(sql,/ON CONFLICT \(follow_up_id\) DO UPDATE/);
 assert.match(sql,/blocker_codes text\[\]/);
 assert.doesNotMatch(sql,/recipient_phone|message_text|bearer_token|api_key|access_token|wamid/);
});
test("hold staging cannot send/modify followups or consent",()=>{
 assert.match(sql,/provider_not_certified/);
 assert.match(sql,/ALTER TABLE public\.crm_delivery_outbox ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/REVOKE ALL ON public\.crm_delivery_outbox FROM PUBLIC,anon,authenticated/);
 assert.match(sql,/crm_internal_only/);
 assert.match(sql,/auth\.role\(\) IS NOT NULL/);
 assert.doesNotMatch(sql,/\bUPDATE public\.crm_follow_ups|\bUPDATE public\.crm_customers|\bINSERT INTO public\.orders/);
 assert.doesNotMatch(sql,/\bnet\.http_post|graph\.facebook\.com|fetch\(/);
});
test("staff-only readiness, cron only stages holds after observer",()=>{
 assert.match(sql,/PERFORM public\.crm_require_staff\(\)/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.crm_delivery_readiness\(\) TO authenticated/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.crm_delivery_prepare_holds\(\) TO service_role/);
 assert.match(cron,/lod-crm-delivery-holds-5min/);
 assert.match(cron,/2-59\/5 \* \* \* \*/);
 assert.match(cron,/select public\.crm_delivery_prepare_holds\(\)/);
 assert.doesNotMatch(cron,/net\.http_post|graph\.facebook\.com|crm_followup_send_preflight|crm_whatsapp_dispatch/i);
});
