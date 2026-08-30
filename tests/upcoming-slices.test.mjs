import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

test("shows both enabled menus from R$ 20", () => {
  assert.match(page, /draftSubtotal === null\s*\? "A partir de R\$20"/);
  assert.match(page, /facts: \["A partir de R\$20", "Calda grátis e separada"\]/);
  assert.match(page, /facts: \["A partir de R\$20", "Até 3 sabores"\]/);
});

test("makes Ninho com Morango in white batter available without a date notice", () => {
  assert.match(catalog, /id: "fatia-ninho-morango"[\s\S]*?subtitle: "Massa branca"[\s\S]*?available: true/);
  assert.doesNotMatch(catalog, /id: "fatia-ninho-morango"[\s\S]*?availabilityLabel:/);
  assert.doesNotMatch(catalog, /id: "fatia-prestigio"[\s\S]*?availabilityLabel:/);
  assert.match(page, /slice\.availabilityLabel \? "is-upcoming"/);
  assert.match(page, /slice\.availabilityLabel \? "is-upcoming" : ""}`\}>\{slice\.availabilityLabel \?\? "Esgotado hoje"\}/);
});

test("uses the real optimized Prestígio photo while keeping it selectable", () => {
  assert.match(catalog, /id: "fatia-prestigio"[\s\S]*?image: "\/fatia-prestigio\.jpeg"[\s\S]*?cardImage: "\/fatia-prestigio-card\.webp"[\s\S]*?available: true/);
  assert.match(catalog, /imageAlt: "Fatia artesanal de Prestígio com recheio cremoso"/);
  assert.match(page, /src=\{slice\.cardImage \?\? slice\.image\}/);
  assert.match(page, /disabled=\{!slice\.available \|\| !variant\.available\}/);
});
