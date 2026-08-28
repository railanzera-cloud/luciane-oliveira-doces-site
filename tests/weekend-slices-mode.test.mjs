import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const catalog = await readFile(new URL("../app/catalog.ts", import.meta.url), "utf8");
const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");

test("keeps popcorn data while temporarily disabling its category", () => {
  assert.match(catalog, /enabledCategories:\s*\{\s*pipocas: false,\s*fatias: true,/s);
  assert.match(catalog, /id: "pipoca-gourmet"/);
  assert.match(catalog, /export const POPCORN = PRODUCTS\.find/);
});

test("opens the only enabled category and blocks disabled category navigation", () => {
  assert.match(page, /const DEFAULT_CATEGORY: CategoryId = STORE_CONFIG\.enabledCategories\.pipocas \? "pipocas" : "fatias"/);
  assert.match(page, /useState<CategoryId>\(DEFAULT_CATEGORY\)/);
  assert.match(page, /if \(!isCategoryEnabled\(category\)\) return/);
  assert.match(page, /STORE_CONFIG\.enabledCategories\.pipocas && STORE_CONFIG\.enabledCategories\.fatias/);
  assert.match(layout, /STORE_CONFIG\.enabledCategories\.pipocas/);
  assert.match(layout, /Luciane Oliveira Doces \| Fatias Artesanais/);
});

test("removes disabled popcorn from restored carts and hides popcorn add-more actions", () => {
  assert.match(page, /!isProductEnabled\(product\)/);
  assert.match(page, /STORE_CONFIG\.enabledCategories\.pipocas && <Button/);
  assert.match(page, /onClick=\{\(\) => startAnother\("pipocas"\)\}/);
  assert.match(page, /Escolha uma fatia ou um refrigerante para começar/);
});
