import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHmac, webcrypto } from "node:crypto";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../supabase/functions/mercadopago-webhook/index.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source.replace(/import\s*\{[\s\S]*?\}\s*from\s*"npm:mercadopago@3\.6\.1";/, ""), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const orderId = "ORDTST01M2DFM1WQBVVCKZ09VD49FGBV";
const requestId = "fixture-request-id";
const timestamp = "1789306478";
const secret = "fixture-webhook-secret";
const digest = (manifest) => createHmac("sha256", secret).update(manifest).digest("hex");
// Independent signed fixture: Orders uses lowercase only in the HMAC manifest.
const signature = `ts=${timestamp},v1=${digest(`id:${orderId.toLowerCase()};request-id:${requestId};ts:${timestamp};`)}`;

function fixture() {
  let handler;
  const calls = [];
  const warnings = [];
  class InvalidWebhookSignatureError extends Error { reason = "SignatureMismatch"; }
  const WebhookSignatureValidator = { validate({ dataId, xRequestId, xSignature }) {
    const expected = `ts=${timestamp},v1=${digest(`id:${dataId};request-id:${xRequestId};ts:${timestamp};`)}`;
    if (xSignature !== expected) throw new InvalidWebhookSignatureError();
  } };
  const env = { PAYMENTS_ENVIRONMENT: "test", MP_WEBHOOK_SECRET_TEST: secret,
    MP_ACCESS_TOKEN_TEST: "fixture-access-token", SUPABASE_URL: "https://fixture.invalid",
    SUPABASE_SECRET_KEYS: '{"default":"fixture-backend-key"}' };
  vm.runInNewContext(code, { WebhookSignatureValidator, InvalidWebhookSignatureError,
    crypto: webcrypto, Request, Response, Headers, URL, TextEncoder, AbortController, DOMException,
    setTimeout, clearTimeout, console: { error() {}, warn: (...args) => warnings.push(args) },
    Deno: { env: { get: (key) => env[key] }, serve: (fn) => { handler = fn; } },
    fetch: async (url, options = {}) => {
      calls.push({ url, body: options.body && JSON.parse(options.body) });
      if (url === `https://api.mercadopago.com/v1/orders/${orderId}`) return Response.json({
        id: orderId, external_reference: "LOD-G5HC-1F7F-ZZ7A", total_amount: "50.00", country_code: "BRA",
        status: "processed", status_detail: "accredited", live_mode: false,
        transactions: { payments: [{ id: "PAY-FIXTURE", status: "processed", status_detail: "accredited" }] },
      });
      if (url.endsWith("/rpc/apply_mercadopago_order_event")) return Response.json({ changed_to_paid: false, duplicate: false });
      throw new Error("Unexpected fixture request");
    },
  });
  return { calls, warnings, invoke: (value = signature) => handler(new Request(
    `https://fixture.invalid/webhook?data.id=${orderId}&type=order`, {
      method: "POST", headers: { "content-type": "application/json", "x-request-id": requestId,
        ...(value === null ? {} : { "x-signature": value }) },
      body: JSON.stringify({ type: "order", action: "order.updated", data: { id: orderId } }),
    })) };
}

test("signed alphanumeric Orders manifest passes while API and database retain the original ID", async () => {
  const f = fixture();
  assert.equal((await f.invoke()).status, 200);
  assert.equal(f.calls[0].url, `https://api.mercadopago.com/v1/orders/${orderId}`);
  assert.equal(f.calls[1].body.p_mp_order_id, orderId);
  assert.equal(f.calls[1].body.p_total, "50.00");
  assert.equal(f.calls[1].body.p_gateway_status, "processed");
});

test("tampered signature cannot fetch a payment or update an order", async () => {
  const f = fixture();
  assert.equal((await f.invoke(signature + "0")).status, 401);
  assert.equal(f.calls.length, 0);
  assert.deepEqual(f.warnings, [["mercadopago-webhook signature rejected", "SignatureMismatch"]]);
});

test("missing signature remains blocked and diagnostics contain no credentials", async () => {
  const f = fixture();
  assert.equal((await f.invoke(null)).status, 401);
  assert.equal(f.calls.length, 0);
  assert.deepEqual(f.warnings, [["mercadopago-webhook signature rejected", "MissingSignatureInputs"]]);
});
