import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const catalog = await readFile(new URL("../app/catalog.ts", import.meta.url), "utf8");
const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("keeps regular Kinder Bueno and adds the premium Crisp flavor", () => {
  assert.match(catalog, /id: "kinder-bueno", name: "Kinder Bueno"/);
  assert.match(catalog, /id: "kinder-bueno-crisp", name: "Kinder Bueno Crisp"/);
  assert.match(catalog, /Creme de avelã com leite e pedaços crocantes\./);
  assert.match(catalog, /priceAdjustment: 5/);
});

test("replaces Pistache with Ovomaltine", () => {
  assert.doesNotMatch(catalog, /id: "pistache"|name: "Pistache"/);
  assert.match(catalog, /id: "ovomaltine", name: "Ovomaltine"/);
  assert.match(catalog, /Creme de avelã com malte, cacau e crocância\./);
});

test("applies the Crisp adjustment throughout the complete order flow", () => {
  assert.match(page, /function optionPriceAdjustment/);
  assert.match(page, /function itemUnitPrice/);
  assert.match(page, /itemUnitPrice\(POPCORN, variant, popcornOptionIds\)/);
  assert.match(page, /metaProductPayload\(POPCORN, popcornVariant, popcornQuantity, popcornOptionIds\)/);
  assert.match(page, /itemUnitPrice\(product, variant, item\.optionIds\) \* item\.quantity/);
  assert.match(page, /Kinder Bueno Crisp acrescenta/);
  assert.match(page, /uma única vez, mesmo em combinações/);
});
