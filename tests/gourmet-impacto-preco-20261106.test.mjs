import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { quoteCartItems } from "../supabase/functions/_shared/commerce-catalog.mjs";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const time = Date.parse("2026-11-06T18:00:00-03:00");
const price = (size, flavors) => quoteCartItems([{
  product_id: "pipoca-gourmet", variant_id: size, option_ids: flavors, quantity: 1,
}], time).subtotalCents;

test("preço Gourmet continua sendo o maior grupo, nunca uma soma de sabores", () => {
  assert.equal(price("1l", ["leitinho"]), 4900);
  assert.equal(price("1l", ["leitinho", "ovomaltine"]), 4900);
  assert.equal(price("1l", ["leitinho", "nutella"]), 5800);
  assert.equal(price("1l", ["nutella"]), 5800);
  assert.equal(price("1l", ["leitinho", "nutella", "ovomaltine"]), 5800);
});

test("preço de referência e total real continuam distintos", () => {
  assert.match(page, /<strong>\{currency\.format\(flavorPotPrice \?\? potPriceWithOption\)\}<\/strong>/);
  assert.match(page, /const currentPotPrice = popcornVariantUsable && popcornVariant/);
  assert.match(page, /const potPriceWithOption = popcornVariantUsable && popcornVariant/);
  assert.match(page, /Math\.max\(0, potPriceWithOption - currentPotPrice\)/);
  assert.match(page, /popcornPrice\(popcornVariant\.id, popcornOptionIds, promotionTime\)/);
});

test("copy depende do efeito da escolha no total, não inventa adicionais", () => {
  assert.match(page, /!popcornOptionIds\.length && priceDifference === 0[\s\S]*?\? "Preço base"/);
  assert.match(page, /!popcornOptionIds\.length[\s\S]*?\? `Pote fica por \$\{currency\.format\(potPriceWithOption\)\}`/);
  assert.match(page, /priceDifference === 0[\s\S]*?\? `Mantém \$\{currency\.format\(potPriceWithOption\)\}`/);
  assert.match(page, /`Pote vai para \$\{currency\.format\(potPriceWithOption\)\}`/);
  assert.match(page, /o pote mantém o preço de \$\{currency\.format\(potPriceWithOption\)\}/);
  assert.match(page, /o pote passa a custar \$\{currency\.format\(potPriceWithOption\)\}/);
  assert.doesNotMatch(page, /Sem acréscimo/);
});

test("promoções e estados indisponíveis preservam o gate original", () => {
  assert.match(page, /!popcornPromotionActive && !selected && !disabled && potPriceWithOption !== null/);
  assert.match(page, /popcornPromotionActive && savedToday > 0 && available/);
  assert.match(page, /const disabled = waitingForSize \|\| \(!available && !selected\) \|\| limitDisabled/);
  assert.match(page, /if \(!alreadySelected && popcornOptionIds\.length \+ 1 === popcornMaxOptions\)/);
});
