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

test("keeps drinks ready to reactivate while hiding them from the current menu", () => {
  assert.match(catalog, /enabledExtras:\s*\{\s*drinks: false,/s);
  assert.match(catalog, /id: "coca-cola-220"/);
  assert.match(catalog, /export const DRINKS = PRODUCTS\.filter/);
  assert.match(page, /if \(product\.kind === "slice"\) return isCategoryEnabled\("fatias"\);\s*return STORE_CONFIG\.enabledExtras\.drinks;/s);
  assert.match(page, /STORE_CONFIG\.enabledExtras\.drinks && \(\s*<section className="extras-section"/s);
  assert.match(page, /STORE_CONFIG\.enabledExtras\.drinks && <Button/);
  assert.match(page, /scrollToSection\("acompanhamentos"\)/);
});

test("starts neutral and resolves navigation from the existing availability controls", () => {
  assert.doesNotMatch(page, /DEFAULT_CATEGORY/);
  assert.match(page, /useState<CategoryId \| null>\(null\)/);
  assert.match(page, /resolveMenuCategory\(availability, requestedCategory\)/);
  assert.match(page, /if \(!categoryIsAvailable\(category\)\) return/);
  assert.match(page, /isItemVisible\(availability, CATEGORY_ITEM_KEYS\.pipocas\)/);
  assert.match(page, /visibleCategories\.map/);
  assert.match(layout, /STORE_CONFIG\.enabledCategories\.pipocas/);
});

test("removes statically disabled products from restored carts and hides unavailable add-more actions", () => {
  assert.match(page, /!isProductEnabled\(product\)/);
  assert.match(page, /pipocasAvailable && <Button/);
  assert.match(page, /fatiasAvailable && <Button/);
  assert.match(page, /onClick=\{\(\) => startAnother\("pipocas"\)\}/);
  assert.match(page, /Escolha uma fatia para começar/);
});
