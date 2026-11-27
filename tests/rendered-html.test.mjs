import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders production metadata without a development preview marker", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.doesNotMatch(html, developmentPreviewMeta);
  assert.match(html, /<title>Luciane Oliveira Doces \| Fatias de Chocottone, Cascão Trufado, Pipocas e Fatias<\/title>/);
  // A palavra pode estar no bundle; SKUs só podem ser escolhidos após disponibilidade remota.
  assert.doesNotMatch(html, /coca-cola-220/i);
  assert.match(html, /Escolha seu <em>doce/);
  assert.match(html, /Consultando o cardápio/);
  assert.doesNotMatch(html, /id="configurador"/);
});

test("renders the admin route without exposing protected controls before auth", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("admin-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/admin", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Pedidos e cardápio \| Luciane Oliveira Doces<\/title>/);
  // Sem chaves de Supabase no CI, a tela segura de login pode ser renderizada diretamente.
  assert.match(html, /Verificando acesso|admin-login-page|Luciane Oliveira Doces/);
  assert.doesNotMatch(html, />PEDIDOS</);
  assert.doesNotMatch(html, /Controle do cardápio<\/span>/);
});

test("ships panel styles only to admin and retains shared storefront loading styles", async () => {
  const { default: worker } = await import("../dist/server/index.js");
  async function stylesFor(path) {
    const response = await worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
      { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
      { waitUntil() {}, passThroughOnException() {} });
    assert.equal(response.status, 200);
    const html = await response.text();
    const files = [...html.matchAll(/\bhref="(\/assets\/[^"?]+\.css)"/g)].map(match => match[1]);
    assert.ok(files.length > 0, `Missing CSS for ${path}`);
    return (await Promise.all(files.map(file => readFile(new URL(`../dist/client${file}`, import.meta.url), "utf8")))).join("\n");
  }
  const [home, tracking, admin] = await Promise.all([stylesFor("/"), stylesFor("/pedido"), stylesFor("/admin")]);
  for (const css of [home, tracking]) {
    assert.match(css, /\.admin-spinner\b/);
    assert.doesNotMatch(css, /\.admin-(?:login-card|main-tabs|kitchen-settings)\b/);
  }
  for (const selector of ["admin-login-card", "admin-main-tabs", "admin-kitchen-settings", "admin-spinner"]) {
    assert.ok(admin.includes(`.${selector}`), `Missing admin style ${selector}`);
  }
});
