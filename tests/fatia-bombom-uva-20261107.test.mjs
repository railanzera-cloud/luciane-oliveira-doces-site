import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import test from "node:test";
import { quoteCartItems } from "../supabase/functions/_shared/commerce-catalog.mjs";

const front = readFileSync("app/catalog.ts", "utf8");
const availability = readFileSync("app/menu-availability.ts", "utf8");
const backend = readFileSync("supabase/functions/_shared/commerce-catalog.mjs", "utf8");
const page = readFileSync("app/page.tsx", "utf8");
const migration = readFileSync("supabase/migrations/20261107190000_fatia_bombom_uva.sql", "utf8");
const productId = "fatia-bombom-uva", itemKey = "slice_bombom_uva", name = "Bombom de Uva";

test("Fatia de Bombom de Uva é um SKU novo de R$ 20 com a foto aprovada", () => {
  const section = front.slice(front.indexOf('id: "' + productId + '"'), front.indexOf('id: "coca-cola-220"'));
  assert.ok(section.includes('kind: "slice"'));
  assert.ok(section.includes('name: "' + name + '"'));
  assert.match(section, /price: 20, available: true/);
  assert.match(section, /options: SLICE_OPTIONS/);
  assert.match(section, /image: "\/fatia-bombom-uva.avif"/);
  assert.match(section, /cardImage: "\/fatia-bombom-uva.avif"/);
  assert.ok(availability.includes('"' + productId + '": "' + itemKey + '"'));
  assert.ok(backend.includes('"' + productId + '": Object.freeze('));
  assert.ok(backend.includes('itemKey: "' + itemKey + '", name: "' + name + '", priceCents: 2000'));
});

test("Backend cota dois Bombons de Uva em R$ 40 e preserva a calda", () => {
  const quote = quoteCartItems([{product_id: productId, variant_id: "fatia", quantity: 2, option_ids: ["sem-calda"]}]);
  assert.deepEqual(quote.availabilityKeys, ["category_fatias", itemKey]);
  assert.equal(quote.subtotalCents, 4000);
  assert.equal(quote.items[0].item_key, itemKey);
  assert.equal(quote.items[0].name, name);
  assert.equal(quote.items[0].unit_price_cents, 2000);
  assert.deepEqual(quote.items[0].option_names, ["Sem calda, por favor"]);
  assert.throws(() => quoteCartItems([{product_id: productId, variant_id: "400ml", quantity: 1, option_ids: []}]), /Escolha uma fatia válida/);
  assert.equal(quoteCartItems([{product_id:"fatia-prestigio",variant_id:"fatia",quantity:1,option_ids:[]}]).subtotalCents, 2000);
});

test("Cadastro remoto não altera outras fatias nem cria oferta antes do release", () => {
  assert.match(availability, /statuses\[SLICE_ITEM_KEYS\["fatia-bombom-uva"\]\] = "hidden"/);
  assert.ok(migration.includes("'slice_bombom_uva', 'Bombom de Uva'"));
  assert.match(migration, /ON CONFLICT \(item_key\) DO NOTHING/);
  assert.doesNotMatch(migration, /UPDATE\s+public\.menu_availability|DELETE FROM/);
});

test("Foto comercial realçada e aprovada está versionada em AVIF", () => {
  const path = "public/fatia-bombom-uva.avif";
  const img = readFileSync(path);
  assert.ok(statSync(path).size > 10000);
  assert.equal(img.toString("ascii", 4, 12), "ftypavif");
});


test("Bombom de Uva acompanha o peso informado de 380 g por fatia", () => {
  assert.ok(front.includes("export const SLICE_WEIGHT_GRAMS = 380;"));
  assert.ok(page.includes('<span className="slice-weight">{SLICE_WEIGHT_GRAMS} g por fatia</span>'));
  assert.ok(page.includes('product.kind === "slice" && <span>{SLICE_WEIGHT_GRAMS} g por fatia</span>'));
  assert.ok(!page.includes('product.id !== "fatia-bombom-uva"'));
  assert.ok(!page.includes('slice.id !== "fatia-bombom-uva"'));
});
