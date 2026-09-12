import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const effectsSource = await read("../supabase/functions/process-order-effects/index.ts");
const effectsCode = ts.transpileModule(effectsSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const retrySql = await read("../supabase/migrations/20260912183000_phase2_retry_safety.sql");
const cardSource = await read("../components/mercado-pago-card-form.tsx");
const cardFunction = cardSource.match(/function normalizeCardData\([\s\S]*?\n}\n/)?.[0];
assert.ok(cardFunction);
const normalizeCard = new Function(`${ts.transpileModule(cardFunction, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText}; return normalizeCardData;`)();

// Isolated handler tests. No credentials, external HTTP or production database.
function effectsHarness({ order = {}, env = {}, graphStatus = 200 } = {}) {
  const environment = {
    SUPABASE_URL: "https://database.example.invalid",
    SUPABASE_SECRET_KEYS: JSON.stringify({ default: "fixture-internal-token" }),
    SUPABASE_PUBLISHABLE_KEYS: JSON.stringify({ default: "fixture-public-key" }),
    META_CAPI_ACCESS_TOKEN: "fixture-meta-token",
    META_GRAPH_API_VERSION: "v99.0",
    META_CAPI_TEST_EVENT_CODE: "fixture-test-event",
    PAYMENTS_ENVIRONMENT: "test",
    ...env,
  };
  const calls = [];
  let handler;
  let claimed = false;
  const context = vm.createContext({
    Response, Request, Headers, AbortSignal, AbortController, TextEncoder,
    setTimeout, clearTimeout, crypto: webcrypto, console: { error() {} },
    Deno: { env: { get: (name) => environment[name] }, serve: (fn) => { handler = fn; } },
    fetch: async (url, options = {}) => {
      const body = options.body ? JSON.parse(options.body) : null;
      calls.push({ url, body });
      if (url.endsWith("/auth/v1/user")) return Response.json({}, { status: 401 });
      if (url.endsWith("/claim_event_outbox")) {
        if (claimed) return Response.json(null);
        claimed = true;
        return Response.json({
          job: { id: "fixture-job", payload: {} },
          order: {
            order_id: "LOD-TEST-TEST-TEST", sales_channel: "site", payment_status: "paid",
            total: "33.00", gateway_environment: "test", customer_email: "qa@example.invalid",
            meta_purchase_event_id: "lod_purchase_fixture", paid_at: "2026-09-12T12:00:00.000Z", ...order,
          },
          items: [{ product_id: "pipoca-gourmet", quantity: 1, unit_price: "33.00" }],
        });
      }
      if (url.endsWith("/complete_event_outbox") || url.endsWith("/fail_event_outbox")) return Response.json({});
      if (url.startsWith("https://graph.facebook.com/")) {
        return Response.json(graphStatus === 200 ? { events_received: 1 } : { error: { code: 1 } }, { status: graphStatus });
      }
      throw new Error(`Unexpected fixture request: ${url}`);
    },
  });
  vm.runInContext(effectsCode, context);
  return {
    calls,
    invoke: (headers = {}, method = "POST") => handler(new Request("https://edge.example.invalid/effects", {
      method, headers: { authorization: "Bearer fixture-internal-token", ...headers },
    })),
  };
}

test("Card Brick reads paymentTypeId from the official second callback argument", () => {
  const result = normalizeCard({ token: "fixture-token", payment_method_id: "visa", installments: 1,
    payer: { email: "qa@example.invalid", identification: { type: "CPF", number: "00000000000" } },
  }, { paymentTypeId: "credit_card" });
  assert.equal(result.payment_type_id, "credit_card");
  assert.equal(result.payment_method_id, "visa");
  assert.throws(() => normalizeCard({ token: "fixture-token", payment_method_id: "visa", installments: 1 }), /Confira/);
  assert.match(cardSource, /normalizeCardData\(formData, additionalData\)/);
});

test("effects supports allowed admin preflights and denies foreign origins", async () => {
  const harness = effectsHarness();
  const preflight = await harness.invoke({ origin: "https://lucianeoliveiradoces.pages.dev" }, "OPTIONS");
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("Access-Control-Allow-Origin"), "https://lucianeoliveiradoces.pages.dev");
  const foreign = await harness.invoke({ origin: "https://foreign.example.invalid" });
  assert.equal(foreign.status, 403);
  assert.equal(foreign.headers.get("Access-Control-Allow-Origin"), null);
  assert.equal(harness.calls.length, 0);
});

test("unauthenticated callers cannot drain the outbox", async () => {
  const harness = effectsHarness();
  assert.equal((await harness.invoke({ authorization: "" })).status, 401);
  assert.equal(harness.calls.length, 0);
});

test("missing Meta configuration does not claim or consume an event", async () => {
  const harness = effectsHarness({ env: { META_CAPI_ACCESS_TOKEN: "" } });
  assert.equal((await harness.invoke()).status, 503);
  assert.equal(harness.calls.length, 0);
});

test("test payments never reach live Meta events without a test code", async () => {
  const harness = effectsHarness({ env: { META_CAPI_TEST_EVENT_CODE: "" } });
  const response = await harness.invoke();
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, "meta_test_code_required");
  assert.equal(harness.calls.length, 0);
});

test("old offline test orders remain test-only after switching the deployment environment", async () => {
  const harness = effectsHarness({ env: { PAYMENTS_ENVIRONMENT: "production", META_CAPI_TEST_EVENT_CODE: "" }, order: { gateway_environment: null } });
  assert.equal((await harness.invoke()).status, 503);
  assert.equal(harness.calls.some(({ url }) => url.includes("graph.facebook.com")), false);
  const failure = harness.calls.find(({ url }) => url.endsWith("/fail_event_outbox"));
  assert.ok(failure.body.p_worker_id.startsWith("effects-"));
});

test("paid site event uses test mode, hashed customer data and one stable id", async () => {
  const harness = effectsHarness();
  assert.equal((await harness.invoke()).status, 200);
  assert.equal((await harness.invoke()).status, 200);
  const graphCalls = harness.calls.filter(({ url }) => url.includes("graph.facebook.com"));
  assert.equal(graphCalls.length, 1);
  const body = graphCalls[0].body;
  assert.equal(body.test_event_code, "fixture-test-event");
  assert.equal(body.data[0].event_name, "Purchase");
  assert.equal(body.data[0].event_id, "lod_purchase_fixture");
  assert.equal(body.data[0].custom_data.value, 33);
  assert.match(body.data[0].user_data.em[0], /^[0-9a-f]{64}$/);
  assert.equal("fbp" in body.data[0].user_data, false);
  assert.equal("fbc" in body.data[0].user_data, false);
  const claim = harness.calls.find(({ url }) => url.endsWith("/claim_event_outbox"));
  const completion = harness.calls.find(({ url }) => url.endsWith("/complete_event_outbox"));
  assert.equal(completion.body.p_worker_id, claim.body.p_worker_id);
});

test("unpaid and WhatsApp orders never generate site Purchase", async () => {
  for (const order of [{ payment_status: "pending" }, { sales_channel: "whatsapp" }]) {
    const harness = effectsHarness({ order });
    assert.equal((await harness.invoke()).status, 422);
    assert.equal(harness.calls.some(({ url }) => url.includes("graph.facebook.com")), false);
  }
});

test("Meta failure records a retry without modifying payment or printing", async () => {
  const harness = effectsHarness({ graphStatus: 503 });
  assert.equal((await harness.invoke()).status, 502);
  assert.ok(harness.calls.some(({ url }) => url.endsWith("/fail_event_outbox")));
  assert.equal(harness.calls.some(({ url }) => url.endsWith("/complete_event_outbox")), false);
  assert.equal(harness.calls.some(({ url }) => /print|payment_attempts|\/orders/.test(url)), false);
});

test("retry migration binds gateway events to their attempt and fences stale workers", () => {
  assert.match(retrySql, /order_uuid = v_order\.id and mercado_pago_order_id = p_mp_order_id/);
  assert.match(retrySql, /where id = v_attempt\.id/);
  assert.match(retrySql, /ignored_old_attempt/);
  assert.match(retrySql, /multiple_accredited_payments_requires_review/);
  assert.match(retrySql, /locked_at < now\(\) - interval '2 minutes'/);
  assert.equal((retrySql.match(/locked_by = p_worker_id/g) ?? []).length, 2);
  assert.doesNotMatch(retrySql, /(?:insert into|update|delete from) public\.(?:menu_availability|store_settings)/);
});
