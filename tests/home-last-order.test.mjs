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
const { resolveHomeLastOrder: resolve, HOME_LAST_ORDER_WINDOW_MS } = moduleFrom('../lib/home-last-order.ts', { '@/lib/site-order': {} });
const token = 'a'.repeat(48), newer = 'b'.repeat(48);
const FIXED_NOW = Date.UTC(2026,9,1,12);
const CREATED_AT = FIXED_NOW - 3600000;
const expiresAt = CREATED_AT + HOME_LAST_ORDER_WINDOW_MS;
const resolveHomeLastOrder = (source, now = () => FIXED_NOW) => resolve(source, now);
function fixture(status, createdAt = CREATED_AT) {
  let saved = token;
  const calls = [];
  return {
    read: () => saved,
    save: value => { saved = value; },
    load: async value => { calls.push(value); return { order_number: 1021, order_status: status, created_at: new Date(createdAt).toISOString() }; },
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
    for (let i = 0; i < 2; i++) assert.deepEqual(await resolveHomeLastOrder(f), { token, number: 1021, expiresAt });
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
  assert.deepEqual(await resolveHomeLastOrder(f), { token: newer, number: 1021, expiresAt });
});
test('offline and unknown statuses do not invent activity or destroy reference', async () => {
  const f = fixture('unrecognized');
  assert.equal(await resolveHomeLastOrder(f), null);
  f.load = async () => { throw new Error('offline'); };
  assert.equal(await resolveHomeLastOrder(f), null); assert.equal(f.read(), token);
});
test('home lifecycle: no empty wrapper; active token link; refresh, resume, storage and cleanup', async () => {
  let state = null, effect, resolverCalls = 0, pending;
  const cleared=[];
  const handlers = new Map(); const docHandlers = new Map();
  globalThis.window = {
    addEventListener: (k,v) => handlers.set(k,v), removeEventListener: k => handlers.delete(k),
    setTimeout: fn => { handlers.set('expiry',fn); return 8; },
    clearTimeout: () => handlers.delete('expiry'),
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
    '@/lib/home-last-order': { clearHomeLastOrder: value=>cleared.push(value), resolveHomeLastOrder: () => { resolverCalls++; return new Promise(resolve => { pending = resolve; }); } },
  });
  const render = () => renderToStaticMarkup(React.createElement(HomeLastOrderLink, { token }));
  try {
    assert.equal(render(), '');
    const cleanup = effect();
    handlers.get('focus')(); // Deduplicated while initial request is pending.
    assert.equal(resolverCalls, 1);
    pending({ token, number: 1021, expiresAt: Date.now()+3600000 }); await Promise.resolve();
    assert.equal(resolverCalls, 2); // One queued revalidation.
    pending({ token, number: 1021, expiresAt: Date.now()+3600000 }); await Promise.resolve();
    assert.match(render(), new RegExp(`/pedido\\?token=${token}`));
    assert.match(render(), /Pedido #1021/);
    assert.match(render(), /Ver meu último pedido/); assert.doesNotMatch(render(), /em andamento|Acompanhar/);
    handlers.get('expiry')(); assert.equal(render(),''); assert.deepEqual(cleared,[token]);
    for (const event of ['pageshow', 'interval']) {
      handlers.get(event)(); pending(null); await Promise.resolve(); assert.equal(render(), '');
    }
    document.visibilityState = 'hidden'; const before = resolverCalls;
    handlers.get('interval')(); assert.equal(resolverCalls, before);
    document.visibilityState = 'visible'; docHandlers.get('visibilitychange')();
    pending({ token, number: 1021, expiresAt: Date.now()+3600000 }); await Promise.resolve();
    handlers.get('storage')({ key: 'lod-last-tracking-token' }); assert.equal(render(), '');
    pending(null); await Promise.resolve(); cleanup();
    assert.equal(handlers.size, 0); assert.equal(docHandlers.size, 0);
  } finally { delete globalThis.window; delete globalThis.document; }
});

test('six-hour boundary hides and clears recovery; recent orders remain eligible', async () => {
 assert.equal(HOME_LAST_ORDER_WINDOW_MS,6*60*60*1000);
 for(const age of [0,HOME_LAST_ORDER_WINDOW_MS-1]) {
  const f=fixture('new',FIXED_NOW-age);
  assert.ok(await resolveHomeLastOrder(f)); assert.equal(f.read(),token);
 }
 for(const age of [HOME_LAST_ORDER_WINDOW_MS,HOME_LAST_ORDER_WINDOW_MS+1,24*3600000]) {
  const f=fixture('new',FIXED_NOW-age);
  assert.equal(await resolveHomeLastOrder(f),null); assert.equal(f.read(),'');
  assert.equal(await resolveHomeLastOrder(f),null); assert.equal(f.calls.length,1);
 }
});
test('elapsed time is checked after loading; unknown or future dates cannot show recent recovery', async () => {
 const f=fixture('new');
 assert.equal(await resolveHomeLastOrder(f,()=>expiresAt),null); assert.equal(f.read(),'');
 for(const created_at of ['invalid',new Date(FIXED_NOW+1).toISOString()]) {
  const f=fixture('new'); f.load=async()=>({order_number:1021,order_status:'new',created_at});
  assert.equal(await resolveHomeLastOrder(f),null); assert.equal(f.read(),token);
 }
 const invalid=fixture('new'); invalid.save('1047');
 assert.equal(await resolveHomeLastOrder(invalid),null); assert.equal(invalid.calls.length,0);
});
test('device cleanup compares tokens and never clears a newer reference', () => {
 let saved=newer; const removed=[];
 const {clearHomeLastOrder}=moduleFrom('../lib/home-last-order.ts',{'@/lib/site-order':{
  LAST_ORDER_KEY:'lod-last-tracking-token',lastOrderToken:()=>saved,
 }});
 globalThis.window={localStorage:{removeItem:key=>{removed.push(key); saved='';}}};
 try {
  clearHomeLastOrder(token); assert.equal(saved,newer); assert.deepEqual(removed,[]);
  clearHomeLastOrder(newer); assert.equal(saved,''); assert.deepEqual(removed,['lod-last-tracking-token']);
 } finally {delete globalThis.window;}
});
test('expired home recovery does not invalidate old token URLs or public-order-status', async () => {
 const f=fixture('new',FIXED_NOW-24*3600000);
 assert.equal(await resolveHomeLastOrder(f),null);
 const previousFetch=globalThis.fetch; const requests=[];
 const {loadPublicOrderStatus}=moduleFrom('../lib/site-order.ts',{'@/lib/supabase-config':{
  getSupabasePublicConfiguration:()=>({url:'https://fixture.invalid',publishableKey:'public-fixture'}),
 }});
 globalThis.fetch=async(url,options)=>{
  requests.push({url,body:JSON.parse(options.body)});
  return {ok:true,json:async()=>({ok:true,order:{order_number:1021,order_status:'completed',created_at:new Date(FIXED_NOW-24*3600000).toISOString()}})};
 };
 try {
  const order=await loadPublicOrderStatus(token);
  assert.equal(order.order_number,1021); assert.equal(order.order_status,'completed');
  assert.equal(requests[0].url,'https://fixture.invalid/functions/v1/public-order-status');
  assert.deepEqual(requests[0].body,{tracking_token:token});
 } finally {globalThis.fetch=previousFetch;}
});
