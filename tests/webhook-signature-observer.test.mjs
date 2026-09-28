import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHmac, webcrypto } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = await readFile(new URL('../supabase/functions/mercadopago-webhook/index.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source.replace(/import\s*\{[\s\S]*?\}\s*from\s*"npm:mercadopago@3\.6\.1";/, ''), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const id = 'ORDTST01M3FP3FQBJZWNBNX3YWPZHKJ8';
const secret = 'observer-fixture-secret-not-a-real-secret';
const rid = 'observer-fixture-request';
const timestamp = '1790607600';
const start = Date.parse('2026-09-28T15:00:00Z');
const end = Date.parse('2026-09-29T15:00:00Z');
const sign = (dataId = id, requestId = rid) => `ts=${timestamp},v1=${createHmac('sha256', secret)
  .update(`${dataId ? `id:${dataId};` : ''}${requestId ? `request-id:${requestId};` : ''}ts:${timestamp};`).digest('hex')}`;
const official = process.env.LOD_MP_SDK_WEBHOOK_PATH
  ? createRequire(import.meta.url)(process.env.LOD_MP_SDK_WEBHOOK_PATH) : null;

function fixture({ now = start + 1000, crypto = webcrypto, loggerFails = false } = {}) {
  const logs = [], calls = [];
  let handler;
  class SignatureError extends Error { constructor(reason) { super('fixture'); this.reason = reason; } }
  const validator = official?.WebhookSignatureValidator ?? { validate({ xSignature, xRequestId, dataId }) {
    const pairs = Object.fromEntries((xSignature ?? '').split(',').map(p => {
      const n = p.indexOf('='); return [p.slice(0, n).trim().toLowerCase(), p.slice(n + 1).trim()];
    }).filter(([k, v]) => k && v));
    const expected = sign(dataId?.trim(), xRequestId?.trim()).split('v1=')[1];
    if (pairs.ts !== timestamp || pairs.v1 !== expected) throw new SignatureError('SignatureMismatch');
  } };
  const env = { PAYMENTS_ENVIRONMENT: 'test', MP_WEBHOOK_SECRET_TEST: secret,
    MP_ACCESS_TOKEN_TEST: 'fixture-access-token', SUPABASE_URL: 'https://fixture.invalid',
    SUPABASE_SECRET_KEYS: '{"default":"fixture-backend-key"}',
    SB_EXECUTION_ID: '5c28a664-7e52-4812-a455-90b6037a2281' };
  const context = vm.createContext({
    WebhookSignatureValidator: validator,
    InvalidWebhookSignatureError: official?.InvalidWebhookSignatureError ?? SignatureError,
    crypto, Request, Response, Headers, URL, TextEncoder, TextDecoder, AbortController, DOMException,
    setTimeout, clearTimeout, Date: class extends Date { static now() { return now; } },
    console: { error() {}, warn(...args) {
      if (loggerFails && args[0] === 'lod_mp_signature_1003_v1') throw new Error(secret);
      logs.push(args);
    } },
    Deno: { env: { get: key => env[key] }, serve: fn => { handler = fn; } },
    fetch: async (url, options = {}) => {
      calls.push({ url, body: options.body && JSON.parse(options.body) });
      if (url === `https://api.mercadopago.com/v1/orders/${id}`) return Response.json({
        id, external_reference: 'LOD-0926-CTST-7K3M', total_amount: '25.00', country_code: 'BRA',
        status: 'canceled', status_detail: 'expired', live_mode: false,
        transactions: { payments: [{ id: 'PAY-FIXTURE', status: 'expired', status_detail: 'expired' }] },
      });
      if (url.endsWith('/rpc/apply_mercadopago_order_event')) return Response.json({ changed_to_paid: false });
      throw new Error('Unexpected fixture network request');
    },
  });
  vm.runInContext(code, context);
  const request = (signature = sign(), body = JSON.stringify({ type: 'order', action: 'order.canceled', data: { id }, live_mode: false })) => new Request(
    `https://fixture.invalid/webhook?data.id=${id}&type=order`, { method: 'POST',
      headers: { 'content-type': 'application/json', 'x-signature': signature, 'x-request-id': rid }, body });
  const report = () => {
    const entries = logs.filter(([tag]) => tag === 'lod_mp_signature_1003_v1');
    assert.equal(entries.length, 1); return JSON.parse(entries[0][1]);
  };
  return { logs, calls, env, context, request, report,
    invoke: (...args) => handler(request(...args)),
    invokeRequest: req => handler(req),
    observe: async ({ signature = sign(), requestId = rid, bodyId = id, url, req, dataId = id, environment = 'test' } = {}) => {
      const r = req ?? request(signature, JSON.stringify({ data: { id: bodyId }, live_mode: false }));
      await context.observeSignature1003(r, url ?? new URL(r.url), dataId, signature, requestId, secret, environment);
    } };
}

test('exact original ID matches both SDK and manual HMAC without consuming original body', async () => {
  const f = fixture(); const req = f.request(); await f.observe({ req });
  assert.equal(f.report().sdk_valid, true); assert.equal(f.report().matches_sdk_manifest, true);
  assert.equal(f.report().matches_lowercase_id, false);
  assert.equal((await req.json()).data.id, id);
});
test('lowercase match never authorizes an SDK-rejected notification', async () => {
  const f = fixture(); const response = await f.invoke(sign(id.toLowerCase()));
  assert.equal(response.status, 401); assert.equal(f.calls.length, 0);
  assert.equal(f.report().sdk_valid, false); assert.equal(f.report().matches_lowercase_id, true);
  assert.equal(f.report().matches_sdk_manifest, false);
});
test('body ID source can match independently and does not authorize', async () => {
  const f = fixture();
  const response = await f.invoke(sign('OTHER-BODY-ID'), JSON.stringify({ data: { id: 'OTHER-BODY-ID' } }));
  assert.equal(response.status, 401); assert.equal(f.calls.length, 0);
  assert.equal(f.report().matches_body_id, true); assert.equal(f.report().body_id_matches_query, false);
});
test('body lowercase hypothesis is compared separately', async () => {
  const f = fixture(); await f.observe({ bodyId: 'OTHER-ID', signature: sign('other-id') });
  assert.equal(f.report().matches_body_id, false); assert.equal(f.report().matches_body_lowercase_id, true);
});
test('conflicting repeated query and alias IDs survive analysis without logging values', async () => {
  const f = fixture(); const url = new URL(f.request().url);
  url.searchParams.append('data.id', 'SECOND'); url.searchParams.append('data_id', 'ALIAS');
  await f.observe({ url, signature: sign('ALIAS') });
  assert.equal(f.report().query_id_count, 2); assert.equal(f.report().alias_id_count, 1);
  assert.equal(f.report().query_ids_conflict, true); assert.equal(f.report().matches_alternative_query_id, true);
});
test('raw versus trimmed request ID is distinguished at helper boundary', async () => {
  // Fetch Headers may already trim whitespace; do not pretend original wire bytes are accessible.
  const f = fixture(); await f.observe({ requestId: ` ${rid} `, signature: sign(id, ` ${rid} `) });
  assert.equal(f.report().matches_raw_request_id, true); assert.equal(f.report().matches_sdk_manifest, false);
  assert.equal(f.report().request_id_trim_changes, true);
  const g = fixture(); await g.observe({ requestId: ` ${rid} ` });
  assert.equal(g.report().matches_raw_request_id, false); assert.equal(g.report().matches_sdk_manifest, true);
});
test('duplicate ts/v1 parsing agrees with SDK last nonempty values', async () => {
  const f = fixture(); await f.observe({ signature: `TS=1,V1=bad,${sign()},ts=,v1=` });
  assert.equal(f.report().ts_count, 3); assert.equal(f.report().v1_count, 3);
  assert.equal(f.report().matches_sdk_manifest, true); assert.equal(f.report().sdk_valid, true);
});
for (const [label, options, observe] of [
  ['before window', { now: start - 1 }, {}], ['expired window', { now: end }, {}],
  ['other ID', {}, { dataId: 'OTHER' }], ['production', {}, { environment: 'production' }],
  ['GET', {}, { req: new Request('https://fixture.invalid') }],
]) test(`observer is silent for ${label}`, async () => {
  const f = fixture(options); await f.observe(observe); assert.equal(f.logs.length, 0);
});
test('crypto failure is contained and rejection remains 401 without API or database calls', async () => {
  const f = fixture({ crypto: { subtle: { digest() { throw new Error(secret); } } } });
  assert.equal((await f.invoke(sign(id.toLowerCase()))).status, 401);
  assert.equal(f.calls.length, 0); assert.equal(f.report().diagnostic_failed, true);
  assert.ok(!JSON.stringify(f.logs).includes(secret));
});
test('logger failure is contained and original valid financial path is unchanged', async () => {
  const f = fixture({ loggerFails: true }); assert.equal((await f.invoke()).status, 200);
  assert.equal(f.calls.length, 2); assert.equal(f.calls[1].body.p_gateway_status, 'canceled');
});
test('valid flow with observer and without active window has identical response and API payloads', async () => {
  const active = fixture(), inactive = fixture({ now: end });
  const a = await active.invoke(), b = await inactive.invoke();
  assert.equal(a.status, b.status); assert.deepEqual(await a.json(), await b.json());
  assert.deepEqual(active.calls, inactive.calls);
});
test('clone failure preserves both rejected and accepted original flows', async () => {
  for (const [signature, status, callCount] of [[sign(id.toLowerCase()), 401, 0], [sign(), 200, 2]]) {
    const f = fixture(); const req = f.request(signature);
    req.clone = () => { throw new Error(secret); };
    assert.equal((await f.invokeRequest(req)).status, status);
    assert.equal(f.calls.length, callCount);
    assert.equal(f.report().diagnostic_failed, true);
    assert.ok(!JSON.stringify(f.logs).includes(secret));
  }
});
test('oversized and malformed bodies are bounded and do not expose their contents', async () => {
  for (const [body, state] of [['x'.repeat(65537), 'too_large'], ['private-invalid-body', 'unreadable']]) {
    const f = fixture(); await f.observe({ req: f.request(sign(), body) });
    assert.equal(f.report().body_state, state);
  }
});
test('slow body times out once and emits no late second record', async () => {
  const f = fixture();
  const req = { method: 'POST', clone: () => ({ body: new ReadableStream({}) }) };
  const before = performance.now(); await f.observe({ req, url: new URL(f.request().url) });
  assert.ok(performance.now() - before < 1500); assert.equal(f.report().timed_out, true);
  await new Promise(r => setTimeout(r, 20)); f.report();
});
test('oversized headers skip collection', async () => {
  const f = fixture(); await f.observe({ signature: 'x'.repeat(2049) }); assert.equal(f.report().input_limit, true);
});
test('logs only contain allowlisted metadata, numbers and booleans, never input material', async () => {
  const f = fixture(); await f.observe(); const report = f.report();
  const allowedStrings = ['diagnostic', 'sdk', 'observed_at', 'scoped_resource', 'execution_id', 'sdk_reason', 'body_state'];
  for (const [key, value] of Object.entries(report)) {
    if (!allowedStrings.includes(key)) assert.ok(['boolean', 'number'].includes(typeof value), key);
  }
  const serialized = JSON.stringify(f.logs);
  for (const forbidden of [id, secret, rid, sign(), sign().split('v1=')[1], 'fixture-access-token', 'request-id:', 'live_mode']) {
    assert.ok(!serialized.includes(forbidden), forbidden);
  }
});
