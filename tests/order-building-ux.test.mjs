import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("makes popcorn flavor selection explicit", () => {
  assert.match(page, /Escolha os sabores da sua pipoca/);
  assert.match(page, /Escolher meus sabores/);
  assert.match(page, /Escolha pelo menos 1 sabor para adicionar ao pedido/);
});

test("keeps a second product easy to add after the first one", () => {
  assert.match(page, /id="item-adicionado"/);
  assert.match(page, /Adicionar outra fatia/);
  assert.match(page, /Adicionar outra pipoca/);
  assert.match(page, /Outra fatia/);
  assert.match(page, /Outra pipoca/);
  assert.match(page, /Refrigerante/);
});

test("lets the sticky action add a ready second item instead of skipping to checkout", () => {
  assert.match(page, /if \(editingId \|\| draftReady \|\| !cart\.length\)/);
  const stickyLabels = page.slice(page.indexOf('<Button type="button" onClick={stickyAction}'));
  assert.ok(stickyLabels.indexOf("draftReady") < stickyLabels.indexOf("cart.length"));
});

test("explains quantities for repeated and different combinations", () => {
  assert.match(page, /Quantos potes desta combinação\?/);
  assert.match(page, /Quantas fatias deste sabor\?/);
  assert.match(page, /Para outro sabor, adicione este item e escolha a próxima fatia/);
});
