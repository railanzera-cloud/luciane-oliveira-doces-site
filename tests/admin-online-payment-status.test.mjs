import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const helper = path.join(root, "lib/admin-online-payment-status.ts");
const compiled = ts.transpileModule(readFileSync(helper, "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  reportDiagnostics: true,
});
const errors = (compiled.diagnostics || []).filter(x => x.category === ts.DiagnosticCategory.Error);
assert.equal(errors.length, 0, errors.map(x => ts.flattenDiagnosticMessageText(x.messageText, "\n")).join("\n"));
const testModule = { exports: {} };
vm.runInNewContext(compiled.outputText, { module: testModule, exports: testModule.exports }, { filename: helper });
const { onlinePaymentLabel, pendingOnlineOrderLabel } = testModule.exports;

test("new online card and Pix payments still display as pending", () => {
  assert.equal(onlinePaymentLabel("mercado_pago_card", "pending", null), "Cartão online pendente");
  assert.equal(onlinePaymentLabel("mercado_pago_pix", "pending", null), "Pix online pendente");
  assert.equal(pendingOnlineOrderLabel("pending", null), null);
});

test("accredited card and Pix remain explicitly paid", () => {
  assert.equal(onlinePaymentLabel("mercado_pago_card", "paid", null), "Pago — Cartão online");
  assert.equal(onlinePaymentLabel("mercado_pago_pix", "paid", null), "Pago — Pix");
  assert.equal(pendingOnlineOrderLabel("paid", null), null);
});

test("reconciled canceled/expired card #1127 displays as expired, not pending or paid", () => {
  assert.equal(onlinePaymentLabel("mercado_pago_card", "cancelled", "expired"), "Cartão online expirado");
  assert.equal(pendingOnlineOrderLabel("cancelled", "expired"), "Pagamento expirado");
});

test("expired Pix follows the same financial presentation", () => {
  assert.equal(onlinePaymentLabel("mercado_pago_pix", "cancelled", "expired"), "Pix online expirado");
});

test("nonexpired cancel remains cancel, not expiration", () => {
  assert.equal(onlinePaymentLabel("mercado_pago_card", "cancelled", "canceled"), "Cartão online cancelado");
  assert.equal(pendingOnlineOrderLabel("cancelled", "canceled"), "Pagamento cancelado");
  assert.equal(onlinePaymentLabel("mercado_pago_pix", "cancelled", null), "Pix online cancelado");
});

test("failed payment is not labeled as pending", () => {
  assert.equal(onlinePaymentLabel("mercado_pago_card", "failed", null), "Cartão online recusado");
  assert.equal(pendingOnlineOrderLabel("failed", null), "Pagamento recusado");
});

test("refunded payment is not labeled paid or pending", () => {
  assert.equal(onlinePaymentLabel("mercado_pago_pix", "refunded", null), "Pix online reembolsado");
  assert.equal(pendingOnlineOrderLabel("refunded", null), "Pagamento reembolsado");
});

test("online payment status takes priority over optional card_mode", () => {
  const panel = readFileSync(path.join(root, "components/admin-orders-panel.tsx"), "utf8");
  const block = panel.slice(panel.indexOf("function paymentLabel("), panel.indexOf("function attributionSource("));
  assert.ok(block.indexOf('order.payment_method === "mercado_pago_card"') >= 0);
  assert.ok(block.indexOf('order.payment_method === "mercado_pago_card"') < block.indexOf("if (order.card_mode)"));
});

test("admin reads gateway detail but retains order transition logic and no financial mutations", () => {
  const query = readFileSync(path.join(root, "lib/admin-orders-client.ts"), "utf8");
  const panel = readFileSync(path.join(root, "components/admin-orders-panel.tsx"), "utf8");
  assert.match(query, /payment_method, payment_status, order_status, gateway_status_detail, cash_change_for/);
  assert.match(panel, /onlinePaymentLabel\(order\.payment_method, order\.payment_status, order\.gateway_status_detail\)/);
  assert.match(panel, /pendingOnlineOrderLabel\(order\.payment_status, order\.gateway_status_detail\)/);
  assert.match(panel, /await transitionAdminOrder\(client, order\.id, status\)/);
  assert.match(panel, /\["completed", "cancelled"\]\.includes\(order\.order_status\)/);
});
