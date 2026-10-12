import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../lib/admin-results-model.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const {
  parseResultsOverview, resultsMoney, evidenceDescription,
  trackingEvidenceDescription, trackingEvidenceExplanation, channelDescription,
} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const sample = () => ({
  period_days: 30,
  generated_at: "2026-10-12T20:00:00Z",
  data_scope: "orders_created_in_supabase_only",
  sales_coverage: "incomplete_tintim_confirmations_not_synced",
  summary: {
    orders: 225, paid_orders: 100, paid_amount: 4154.44,
    pending_orders: 124, pending_amount: 4551.57,
    cancelled_orders: 18, paid_cancelled_orders: 0,
    near_campaign_orders: 3, historical_campaign_orders: 1,
    linked_without_campaign: 0, without_tintim_link: 221,
    tintim_linked_orders: 4, orders_with_campaign_or_meta_signal: 113,
    unclassified_orders: 111, bio_orders: 64, bio_with_fbclid: 63,
    orders_with_fbclid: 110, with_tintim_campaign: 4,
    with_saved_utm_campaign: 28, with_meta_link_id: 81,
  },
  channels: [{channel:"whatsapp",orders:221,paid_orders:100,paid_amount:4154.44}],
  tracking_evidence: [
    {kind:"tintim_campaign",orders:4,marked_paid_on_site:0,bio_orders:2},
    {kind:"saved_utm_campaign",orders:28,marked_paid_on_site:12,bio_orders:14},
    {kind:"meta_link_identifier",orders:81,marked_paid_on_site:35,bio_orders:47},
    {kind:"bio_without_campaign_or_click_id",orders:1,marked_paid_on_site:0,bio_orders:1},
    {kind:"unclassified",orders:111,marked_paid_on_site:53,bio_orders:0},
  ],
  visits: [{source:"Origem da visita não identificada",orders:111,paid_orders:53}],
  campaigns: [{campaign_name:"Campanha A",campaign_id:"123",
    evidence_kind:"historical_conversation",orders:1,paid_orders:0,
    paid_amount:0,pending_orders:1}],
  utm_campaigns: [{campaign_name:"Campanha salva",orders:28,marked_paid_on_site:12}],
  daily: [{day:"2026-10-12",orders:4,paid_orders:0}],
});

test("relatório valida números, cobertura e categorias sem sobreposição", () => {
  const payload = sample();
  payload.summary.paid_amount = "4154.44";
  const result = parseResultsOverview(payload);
  assert.equal(result.summary.paid_amount, 4154.44);
  assert.equal(result.summary.orders_with_campaign_or_meta_signal, 113);
  assert.equal(result.summary.unclassified_orders, 111);
  assert.equal(result.summary.bio_with_fbclid, 63);
  assert.equal(result.tracking_evidence.length, 5);
  assert.equal(result.period_days, 30);
});

test("recusa métricas ausentes em vez de inventar zeros", () => {
  const payload = sample();
  delete payload.summary.pending_orders;
  assert.throws(() => parseResultsOverview(payload), /validar os indicadores/);
});

test("rejeita soma de classificação diferente do total ou duplicações", () => {
  const payload = sample();
  payload.tracking_evidence[1].orders = 29;
  assert.throws(() => parseResultsOverview(payload), /totais de rastreamento/);
});

test("recusa excesso de fbclid nas visitas pela bio", () => {
  const payload = sample();
  payload.summary.bio_with_fbclid = 70;
  assert.throws(() => parseResultsOverview(payload), /totais de rastreamento/);
});

test("recusa período arbitrário ou formato incompleto", () => {
  assert.throws(() => parseResultsOverview(null), /incompleto/);
  assert.throws(() => parseResultsOverview({...sample(), period_days:365}), /incompleto/);
  assert.throws(() => parseResultsOverview({...sample(), campaigns:null}), /validar/);
  assert.throws(() => parseResultsOverview({...sample(), sales_coverage:"complete"}), /validar/);
});

test("rótulos deixam claro que fbclid e não identificado não provam anúncio ou orgânico", () => {
  assert.match(trackingEvidenceDescription("meta_link_identifier"), /Meta/);
  assert.match(trackingEvidenceExplanation("meta_link_identifier"), /não comprova/);
  assert.match(trackingEvidenceExplanation("unclassified"), /não significa acesso orgânico/);
  assert.match(trackingEvidenceExplanation("saved_utm_campaign"), /visita anterior/);
  assert.match(evidenceDescription("near_order"), /próxima ao pedido/);
  assert.match(channelDescription("whatsapp"), /WhatsApp/);
  assert.match(resultsMoney(20), /20,00/);
});

test("RPC nova agrega todos os pedidos do período sem expor dados pessoais", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20261012233000_admin_results_evidence_v2.sql", import.meta.url), "utf8");
  assert.match(sql, /lod_require_authenticated_staff\(\)/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.admin_get_results_overview_v2\(integer\)/);
  assert.match(sql, /FROM public\.orders o/);
  assert.match(sql, /LEFT JOIN public\.tintim_order_tracking_snapshots s ON s\.order_uuid=o\.id/);
  assert.match(sql, /'tracking_evidence'/);
  assert.match(sql, /AS bio_with_fbclid/);
  assert.match(sql, /'incomplete_tintim_confirmations_not_synced'/);
  assert.ok(!/LIMIT\s+100\b/i.test(sql));
  assert.ok(!/SELECT\s+o\.\*/i.test(sql));
  assert.ok(!/r\.message_text|r\.customer_phone/i.test(sql));
});

test("interface mostra cobertura parcial sem criar venda ou disparar evento Meta", async () => {
  const admin = await readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8");
  const ui = await readFile(new URL("../components/admin-results-panel.tsx", import.meta.url), "utf8");
  const client = await readFile(new URL("../lib/admin-results-client.ts", import.meta.url), "utf8");
  assert.ok(admin.includes('<TabsTrigger value="results">'));
  assert.ok(admin.includes('<TabsTrigger value="orders">'));
  assert.ok(admin.includes('<TabsTrigger value="availability">'));
  assert.ok(ui.includes("loadAdminResults(client, days)"));
  assert.ok(client.includes('client.rpc("admin_get_results_overview_v2"'));
  assert.ok(ui.includes("Sinais de anúncios"));
  assert.ok(ui.includes("Registros do site"));
  assert.ok(ui.includes("Origem não identificada"));
  assert.ok(ui.includes("Não representa o faturamento total"));
  assert.ok(ui.includes("O Tintim continua responsável pelos disparos Purchase"));
  assert.ok(ui.includes("podem incluir testes."));
  assert.ok(ui.includes("O período é definido pela data em que o pedido foi criado."));
  assert.ok(!ui.includes("confirmOfflinePayment("));
  assert.ok(!ui.includes("transitionAdminOrder("));
});
