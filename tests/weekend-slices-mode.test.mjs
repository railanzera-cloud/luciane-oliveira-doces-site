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

test("keeps the four drinks gated by remote availability and independent of dessert menus", async () => {
  assert.match(catalog, /enabledExtras:\s*\{\s*drinks: true,/s);
  assert.match(catalog, /DRINKS as DRINK_CATALOG/);
  assert.match(catalog, /export const DRINKS = PRODUCTS\.filter/);
  assert.match(page, /return STORE_CONFIG\.enabledExtras\.drinks;/);
  assert.match(page, /DRINKS\.some\(drink => drinkStatus\(availability,drink.id\) === "available"\)/);
  assert.match(page, /scrollToSection|requestScroll/);
  assert.match(page, /recebimento-opcoes/);
  assert.match(await readFile(new URL("../components/drink-complements.tsx", import.meta.url), "utf8"), /refreshment-later/);
});

test("starts neutral and resolves navigation from the existing availability controls", () => {
  assert.doesNotMatch(page, /DEFAULT_CATEGORY/);
  assert.match(page, /useState<CategoryId \| null>\(null\)/);
  assert.match(page, /resolveMenuCategory\(availability, requestedCategory\)/);
  assert.match(page, /if \(!categoryIsAvailable\(category\)\) return/);
  assert.match(page, /isItemVisible\(availability, CATEGORY_ITEM_KEYS\.pipocas\)/);
  assert.match(page, /visibleCategories\.filter\(category => category\.id !== "cones"\)\.map/);
  assert.match(layout, /Fatias de Chocottone, Cascão Trufado, Pipocas e Fatias/);
});

test("removes statically disabled products from restored carts and hides unavailable add-more actions", () => {
  assert.match(page, /!isProductEnabled\(product\)/);
  assert.match(page, /pipocasAvailable && <Button/);
  assert.match(page, /fatiasAvailable && <Button/);
  assert.match(page, /onClick=\{\(\) => startAnother\("pipocas"\)\}/);
  assert.match(page, /Escolha uma fatia para começar/);
});
