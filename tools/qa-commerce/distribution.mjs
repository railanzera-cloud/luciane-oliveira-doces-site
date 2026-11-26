import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from '@playwright/test';
import { origin, startPreview } from './preview.mjs';

const publicOrigin = 'https://lucianeoliveiradoces.com.br';
const publicMenu = 'https://edqiwvccmboyayojvuea.supabase.co';
const menuPaths = new Set([
  '/rest/v1/store_settings', '/rest/v1/menu_availability',
  '/rest/v1/rpc/public_crocante_inventory', '/rest/v1/rpc/public_slice_preorder',
]);
const [phase] = process.argv.slice(2);
if (!['referencia', 'candidato', 'oficial', 'pareado'].includes(phase)) throw new Error('Informe a fase da medição de distribuição.');
const reports = fileURLToPath(new URL(`../../outputs/qa-commerce/distribuicao/${phase}/`, import.meta.url));
const routes = [['vitrine', '/'], ['fatias', '/?categoria=fatias']];
const viewport = { width: 390, height: 844 };
const network = { offline: false, latency: 150, downloadThroughput: 1_638_400 / 8, uploadThroughput: 750_000 / 8 };
const cpuSlowdown = 4;
const rounds = 3;

function watchPaint() {
  const trace = window.qaDistribution = { lcp: null, photoMs: null, catalogMs: null, shifts: [], longTasks: [] };
  new PerformanceObserver(list => {
    for (const entry of list.getEntries()) {
      trace.lcp = { ms: entry.startTime, tag: entry.element?.tagName, url: entry.url };
    }
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver(list => {
    for (const entry of list.getEntries()) {
      if (entry.identifier === 'primeira-foto' && trace.photoMs === null) trace.photoMs = entry.startTime;
    }
  }).observe({ type: 'element', buffered: true });
  new PerformanceObserver(list => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) trace.shifts.push({ ms: entry.startTime, value: entry.value });
    }
  }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver(list => trace.longTasks.push(...list.getEntries().map(entry => entry.duration)))
    .observe({ type: 'longtask', buffered: true });
  const observer = new MutationObserver(() => {
    const image = document.querySelector('.collection-choice img, .slice-card img');
    if (!image) return;
    image.setAttribute('elementtiming', 'primeira-foto');
    trace.catalogMs = performance.now();
    observer.disconnect();
  });
  observer.observe(document, { childList: true, subtree: true });
}

function maxShift(shifts) {
  let start = 0;
  let previous = -Infinity;
  let sum = 0;
  let max = 0;
  for (const { ms, value } of shifts) {
    if (ms - previous >= 1000 || ms - start >= 5000) { start = ms; sum = 0; }
    previous = ms;
    sum += value;
    max = Math.max(max, sum);
  }
  return max;
}

function observeNetwork(cdp, target) {
  const requests = new Map();
  const ownOrigin = new URL(target).origin;
  cdp.on('Fetch.requestPaused', event => {
    const { request, requestId, resourceType } = event;
    const address = new URL(request.url);
    const isMenu = menuPaths.has(address.pathname) && (address.origin === publicMenu || address.origin === origin);
    const isDocument = resourceType === 'Document' && address.pathname === '/';
    const isAsset = ['Script', 'Stylesheet', 'Image', 'Font', 'Media'].includes(resourceType)
      && /\.(?:m?js|css|avif|gif|jpe?g|png|svg|webp|woff2?|ico)$/i.test(address.pathname);
    const allowed = (request.method === 'GET' && (isMenu || (address.origin === ownOrigin && (isDocument || isAsset))))
      || (request.method === 'OPTIONS' && isMenu);
    const command = allowed ? 'Fetch.continueRequest' : 'Fetch.failRequest';
    const params = allowed ? { requestId } : { requestId, errorReason: 'BlockedByClient' };
    void cdp.send(command, params).catch(() => {});
  });
  cdp.on('Network.requestWillBeSent', event => {
    const url = new URL(event.request.url);
    requests.set(event.requestId, {
      path: url.pathname, type: event.type, method: event.request.method,
      publicMenu: menuPaths.has(url.pathname), start: event.timestamp,
    });
  });
  cdp.on('Network.requestServedFromCache', event => {
    const record = requests.get(event.requestId);
    if (record) record.cache = true;
  });
  cdp.on('Network.responseReceived', event => {
    const record = requests.get(event.requestId);
    if (!record) return;
    const headers = Object.fromEntries(Object.entries(event.response.headers).map(([key, value]) => [key.toLowerCase(), value]));
    Object.assign(record, {
      type: event.type, status: event.response.status, cache: Boolean(record.cache || event.response.fromDiskCache),
      encoding: headers['content-encoding'] || 'identity', cacheControl: headers['cache-control'],
      edgeCache: headers['cf-cache-status'],
    });
  });
  cdp.on('Network.loadingFinished', event => {
    const record = requests.get(event.requestId);
    if (record) Object.assign(record, { end: event.timestamp, bytes: record.cache ? 0 : event.encodedDataLength });
  });
  return requests;
}

async function measure(browser, target, filename, warmOnly = false) {
  const context = await browser.newContext({
    ...devices['Pixel 7'], viewport, locale: 'pt-BR', timezoneId: 'America/Belem', serviceWorkers: 'block',
  });
  try {
    await context.addInitScript(watchPaint);
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    const requests = observeNetwork(cdp, target);
    await cdp.send('Network.enable');
    await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
    await cdp.send('Network.emulateNetworkConditions', network);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuSlowdown });
    await cdp.send('Performance.enable');
    const results = {};
    for (const profile of ['frio', 'revisita']) {
      if (profile === 'revisita') await page.goto('about:blank');
      requests.clear();
      const before = (await cdp.send('Performance.getMetrics')).metrics;
      const response = await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      if (!response?.ok()) throw new Error(`Navegação HTTP ${response?.status()} em ${target}`);
      if (target.startsWith(origin) && response.headers()['x-luciane-preview'] !== 'synthetic-local') {
        throw new Error('Origem de QA inválida.');
      }
      await page.locator('#inicio[aria-busy="false"]').waitFor({ timeout: 30_000 });
      const image = page.locator('.collection-choice img, .slice-card img').first();
      if (await image.count()) await image.evaluate(element => element.decode().catch(() => {}));
      await page.waitForLoadState('networkidle', { timeout: 10_000 });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const paint = await page.evaluate(() => ({ ...window.qaDistribution,
        title: document.querySelector('h1')?.textContent,
        visiblePhoto: document.querySelector('.collection-choice img, .slice-card img')?.currentSrc,
        fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
      }));
      const after = (await cdp.send('Performance.getMetrics')).metrics;
      const delta = name => 1000 * ((after.find(x => x.name === name)?.value ?? 0) - (before.find(x => x.name === name)?.value ?? 0));
      const all = [...requests.values()];
      const navigationStart = all.find(request => request.type === 'Document')?.start ?? 0;
      const relativeTime = value => value == null ? undefined : Math.round(1000 * (value - navigationStart));
      results[profile] = {
        ...paint, cls: maxShift(paint.shifts), scriptMs: delta('ScriptDuration'),
        mainThreadMs: delta('TaskDuration'), layoutMs: delta('LayoutDuration'),
        resources: all.filter(resource => resource.status || resource.publicMenu).map(({ start, end, ...rest }) => ({
          ...rest, startMs: relativeTime(start), endMs: relativeTime(end),
        })),
      };
      if (filename && profile === 'frio') await page.screenshot({ path: filename });
      if (warmOnly) return;
    }
    return results;
  } finally {
    await context.close();
  }
}

await mkdir(reports, { recursive: true });
const browser = await chromium.launch();
const result = { viewport, network, cpuSlowdown, rounds, measurements: [] };
const profiles = phase === 'oficial' ? ['oficial'] : phase === 'candidato' ? ['pages'] : ['identity', 'pages'];

async function startIsolatedBuild(build) {
  // Vinext keeps process state. Load each build in its own server process.
  const env = { ...process.env, QA_HOST: '127.0.0.1', QA_DELIVERY_PROFILE: 'pages' };
  if (build) env.QA_BUILD_DIR = build;
  const child = spawn(process.execPath, [fileURLToPath(new URL('./preview.mjs', import.meta.url))], { env, stdio: ['ignore', 'pipe', 'inherit'] });
  const finished = once(child, 'exit');
  const stop = async () => {
    if (child.exitCode === null) child.kill();
    await finished;
  };
  const ready = new Promise(resolve => {
    let output = '';
    child.stdout.on('data', chunk => {
      output += chunk;
      if (output.includes(`Prévia comercial com dados simulados em ${origin}`)) resolve();
    });
  });
  let deadline;
  try {
    await Promise.race([ready, finished.then(([code]) => { throw new Error(`Prévia saiu com código ${code}.`); }),
      new Promise((_, reject) => { deadline = setTimeout(() => reject(new Error('A prévia do pareamento não iniciou.')), 45_000); })]);
    return stop;
  } catch (error) {
    await stop();
    throw error;
  } finally {
    clearTimeout(deadline);
  }
}

async function runProfile(mode, runs, build, label = mode) {
  let stop;
  if (phase === 'pareado') stop = await startIsolatedBuild(build);
  else if (mode !== 'oficial') {
    const preview = await startPreview(undefined, mode);
    stop = () => new Promise(resolve => preview.close(resolve));
  }
  const target = mode === 'oficial' ? publicOrigin : origin;
  try {
    if (stop) for (const [, route] of routes) await measure(browser, target + route, null, true);
    for (const run of runs) {
      for (const [name, route] of routes) {
        const screenshot = run === 1 ? path.join(reports, `${label}-${name}.png`) : null;
        const samples = await measure(browser, target + route, screenshot);
        result.measurements.push({ mode: label, name, run, ...samples });
        console.log(`${label} · ${name} · ${run}/${rounds}`);
      }
    }
  } finally {
    await stop?.();
  }
}
try {
  const runs = Array.from({ length: rounds }, (_, index) => index + 1);
  if (phase === 'pareado') {
    const reference = path.resolve(process.argv[3]);
    for (const run of runs) {
      const builds = [['referencia', reference], ['candidato', undefined]];
      if (run % 2 === 0) builds.reverse();
      for (const [label, build] of builds) await runProfile('pages', [run], build, label);
    }
  } else {
    for (const mode of profiles) await runProfile(mode, runs);
  }
} finally {
  await browser.close();
  await writeFile(path.join(reports, 'medicoes.json'), JSON.stringify(result, null, 2));
}
