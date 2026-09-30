import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';

function moduleFrom(path, dependencies) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } });
  const exports = {};
  new Function('require', 'exports', outputText)((name) => {
    assert.ok(name in dependencies, name);
    return dependencies[name];
  }, exports);
  return exports;
}
const { resolveHomeLastOrder } = moduleFrom('../lib/home-last-order.ts', { '@/lib/site-order': {} });
const token = 'a'.repeat(48), newer = 'b'.repeat(48);
function fixture(status) {
  let saved = token;
  const calls = [];
  return {
    read: () => saved,
    save: value => { saved = value; },
    load: async value => { calls.push(value); return { order_number: 1021, order_status: status }; },
    clear: value => { assert.equal(value, saved); saved = ''; },
    calls,
  };
}
test('no reference: no backend request and no block', async () => {
  const f = fixture('new'); f.save('');
  assert.equal(await resolveHomeLastOrder(f), null); assert.deepEqual(f.calls, []);
});
for (const status of ['payment_pending', 'new', 'confirmed', 'preparing', 'ready', 'ready_for_pickup', 'out_for_delivery']) {
  test(`active ${status}: preserves exact token and real number, including reopen`, async () => {
    const f = fixture(status);
    for (let i = 0; i < 2; i++) assert.deepEqual(await resolveHomeLastOrder(f), { token, number: 1021 });
    assert.equal(f.read(), token); assert.equal(f.calls.length, 2);
  });
}
for (const status of ['cancelled', 'completed']) {
  test(`${status}: removes only local reference, remains absent on reopen`, async () => {
    const f = fixture(status);
    assert.equal(await resolveHomeLastOrder(f), null); assert.equal(f.read(), '');
    assert.equal(await resolveHomeLastOrder(f), null); assert.equal(f.calls.length, 1);
  });
}
test('old response cannot invalidate newer active order', async () => {
  const f = fixture('new'); const load = f.load;
  f.load = async () => { f.save(newer); return { order_status: 'completed' }; };
  assert.equal(await resolveHomeLastOrder(f), null); assert.equal(f.read(), newer);
  f.load = load;
  assert.deepEqual(await resolveHomeLastOrder(f), { token: newer, number: 1021 });
});
test('offline and unknown statuses do not invent activity or destroy reference', async () => {
  const f = fixture('unrecognized');
  assert.equal(await resolveHomeLastOrder(f), null);
  f.load = async () => { throw new Error('offline'); };
  assert.equal(await resolveHomeLastOrder(f), null); assert.equal(f.read(), token);
});
test('home lifecycle: no empty wrapper; active token link; refresh, resume, storage and cleanup', async () => {
  let state = null, effect, resolverCalls = 0, pending;
  const handlers = new Map(); const docHandlers = new Map();
  globalThis.window = {
    addEventListener: (k,v) => handlers.set(k,v), removeEventListener: k => handlers.delete(k),
    setInterval: fn => { handlers.set('interval', fn); return 7; },
    clearInterval: id => { assert.equal(id,7); handlers.delete('interval'); },
  };
  globalThis.document = { visibilityState: 'visible',
    addEventListener: (k,v) => docHandlers.set(k,v), removeEventListener: k => docHandlers.delete(k),
  };
  const { HomeLastOrderLink } = moduleFrom('../components/home-last-order.tsx', {
    'react': { useState: () => [state, value => { state = value; }], useEffect: fn => { effect = fn; } },
    'react/jsx-runtime': jsx,
    '@/lib/site-order': { LAST_ORDER_KEY: 'lod-last-tracking-token', lastOrderToken: () => token },
    '@/lib/home-last-order': { resolveHomeLastOrder: () => { resolverCalls++; return new Promise(resolve => { pending = resolve; }); } },
  });
  const render = () => renderToStaticMarkup(React.createElement(HomeLastOrderLink, { token }));
  try {
    assert.equal(render(), '');
    const cleanup = effect();
    handlers.get('focus')(); // Deduplicated while initial request is pending.
    assert.equal(resolverCalls, 1);
    pending({ token, number: 1021 }); await Promise.resolve();
    assert.equal(resolverCalls, 2); // One queued revalidation.
    pending({ token, number: 1021 }); await Promise.resolve();
    assert.match(render(), new RegExp(`/pedido\\?token=${token}`));
    assert.match(render(), /Pedido #1021 em andamento/);
    for (const event of ['pageshow', 'interval']) {
      handlers.get(event)(); pending(null); await Promise.resolve(); assert.equal(render(), '');
    }
    document.visibilityState = 'hidden'; const before = resolverCalls;
    handlers.get('interval')(); assert.equal(resolverCalls, before);
    document.visibilityState = 'visible'; docHandlers.get('visibilitychange')();
    pending({ token, number: 1021 }); await Promise.resolve();
    handlers.get('storage')({ key: 'lod-last-tracking-token' }); assert.equal(render(), '');
    pending(null); await Promise.resolve(); cleanup();
    assert.equal(handlers.size, 0); assert.equal(docHandlers.size, 0);
  } finally { delete globalThis.window; delete globalThis.document; }
});
