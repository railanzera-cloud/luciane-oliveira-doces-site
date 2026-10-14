import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";
import { quoteCartItems, CROCANTES_OPEN_AT_MS } from "../supabase/functions/_shared/commerce-catalog.mjs";

const ninho = { product_id: "crocante-ninho", variant_id: "400ml", option_ids: [], quantity: 2 };
const chocolate = { product_id: "crocante-chocolate", variant_id: "400ml", option_ids: [], quantity: 1 };
const opens = CROCANTES_OPEN_AT_MS;

test("os dois copos nao podem ser registrados nem 1 ms antes de meio-dia", () => {
  assert.equal(opens, Date.parse("2026-10-15T15:00:00Z"));
  assert.throws(() => quoteCartItems([ninho], opens - 1), /12h/);
  assert.throws(() => quoteCartItems([chocolate], opens - 1), /12h/);
});

test("meio-dia libera cotação de dois sabores separados com preço autoritativo", () => {
  const result = quoteCartItems([ninho, chocolate], opens);
  assert.equal(result.subtotalCents, 4770);
  assert.deepEqual(result.items.map((i) => [i.product_id, i.quantity, i.unit_price_cents, i.line_total_cents]), [
    ["crocante-ninho", 2, 1590, 3180],
    ["crocante-chocolate", 1, 1590, 1590],
  ]);
  assert.ok(result.items.every((i) => i.item_type === "popcorn" && i.size_label === "400 ml · 190 g" && i.option_names.length === 0));
  assert.deepEqual(result.availabilityKeys, ["category_pipocas", "crocante_copo_chocolate", "crocante_copo_ninho"]);
});

test("mistura com fatia conserva precos existentes", () => {
  const res = quoteCartItems([
    ninho, { product_id: "fatia-chocolate-morango", variant_id: "fatia", option_ids: ["sem-calda"], quantity: 1 },
  ], opens);
  assert.equal(res.subtotalCents, 5380);
  assert.ok(res.availabilityKeys.includes("category_fatias"));
});

test("impede sku falso, sabor misturado, tamanho trocado e quantidade abusiva", () => {
  const invalid = [
    { ...ninho, variant_id: "1l" },
    { ...ninho, option_ids: ["chocolate"] },
    { ...ninho, quantity: 100 },
    { product_id: "crocante-inventado", variant_id: "400ml", option_ids: [], quantity: 1 },
  ];
  for (const item of invalid) assert.throws(() => quoteCartItems([item], opens));
});

test("checkout e mensagem identificam marca da edicao, preservando o fluxo Tintim", () => {
  const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.ok(page.includes('return `Pipocas Crocantes — ${product.name}`'));
  assert.ok(page.includes('tintimWhatsAppUrl(buildRegisteredOrderMessage'));
});
