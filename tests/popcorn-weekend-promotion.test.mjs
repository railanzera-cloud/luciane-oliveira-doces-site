import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import {
  POPCORN_PROMOTION, isPopcornPromotionActive, isPopcornPromotionEligible,
  promotionalPopcornPriceCents,
} from "../supabase/functions/_shared/popcorn-promotion.mjs";
import { applyPopcornPromotionToQuote } from "../supabase/functions/_shared/popcorn-quote-campaign.mjs";
import { quoteCartItems, POPCORN_PRICES_CENTS, POPCORN_FLAVORS } from "../supabase/functions/_shared/commerce-catalog.mjs";

const source = await readFile(new URL("../app/catalog.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText.replace(
  "../supabase/functions/_shared/popcorn-promotion.mjs",
  new URL("../supabase/functions/_shared/popcorn-promotion.mjs", import.meta.url).href,
);
const catalog = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const item = (size, flavors, quantity = 1) =>
  ({ product_id: "pipoca-gourmet", variant_id: size, option_ids: flavors, quantity });
const sizes = [["500ml", 2500], ["750ml", 3900], ["1l", 4900]];
const today = Date.parse("2026-11-07T12:00:00-03:00");
const before = POPCORN_PROMOTION.startsAt - 1;
const after = POPCORN_PROMOTION.endsAt;

test("promoção 07/11 fecha automaticamente à meia-noite de Paragominas", () => {
  assert.equal(POPCORN_PROMOTION.id, "gourmet-sabado-20261107-exceto-nutella");
  assert.equal(POPCORN_PROMOTION.startsAt, Date.parse("2026-11-07T03:00:00Z"));
  assert.equal(POPCORN_PROMOTION.endsAt, Date.parse("2026-11-08T03:00:00Z"));
  assert.deepEqual(POPCORN_PROMOTION.excludedFlavorIds, ["nutella"]);
  for (const t of [NaN, before, after, after + 1]) assert.equal(isPopcornPromotionActive(t), false);
  for (const t of [POPCORN_PROMOTION.startsAt, today, after - 1]) assert.equal(isPopcornPromotionActive(t), true);
});

test("todos os sabores disponíveis exceto Nutella custam o preço-base nos três tamanhos", () => {
  const ids = Object.keys(POPCORN_FLAVORS);
  assert.equal(ids.length, 8);
  const participating = ids.filter(id => id !== "nutella");
  assert.equal(participating.length, 7);
  for (const [size, base] of sizes) {
    for (const a of participating) {
      assert.equal(Math.round(catalog.popcornPrice(size, [a], today) * 100), base, a + " " + size);
      assert.equal(quoteCartItems([item(size, [a])], today).subtotalCents, base);
      for (const b of participating.filter(b => b !== a)) {
        assert.equal(Math.round(catalog.popcornPrice(size, [a, b], today) * 100), base);
        assert.equal(quoteCartItems([item(size, [a, b], 3)], today).subtotalCents, base * 3);
      }
    }
    if (size === "1l") {
      assert.equal(quoteCartItems([item(size, ["leitinho", "kinder-bueno", "kinder-bueno-crisp"])], today).subtotalCents, base);
    }
  }
});

test("Nutella sozinha ou combinada com QUALQUER sabor mantém preço normal do grupo 3", () => {
  const ids = Object.keys(POPCORN_FLAVORS).filter(id => id !== "nutella");
  assert.equal(isPopcornPromotionEligible(["leitinho", "nutella"]), false);
  assert.equal(isPopcornPromotionEligible(["kinder-bueno"]), true);
  assert.equal(isPopcornPromotionEligible("nutella"), false);
  for (const [size] of sizes) {
    const normal = POPCORN_PRICES_CENTS[3][size];
    assert.equal(Math.round(catalog.popcornPrice(size, ["nutella"], today) * 100), normal);
    assert.equal(quoteCartItems([item(size, ["nutella"])], today).subtotalCents, normal);
    for (const id of ids) {
      for (const pair of [["nutella", id], [id, "nutella"]]) {
        assert.equal(quoteCartItems([item(size, pair)], today).subtotalCents, normal, size + pair);
        assert.equal(Math.round(catalog.popcornPrice(size, pair, today) * 100), normal);
      }
    }
  }
  assert.equal(quoteCartItems([item("1l", ["leitinho", "nutella", "kinder-bueno"])], today).subtotalCents, 5800);
});

test("checkout Site respeita exceção Nutella; nunca confia no valor do navegador", () => {
  const cart = [
    item("500ml", ["leitinho", "nutella"], 2),
    item("750ml", ["kinder-bueno", "choco-cookies-branco"]),
    item("1l", ["kinder-bueno-crisp", "leitinho"]),
  ];
  const full = quoteCartItems(cart, before);
  const campaign = applyPopcornPromotionToQuote(full, today);
  assert.deepEqual(campaign.items.map(i => i.unit_price_cents), [3300, 3900, 4900]);
  assert.equal(campaign.subtotalCents, 3300 * 2 + 3900 + 4900);
  assert.equal(applyPopcornPromotionToQuote(campaign, today).subtotalCents, campaign.subtotalCents);
  assert.equal(applyPopcornPromotionToQuote(full, after).subtotalCents, full.subtotalCents);
  assert.deepEqual(full.availabilityKeys, campaign.availabilityKeys);
  assert.deepEqual(full.items.map(i=>i.option_ids), campaign.items.map(i=>i.option_ids));
  assert.equal(promotionalPopcornPriceCents("500ml", 3300, today, ["nutella", "leitinho"]), 3300);
  assert.equal(promotionalPopcornPriceCents("500ml", 3000, today, ["kinder-bueno"]), 2500);
});

test("promoção não muda disponibilidade, sabores máximos nem variantes aposentadas", () => {
  for (const size of ["500ml", "750ml"]) {
    assert.throws(() => quoteCartItems([item(size, ["leitinho", "kinder-bueno", "nutella"])], today));
  }
  assert.throws(() => quoteCartItems([item("500ml", ["unknown"])], today));
  assert.throws(() => quoteCartItems([item("350ml", ["nutella"])], today));
  assert.equal(promotionalPopcornPriceCents("350ml", 9999, today, []), 9999);
  for (const [size] of sizes) {
    for (const [flavors, group] of [
      [["leitinho", "kinder-bueno"], 2],
      [["leitinho", "nutella"], 3],
      [["nutella", "kinder-bueno"], 3],
    ]) {
      const regular = POPCORN_PRICES_CENTS[group][size];
      assert.equal(quoteCartItems([item(size, flavors)], after).subtotalCents, regular);
      assert.equal(Math.round(catalog.popcornPrice(size, flavors, after) * 100), regular);
    }
  }
});

test("UI comunica validade, exceção, preços normais riscados e revalidação do pedido", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/gourmet-feriado-20261102.css", import.meta.url), "utf8");
  const campaign = await readFile(new URL("../lib/storefront-campaign-creative.ts", import.meta.url), "utf8");
  const whatsappBackend = await readFile(new URL("../supabase/functions/_shared/commerce-catalog.mjs", import.meta.url), "utf8");
  const siteBackend = await readFile(new URL("../supabase/functions/_shared/popcorn-quote-campaign.mjs", import.meta.url), "utf8");
  assert.match(page, /StorefrontCampaignEditorial/);
  assert.match(campaign, /Sábado Gourmet · 07\/11/);
  assert.match(campaign, /Nutella é a única exceção/);
  assert.match(campaign, /Escolha seu tamanho logo abaixo/);
  assert.doesNotMatch(campaign, /500 ml R\$ 25 · 750 ml R\$ 39 · 1 litro R\$ 49/);
  assert.match(page, /popcornRegularCombinationPrice/);
  assert.match(page, /popcornCombinationSavings/);
  assert.match(page, /gourmet-combination-savings/);
  assert.match(page, /Você economiza \{currency\.format\(popcornCombinationSavings\)\} neste pote/);
  assert.match(campaign, /Só até 23h59/);
  assert.match(page, /gourmet-feriado-regular-price/);
  assert.match(page, /gourmet-feriado-saving/);
  assert.match(page, /gourmet-feriado-exception/);
  assert.match(page, /optionCombination\.includes\("nutella"\)/);
  assert.match(page, /popcornPromotionActive !== isPopcornPromotionActive\(\)/);
  assert.match(whatsappBackend, /promotionalPopcornPriceCents\(variantId, POPCORN_PRICES_CENTS\[pricingGroup\]\[variantId\], now, optionIds\)/);
  assert.match(siteBackend, /promotionalPopcornPriceCents\(item.variant_id, item.unit_price_cents, now, item.option_ids\)/);
  assert.match(css, /gourmet-feriado-exception/);
});
