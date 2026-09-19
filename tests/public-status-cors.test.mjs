import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../supabase/functions/public-order-status/index.ts", import.meta.url), "utf8");
const preview = "http://terminal.local:4173";
const production = "https://lucianeoliveiradoces.pages.dev";

function harness(environment = {}) {
  const env = {
    PAYMENTS_ENVIRONMENT: "test", SITE_ORDERING_ENABLED: "false",
    SUPABASE_URL: "https://database.example.invalid",
    SUPABASE_PUBLISHABLE_KEYS: '{"default":"fixture-public"}',
    SUPABASE_SECRET_KEYS: '{"default":"fixture-internal"}',
    ...environment,
  };
  const calls = [];
  let handler;
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText, {
    Request, Response, Headers, AbortController, DOMException, setTimeout, clearTimeout,
    console: { error() {} },
    Deno: { env: { get: (key) => env[key] }, serve: (fn) => { handler = fn; } },
    fetch: async (url, options) => {
      calls.push({ url, body: JSON.parse(options.body) });
      return Response.json({ order_number: 1001, payment_status: "paid", total: "50.00", customer_name: "private" });
    },
  });
  return {
    calls,
    request: (origin, { method = "OPTIONS", key = "fixture-public", body = {} } = {}) => handler(new Request("https://edge.example.invalid/public-order-status", {
      method,
      headers: { origin, apikey: key, "content-type": "application/json", "access-control-request-method": "POST", "access-control-request-headers": "apikey,authorization,content-type" },
      ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
    })),
  };
}

test("tracking preview preflight permits only the exact supervised origin", async () => {
  const h = harness();
  const response = await h.request(preview);
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), preview);
  assert.equal(response.headers.get("vary"), "Origin");
  assert.equal(response.headers.get("access-control-allow-methods"), "POST, OPTIONS");
  assert.equal(h.calls.length, 0);
  for (const origin of ["http://terminal.local:4174", "https://terminal.local:4173", "http://localhost:4173", "http://terminal.local.attacker.invalid:4173", "null"]) {
    const rejected = await h.request(origin);
    assert.equal(rejected.status, 403);
    assert.equal(rejected.headers.get("access-control-allow-origin"), null);
  }
});

test("tracking preview closes in production, missing environment, or open public checkout", async () => {
  for (const environment of [{ PAYMENTS_ENVIRONMENT: "production" }, { PAYMENTS_ENVIRONMENT: undefined }, { SITE_ORDERING_ENABLED: "true" }]) {
    const h = harness(environment);
    assert.equal((await h.request(preview)).status, 403);
    assert.equal(h.calls.length, 0);
    assert.equal((await h.request(production)).status, 204);
  }
});

test("tracking preview preserves explicitly configured origins without broadening the list", async () => {
  const configured = "https://approved-preview.example.invalid";
  const h = harness({ CHECKOUT_ALLOWED_ORIGINS: ` ${production}, ${configured} ` });
  for (const origin of [production, configured, preview]) {
    assert.equal((await h.request(origin)).headers.get("access-control-allow-origin"), origin);
  }
  assert.equal((await h.request("https://other.example.invalid")).status, 403);
});

test("tracking preview still requires the public client key and high-entropy token", async () => {
  const h = harness();
  assert.equal((await h.request(preview, { method: "POST", key: "", body: { tracking_token: "a".repeat(48) } })).status, 401);
  assert.equal((await h.request(preview, { method: "POST", body: { order_number: 1001 } })).status, 404);
  assert.equal(h.calls.length, 0);
  const response = await h.request(preview, { method: "POST", body: { tracking_token: "a".repeat(48) } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), preview);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(h.calls[0].body, { p_tracking_token: "a".repeat(48) });
  assert.deepEqual(await response.json(), { ok: true, order: { order_number: 1001, payment_status: "paid", total: "50.00" } });
});
