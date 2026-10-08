import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { webcrypto } from "node:crypto";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../supabase/functions/reconcile-mp-order/index.ts");
const source = readFileSync(file, "utf8");
const javascript = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  reportDiagnostics: true,
});
const errors = (javascript.diagnostics || []).filter(x => x.category === ts.DiagnosticCategory.Error);
assert.equal(errors.length, 0, errors.map(x => ts.flattenDiagnosticMessageText(x.messageText, "\n")).join("\n"));

const ORDER_ID = "LOD-8K2M-7P4R-9T6V";
const MP_ID = "ORDTST01M4CPS6DKC9S2XXADPV3DKZS9";
const SECRET = "TEST_ONLY_SERVER_KEY";
function mock(overrides = {}) {
  const calls = [];
  const env = {
    PAYMENTS_ENVIRONMENT: "test",
    SUPABASE_SERVICE_ROLE_KEY: SECRET,
    SUPABASE_URL: "https://project.supabase.co",
    MP_ACCESS_TOKEN_TEST: "TEST_ONLY_MP_TOKEN",
    ...(overrides.env || {}),
  };
  let route;
  const databaseOrder = {
    id: "b79bdd9c-ac74-48aa-84d6-46c02356df2b",
    order_id: ORDER_ID, total: "20.00", currency: "BRL",
    sales_channel: "site", payment_method: "mercado_pago_card",
    payment_status: "pending", gateway_environment: "test",
    ...(overrides.order || {}),
  };
  const attempt = {
    id: "1b97bb26-cc23-49d5-9d0c-9b7648bd8c4a",
    attempt_number: 1, method: "mercado_pago_card",
    mercado_pago_order_id: MP_ID, status: "pending",
    ...(overrides.attempt || {}),
  };
  const mp = {
    id: MP_ID, external_reference: ORDER_ID, total_amount: "20.00",
    country_code: "BRA", live_mode: false,
    status: "canceled", status_detail: "expired",
    transactions: { payments: [{ id: "PAY01M4CPS6E0KDD9GCJEY8A1VGMM", status: "canceled", status_detail: "expired" }] },
    ...(overrides.mp || {}),
  };
  const fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || "GET", body: init.body || null });
    if (String(url).includes("/rest/v1/orders?")) return Response.json([databaseOrder]);
    if (String(url).includes("/rest/v1/payment_attempts?")) return Response.json([attempt]);
    if (String(url).includes("/rest/v1/rpc/apply_mercadopago_order_event")) {
      return Response.json(overrides.applyResponse || { changed_to_paid: false, payment_status: "cancelled", order_status: "cancelled", duplicate: false });
    }
    if (String(url).includes("/functions/v1/process-order-effects")) return Response.json({ ok: true });
    if (String(url).startsWith("https://api.mercadopago.com/v1/orders/")) return Response.json(overrides.mpErrorBody ?? mp, { status: overrides.mpStatus ?? 200 });
    throw new Error("unexpected URL: " + url);
  };
  const context = {
    Deno: { env: { get: k => env[k] }, serve: fn => { route = fn; } },
    fetch, crypto: webcrypto, TextEncoder, Request, Response, AbortController,
    setTimeout, clearTimeout, console,
  };
  vm.runInNewContext(javascript.outputText, context, { filename: file });
  assert.equal(typeof route, "function");
  return {
    calls,
    async post(data = {}, headers = {}) {
      const req = new Request("https://project.supabase.co/functions/v1/reconcile-mp-order", {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SECRET, "x-lod-test": "1", ...headers },
        body: JSON.stringify({ order_id: ORDER_ID, ...data }),
      });
      const response = await route(req);
      return { status: response.status, data: await response.json() };
    },
  };
}
const writes = x => x.calls.filter(c => c.url.includes("/rpc/") || c.url.includes("/process-order-effects"));

test("dry-run consults provider without financial writes", async () => {
  const h = mock();
  const r = await h.post();
  assert.equal(r.status, 200);
  assert.equal(r.data.dry_run, true);
  assert.equal(r.data.local_payment_status, "pending");
  assert.equal(r.data.gateway_status, "canceled");
  assert.equal(r.data.gateway_status_detail, "expired");
  assert.equal(writes(h).length, 0);
});

test("public or missing credentials cannot call reconciliation", async () => {
  const h = mock();
  const r = await h.post({}, { apikey: "PUBLISHABLE_KEY" });
  assert.equal(r.status, 401);
  assert.equal(h.calls.length, 0);
});

test("apply remains disabled unless explicitly enabled", async () => {
  const h = mock();
  const r = await h.post({ apply: true }, { "x-lod-apply-order": ORDER_ID });
  assert.equal(r.status, 403);
  assert.equal(r.data.error.code, "apply_disabled");
  assert.equal(h.calls.length, 0);
});

test("apply requires exact order confirmation header", async () => {
  const h = mock({ env: { LOD_RECONCILIATION_APPLY_ENABLED: "true" } });
  const r = await h.post({ apply: true });
  assert.equal(r.status, 403);
  assert.equal(r.data.error.code, "apply_order_confirmation_missing");
  assert.equal(h.calls.length, 0);
});

test("cannot cross-link another payment method", async () => {
  const h = mock({ attempt: { method: "mercado_pago_pix" } });
  const r = await h.post();
  assert.equal(r.status, 422);
  assert.equal(r.data.error.code, "attempt_method_mismatch");
  assert.equal(writes(h).length, 0);
});

test("rejects wrong value before RPC", async () => {
  const h = mock({ mp: { total_amount: "30.00" }, env: { LOD_RECONCILIATION_APPLY_ENABLED: "true" } });
  const r = await h.post({ apply: true }, { "x-lod-apply-order": ORDER_ID });
  assert.equal(r.status, 422);
  assert.equal(r.data.error.code, "gateway_order_mismatch");
  assert.deepEqual(Array.from(r.data.error.failed_checks), ["amount"]);
  assert.equal(writes(h).length, 0);
});

test("rejects a live-mode provider response", async () => {
  const h = mock({ mp: { live_mode: true } });
  const r = await h.post();
  assert.equal(r.status, 422);
  assert.equal(writes(h).length, 0);
});

test("reconciliation of canceled order writes once and does not send Purchase", async () => {
  const h = mock({ env: { LOD_RECONCILIATION_APPLY_ENABLED: "true" } });
  const r = await h.post({ apply: true }, { "x-lod-apply-order": ORDER_ID });
  assert.equal(r.status, 200);
  assert.equal(r.data.changed_to_paid, false);
  const effects = h.calls.filter(c => c.url.includes("process-order-effects"));
  const rpc = h.calls.find(c => c.url.includes("rpc/apply_mercadopago_order_event"));
  assert.ok(rpc);
  assert.equal(effects.length, 0);
  const body = JSON.parse(rpc.body);
  assert.equal(body.p_external_reference, ORDER_ID);
  assert.equal(body.p_gateway_status, "canceled");
  assert.equal(body.p_environment, "test");
});

test("approved Order invokes effects only when SQL reports a new paid transition", async () => {
  const h = mock({
    env: { LOD_RECONCILIATION_APPLY_ENABLED: "true" },
    mp: { status: "processed", status_detail: "accredited" },
    applyResponse: { changed_to_paid: true, payment_status: "paid", order_status: "new" },
  });
  const r = await h.post({ apply: true }, { "x-lod-apply-order": ORDER_ID });
  assert.equal(r.status, 200);
  assert.equal(r.data.payment_status, "paid");
  assert.equal(h.calls.filter(c => c.url.includes("process-order-effects")).length, 1);
});

test("duplicate SQL transition never invokes downstream effects", async () => {
  const h = mock({
    env: { LOD_RECONCILIATION_APPLY_ENABLED: "true" },
    mp: { status: "processed", status_detail: "accredited" },
    applyResponse: { duplicate: true, changed_to_paid: false, payment_status: "paid", order_status: "new" },
  });
  const r = await h.post({ apply: true }, { "x-lod-apply-order": ORDER_ID });
  assert.equal(r.status, 200);
  assert.equal(h.calls.filter(c => c.url.includes("process-order-effects")).length, 0);
});

test("reports only the failed currency check without changing payment state", async () => {
  const h = mock({ mp: { country_code: "BR", currency_id: undefined, currency: undefined } });
  const r = await h.post();
  assert.equal(r.status, 422);
  assert.deepEqual(Array.from(r.data.error.failed_checks), ["currency"]);
  assert.equal(writes(h).length, 0);
});

test("accepts omitted live_mode in dry-run while leaving financial data unchanged", async () => {
  const h = mock({ mp: { live_mode: undefined } });
  const r = await h.post();
  assert.equal(r.status, 200);
  assert.equal(r.data.dry_run, true);
  assert.equal(r.data.gateway_status, "canceled");
  assert.equal(writes(h).length, 0);
});

test("reports multiple mismatch checks without exposing gateway values", async () => {
  const h = mock({ mp: { total_amount: "35.00", live_mode: null, country_code: "BR" } });
  const r = await h.post();
  assert.equal(r.status, 422);
  assert.deepEqual(Array.from(r.data.error.failed_checks), ["live_mode", "currency", "amount"]);
  assert.equal(writes(h).length, 0);
});

test("rejects explicit live_mode string instead of boolean", async () => {
  const h = mock({ mp: { live_mode: "false" } });
  const r = await h.post();
  assert.equal(r.status, 422);
  assert.deepEqual(Array.from(r.data.error.failed_checks), ["live_mode"]);
  assert.equal(writes(h).length, 0);
});

test("does not fabricate false in the sanitized payload when live_mode is absent", async () => {
  const h = mock({ mp: { live_mode: undefined }, env: { LOD_RECONCILIATION_APPLY_ENABLED: "true" } });
  const r = await h.post({ apply: true }, { "x-lod-apply-order": ORDER_ID });
  assert.equal(r.status, 200);
  const rpc = h.calls.find(c => c.url.includes("rpc/apply_mercadopago_order_event"));
  assert.ok(rpc);
  assert.equal(JSON.parse(rpc.body).p_sanitized_payload.live_mode, null);
  assert.equal(h.calls.filter(c => c.url.includes("process-order-effects")).length, 0);
});

for (const status of [401, 403, 404, 429, 503]) {
  test(`GET /v1/orders HTTP ${status} returns only safe upstream status without any database writes`, async () => {
    const h = mock({ mpStatus: status, mpErrorBody: { message: "do not expose raw provider error", access_token: "sensitive" } });
    const r = await h.post();
    assert.equal(r.status, 502);
    assert.equal(r.data.error.code, "gateway_lookup_failed");
    assert.equal(r.data.error.upstream_status, status);
    assert.equal(JSON.stringify(r.data).includes("sensitive"), false);
    assert.equal(JSON.stringify(r.data).includes("raw provider error"), false);
    assert.equal(writes(h).length, 0);
  });
}
