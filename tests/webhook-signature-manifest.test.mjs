import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHmac, webcrypto } from "node:crypto";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
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
// Independent HMAC fixture follows the Orders API's official SDK example:
// dataId is the original query value, including its case.
const signature = `ts=${timestamp},v1=${digest(`id:${orderId};request-id:${requestId};ts:${timestamp};`)}`;
// Optional path to the pinned official SDK module for an integration run.
// No SDK dependency is added to the storefront's bundle.
const officialSdk = process.env.LOD_MP_SDK_WEBHOOK_PATH
  ? createRequire(import.meta.url)(process.env.LOD_MP_SDK_WEBHOOK_PATH)
  : null;

function fixture() {
  let handler;
  const calls = [];
  const warnings = [];
  class InvalidWebhookSignatureError extends Error { reason = "SignatureMismatch"; }
  const fixtureValidator = { validate({ dataId, xRequestId, xSignature }) {
    const expected = `ts=${timestamp},v1=${digest(`id:${dataId};request-id:${xRequestId};ts:${timestamp};`)}`;
    if (xSignature !== expected) throw new InvalidWebhookSignatureError();
  } };
  const env = { PAYMENTS_ENVIRONMENT: "test", MP_WEBHOOK_SECRET_TEST: secret,
    MP_ACCESS_TOKEN_TEST: "fixture-access-token", SUPABASE_URL: "https://fixture.invalid",
    SUPABASE_SECRET_KEYS: '{"default":"fixture-backend-key"}' };
  vm.runInNewContext(code, {
    WebhookSignatureValidator: officialSdk?.WebhookSignatureValidator ?? fixtureValidator,
    InvalidWebhookSignatureError: officialSdk?.InvalidWebhookSignatureError ?? InvalidWebhookSignatureError,
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

test("original-case signed Orders ID passes and is preserved in API and database", async () => {
  const f = fixture();
  assert.equal((await f.invoke()).status, 200);
  assert.equal(f.calls[0].url, `https://api.mercadopago.com/v1/orders/${orderId}`);
  assert.equal(f.calls[1].body.p_mp_order_id, orderId);
  assert.equal(f.calls[1].body.p_total, "50.00");
  assert.equal(f.calls[1].body.p_gateway_status, "processed");
});

test("changing the signed ID case is rejected before any API or database access", async () => {
  const f = fixture();
  const changed = `ts=${timestamp},v1=${digest(`id:${orderId.toLowerCase()};request-id:${requestId};ts:${timestamp};`)}`;
  assert.equal((await f.invoke(changed)).status, 401);
  assert.equal(f.calls.length, 0);
});

test("signature for another request ID remains rejected", async () => {
  const f = fixture();
  const changed = `ts=${timestamp},v1=${digest(`id:${orderId};request-id:another-request;ts:${timestamp};`)}`;
  assert.equal((await f.invoke(changed)).status, 401);
  assert.equal(f.calls.length, 0);
});

test("signature generated with a different secret remains rejected", async () => {
  const f = fixture();
  const hash = createHmac("sha256", "incorrect-fixture-secret")
    .update(`id:${orderId};request-id:${requestId};ts:${timestamp};`).digest("hex");
  assert.equal((await f.invoke(`ts=${timestamp},v1=${hash}`)).status, 401);
  assert.equal(f.calls.length, 0);
});

test("malformed signature cannot consult or update the order", async () => {
  const f = fixture();
  assert.equal((await f.invoke("invalid-header")).status, 401);
  assert.equal(f.calls.length, 0);
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
