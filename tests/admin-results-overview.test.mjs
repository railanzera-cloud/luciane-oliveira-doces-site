import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../lib/admin-results-model.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { parseResultsOverview, resultsMoney, evidenceDescription, channelDescription } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);
const sample = () => ({
  period_days: 30,
  generated_at: "2026-10-12T20:00:00Z",
  summary: {
    orders: 225, paid_orders: 100, paid_amount: 4154.44,
    pending_orders: 124, pending_amount: 4551.57,
    cancelled_orders: 18, paid_cancelled_orders: 0,
    near_campaign_orders: 3, historical_campaign_orders: 1,
    linked_without_campaign: 0, without_tintim_link: 221,
  },
  channels: [{channel:"whatsapp",orders:221,paid_orders:100,paid_amount:4154.44}],
  evidence: [{kind:"historical_conversation",orders:1,paid_orders:0,paid_amount:0}],
  visits: [{source:"Não identificada",orders:220,paid_orders:100}],
  campaigns: [{campaign_name:"Campanha A",campaign_id:"123",evidence_kind:"historical_conversation",
    orders:1,paid_orders:0,paid_amount:0,pending_orders:1}],
  daily: [{day:"2026-10-12",orders:4,paid_orders:0}],
});

test("relatório converte valores numéricos e mantém os campos de análise", () => {
  const payload = sample();
  payload.summary.paid_amount = "4154.44";
  const result = parseResultsOverview(payload);
  assert.equal(result.summary.paid_amount, 4154.44);
  assert.equal(result.summary.pending_orders, 124);
  assert.equal(result.campaigns[0].evidence_kind, "historical_conversation");
  assert.equal(result.period_days, 30);
});

test("recusa métricas ausentes em vez de inventar zeros", () => {
  const payload = sample();
  delete payload.summary.pending_orders;
  assert.throws(() => parseResultsOverview(payload), /validar os indicadores/);
});

test("recusa período arbitrário e formato de resposta inválido", () => {
  assert.throws(() => parseResultsOverview(null), /incompleto/);
  assert.throws(() => parseResultsOverview({...sample(), period_days:365}), /incompleto/);
  assert.throws(() => parseResultsOverview({...sample(), campaigns:null}), /validar/);
});

test("classificações não confundem campanha próxima e histórica", () => {
  assert.match(evidenceDescription("near_order"), /próxima ao pedido/);
  assert.match(evidenceDescription("historical_conversation"), /anterior na conversa/);
  assert.match(evidenceDescription("no_link"), /Sem conversa/);
  assert.match(channelDescription("whatsapp"), /WhatsApp/);
  assert.match(resultsMoney(20), /20,00/);
});

test("agregado não retorna identificadores ou conteúdo da conversa", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20261012230000_admin_results_overview.sql", import.meta.url), "utf8");
  assert.match(sql, /lod_require_authenticated_staff\(\)/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.admin_get_results_overview\(integer\)/);
  assert.match(sql, /FILTER\(WHERE valid_paid\)/);
  assert.match(sql, /JOIN public\.tintim_order_tracking_snapshots s ON s\.order_uuid=o\.id/);
  assert.ok(!/SELECT\s+o\.\*/i.test(sql));
  assert.ok(!/r\.message_text|r\.customer_phone/i.test(sql));
});

test("aba Resultados não altera botões de pedido nem eventos Meta", async () => {
  const admin = await readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8");
  const ui = await readFile(new URL("../components/admin-results-panel.tsx", import.meta.url), "utf8");
  assert.ok(admin.includes('<TabsTrigger value="results">'));
  assert.ok(admin.includes('<AdminResultsPanel client={supabase!} />'));
  assert.ok(admin.includes('<TabsTrigger value="orders">'));
  assert.ok(admin.includes('<TabsTrigger value="availability">'));
  assert.ok(ui.includes("loadAdminResults(client, days)"));
  assert.ok(ui.includes("O Tintim continua responsável pelos disparos Purchase"));
  assert.ok(ui.includes("podem incluir testes."));
  assert.ok(ui.includes("O período é definido pela data em que o pedido foi criado."));
  assert.ok(!ui.includes("confirmOfflinePayment("));
  assert.ok(!ui.includes("transitionAdminOrder("));
});
