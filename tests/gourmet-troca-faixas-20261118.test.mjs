import assert from "node:assert/strict";
import test from "node:test";
import { POPCORN_FLAVORS, POPCORN_PRICES_CENTS, CATALOG_VERSION, quoteCartItems } from "../supabase/functions/_shared/commerce-catalog.mjs";

const now = Date.parse("2026-11-18T12:00:00-03:00");
const quote = (size, ids) => quoteCartItems([
  { product_id: "pipoca-gourmet", variant_id: size, option_ids: ids, quantity: 1 },
], now);

test("troca exclusivamente Ovomaltine e Cookies ao Leite, sem mudar outros sabores nem IDs", () => {
  assert.deepEqual(Object.entries(POPCORN_FLAVORS).map(([id, value]) => [id, value.pricingGroup]), [
    ["leitinho", 1],
    ["choco-nute", 1],
    ["choco-cookies-leite", 1],
    ["ovomaltine", 2],
    ["kinder-bueno", 2],
    ["choco-cookies-branco", 2],
    ["kinder-bueno-crisp", 3],
    ["nutella", 3],
  ]);
  assert.equal(POPCORN_FLAVORS["choco-cookies-leite"].itemKey, "popcorn_flavor_choco_cookies_leite");
  assert.equal(POPCORN_FLAVORS["choco-cookies-branco"].itemKey, "popcorn_flavor_choco_cookies_branco");
});

test("500 ml, 750 ml e 1 litro respeitam as tres faixas existentes e a maior na combinacao", () => {
  for (const size of ["500ml", "750ml", "1l"]) {
    const [base, premium, nutella] = [1, 2, 3].map(group => POPCORN_PRICES_CENTS[group][size]);
    assert.equal(quote(size, ["leitinho"]).subtotalCents, base);
    assert.equal(quote(size, ["choco-cookies-leite"]).subtotalCents, base);
    assert.equal(quote(size, ["ovomaltine"]).subtotalCents, premium);
    assert.equal(quote(size, ["choco-cookies-branco"]).subtotalCents, premium);
    assert.equal(quote(size, ["nutella"]).subtotalCents, nutella);
    assert.equal(quote(size, ["leitinho", "choco-cookies-leite"]).subtotalCents, base);
    assert.equal(quote(size, ["leitinho", "ovomaltine"]).subtotalCents, premium);
    assert.equal(quote(size, ["choco-cookies-leite", "ovomaltine"]).subtotalCents, premium);
    assert.equal(quote(size, ["ovomaltine", "nutella"]).subtotalCents, nutella);
    assert.equal(quote(size, ["ovomaltine"]).items[0].catalog_version, CATALOG_VERSION);
  }
  assert.equal(quote("500ml", ["ovomaltine"]).subtotalCents, 3000);
  assert.equal(quote("500ml", ["choco-cookies-leite"]).subtotalCents, 2500);
  assert.equal(quote("750ml", ["ovomaltine"]).subtotalCents, 4500);
  assert.equal(quote("750ml", ["choco-cookies-leite"]).subtotalCents, 3900);
  assert.equal(quote("1l", ["ovomaltine"]).subtotalCents, 5500);
  assert.equal(quote("1l", ["choco-cookies-leite"]).subtotalCents, 4900);
});
