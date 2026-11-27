import assert from 'node:assert/strict';
import test from 'node:test';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';
import { deliveryProfile } from '../tools/qa-commerce/delivery-profile.mjs';

const css = '.example { color: #24130f; }\n'.repeat(100);
async function send(profile, headers, { resource = '/assets/style-B123.css', type = 'text/css', body = css, method = 'GET' } = {}) {
  const response = { writeHead(status, sent) { this.status = status; this.headers = sent; }, end(payload) { this.payload = payload; } };
  await profile({ method, headers }, response, { resource, status: 200, type, body });
  return response;
}

test('the Pages simulation negotiates compression and serves cacheable versioned assets', async () => {
  const pages = deliveryProfile('pages');
  const br = await send(pages, { 'accept-encoding': 'gzip, br' });
  assert.equal(br.headers['Content-Encoding'], 'br');
  assert.equal(brotliDecompressSync(br.payload).toString(), css);
  assert.equal(br.headers.Vary, 'Accept-Encoding');
  assert.match(br.headers['Cache-Control'], /immutable/);
  const gzip = await send(pages, { 'accept-encoding': 'br;q=0, gzip' });
  assert.equal(gzip.headers['Content-Encoding'], 'gzip');
  assert.equal(gunzipSync(gzip.payload).toString(), css);
  const cached = await send(pages, { 'if-none-match': br.headers.ETag });
  assert.equal(cached.status, 304);
  assert.equal(cached.payload, undefined);
  const image = await send(pages, { 'accept-encoding': 'br' }, { resource: '/item.webp', type: 'image/webp' });
  assert.equal(image.headers['Content-Encoding'], undefined);
  assert.match(image.headers['Cache-Control'], /must-revalidate/);
  assert.equal((await send(pages, {}, { method: 'HEAD' })).payload, undefined);
});

test('the uncompressed control sends exactly the original bytes', async () => {
  const identity = await send(deliveryProfile('identity'), { 'accept-encoding': 'gzip, br' });
  assert.equal(identity.headers['Content-Encoding'], undefined);
  assert.equal(identity.headers.ETag, undefined);
  assert.equal(identity.payload.toString(), css);
});
