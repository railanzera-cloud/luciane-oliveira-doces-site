import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const catalog = await readFile(new URL("../app/catalog.ts", import.meta.url), "utf8");
const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");

test("reactivates the popcorn category while keeping its catalog data", () => {
  assert.match(catalog, /enabledCategories:\s*\{\s*pipocas: true,\s*fatias: true,/s);
  assert.match(catalog, /id: "pipoca-gourmet"/);
  assert.match(catalog, /export const POPCORN = PRODUCTS\.find/);
});

test("drinks remain optional complements with preserved historical IDs", () => {
  assert.match(catalog, /drinks: true/);
  assert.match(catalog, /id: "coca-cola-220"/);
  assert.match(page, /<DrinkComplements compact/);
  assert.match(page, /<DrinkComplements availability/);
  assert.doesNotMatch(page, /className="extras-section"/);
});

test("starts neutral and resolves navigation from the existing availability controls", () => {
  assert.doesNotMatch(page, /DEFAULT_CATEGORY/);
  assert.match(page, /useState<CategoryId \| null>\(null\)/);
  assert.match(page, /resolveMenuCategory\(availability, requestedCategory\)/);
  assert.match(page, /if \(!categoryIsAvailable\(category\)\) return/);
  assert.match(page, /isItemVisible\(availability, CATEGORY_ITEM_KEYS\.pipocas\)/);
  assert.match(page, /visibleCategories\.filter\(category => category\.id !== "cones"\)\.map/);
  assert.match(layout, /Cones Trufados, Pipocas e Fatias Artesanais/);
});

test("removes statically disabled products from restored carts and hides unavailable add-more actions", () => {
  assert.match(page, /!isProductEnabled\(product\)/);
  assert.match(page, /pipocasAvailable && <Button/);
  assert.match(page, /fatiasAvailable && <Button/);
  assert.match(page, /onClick=\{\(\) => startAnother\("pipocas"\)\}/);
  assert.match(page, /Escolha uma fatia para começar/);
});
