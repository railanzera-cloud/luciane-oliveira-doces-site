import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const read = path => fs.readFileSync(new URL("../" + path, import.meta.url), "utf8");
const source = read("lib/crm-follow-up.ts");
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exports = {};
vm.runInNewContext(js, { exports });
const { crmSuggestedMessage, crmWhatsAppLink } = exports;

test("mensagem respeita interesse e nunca afirma estoque", () => {
  const msg = crmSuggestedMessage("  Chocolate com Morango ");
  assert.match(msg, /Chocolate com Morango/);
  assert.match(msg, /te confirmo a disponibilidade/);
  assert.doesNotMatch(msg, /temos estoque|últimas unidades|garantido/);
  assert.match(crmSuggestedMessage(null), /opções disponíveis/);
});

test("link e164 valida telefone, codifica e nao envia", () => {
  const link = crmWhatsAppLink("5591999999999", "Prestígio & Maracujá");
  const parsed = new URL(link);
  assert.equal(parsed.host, "wa.me");
  assert.equal(parsed.pathname, "/5591999999999");
  assert.match(parsed.searchParams.get("text"), /Prestígio & Maracujá/);
  assert.throws(() => crmWhatsAppLink("11999999999", null));
});

test("CRM isolado, protegido, com bloqueio financeiro e idempotencia de lembretes", () => {
  const sql = read("supabase/migrations/20261026203000_crm_followups_assistidos.sql");
  for (const table of ["crm_staff_access","crm_customers","crm_conversations","crm_follow_ups","crm_events"]) {
    assert.match(sql, new RegExp("ALTER TABLE public\\."+table+" ENABLE ROW LEVEL SECURITY"));
  }
  assert.match(sql, /CREATE UNIQUE INDEX crm_one_pending_follow_up_per_conversation/);
  assert.match(sql, /crm_require_staff/);
  assert.match(sql, /crm_access_denied/);
  assert.match(sql, /commercial_opt_out/);
  assert.match(sql, /crm_consent_evidence_required/);
  assert.match(sql, /customer_replied/);
  assert.match(sql, /manual_conversion/);
  assert.doesNotMatch(sql, /UPDATE public\.orders\b|INSERT INTO public\.orders\b|meta_purchase_status\s*=/i);
  assert.doesNotMatch(sql, /CREATE\s+(?:OR REPLACE\s+)?TRIGGER\s+.*orders/i);
});

test("Admin adiciona Clientes sem substituir funcionalidades existentes", () => {
  const admin = read("app/admin/page.tsx");
  assert.match(admin, /value="orders"/);
  assert.match(admin, /value="availability"/);
  assert.match(admin, /value="results"/);
  assert.match(admin, /value="crm"/);
  assert.match(admin, /AdminCrmPanel client=/);
  const ui=read("components/admin-crm-panel.tsx");
  assert.match(ui, /crm_list_tintim_candidates/);
  assert.match(ui, /crm_record_action/);
  assert.match(ui, /crm_open_opportunity/);
  assert.match(ui, /sent_manually/);
  assert.doesNotMatch(ui, /fetch\(["']https:\/\/graph\.facebook\.com/);
});


test("quatro abas preservam largura e acessibilidade no mobile", () => {
  const css=read("app/globals.css");
  const block=css.slice(css.lastIndexOf("/* CRM — quatro abas administrativas"));
  assert.match(block, /grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(block, /max-width:\s*600px/);
  assert.match(block, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
});
