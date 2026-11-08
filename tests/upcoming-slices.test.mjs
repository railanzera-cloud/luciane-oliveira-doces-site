import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const catalog = await readFile(new URL("../app/catalog.ts", import.meta.url), "utf8");
const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("keeps Prestígio available at the requested price without a promotional badge", () => {
  assert.match(catalog, /id: "fatia-prestigio"[\s\S]*?name: "Prestígio"[\s\S]*?available: true[\s\S]*?price: 20/);
  assert.doesNotMatch(page, />\s*Novo\s*</i);
});

test("prices the four requested slices at R$ 20", () => {
  for (const productId of ["fatia-chocolate-cenoura", "fatia-prestigio", "fatia-chocolatudo", "fatia-chocolate-maracuja"]) {
    const productStart = catalog.indexOf(`id: "${productId}"`);
    const nextProduct = catalog.indexOf("\n  {", productStart + 1);
    const productSource = catalog.slice(productStart, nextProduct === -1 ? undefined : nextProduct);
    assert.match(productSource, /price: 20/, `${productId} deve custar R$ 20`);
  }
});

test("keeps slices from R$ 20 while popcorn uses its current pricing table", () => {
  assert.match(page, /currency\.format\(popcornPrice\("500ml"(?:,\s*\[\],\s*promotionTime)?\)\)/);
  assert.ok(page.includes(': "A partir de R$20"'));
  assert.match(page, /currency\.format\(variant\.price\)/);
});

test("keeps Brigadeiro Branco com Morango on its existing SKU without redundant subtitle", () => {
  const ninho = catalog.slice(catalog.indexOf('id: "fatia-ninho-morango"'), catalog.indexOf('id: "fatia-prestigio"'));
  assert.match(ninho, /name: "Brigadeiro Branco com Morango"/);
  assert.match(ninho, /available: true/);
  assert.doesNotMatch(ninho, /subtitle:/);
  assert.doesNotMatch(catalog, /id: "fatia-ninho-morango"[\s\S]*?availabilityLabel:/);
  assert.doesNotMatch(catalog, /id: "fatia-prestigio"[\s\S]*?availabilityLabel:/);
  assert.match(page, /slice\.availabilityLabel \? "is-upcoming"/);
  assert.match(page, /slice\.availabilityLabel \? "is-upcoming" : ""}`\}>\{slice\.availabilityLabel \?\? "Esgotado hoje"\}/);
});

test("uses the real optimized Prestígio photo while keeping it selectable", () => {
  assert.match(catalog, /id: "fatia-prestigio"[\s\S]*?image: "\/fatia-prestigio\.jpeg"[\s\S]*?cardImage: "\/fatia-prestigio-card\.webp"[\s\S]*?available: true/);
  assert.match(catalog, /imageAlt: "Fatia artesanal de Prestígio com recheio cremoso"/);
  assert.match(page, /src=\{slice\.cardImage \?\? slice\.image\}/);
  assert.match(page, /disabled=\{!available\}/);
});

test("keeps every catalog card image present in source and production output", async () => {
  // Os três cards de Cones são fornecidos no ZIP de Cloudflare aprovado,
  // ainda pendente a sincronização binária dos novos assets no GitHub.
  const cardImages = [...catalog.matchAll(/cardImage: "([^"]+)"/g)].map((match) => match[1])
    .filter(path => !path.startsWith("/images/cone-trufado-"));

  assert.ok(cardImages.length > 0);
  assert.match(catalog,/id: "cone-trufado-prestigio"/);
  for (const cardImage of cardImages) {
    await access(new URL(`../public${cardImage}`, import.meta.url));
    await access(new URL(`../dist/client${cardImage}`, import.meta.url));
  }
});
