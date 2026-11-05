// Executa os entrypoints reais compilados de TS em VM: TODOS os acessos externos
// são interceptados por fixtures em memória. Não requer Supabase, Mercado Pago ou
// segredos, não abre portas e nunca envia um pedido/pagamento real.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { webcrypto } from "node:crypto";
import ts from "typescript";
import * as commerce from "../supabase/functions/_shared/commerce-catalog.mjs";
import * as promo from "../supabase/functions/_shared/popcorn-quote-campaign.mjs";
import * as receipt from "../supabase/functions/_shared/receipt-card.mjs";

const ORIGIN = "https://lucianeoliveiradoces.pages.dev";
const MOCK_SUPABASE = "https://mock-supabase.invalid";
const MP_URL = "https://api.mercadopago.com/v1/orders";
const ORDER_ID = "LOD-ABCD-EFGH-JKLM";
const PUBLISHABLE = "sb_publishable_local_fixture_only";
const makeOrder = (method, fulfillment, expectedTotal) => ({
  client_order_id: ORDER_ID,
  request_key: "a".repeat(64),
  customer: { name: "Cliente Sintético", phone: "91999999999", email: "fixture@example.invalid" },
  items: [{ product_id: "fatia-chocolatudo", variant_id: "fatia", option_ids: [], quantity: 1 }],
  fulfillment,
  payment: { method },
  ...(expectedTotal === undefined ? {} : { expected_total: expectedTotal }),
});
const city = () => ({
  type: "delivery", zone_id: "cidade", locality_id: "promissao-ii",
  neighborhood: "Promissão II", street: "Rua Exemplo", number: "12",
});
const special = () => ({
  type: "delivery", zone_id: "ouro-preto", locality_id: "ouro-preto",
  neighborhood: "Ouro Preto", street: "Rua Exemplo", number: "12",
});

async function isolatedHandler(slug, options = {}) {
  assert.ok(["create-order", "create-whatsapp-order"].includes(slug));
  const filename = new URL("../supabase/functions/" + slug + "/index.ts", import.meta.url);
  const source = await readFile(filename, "utf8");
  const output = ts.transpileModule(source, {
    fileName: slug + "/index.ts",
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  assert.deepEqual(output.diagnostics ?? [], [], "Handler did not transpile");
  const env = {
    SUPABASE_URL: MOCK_SUPABASE,
    SUPABASE_SERVICE_ROLE_KEY: "never_a_real_key_mock_secret",
    SUPABASE_PUBLISHABLE_KEYS: JSON.stringify({ default: PUBLISHABLE }),
    SITE_ORDERING_ENABLED: "true",
    PAYMENTS_ENVIRONMENT: "test",
    MP_ACCESS_TOKEN_TEST: "fixture_gateway_token_only",
    ...options.env,
  };
  const calls = [];
  const violations = [];
  const reply = (payload, status = 200) =>
    new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } });
  const fakeFetch = async (target, init = {}) => {
    const url = String(target);
    const method = init.method ?? "GET";
    const data = typeof init.body === "string" && init.body.length ? JSON.parse(init.body) : null;
    calls.push({ url, method, data, headers: init.headers });
    if (url.startsWith(MOCK_SUPABASE + "/rest/v1/")) {
      const parsed = new URL(url);
      const pathname = parsed.pathname.slice("/rest/v1/".length);
      if (pathname === "store_settings") return reply([{ value: options.ordersOpen !== false }]);
      if (pathname === "menu_availability") {
        const match = parsed.searchParams.get("item_key")?.match(/^in\.\((.*)\)$/);
        assert.ok(match, "Expected structured availability keys");
        return reply(match[1].split(",").map(key => ({
          item_key: decodeURIComponent(key),
          status: options.unavailableKeys?.includes(decodeURIComponent(key)) ? "sold_out" : "available",
        })));
      }
      if (pathname === "rpc/public_slice_preorder") return reply({ active: false, remaining: 0 });
      if (pathname === "rpc/recover_whatsapp_order") return reply(options.recoveredOrder ?? null);
      if (pathname === "rpc/create_whatsapp_store_order" || pathname === "rpc/create_store_order") {
        if (options.databaseFailure) return reply({ message: options.databaseFailure }, 409);
        return reply({ id: "fake-order-uuid", order_id: ORDER_ID, payment_status: "pending", order_status: "received" });
      }
      if (pathname === "rpc/get_or_create_payment_attempt") {
        return reply(options.attempt ?? { id: "attempt-01", idempotency_key: "fixture-idempotency-key", status: "created" });
      }
      if (pathname.startsWith("payment_attempts")) return reply(null);
      if (pathname === "rpc/apply_mercadopago_order_event") {
        return reply({ changed_to_paid: false, payment_status: "pending", order_status: "received" });
      }
    }
    if (url === MP_URL) {
      const mismatch = options.gatewayMismatch === true;
      return reply({
        id: "mock-mp-order-001",
        external_reference: mismatch ? "LOD-OTHER-ABCD-EFGH" : data.external_reference,
        total_amount: data.total_amount,
        live_mode: false,
        status: "action_required",
        status_detail: "pending",
        transactions: { payments: [{ id: "mock-mp-payment-01", status: "pending",
          payment_method: { qr_code: "fake-pix-qr-not-real" } }] },
      });
    }
    if (url === MOCK_SUPABASE + "/functions/v1/process-order-effects") {
      return reply({ ok: true });
    }
    violations.push(url);
    throw new Error("Outbound destination not allowed in isolated Edge test: " + url);
  };
  const imports = {
    "../_shared/commerce-catalog.mjs": commerce,
    "../_shared/popcorn-quote-campaign.mjs": promo,
    "../_shared/receipt-card.mjs": receipt,
  };
  let handler = null;
  const sandbox = {
    exports: {}, require: (name) => {
      assert.ok(Object.hasOwn(imports, name), "Unexpected Edge dependency: " + name);
      return imports[name];
    },
    Deno: {
      env: { get: key => env[key] },
      serve: fn => { assert.equal(handler, null, "Only one Edge handler expected"); handler = fn; },
    },
    fetch: fakeFetch, Request, Response, Headers, URL, TextEncoder,
    AbortController, DOMException, crypto: webcrypto, setTimeout, clearTimeout,
    console: { log() {}, warn() {}, error() {} },
  };
  vm.runInNewContext(output.outputText, sandbox, { filename: slug + "/index.ts", timeout: 1500 });
  assert.equal(typeof handler, "function", "Real Edge handler was not captured");
  return {
    calls, violations, env,
    async send(payload, headers = {}, method = "POST") {
      const request = new Request("https://isolated-edge.invalid/" + slug, {
        method, headers: { origin: ORIGIN, apikey: PUBLISHABLE,
          "content-type": "application/json", ...headers },
        ...(method === "POST" ? { body: JSON.stringify(payload) } : {}),
      });
      const result = await handler(request);
      assert.deepEqual(violations, [], "Attempted unknown outbound network destination");
      return { status: result.status, json: result.status === 204 ? null : await result.json() };
    },
    wroteOrder() {
      return calls.some(c => c.url.includes("/rpc/create_store_order")
        || c.url.includes("/rpc/create_whatsapp_store_order"));
    },
    rpc(name) {
      return calls.find(c => c.url.includes("/rest/v1/rpc/" + name));
    },
  };
}

test("WhatsApp: approved R$8 locality persists only server-authoritative fee and totals", async () => {
  const edge = await isolatedHandler("create-whatsapp-order");
  const response = await edge.send(makeOrder("manual_pix", city(), "28.00"));
  assert.equal(response.status, 201);
  assert.equal(response.json.ok, true);
  assert.equal(response.json.payment.status, "pending");
  const saved = edge.rpc("create_whatsapp_store_order");
  assert.ok(saved, "Expected only mocked order insertion");
  assert.equal(saved.data.p_order.delivery_fee, "8.00");
  assert.equal(saved.data.p_order.total, "28.00");
  assert.equal(saved.data.p_order.neighborhood, "Promissão II");
  assert.equal(saved.data.p_order.delivery_zone_id, "cidade");
  assert.equal(saved.data.p_items[0].unit_price, "20.00");
  assert.equal(saved.data.p_items[0].item_key, "slice_chocolatudo");
  assert.equal(edge.calls.filter(c => c.url === MP_URL).length, 0);
});

test("WhatsApp: R$10 destination and old city R$8 payload mismatch never undercharge", async () => {
  const allowed = await isolatedHandler("create-whatsapp-order");
  const ok = await allowed.send(makeOrder("manual_pix", special(), "30.00"));
  assert.equal(ok.status, 201);
  assert.equal(allowed.rpc("create_whatsapp_store_order").data.p_order.delivery_fee, "10.00");

  const altered = await isolatedHandler("create-whatsapp-order");
  const tampered = await altered.send(makeOrder("manual_pix",
    { ...special(), zone_id: "cidade", delivery_fee_cents: 800 }, "28.00"));
  assert.equal(tampered.status, 400);
  assert.equal(tampered.json.error.code, "invalid_order");
  assert.equal(altered.wroteOrder(), false);
});

test("WhatsApp: quote rejects pending locality and total mismatch before any insert", async () => {
  const pending = await isolatedHandler("create-whatsapp-order");
  const r1 = await pending.send(makeOrder("manual_pix",
    { ...city(), locality_id: "alto-do-vale", neighborhood: "Alto do Vale" }, "28.00"));
  assert.equal(r1.status, 400);
  assert.equal(pending.wroteOrder(), false);
  const wrongTotal = await isolatedHandler("create-whatsapp-order");
  const r2 = await wrongTotal.send(makeOrder("manual_pix", city(), "20.00"));
  assert.equal(r2.status, 409);
  assert.equal(r2.json.error.code, "price_changed");
  assert.equal(wrongTotal.wroteOrder(), false);
});

test("WhatsApp: recovery is idempotent and bypasses all new writes and payment effects", async () => {
  const saved = { id: "existing-mock", order_id: ORDER_ID };
  const edge = await isolatedHandler("create-whatsapp-order", { recoveredOrder: saved });
  const result = await edge.send(makeOrder("manual_pix", city(), "28.00"));
  assert.equal(result.status, 200);
  assert.equal(result.json.order.id, saved.id);
  assert.equal(edge.wroteOrder(), false);
  assert.equal(edge.calls.filter(c => c.url === MP_URL).length, 0);
  assert.equal(edge.rpc("recover_whatsapp_order")?.method, "POST");
});

test("WhatsApp: strict flag blocks old delivery tabs but not pickup", async () => {
  const edge = await isolatedHandler("create-whatsapp-order",
    { env: { DELIVERY_REQUIRE_LOCALITY_ID: "true" } });
  const legacy = { ...city() };
  delete legacy.locality_id;
  const rejected = await edge.send(makeOrder("manual_pix", legacy, "28.00"));
  assert.equal(rejected.status, 400);
  assert.equal(edge.wroteOrder(), false);
  const picked = await edge.send(makeOrder("manual_pix", { type: "pickup" }, "20.00"));
  assert.equal(picked.status, 201);
  assert.equal(edge.rpc("create_whatsapp_store_order").data.p_order.delivery_fee, "0.00");
});

test("WhatsApp: operational closure prevents order creation after quote", async () => {
  const edge = await isolatedHandler("create-whatsapp-order", { ordersOpen: false });
  const response = await edge.send(makeOrder("manual_pix", city(), "28.00"));
  assert.equal(response.status, 409);
  assert.equal(response.json.error.code, "orders_closed");
  assert.equal(edge.wroteOrder(), false);
});

test("Mercado Pago site: cash order follows approved delivery and never contacts gateway", async () => {
  const edge = await isolatedHandler("create-order");
  const response = await edge.send(makeOrder("cash", special()));
  assert.equal(response.status, 201);
  assert.equal(response.json.payment.status, "pending");
  assert.equal(response.json.payment.payable_on_receipt, true);
  assert.equal(edge.rpc("create_store_order").data.p_order.delivery_fee, "10.00");
  assert.equal(edge.rpc("create_store_order").data.p_order.total, "30.00");
  assert.equal(edge.calls.filter(c => c.url === MP_URL).length, 0);
});

test("Mercado Pago site: Pix uses fake gateway and never marks an unaccredited order paid", async () => {
  const edge = await isolatedHandler("create-order");
  const response = await edge.send(makeOrder("mercado_pago_pix", city()));
  assert.equal(response.status, 201);
  assert.equal(response.json.payment.status, "action_required");
  assert.equal(response.json.order.payment_status, "pending");
  assert.equal(edge.rpc("create_store_order").data.p_order.total, "28.00");
  assert.equal(edge.rpc("get_or_create_payment_attempt")?.method, "POST");
  const gateway = edge.calls.filter(c => c.url === MP_URL);
  assert.equal(gateway.length, 1);
  assert.equal(gateway[0].data.total_amount, "28.00");
  assert.equal(gateway[0].data.transactions.payments[0].payment_method.id, "pix");
  assert.equal(edge.rpc("apply_mercadopago_order_event").data.p_gateway_status, "action_required");
  assert.equal(edge.calls.some(c => c.url.includes("process-order-effects")), false);
});

test("Mercado Pago site: payment retry recovers existing attempt without a second gateway request", async () => {
  const edge = await isolatedHandler("create-order", { attempt: {
    id: "attempt-old", status: "pending", mercado_pago_order_id: "mp-existing",
    safe_response: { method: "mercado_pago_pix", status: "action_required" },
  } });
  const result = await edge.send(makeOrder("mercado_pago_pix", city()));
  assert.equal(result.status, 200);
  assert.equal(result.json.idempotent, true);
  assert.equal(edge.calls.filter(c => c.url === MP_URL).length, 0);
});

test("Mercado Pago site: gateway mismatches fail closed and mark attempt unknown", async () => {
  const edge = await isolatedHandler("create-order", { gatewayMismatch: true });
  const response = await edge.send(makeOrder("mercado_pago_pix", city()));
  assert.equal(response.status, 502);
  assert.equal(response.json.error.code, "gateway_response_mismatch");
  assert.equal(edge.rpc("apply_mercadopago_order_event"), undefined);
  const patches = edge.calls.filter(c => c.url.includes("/payment_attempts?"));
  assert.equal(patches.at(-1)?.data.status, "unknown");
});

test("Both endpoints reject unknown localities before attempting to persist an order", async () => {
  for (const slug of ["create-order", "create-whatsapp-order"]) {
    const edge = await isolatedHandler(slug);
    const input = makeOrder(slug === "create-order" ? "cash" : "manual_pix",
      { ...city(), locality_id: "inventado", zone_id: "cidade" }, "28.00");
    const result = await edge.send(input);
    assert.equal(result.status, 400, slug);
    assert.equal(edge.wroteOrder(), false, slug);
  }
});

test("Both endpoints reject foreign origins before consulting store or payment", async () => {
  for (const slug of ["create-order", "create-whatsapp-order"]) {
    const edge = await isolatedHandler(slug);
    const input = makeOrder(slug === "create-order" ? "cash" : "manual_pix", city(), "28.00");
    const result = await edge.send(input, { origin: "https://evil.invalid" });
    assert.equal(result.status, 403, slug);
    assert.equal(edge.calls.length, 0, slug);
  }
});
