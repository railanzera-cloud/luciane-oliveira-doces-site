// Run against an isolated `wrangler pages dev` of the generated Pages package.
// Local HTTP only; does not submit orders or load third-party tracking scripts.
import assert from 'node:assert/strict';
const base = process.argv[2] || 'http://127.0.0.1:8791';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'Local runtime only');
const cases = [
  ['/ig', 'instagram', 'bio_instagram'],
  ['/fb', 'facebook', 'bio_facebook'],
  ['/stories', 'instagram', 'stories_organico'],
  ['/status', 'whatsapp', 'status_whatsapp'],
  ['/ig?fbclid=TESTE123', 'instagram', 'bio_instagram'],
  ['/stories?utm_content=teste_story&fbclid=TESTE456', 'instagram', 'stories_organico'],
  ['/ig?utm_campaign=campanha_manual&fbclid=TESTE789', 'instagram', 'campanha_manual'],
  ['/fb?utm_source=manual&utm_medium=&utm_campaign=one&utm_campaign=two&utm_content=c&utm_term=t&utm_id=42&tintim_fbid=tt&fbclid=fb&extra=a%2Bb&extra=c', 'manual', 'one'],
];
for (const [path, source, campaign] of cases) {
  const input = new URL(path, base);
  const response = await fetch(input, { redirect: 'manual' });
  assert.equal(response.status, 302, path);
  const target = new URL(response.headers.get('location'));
  assert.equal(target.origin, input.origin);
  assert.equal(target.pathname, '/');
  assert.equal(target.searchParams.get('utm_source'), source);
  assert.equal(target.searchParams.get('utm_campaign'), campaign);
  assert.equal(target.searchParams.get('utm_medium'), input.searchParams.get('utm_medium') ?? 'organic_social');
  for (const key of new Set(input.searchParams.keys())) {
    assert.deepEqual(target.searchParams.getAll(key), input.searchParams.getAll(key));
  }
  const home = await fetch(target, { redirect: 'manual' });
  assert.equal(home.status, 200, 'Home must not redirect again');
  assert.equal(home.headers.get('location'), null);
  const html = await home.text();
  assert.match(html, /Luciane Oliveira Doces/);
  assert.match(html, /s\.tintim\.app/);
  assert.match(html, /connect\.facebook\.net/);
  const assets = [...new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^"#?]+)"/g)].map(match => match[1]))];
  assert.ok(assets.some(asset => asset.endsWith('.js')));
  assert.ok(assets.some(asset => asset.endsWith('.css')));
  for (const asset of assets) {
    const result = await fetch(new URL(asset, base), { redirect: 'manual' });
    assert.equal(result.status, 200, asset);
    assert.doesNotMatch(result.headers.get('content-type') || '', /text\/html/, asset);
    await result.arrayBuffer();
  }
  console.log(`PASS ${path} -> ${target.pathname}${target.search} -> 200; ${assets.length} assets OK`);
}
for (const path of ['/admin/', '/pedido/']) {
  const result = await fetch(new URL(path, base), { redirect: 'manual' });
  assert.equal(result.status, 200, path);
  assert.match(result.headers.get('content-type'), /text\/html/);
  console.log(`PASS unchanged static route ${path}: 200`);
}
const missing = await fetch(new URL('/unrelated-missing-path', base), { redirect: 'manual' });
assert.equal(missing.status, 404);
assert.match(await missing.text(), /Luciane Oliveira Doces/);
console.log('PASS existing 404.html home fallback preserved (404)');
