import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const sql=fs.readFileSync(new URL("../supabase/migrations/20261027004000_crm_followup_send_preflight.sql",import.meta.url),"utf8");

test("preflight restrito a staff e service_role, sem alteracao comercial",()=>{
 assert.match(sql,/crm_require_staff\(\)/);
 assert.match(sql,/auth\.role\(\) IS DISTINCT FROM 'service_role'/);
 assert.match(sql,/SECURITY DEFINER SET search_path=public,pg_temp/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.crm_followup_send_preflight\(uuid\)[\s\S]*TO authenticated,service_role/);
 assert.doesNotMatch(sql,/\b(?:INSERT|UPDATE|DELETE)\s+(?:INTO\s+|FROM\s+)?public\./i);
 assert.doesNotMatch(sql,/\b(?:http|fetch)\b|POST\s+.*messages/i);
});
test("safety gate requires explicit consent and customer protection",()=>{
 for (const s of [
  "consent_not_verified","commercial_opt_out","not_pending","not_due",
  "not_waiting_customer","not_waiting_after_business_reply",
  "outside_verified_service_window","inbound_timestamp_unverified",
  "purchase_signal_review","sender_disabled",
 ])assert.ok(sql.includes(s),s);
 assert.match(sql,/v_u\.consent_at IS NULL/);
 assert.match(sql,/v_u\.consent_evidence/);
 assert.match(sql,/v_u\.commercial_opt_out/);
});
test("webhook receipt time alone never establishes Meta send window",()=>{
 assert.match(sql,/e\.time_basis='provider_timestamp'/);
 assert.match(sql,/public\.crm_whatsapp_message_events/);
 assert.match(sql,/interval '23 hours'/);
 assert.match(sql,/last_inbound_at/);
 assert.match(sql,/note','read_only_preflight_not_delivery_authorization'/);
});
test("delivery never assumes stage change means verified payment",()=>{
 assert.match(sql,/stage_label/);
 assert.match(sql,/public\.tintim_order_links/);
 assert.match(sql,/public\.orders o/);
 assert.match(sql,/purchase_signal_review/);
 assert.doesNotMatch(sql,/UPDATE.*payment_status|paid_at\s*=/i);
});
