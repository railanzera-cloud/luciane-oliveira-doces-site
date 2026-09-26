import assert from "node:assert/strict";
import { createHmac, webcrypto, createHash } from "node:crypto";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { prepare } from "./prepare-signature-1002-v2.mjs";

const require = createRequire(import.meta.url);
const dependencies = process.env.LOD_DIAGNOSTIC_MODULES;
const resolveModule = (name) => require(require.resolve(name, dependencies ? { paths: [dependencies] } : undefined));
const ts = resolveModule("typescript");
const sdk = resolveModule("mercadopago/dist/utils/webhook/index.js");
const source = await prepare("2026-09-26T17:00:00Z", "2026-09-26T18:00:00Z");
const transpiled = ts.transpileModule(source.replace(/import\s*\{[\s\S]*?\}\s*from\s*"npm:mercadopago@3\.6\.1";/, ""), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }, reportDiagnostics: true,
});
assert.equal(transpiled.diagnostics.length, 0);
const id = "ORDTST01M2ZHGZHNSJEQ8D9Z5EF6YKDT";
const requestId = "ac391188-3333-4444-aaaa-123456789abc";
const secret = "fake-secret-do-not-log";
const tsValue = "1790442000";
const hash = (dataId = id, req = requestId) => createHmac("sha256", secret)
  .update(`id:${dataId};${req ? `request-id:${req};` : ""}ts:${tsValue};`).digest("hex");
const signature = `ts=${tsValue},v1=${hash()}`;
const body = { application_id: 7382535553656845, data: { id }, live_mode: false, private_fixture: "never-log-customer" };
function fixture(options = {}) {
  let handler;
  const logs = [], calls = [];
  const env = { PAYMENTS_ENVIRONMENT: options.environment ?? "test", MP_WEBHOOK_SECRET_TEST: secret,
    MP_ACCESS_TOKEN_TEST: "fake-access-token-do-not-log" };
  class Clock extends Date { static now() { return Date.parse(options.now ?? "2026-09-26T17:30:00Z"); } }
  vm.runInNewContext(transpiled.outputText, {
    ...sdk, crypto: options.crypto ?? webcrypto, Date: Clock, Request, Response, Headers, URL, TextEncoder, TextDecoder,
    AbortController, DOMException, setTimeout, clearTimeout,
    console: { error: (...args) => logs.push(args), warn: (...args) => logs.push(args) },
    Deno: { env: { get: name => env[name] }, serve: fn => { handler = fn; } },
    fetch: async (...args) => { calls.push(args); throw new Error("Network disabled in test"); },
  });
  return { calls, logs, invoke: async (overrides = {}) => {
    const headers = { "x-request-id": requestId, "x-signature": signature, ...overrides.headers };
    Object.keys(headers).forEach(key => { if (headers[key] === null) delete headers[key]; });
    const req = new Request(`https://fixture.invalid/webhook?${overrides.query ?? `data.id=${id}`}`, {
      method: "POST", headers, body: overrides.raw ?? JSON.stringify(overrides.body ?? body),
    });
    const response = await handler(req);
    const entry = logs.find(row => row[0] === "lod_mp_signature_1002_v2");
    return { response, report: entry ? JSON.parse(entry[1]) : null };
  } };
}
async function observe(overrides, options) {
  const f = fixture(options), result = await f.invoke(overrides);
  assert.equal(result.response.status, 409);
  assert.equal(f.calls.length, 0, "No financial lookup, SQL or effect request permitted");
  assert.equal((await result.response.json()).effects_blocked, true);
  for (const forbidden of [secret, "fake-access-token-do-not-log", "never-log-customer", signature, hash(), requestId,
    `id:${id};request-id:${requestId};ts:${tsValue};`]) {
    assert.ok(!JSON.stringify(f.logs).includes(forbidden), "Sanitized logs must not leak inputs");
  }
  return result.report;
}
test("valid SDK and HMAC still stop before every financial effect", async () => {
  const r = await observe({});
  assert.equal(r.sdk_valid, true); assert.equal(r.matches_exact_manifest, true);
  assert.equal(r.application_matches, true); assert.equal(r.body_id_matches, true); assert.equal(r.live_mode, false);
  assert.equal(r.runtime_secret_matches_compared_digest, false);
});
test("lowercase ID match is diagnostic only", async () => {
  const r = await observe({ headers: { "x-signature": `ts=${tsValue},v1=${hash(id.toLowerCase())}` } });
  assert.equal(r.sdk_reason, "SignatureMismatch"); assert.equal(r.matches_lowercase_id, true);
  assert.equal(r.matches_exact_manifest, false);
});
test("uppercase hexadecimal is distinguished without accepting it", async () => {
  const r = await observe({ headers: { "x-signature": `ts=${tsValue},v1=${hash().toUpperCase()}` } });
  assert.equal(r.sdk_valid, false); assert.equal(r.v1_has_uppercase, true); assert.equal(r.matches_casefolded_hash, true);
});
test("duplicate query keys and conflicting alias are recorded", async () => {
  const r = await observe({ query: `data.id=${id}&data.id=other&data_id=other` });
  assert.equal(r.query_data_id_count, 2); assert.equal(r.query_ambiguous, true); assert.equal(r.query_values_conflict, true);
});
test("body cannot supply authorization or overwrite independently supplied application ID", async () => {
  const r = await observe({ body: { application_id: "111", data: { id: "other" }, live_mode: true } });
  assert.equal(r.application_matches, false); assert.equal(r.body_id_matches, false); assert.equal(r.live_mode, true);
});
test("absent and unsafe numeric application IDs stay unknown", async () => {
  for (const app of [undefined, 9007199254740992, {}, "not-numeric"]) {
    const r = await observe({ body: { application_id: app } });
    assert.equal(r.application_matches, null); assert.equal(r.live_mode, null); assert.equal(r.body_id_matches, null);
  }
});
test("missing and malformed signature are classified by the pinned official SDK", async () => {
  for (const [value, reason] of [[null, "MissingSignatureHeader"], ["garbage", "MalformedSignatureHeader"],
    ["v1=aaa", "MissingTimestamp"], ["ts=123", "MissingHash"], ["ts=abc,v1=aaa", "MalformedSignatureHeader"]]) {
    const r = await observe({ headers: { "x-signature": value } });
    assert.equal(r.sdk_reason, reason); assert.equal(r.sdk_valid, false);
  }
});
test("missing request ID flags normal-flow rejection even if SDK permits omission", async () => {
  const r = await observe({ headers: { "x-request-id": null, "x-signature": `ts=${tsValue},v1=${hash(id, "")}` } });
  assert.equal(r.sdk_valid, true); assert.equal(r.normal_flow_missing_inputs, true);
});
test("duplicate ts/v1 use official last-populated parsing while counting empty components", async () => {
  const r = await observe({ headers: { "x-signature": `ts=1,v1=aaa,ts=${tsValue},v1=${hash()},v1=` } });
  assert.equal(r.sdk_valid, true); assert.equal(r.matches_exact_manifest, true);
  assert.equal(r.ts_count, 2); assert.equal(r.v1_count, 3);
});
test("oversized inputs are bounded and never logged verbatim", async () => {
  const r = await observe({ headers: { "x-signature": "x".repeat(2049) } });
  assert.equal(r.sdk_valid, null); assert.equal(r.sdk_reason, "DiagnosticHeaderLimit");
  assert.equal(r.signature_sha256, undefined);
});
test("body byte limit and malformed JSON cannot escape diagnostic stop", async () => {
  assert.equal((await observe({ raw: "x".repeat(65537) })).body_state, "too_large");
  assert.equal((await observe({ raw: "invalid-json" })).body_state, "unreadable");
});
test("crypto failure cannot fall through to financial code", async () => {
  const r = await observe({}, { crypto: { subtle: { digest() { throw new Error("fake-secret-do-not-log"); } } } });
  assert.equal(r.diagnostic_failed, true);
});
test("other Order, production and expired/before-start windows do not enter diagnostics", async () => {
  for (const [options, overrides] of [[{}, {query:"data.id=OTHER"}], [{environment:"production"},{}],
    [{now:"2026-09-26T16:59:59Z"},{}], [{now:"2026-09-26T18:00:00Z"},{}]]) {
    const f = fixture(options), r = await f.invoke(overrides);
    assert.equal(r.report, null);
    if (options.now) assert.equal(f.calls.length, 1, "Outside window the original valid flow is restored");
    else assert.equal(f.calls.length, 0);
  }
});
test("preparer rejects absent or wider windows and does not renew automatically", async () => {
  await assert.rejects(prepare(undefined, undefined));
  await assert.rejects(prepare("2026-09-26T17:00:00Z", "2026-09-26T19:00:00Z"));
  assert.equal(createHash("sha256").update(source).digest("hex").length, 64);
});
