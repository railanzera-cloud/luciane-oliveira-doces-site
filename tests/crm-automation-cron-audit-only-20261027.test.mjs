import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const sql=fs.readFileSync(new URL("../supabase/migrations/20261027008000_crm_automation_cron_audit_only.sql",import.meta.url),"utf8");
test("scheduler recorrente é apenas observador e mantém idempotência por nome",()=>{
 assert.match(sql,/CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog/);
 assert.match(sql,/cron.schedule\(/);
 assert.match(sql,/lod-crm-audit-only-5min/);
 assert.match(sql,/\*\/5 \* \* \* \*/);
 assert.match(sql,/select public\.crm_automation_evaluate_pending\(\)/);
 assert.doesNotMatch(sql,/net\.http_post|graph\.facebook\.com|send_whatsapp|UPDATE public\.crm_follow_ups|UPDATE public\.orders/);
});
