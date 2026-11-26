import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { deliveryProfile } from './delivery-profile.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
export const origin = 'http://127.0.0.1:8181';
const contentTypes = {
  '.avif': 'image/avif', '.css': 'text/css', '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg', '.js': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.woff': 'font/woff', '.woff2': 'font/woff2',
};
const policy = [
  "default-src 'none'", "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'", "connect-src 'self'",
  "img-src 'self' data:", "font-src 'self' data:", "form-action 'none'",
  "frame-ancestors 'none'", "base-uri 'none'", "sandbox allow-scripts allow-same-origin",
].join('; ');
const browserGuard = `
window.open = () => null;
window.print = () => {};
for (const eventName of ['click', 'auxclick', 'contextmenu']) {
  document.addEventListener(eventName, event => {
    const link = event.target instanceof Element && event.target.closest('a[href]');
    if (link && new URL(link.href, location.href).origin !== location.origin) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
}
`;

async function loadAvailabilityFixtures() {
  const vite = await createViteServer({
    root,
    configFile: false,
    appType: 'custom',
    optimizeDeps: { noDiscovery: true },
    resolve: { alias: { '@': root } },
    server: { middlewareMode: true, hmr: false },
  });
  try {
    const { MENU_AVAILABILITY_ITEMS, TRUFADA_STOCK_ITEM_KEYS } =
      await vite.ssrLoadModule('/app/menu-availability.ts');
    return new Map([
      ['/rest/v1/store_settings', [{ key: 'orders_open', value: true }]],
      ['/rest/v1/menu_availability', MENU_AVAILABILITY_ITEMS.map(item => ({
        item_key: item.itemKey,
        status: item.isDraft ? 'hidden' : 'available',
      }))],
      ['/rest/v1/rpc/public_crocante_inventory', TRUFADA_STOCK_ITEM_KEYS.map(item_key => ({ item_key, available: 30 }))],
      ['/rest/v1/rpc/public_slice_preorder', null],
    ]);
  } finally {
    await vite.close();
  }
}

export async function startPreview(host = '127.0.0.1', delivery, build = path.join(root, 'dist')) {
  const assets = path.join(build, 'client');
  const { default: worker } = await import(pathToFileURL(path.join(build, 'server/index.js')).href);
  const fixtures = await loadAvailabilityFixtures();
  const assetBinding = { fetch: async () => new Response('Not found', { status: 404 }) };
  const execution = { waitUntil() {}, passThroughOnException() {} };
  const simulateDelivery = delivery && deliveryProfile(delivery);
  const snapshots = new Map();
  const server = createServer(async (request, response) => {
    response.setHeader('Content-Security-Policy', policy);
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Luciane-Preview', 'synthetic-local');

    function send(status, type, body) {
      response.writeHead(status, { 'Content-Type': type });
      response.end(request.method === 'HEAD' ? undefined : body);
    }

    try {
      const url = new URL(request.url, origin);
      if (url.origin !== origin) return send(400, 'text/plain', 'Endereço inválido.');
      const pathname = decodeURIComponent(url.pathname);
      if (request.method === 'GET' && fixtures.has(pathname)) {
        return send(200, 'application/json', JSON.stringify(fixtures.get(pathname)));
      }
      if (/^\/(?:rest|auth|functions|storage)\/v1(?:\/|$)/.test(pathname)) {
        return send(503, 'application/json', '{"error":"temporary_failure"}');
      }
      if (!['GET', 'HEAD'].includes(request.method)) {
        return send(405, 'text/plain', 'Prévia local somente leitura.');
      }
      if (pathname === '/__qa/guard.js') {
        return send(200, 'text/javascript; charset=utf-8', browserGuard);
      }
      if (pathname === '/__qa/health') {
        return send(200, 'text/plain', 'synthetic-local');
      }
      const asset = path.resolve(assets, '.' + pathname);
      if (path.relative(assets, asset).startsWith('..')) {
        return send(404, 'text/plain', 'Arquivo indisponível.');
      }
      if ((await stat(asset).catch(() => null))?.isFile()) {
        const type = contentTypes[path.extname(asset)] || 'application/octet-stream';
        if (simulateDelivery) {
          if (!snapshots.has(asset)) snapshots.set(asset, readFile(asset));
          return await simulateDelivery(request, response, { resource: pathname, status: 200, type, body: await snapshots.get(asset) });
        }
        response.writeHead(200, { 'Content-Type': type });
        if (request.method === 'HEAD') return response.end();
        return createReadStream(asset).pipe(response);
      }
      const render = async () => {
        const result = await worker.fetch(new Request(url, {
          headers: { accept: request.headers.accept || 'text/html' },
        }), { ASSETS: assetBinding }, execution);
        const type = result.headers.get('content-type') || 'text/plain';
        const html = await result.text();
        const body = type.includes('text/html')
          ? html.replace('<head>', '<head><script src="/__qa/guard.js"></script>') : html;
        return { resource: pathname, status: result.status, type, body };
      };
      // Only these public documents are pre-rendered for the static Pages simulation.
      if (simulateDelivery && (url.href === origin + '/' || url.href === origin + '/?categoria=fatias')) {
        if (!snapshots.has(url.href)) snapshots.set(url.href, render());
        return await simulateDelivery(request, response, await snapshots.get(url.href));
      }
      const { status, type, body } = await render();
      return send(status, type, body);
    } catch (error) {
      console.error('Erro na prévia local', error.message);
      return send(500, 'text/plain', 'Erro na prévia local.');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(8181, host, resolve);
  });
  return server;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await startPreview(process.env.QA_HOST || '127.0.0.1', process.env.QA_DELIVERY_PROFILE, process.env.QA_BUILD_DIR);
  console.log('Prévia comercial com dados simulados em ' + origin);
}
