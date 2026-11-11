import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

const copySource = readFileSync(new URL("../lib/whatsapp-finalization.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(copySource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
const exports = {};
new Function("exports", outputText)(exports);
const { getWhatsAppFinalizationCopy, readStoredWhatsAppHandoff } = exports;

const successPage = readFileSync(new URL("../components/whatsapp-order-result.tsx", import.meta.url), "utf8");
const trackingPage = readFileSync(new URL("../app/pedido/page.tsx", import.meta.url), "utf8");

test("mensagem final distingue Pix, crédito, débito e dinheiro", () => {
  const scenarios = [
    ["manual_pix", null, "Pix", /chave Pix e o valor/],
    ["card_on_delivery", "credit_single", "Crédito à vista", /cartão de crédito, no recebimento/],
    ["card_on_delivery", "debit", "Débito", /cartão de débito, no recebimento/],
    ["cash", null, "Dinheiro", /dinheiro, no recebimento/],
  ];
  for (const [method, card, label, note] of scenarios) {
    const result = getWhatsAppFinalizationCopy(method, card);
    assert.equal(result.label, label);
    assert.match(result.instruction, note);
    assert.match(result.instruction, /toque em Enviar/);
  }
  assert.doesNotMatch(getWhatsAppFinalizationCopy("cash", null).instruction, /Pix/);
});

test("reabre somente a mensagem original do mesmo pedido e por link Tintim válido", () => {
  const token = "a".repeat(48), order_number = 1570;
  const stored = { whatsappResult: { result: { order: { tracking_token: token, order_number } },
    whatsappUrl: "https://tintim.link/whatsapp/abc/def?text=Pedido%20%231570&tt_source=meta" } };
  const previous = globalThis.window;
  try {
    globalThis.window = { sessionStorage: { getItem: () => JSON.stringify(stored) } };
    assert.equal(readStoredWhatsAppHandoff(token, order_number), stored.whatsappResult.whatsappUrl);
    assert.equal(readStoredWhatsAppHandoff(token, 1571), null);
    assert.equal(readStoredWhatsAppHandoff("b".repeat(48), order_number), null);
    stored.whatsappResult.whatsappUrl = "javascript:alert(1)";
    assert.equal(readStoredWhatsAppHandoff(token, order_number), null);
    stored.whatsappResult.whatsappUrl = "https://tintim.link.evil.example/whatsapp/abc?text=x";
    assert.equal(readStoredWhatsAppHandoff(token, order_number), null);
  } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
});

test("finalização não gera outro pedido nem promete envio ou pagamento automático", () => {
  assert.match(successPage, /getWhatsAppFinalizationCopy\(order.result.payment.method, order.result.order.card_mode\)/);
  assert.match(successPage, /Abrir WhatsApp para enviar pedido/);
  assert.match(successPage, /Falta UMA ETAPA|FALTA UMA ETAPA/);
  assert.match(successPage, /Somente registrar a solicitação no site não conclui o atendimento/);
  assert.match(successPage, /<summary>Precisa de ajuda\?<\/summary>/);
  assert.match(successPage, /Consultar informações da solicitação/);
  assert.doesNotMatch(successPage, /whatsapp-final-intro|whatsapp-final-status-hint|whatsapp-final-eyebrow/);
  assert.equal((successPage.match(/<a /g) || []).length, 2);
  assert.match(successPage, /href=\{order.whatsappUrl\}/);
  assert.match(successPage, /\{payment.instruction\}/);
  assert.doesNotMatch(successPage, /createWhatsAppOrder|paid_at|trackMetaEvent/);
});

test("refinamento mantém hierarquia enxuta e consulta secundária", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.whatsapp-final-card h1 \{/);
  assert.match(css, /\.whatsapp-final-card \.whatsapp-final-summary/);
  assert.match(css, /\.whatsapp-final-next-step \{/);
  assert.match(css, /\.whatsapp-final-help \{/);
  assert.match(css, /@media \(max-width: 360px\)/);
  assert.match(successPage, /<h1 id="whatsapp-final-title">Envie seu pedido pelo WhatsApp<\/h1>/);
  assert.doesNotMatch(successPage, /Pedido #\{order\.result\.order\.order_number\} registrado!/);
  assert.doesNotMatch(successPage, /Se entrar nos detalhes/);
});

test("acompanhamento recupera a sessão ou oferece assistência e preserva a opção de voltar", () => {
  assert.match(trackingPage, /readStoredWhatsAppHandoff\(token, order.order_number\)/);
  assert.match(trackingPage, /Falar com a loja para concluir/);
  assert.match(trackingPage, /Voltar à finalização/);
  assert.match(trackingPage, /Fazer outro pedido/);
  assert.match(trackingPage, /needsHandoff && order.order_status === "confirmed"/);
  assert.match(trackingPage, /Registrado no sistema/);
  assert.doesNotMatch(trackingPage, /"Recebido pela loja"/);
  assert.doesNotMatch(trackingPage, /createWhatsAppOrder\(/);
});
