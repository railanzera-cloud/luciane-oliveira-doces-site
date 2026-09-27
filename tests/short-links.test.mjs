import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../cloudflare/short-links.js';

const origin = 'https://lucianeoliveiradoces.pages.dev';
const cases = [
  ['/ig', 'instagram', 'bio_instagram'],
  ['/fb', 'facebook', 'bio_facebook'],
  ['/stories', 'instagram', 'stories_organico'],
  ['/status', 'whatsapp', 'status_whatsapp'],
];
const noAssets = { ASSETS: { fetch() { throw new Error('Short link reached static fallback'); } } };

for (const [route, source, campaign] of cases) {
  test(`${route}: 302 to same-origin home with organic defaults, then normal HTML without loop`, async () => {
    const response = await worker.fetch(new Request(origin + route), noAssets);
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const location = new URL(response.headers.get('location'));
    assert.equal(location.origin, origin);
    assert.equal(location.pathname, '/');
    assert.deepEqual([...location.searchParams], [
      ['utm_source', source], ['utm_medium', 'organic_social'], ['utm_campaign', campaign],
    ]);
    // Exercise the built application after the redirect, without network calls.
    const { default: app } = await import('../dist/server/index.js');
    const home = await worker.fetch(new Request(location, { headers: { accept: 'text/html' } }), {
      ASSETS: { fetch: (request) => app.fetch(request,
        { ASSETS: { fetch: async () => new Response('Not found', { status: 404 }) } },
        { waitUntil() {}, passThroughOnException() {} }) },
    });
    assert.equal(home.status, 200);
    assert.equal(home.headers.get('location'), null);
    assert.match(await home.text(), /Luciane Oliveira Doces/);
  });
}

for (const route of [
  '/ig?fbclid=TESTE123',
  '/stories?utm_content=teste_story&fbclid=TESTE456',
  '/ig?utm_campaign=campanha_manual&fbclid=TESTE789',
  '/fb?utm_source=manual&utm_medium=&utm_campaign=a&utm_campaign=b&utm_content=c&utm_term=t&utm_id=42&fbclid=x&tintim_fbid=y&unknown=1&unknown=2&encoded=a%2Bb%26c&__proto__=keep',
]) {
  test(`${route}: preserve every incoming key/value and duplicate; defaults only for absent keys`, async () => {
    const input = new URL(origin + route);
    const result = await worker.fetch(new Request(input), noAssets);
    assert.equal(result.status, 302);
    const output = new URL(result.headers.get('location'));
    for (const key of new Set(input.searchParams.keys())) {
      assert.deepEqual(output.searchParams.getAll(key), input.searchParams.getAll(key));
    }
    assert.equal(output.searchParams.getAll('utm_campaign').length, input.searchParams.getAll('utm_campaign').length || 1);
    assert.equal(output.pathname, '/');
  });
}

test('all unrelated paths and queries are passed unchanged to static assets', async () => {
  for (const path of ['/', '/admin', '/pedido?token=fixture', '/assets/app.js', '/missing', '/ig/extra', '/constructor']) {
    const request = new Request(origin + path);
    const expected = new Response('unchanged', { status: 200 });
    const response = await worker.fetch(request, { ASSETS: { fetch(actual) {
      assert.equal(actual, request);
      return expected;
    } } });
    assert.equal(response, expected);
  }
});

test('HEAD redirects preserve host and query without a response body', async () => {
  const response = await worker.fetch(new Request('https://preview.example/ig?utm_campaign=', { method: 'HEAD' }), noAssets);
  assert.equal(response.status, 302);
  const location = new URL(response.headers.get('location'));
  assert.equal(location.origin, 'https://preview.example');
  assert.equal(location.searchParams.get('utm_campaign'), '');
  assert.equal(await response.text(), '');
});
