import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("makes popcorn flavor selection explicit", () => {
  assert.match(page, /Escolha os sabores da sua pipoca/);
  assert.match(page, /Escolher meus sabores/);
  assert.match(page, /Escolha pelo menos 1 sabor para adicionar ao pedido/);
});

test("starts popcorn and slice choices empty", () => {
  assert.doesNotMatch(page, /DEFAULT_POPCORN_VARIANT_ID|DEFAULT_SLICE_PRODUCT_ID/);
  assert.match(page, /\[popcornVariantId, setPopcornVariantId\] = useState\(""\)/);
  assert.match(page, /\[sliceProductId, setSliceProductId\] = useState\(""\)/);
  assert.match(page, /setPopcornVariantId\(""\)/);
  assert.match(page, /setSliceProductId\(""\)/);
});

test("guides dependent steps only after a conscious first choice", () => {
  assert.match(page, /Primeiro escolha o tamanho\. Depois, os sabores serão liberados/);
  assert.match(page, /const disabled = waitingForSize \|\| !option\.available \|\| limitDisabled/);
  assert.match(page, /Primeiro escolha sua fatia acima/);
  assert.match(page, /disabled=\{!selectedSlice \|\| !sauce\.available\}/);
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
  assert.match(page, /if \(editingId \|\| builderEngaged \|\| draftReady \|\| !cart\.length\)/);
  assert.match(page, /setBuilderEngaged\(true\)/);
  assert.match(page, /setBuilderEngaged\(false\)/);
  assert.match(page, /stickyButtonLabel/);
  assert.match(page, /Escolher tamanho/);
  assert.match(page, /Escolher minha fatia/);
});

test("explains quantities for repeated and different combinations", () => {
  assert.match(page, /Quantos potes desta combinação\?/);
  assert.match(page, /Quantas fatias deste sabor\?/);
  assert.match(page, /Para outro sabor, adicione este item e escolha a próxima fatia/);
});
