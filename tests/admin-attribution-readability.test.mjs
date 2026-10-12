import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../components/admin-orders-panel.tsx", import.meta.url), "utf8");
const start = source.indexOf("function visitParameter(");
const end = source.indexOf("function actionable(", start);
assert.ok(start >= 0 && end > start, "helpers da interface disponíveis");
const helpers = ts.transpileModule(source.slice(start, end), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { visitParameter, readableSource, visitOrigin, marketingHistory, interactionLabel } =
  new Function(`${helpers}; return { visitParameter, readableSource, visitOrigin, marketingHistory, interactionLabel };`)();

const instagramFromBio = {
  attribution_snapshot: {
    first_touch: { parameters: {} },
    current_visit: { parameters: { utm_source: ["ig"], utm_content: ["link_in_bio"] } },
    utm_campaign: "CAMPANHA HISTORICA",
    marketing_interactions: [{
      evidence: "url_parameters",
      observed_at: "2026-10-12T17:28:00Z",
      utm_source: "ig",
      utm_content: "link_in_bio",
    }],
  },
};

test("visita pela bio aparece como Instagram, nao como anuncio pago", () => {
  assert.equal(visitOrigin(visitParameter(instagramFromBio, "current_visit", "utm_source"), visitParameter(instagramFromBio, "current_visit", "utm_content")), "Instagram (link da bio)");
  assert.equal(visitParameter(instagramFromBio, "current_visit", "utm_campaign"), null);
  assert.equal(visitParameter(instagramFromBio, "first_touch", "utm_source"), null);
});

test("campanha antiga agregada nao vira campanha da visita atual", () => {
  assert.equal(visitParameter(instagramFromBio, "current_visit", "utm_campaign"), null);
  const withCurrentCampaign = { attribution_snapshot: {
    current_visit: { parameters: { utm_campaign: ["PIPOCA-OUTUBRO"] } },
  } };
  assert.equal(visitParameter(withCurrentCampaign, "current_visit", "utm_campaign"), "PIPOCA-OUTUBRO");
});

test("historico mostra visita observada, sem chamar link da bio de criativo", () => {
  const history = marketingHistory(instagramFromBio);
  assert.equal(history.length, 1);
  assert.equal(interactionLabel(history[0]), "Instagram (link da bio)");
});

test("visitas sem fonte nao sao inventadas", () => {
  assert.equal(readableSource(null), "Não identificada");
  assert.equal(visitOrigin(null, "link_in_bio"), "Link da bio");
  assert.equal(visitParameter({ attribution_snapshot: {} }, "current_visit", "utm_source"), null);
});

test("interface separa pedido, conversa e historico sem inferir pagamento", () => {
  assert.ok(source.includes("Rastreamento deste pedido"));
  assert.ok(source.includes("Origem associada à conversa"));
  assert.ok(source.includes("Campanha registrada no Tintim"));
  assert.ok(source.includes("Mais informações do Tintim"));
  assert.ok(source.includes("Histórico de visitas identificadas"));
  assert.ok(source.includes("pode representar uma interação anterior"));
  assert.ok(source.includes("O pagamento ainda precisa ser confirmado separadamente no painel."));
  assert.ok(!source.includes("Campanha atual não presumida"));
  assert.ok(!source.includes("Interações rastreáveis anteriores"));
  assert.ok(!source.includes("Criativo: {touch.utm_content}"));
});

test("detalhes repetidos de campanha e anuncio sao escondidos", () => {
  assert.ok(source.includes("order.tintim_tracking.adset_name !== order.tintim_tracking.campaign_name"));
  assert.ok(source.includes("order.tintim_tracking.ad_name !== order.tintim_tracking.campaign_name"));
  assert.ok(source.includes("order.tintim_tracking.ad_name !== order.tintim_tracking.adset_name"));
});

test("evidência de clique é mostrada sem inventar novo clique ou venda", () => {
  assert.ok(source.includes("order.tintim_tracking?.click_identifier_matches"));
  assert.ok(source.includes("O mesmo identificador de clique aparece no histórico do pedido e no Tintim."));
  assert.ok(source.includes("não necessariamente uma nova visita ao anúncio"));
  assert.ok(source.includes('order.payment_status === "paid"'));
  assert.ok(source.includes("O pagamento está registrado como confirmado no painel."));
  assert.ok(!source.includes("uma venda gerada pelo anúncio."));
});

test("a conversa é relacionada pelo número exato do pedido e permanece separada de pagamento", () => {
  assert.ok(source.includes('order.tintim_tracking.match_basis === "order_reference"'));
  assert.ok(source.includes("O número deste pedido foi identificado na mensagem da conversa."));
  assert.ok(source.includes("Origem desta visita ao site:"));
  assert.ok(source.includes("Campanha registrada no Tintim:"));
});
