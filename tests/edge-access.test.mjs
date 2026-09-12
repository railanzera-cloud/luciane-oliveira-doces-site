import assert from "node:assert/strict";
import { createPrivateKey, createSign, generateKeyPairSync, verify, webcrypto, X509Certificate } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const qzSource = await read("../supabase/functions/qz-sign/index.ts");
const publicSource = await read("../supabase/functions/public-order-status/index.ts");
const effectsSource = await read("../supabase/functions/process-order-effects/index.ts");
const migration = await read("../supabase/migrations/20260912123000_phase2_orders.sql");
const adminId = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";
const origin = "https://lucianeoliveiradoces.pages.dev";
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const testPrivatePem = privateKey.export({ type: "pkcs8", format: "pem" });

function harness(source, { user = null, environment = {}, snapshot = {} } = {}) {
  const calls = [];
  const env = {
    SUPABASE_URL: "https://database.example.invalid",
    SUPABASE_PUBLISHABLE_KEYS: JSON.stringify({ default: "fixture-public" }),
    SUPABASE_SECRET_KEYS: JSON.stringify({ default: "fixture-internal" }),
    LOD_ADMIN_USER_IDS: adminId,
    QZ_PRIVATE_KEY_PEM: testPrivatePem,
    ...environment,
  };
  let handler;
  const code = ts.transpileModule(source.replace(/^import .* from "node:crypto";\n/m, ""), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  vm.runInNewContext(code, {
    createPrivateKey, createSign, X509Certificate, crypto: webcrypto,
    Request, Response, Headers, AbortController, AbortSignal, TextEncoder,
    setTimeout, clearTimeout, console: { error() {} },
    Deno: { env: { get: (key) => env[key] }, serve: (fn) => { handler = fn; } },
    fetch: async (url, options) => {
      calls.push({ url, body: options.body ? JSON.parse(options.body) : null });
      if (url.endsWith("/auth/v1/user")) return Response.json(user ?? {}, { status: user ? 200 : 401 });
      if (url.endsWith("/get_public_order_status")) return Response.json(snapshot);
      throw new Error("Unexpected fixture call");
    },
  });
  return {
    calls,
    invoke: (body, headers = {}, method = "POST") => handler(new Request("https://edge.example.invalid/function", {
      method, headers: { origin, apikey: "fixture-public", "Content-Type": "application/json", ...headers },
      ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
    })),
  };
}

test("QZ rejects anonymous callers before parsing or signing the payload", async () => {
  const h = harness(qzSource);
  assert.equal((await h.invoke({ action: "sign", request: "anything" })).status, 401);
  assert.equal(h.calls.length, 0);
});

test("QZ rejects expired or forged user tokens", async () => {
  const h = harness(qzSource);
  assert.equal((await h.invoke({ action: "sign", request: "anything" }, { authorization: "Bearer fixture-expired" })).status, 401);
  assert.equal(h.calls.length, 1);
});

test("QZ rejects authenticated non-admins even if editable metadata claims admin", async () => {
  const h = harness(qzSource, { user: { id: otherId, user_metadata: { role: "admin" } } });
  const response = await h.invoke({ action: "sign", request: "anything" }, { authorization: "Bearer fixture-user" });
  assert.equal(response.status, 403);
  assert.equal((await response.json()).error.code, "admin_required");
});

test("QZ fails closed with missing admin configuration or an anonymous Supabase account", async () => {
  for (const options of [
    { user: { id: adminId }, environment: { LOD_ADMIN_USER_IDS: "" } },
    { user: { id: adminId, is_anonymous: true } },
  ]) {
    const h = harness(qzSource, options);
    assert.ok([401, 403].includes((await h.invoke({ action: "sign", request: "anything" }, { authorization: "Bearer fixture-user" })).status));
  }
});

test("QZ authenticated allowlisted admin receives only a verifiable signature", async () => {
  const h = harness(qzSource, { user: { id: adminId, is_anonymous: false } });
  const payload = JSON.stringify({ call: "print", params: { printer: "fixture" }, timestamp: 1 });
  const response = await h.invoke({ action: "sign", request: payload }, { authorization: "Bearer fixture-admin" });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.deepEqual(Object.keys(result).sort(), ["ok", "signature"]);
  assert.equal(verify("RSA-SHA512", Buffer.from(payload), publicKey, Buffer.from(result.signature, "base64")), true);
  assert.equal(JSON.stringify(result).includes(testPrivatePem), false);
});

test("QZ never returns a private key accidentally saved as its public certificate", async () => {
  const h = harness(qzSource, { user: { id: adminId }, environment: { QZ_CERTIFICATE: testPrivatePem } });
  const response = await h.invoke({ action: "certificate" }, { authorization: "Bearer fixture-admin" });
  assert.equal(response.status, 503);
  assert.equal((await response.text()).includes("PRIVATE KEY"), false);
});

test("QZ rejects unsupported actions and excessive signing payloads", async () => {
  const h = harness(qzSource, { user: { id: adminId } });
  for (const body of [{ action: "unknown" }, { action: "sign", request: "x".repeat(100001) }]) {
    assert.equal((await h.invoke(body, { authorization: "Bearer fixture-admin" })).status, 400);
  }
});

test("public status cannot enumerate an order by order_number or LOD code", async () => {
  const h = harness(publicSource);
  for (const body of [{ order_number: 1001 }, { order_id: "LOD-TEST-TEST-TEST" }, { tracking_token: "1001" }, {}]) {
    assert.equal((await h.invoke(body)).status, 404);
  }
  assert.equal(h.calls.length, 0);
  assert.match(migration, /tracking_token text not null unique default encode\(extensions\.gen_random_bytes\(24\), 'hex'\)/);
});

test("public status rejects missing client key and non-existent high-entropy tokens", async () => {
  const h = harness(publicSource, { snapshot: null });
  assert.equal((await h.invoke({ tracking_token: "a".repeat(48) }, { apikey: "" })).status, 401);
  assert.equal(h.calls.length, 0);
  assert.equal((await h.invoke({ tracking_token: "a".repeat(48) })).status, 404);
  assert.deepEqual(h.calls[0].body, { p_tracking_token: "a".repeat(48) });
});

test("public status projects only minimal fields even if its RPC returns private columns", async () => {
  const h = harness(publicSource, { snapshot: {
    order_number: 1001, payment_method: "mercado_pago_pix", payment_status: "pending",
    order_status: "payment_pending", fulfillment_type: "pickup", total: "20.00", currency: "BRL",
    customer_name: "Private fixture", customer_email: "private@example.invalid", customer_phone: "private",
    street: "private", source_parameters: { fbclid: "private" }, tracking_token: "private", request_hash: "private",
    payment: { gateway_internal: "private", payment: { qr_code: "fixture-pix", payer: "private", card_token: "private" } },
  } });
  const response = await h.invoke({ tracking_token: "a".repeat(48) });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  const result = await response.json();
  assert.equal(result.order.order_number, 1001);
  assert.equal(JSON.stringify(result).includes("private"), false);
  assert.deepEqual(result.order.payment, { payment: { qr_code: "fixture-pix" } });
});

test("effects denies public keys, missing Bearer credentials and authenticated non-admins", async () => {
  for (const [authorization, user] of [
    ["", null], ["fixture-internal", null], ["Bearer fixture-public", null],
    ["Bearer fixture-user", { id: otherId, user_metadata: { role: "admin" } }],
  ]) {
    const h = harness(effectsSource, { user });
    const response = await h.invoke({}, { authorization });
    assert.ok([401, 403].includes(response.status));
    assert.equal(h.calls.some(({ url }) => /rpc\//.test(url)), false);
  }
});

test("effects authenticates internal calls and authorized admin calls without leaking configuration", async () => {
  for (const [authorization, user] of [
    ["Bearer fixture-internal", null], ["Bearer fixture-admin", { id: adminId }],
  ]) {
    const h = harness(effectsSource, { user });
    const response = await h.invoke({}, { authorization });
    assert.equal(response.status, 503); // Authorized, but Meta deliberately absent.
    const body = await response.json();
    assert.equal(body.error.code, "meta_not_configured");
    assert.equal(JSON.stringify(body).includes("fixture-internal"), false);
  }
});
