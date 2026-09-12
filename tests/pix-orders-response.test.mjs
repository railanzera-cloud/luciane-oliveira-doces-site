import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const webhook = await readFile(new URL("../supabase/functions/mercadopago-webhook/index.ts", import.meta.url), "utf8");
const prefix = webhook.slice(webhook.indexOf("const MP_ORDERS_URL"), webhook.indexOf("async function applyEvent"));
const parse = new Function(`${ts.transpileModule(prefix, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText}; return safeOrderSnapshot;`)();
// Shape documented by Mercado Pago Orders API's official Pix test example.
const fixture = { id: "ORD-FIXTURE", external_reference: "LOD-TEST-0000-0001",
  total_amount: "50.00", country_code: "BRA", status: "processed",
  status_detail: "accredited", transactions: { payments: [{ id: "PAY-FIXTURE", status: "processed" }] } };

test("Pix Orders API accepts its documented Brazilian response without currency_id", () => {
  const result = parse(fixture);
  assert.equal(result.currency, "BRL");
  assert.equal(result.total, "50.00");
  assert.equal(result.paymentId, "PAY-FIXTURE");
});
test("Pix never overrides an explicit foreign currency or accepts another country", () => {
  assert.throws(() => parse({ ...fixture, currency_id: "USD" }), /Order/);
  assert.throws(() => parse({ ...fixture, country_code: "MEX" }), /Order/);
  assert.throws(() => parse({ ...fixture, country_code: undefined }), /Order/);
});
test("Pix test webhook rejects live orders", () => {
  assert.throws(() => parse({ ...fixture, live_mode: true }), /Order/);
});
