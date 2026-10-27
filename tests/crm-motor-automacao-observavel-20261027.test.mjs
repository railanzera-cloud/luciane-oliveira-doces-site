import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const get=p=>fs.readFileSync(new URL("../"+p,import.meta.url),"utf8");
const sql=get("supabase/migrations/20261027007000_crm_automation_observer.sql");
const ui=get("components/admin-crm-panel.tsx");
const css=get("components/admin-crm-panel.css");

test("motor persistente usa id unico por followup e motivo sem dados pessoais",()=>{
 assert.match(sql,/CREATE TABLE public\.crm_automation_queue/);
 assert.match(sql,/follow_up_id uuid PRIMARY KEY REFERENCES public\.crm_follow_ups/);
 assert.match(sql,/ON CONFLICT\(follow_up_id\) DO UPDATE/);
 assert.match(sql,/queue_state text NOT NULL CHECK/);
 assert.match(sql,/blockers text\[\] NOT NULL/);
 assert.match(sql,/CREATE TABLE public\.crm_automation_monitor/);
 assert.doesNotMatch(sql,/\bmessage_body\b|\bchat_text\b|\bphone_number_id\b/);
});
test("o monitor nao envia, nao altera followups, faturamento ou consentimento",()=>{
 assert.match(sql,/No WhatsApp sending/);
 assert.match(sql,/dispatched',0/);
 assert.match(sql,/mode','observe_only'/);
 assert.doesNotMatch(sql,/\b(?:INSERT INTO|UPDATE|DELETE FROM) public\.(?:orders|crm_follow_ups|crm_customers|crm_conversations)\b/i);
 assert.doesNotMatch(sql,/https?:\/\/|net\.http_post|graph\.facebook\.com/);
});
test("motor evita reentrancia e trata idempotentemente followups encerrados",()=>{
 assert.match(sql,/pg_try_advisory_xact_lock/);
 assert.match(sql,/follow_up_status<>'pending'/);
 assert.match(sql,/v_state:='finished'/);
 assert.match(sql,/r\.due_at>now\(\)/);
 assert.match(sql,/v_state:='scheduled'/);
 assert.match(sql,/WHERE f\.status='pending'/);
});
test("liberacao bloqueada por janela, optout, comprovacao de horario, compra e canal",()=>{
 for(const flag of ["consent_unverified","customer_opted_out","provider_timestamp_unverified",
  "outside_verified_window","possible_purchase","business_reply_unverified",
  "sender_disabled","provider_not_certified"]){
   assert.ok(sql.includes("'"+flag+"'"),flag);
   assert.ok(ui.includes(flag),flag);
 }
 assert.match(sql,/time_basis='provider_timestamp'/);
 assert.match(sql,/crm_whatsapp_message_events/);
 assert.match(sql,/provider_not_certified/);
 assert.match(sql,/cardinality\(v_blockers\)=0/);
});
test("somente equipe le resumo, service_role/postgres executam o observador",()=>{
 for(const table of ["crm_automation_monitor","crm_automation_queue"]) {
   assert.ok(sql.includes("ALTER TABLE public."+table+" ENABLE ROW LEVEL SECURITY"));
   assert.ok(sql.includes("REVOKE ALL ON public."+table+" FROM PUBLIC,anon,authenticated"));
 }
 assert.match(sql,/crm_require_staff\(\)/);
 assert.match(sql,/session_user <> 'postgres' AND auth\.role\(\) IS DISTINCT FROM 'service_role'/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.crm_automation_evaluate_pending\(\)/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.crm_automation_evaluate_pending\(\)\s+TO service_role/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.crm_automation_operational_report\(\)\s+TO authenticated/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.crm_automation_queue_items\(\)\s+TO authenticated/);
});
test("dashboard diferencia escaneado de envio real e degrada graciosamente",()=>{
 assert.match(ui,/crm_automation_operational_report/);
 assert.match(ui,/crm_automation_queue_items/);
 assert.match(ui,/setAutomation\(reportResult\.error \? null/);
 assert.match(ui,/setAutomationQueue\(queueResult\.error \? \{\}/);
 assert.match(ui,/Nenhuma mensagem é enviada automaticamente/);
 assert.match(ui,/Envio desligado/);
 assert.match(ui,/Monitor de automação ainda indisponível/);
 assert.match(ui,/<summary>Motivos do bloqueio/);
 assert.match(ui,/audit\.blockers\.map/);
 assert.match(css,/\.crm-engine-panel/);
 assert.match(css,/\.crm-audit-reasons/);
});
