import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, devices } from '@playwright/test';
import { origin } from './preview.mjs';

const [destination] = process.argv.slice(2);
const routes = [['vitrine', '/'], ['fatias', '/?categoria=fatias']];
const network = { offline: false, latency: 150, downloadThroughput: 1_638_400 / 8, uploadThroughput: 750_000 / 8 };
const viewport = { width: 390, height: 844 };
const browser = await chromium.launch();

function watchPaints() {
  window.qaPaints = { largest: null, shifts: [] };
  const label = node => node?.id || (typeof node?.className === 'string' && node.className) || node?.nodeName;
  new PerformanceObserver(list => {
    for (const entry of list.getEntries()) {
      window.qaPaints.largest = { time: entry.startTime, element: label(entry.element), url: entry.url };
    }
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver(list => {
    for (const entry of list.getEntries().filter(shift => !shift.hadRecentInput)) {
      window.qaPaints.shifts.push({ time: entry.startTime, score: entry.value, sources: entry.sources.map(source => label(source.node)) });
    }
  }).observe({ type: 'layout-shift', buffered: true });
}

function readLayout() {
  const y = selector => {
    const element = document.querySelector(selector);
    return element ? Math.round(element.getBoundingClientRect().top + scrollY) : null;
  };
  return {
    title: document.querySelector('h1')?.innerText,
    bannerY: y('.natal-home-ribbon'),
    gridY: y('.collection-menu'),
    builderY: y('#configurador'),
    firstSliceY: y('.slice-card'),
    footerY: y('.trust-section'),
    enabledCategoryButtons: document.querySelectorAll('.collection-menu button:not(:disabled), .natal-home-ribbon:not(:disabled)').length,
    enabledOrderButtons: document.querySelectorAll('#configurador .add-button:not(:disabled), .mobile-sticky-bar button:not(:disabled)').length,
  };
}

function largestShiftWindow(shifts) {
  let start = 0;
  let previous = -Infinity;
  let score = 0;
  let largest = 0;
  for (const { time, score: shift } of shifts) {
    if (time - previous >= 1000 || time - start >= 5000) {
      start = time;
      score = 0;
    }
    previous = time;
    score += shift;
    largest = Math.max(largest, score);
  }
  return largest;
}

const records = [];
try {
  for (let run = 1; run <= 3; run++) {
    for (const [name, route] of routes) {
      const context = await browser.newContext({
        ...devices['Pixel 7'], viewport, locale: 'pt-BR', timezoneId: 'America/Belem', serviceWorkers: 'block',
      });
      try {
        const page = await context.newPage();
        const cdp = await context.newCDPSession(page);
        await cdp.send('Network.enable');
        await cdp.send('Network.emulateNetworkConditions', network);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        await context.addInitScript(watchPaints);
        await context.route('**/*', async handle => {
          const url = new URL(handle.request().url());
          if (url.origin !== origin) return handle.abort();
          if (url.pathname.startsWith('/rest/v1/')) {
            // Reproduz a espera comercial em condições idênticas nas duas versões.
            await new Promise(resolve => setTimeout(resolve, 950));
          }
          await handle.continue();
        });
        const response = await page.goto(origin + route, { waitUntil: 'domcontentloaded' });
        if (response.headers()['x-luciane-preview'] !== 'synthetic-local') throw new Error('Origem de QA inválida.');
        const first = await page.evaluate(readLayout);
        if (run === 1) await page.screenshot({ path: path.join(destination, `${name}-inicio.png`) });
        await page.locator('#inicio[aria-busy="false"]').waitFor();
        await page.waitForFunction(() => {
          const visible = [...document.images].filter(img => {
            const box = img.getBoundingClientRect();
            return box.width && box.height && box.bottom > 0 && box.top < innerHeight;
          });
          return visible.length > 0 && visible.every(img => img.complete && img.naturalWidth > 0);
        });
        await page.evaluate(() => document.fonts.ready.then(() => undefined));
        await page.waitForLoadState('networkidle');
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const ready = await page.evaluate(readLayout);
        const paints = await page.evaluate(() => window.qaPaints);
        if (run === 1) await page.screenshot({ path: path.join(destination, `${name}-pronto.png`) });
        records.push({ name, run, first, ready, cls: largestShiftWindow(paints.shifts), ...paints });
        console.log(`Rede móvel ${name}-${run} concluída`);
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
  await writeFile(path.join(destination, 'rede-movel.json'), JSON.stringify({ viewport, network, cpuSlowdown: 4, availabilityDelayMs: 950, records }, null, 2));
}
