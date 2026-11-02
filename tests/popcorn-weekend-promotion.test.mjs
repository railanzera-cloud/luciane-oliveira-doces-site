import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import {
  POPCORN_PROMOTION, isPopcornPromotionActive, promotionalPopcornPriceCents,
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

test("campanha Finados 02/11/2026: janela exclusiva da meia-noite de Paragominas", () => {
  const start = Date.parse("2026-11-02T03:00:00.000Z");
  const end = Date.parse("2026-11-03T03:00:00.000Z");
  assert.equal(POPCORN_PROMOTION.id, "gourmet-feriado-20261102");
  assert.equal(POPCORN_PROMOTION.startsAt, start);
  assert.equal(POPCORN_PROMOTION.endsAt, end);
  for (const stamp of [
    Date.parse("2026-10-11T15:00:00Z"), start - 1, end, end + 1, NaN,
  ]) assert.equal(isPopcornPromotionActive(stamp), false);
  assert.equal(isPopcornPromotionActive(start), true);
  assert.equal(isPopcornPromotionActive(end - 1), true);
  assert.equal(isPopcornPromotionActive(Date.parse("2026-11-02T18:00:00Z")), true);
});
test("oito sabores e todas combinações possíveis mantêm o preço base, por tamanho", () => {
  const now = POPCORN_PROMOTION.startsAt + 3600000;
  const ids = Object.keys(POPCORN_FLAVORS);
  assert.equal(ids.length, 8);
  for (const [size, price] of [["500ml", 2500], ["750ml", 3900], ["1l", 4900]]) {
    for (const a of ids) {
      assert.equal(catalog.popcornPrice(size, [a], now) * 100, price);
      assert.equal(quoteCartItems([item(size, [a])], now).subtotalCents, price);
      for (const b of ids) if (b !== a) {
        const options = [a, b];
        assert.equal(catalog.popcornPrice(size, options, now) * 100, price);
        assert.equal(quoteCartItems([item(size, options)], now).subtotalCents, price);
        assert.equal(quoteCartItems([item(size, options, 3)], now).subtotalCents, price * 3);
      }
    }
    if (size === "1l") {
      assert.equal(quoteCartItems([item(size, ["leitinho", "kinder-bueno", "nutella"])], now).subtotalCents, price);
    }
  }
});
test("o checkout do site não confia no valor mostrado pelo cliente e recalcula no servidor", () => {
  const before = POPCORN_PROMOTION.startsAt - 1;
  const during = POPCORN_PROMOTION.startsAt + 1;
  const after = POPCORN_PROMOTION.endsAt;
  const cart = [item("500ml", ["leitinho", "nutella"], 2), item("750ml", ["kinder-bueno", "choco-cookies-branco"])];
  const normal = quoteCartItems(cart, before);
  const applied = applyPopcornPromotionToQuote(normal, during);
  assert.equal(applied.subtotalCents, (25 * 2 + 39) * 100);
  assert.deepEqual(applied.items.map(row => row.unit_price_cents), [2500, 3900]);
  assert.equal(applyPopcornPromotionToQuote(applied, during).subtotalCents, applied.subtotalCents);
  assert.equal(applyPopcornPromotionToQuote(normal, after).subtotalCents, normal.subtotalCents);
  assert.deepEqual(normal.availabilityKeys, applied.availabilityKeys);
  assert.deepEqual(normal.items.map(x=>x.option_ids), applied.items.map(x=>x.option_ids));
  const invoice = applyPopcornPromotionToQuote({ ...normal, items: [...normal.items, {
    product_id: "fatia-prestigio", variant_id: "fatia", quantity: 1,
    unit_price_cents: 2000, line_total_cents: 2000,
  }]}, during);
  assert.equal(invoice.items.at(-1).unit_price_cents, 2000);
});
test("ao virar 03/11 os grupos 2 e 3 voltam aos valores integrais, independentemente da ordem", () => {
  const end = POPCORN_PROMOTION.endsAt;
  for (const size of ["500ml", "750ml", "1l"]) {
    for (const [options, group] of [
      [["leitinho", "kinder-bueno"], 2],
      [["kinder-bueno", "nutella"], 3],
      [["leitinho", "nutella"], 3],
    ]) {
      const normal = POPCORN_PRICES_CENTS[group][size];
      assert.equal(quoteCartItems([item(size, options)], end).subtotalCents, normal);
      assert.equal(quoteCartItems([item(size, options.reverse())], end).subtotalCents, normal);
      assert.equal(catalog.popcornPrice(size, options, end) * 100, normal);
    }
    assert.equal(promotionalPopcornPriceCents(size, 9999, end), 9999);
  }
});
test("nunca altera limite de sabores, variantes aposentadas ou disponibilidade", () => {
  const now = POPCORN_PROMOTION.startsAt;
  for (const size of ["500ml", "750ml"]) {
    assert.throws(() => quoteCartItems([item(size, ["leitinho", "kinder-bueno", "nutella"])], now));
  }
  assert.throws(() => quoteCartItems([item("500ml", ["sabor-inexistente"])], now));
  assert.throws(() => quoteCartItems([item("350ml", ["nutella"])], now));
  assert.equal(promotionalPopcornPriceCents("350ml", 9999, now), 9999);
});
test("frontend comunica prazo verdadeiro, conservação de estoque e preços comparativos", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/gourmet-feriado-20261102.css", import.meta.url), "utf8");
  const siteBackend = await readFile(new URL("../supabase/functions/create-order/index.ts", import.meta.url), "utf8");
  const whatsappBackend = await readFile(new URL("../supabase/functions/create-whatsapp-order/index.ts", import.meta.url), "utf8");
  const campaign = await readFile(new URL("../lib/storefront-campaign-creative.ts", import.meta.url), "utf8");
  const component = await readFile(new URL("../components/storefront-campaign-editorial.tsx", import.meta.url), "utf8");
  assert.match(page, /StorefrontCampaignEditorial/);
  assert.match(component, /gourmet-feriado-edition/);
  assert.match(campaign, /Só até 23h59/);
  assert.match(campaign, /Sujeito à disponibilidade dos sabores/);
  assert.match(page, /gourmet-feriado-regular-price/);
  assert.match(page, /POPCORN_PRICING_GROUPS\[option\.pricingGroup\]/);
  assert.doesNotMatch(page, /Só sábado e domingo, 10 e 11\/10/);
  assert.match(page, /popcornPromotionActive !== isPopcornPromotionActive\(\)/);
  assert.match(siteBackend, /applyPopcornPromotionToQuote\(quoteCartItems\(input\.items/);
  assert.match(whatsappBackend, /quoteCartItems\(input\.items, Date\.now\(\)\)/);
  assert.match(css, /@media \(max-width: 359px\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});
