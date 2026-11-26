import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { quoteCartItems } from "../supabase/functions/_shared/commerce-catalog.mjs";

const catalog = readFileSync("app/catalog.ts", "utf8");
const availability = readFileSync("app/menu-availability.ts", "utf8");
const authoritative = readFileSync("supabase/functions/_shared/commerce-catalog.mjs", "utf8");

const productId = "fatia-bombom-uva-massa-branca";
const itemKey = "slice_bombom_uva_massa_branca";

test("novo Bombom de Uva de massa branca é apenas um rascunho separado por R$22", () => {
  const draft = catalog.slice(catalog.indexOf("export const SLICE_DRAFTS"), catalog.indexOf("// Catálogo central:"));
  const storefront = catalog.slice(catalog.indexOf("export const PRODUCTS"));
  assert.match(draft, /id: "fatia-bombom-uva-massa-branca"/);
  assert.match(draft, /itemKey: "slice_bombom_uva_massa_branca"/);
  assert.match(draft, /name: "Bombom de Uva na Massa Branca"/);
  assert.match(draft, /price: 22/);
  assert.match(draft, /image: null/);
  assert.ok(!storefront.includes(productId), "rascunho sem foto não entra na vitrine");
  assert.ok(!authoritative.includes(productId), "rascunho sem imagem não entra no servidor de cotação");
  assert.ok(!availability.includes('"' + productId + '": "' + itemKey + '"'), "rascunho não vira produto ativo por engano");
});

test("mesmo com disponibilidade remota, rascunhos são sempre ocultos", () => {
  assert.match(availability, /for \(const draft of SLICE_DRAFTS\) statuses\[draft\.itemKey\] = "hidden"/);
  assert.match(availability, /isDraft: true/);
  assert.throws(() => quoteCartItems([{ product_id: productId, variant_id: "fatia", quantity: 1, option_ids: [] }]));
});

test("Bombom de Uva original continua vendável sob seu próprio SKU, preço e imagem", () => {
  assert.ok(catalog.includes('id: "fatia-bombom-uva"'));
  assert.ok(catalog.includes('image: "/fatia-bombom-uva.avif"'));
  assert.ok(authoritative.includes('"fatia-bombom-uva": Object.freeze({ id: "fatia-bombom-uva", itemKey: "slice_bombom_uva", name: "Bombom de Uva", priceCents: 2200 })'));
  const quote = quoteCartItems([{product_id: "fatia-bombom-uva",variant_id: "fatia",quantity: 2,option_ids: ["sem-calda"]}]);
  assert.equal(quote.subtotalCents, 4400);
  assert.deepEqual(quote.availabilityKeys, ["category_fatias", "slice_bombom_uva"]);
});
