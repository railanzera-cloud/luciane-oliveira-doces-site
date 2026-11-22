import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { SLICES, quoteCartItems } from "../supabase/functions/_shared/commerce-catalog.mjs";

const source = await readFile(new URL("../app/catalog.ts", import.meta.url), "utf8");
const backend = await readFile(new URL("../supabase/functions/_shared/commerce-catalog.mjs", import.meta.url), "utf8");

test("Bombom de Uva único SKU R$22 preserva nome, fotos e disponibilidade", () => {
  const item=SLICES["fatia-bombom-uva"];
  assert.ok(item);
  assert.equal(item.itemKey,"slice_bombom_uva");
  assert.equal(item.name,"Bombom de Uva");
  assert.equal(item.priceCents,2200);
  const start=source.indexOf('id: "fatia-bombom-uva"');
  const end=source.indexOf("\n  },",start);
  assert.ok(start>=0&&end>start);
  const card=source.slice(start,end);
  assert.match(card,/name: "Bombom de Uva"/);
  assert.match(card,/image: "\/fatia-bombom-uva.avif"/);
  assert.match(card,/cardImage: "\/fatia-bombom-uva.avif"/);
  assert.match(card,/available: true/);
  assert.match(card,/price: 22, available: true/);
  assert.match(backend,/"fatia-bombom-uva".*name: "Bombom de Uva", priceCents: 2200/);
});

test("Cotação aplica R$22 para Bombom de Uva e preserva duas caldas de referência", () => {
  for(const option of ["sem-calda","calda-ninho","calda-chocolate"]){
    const quote=quoteCartItems([{product_id:"fatia-bombom-uva",variant_id:"fatia",quantity:2,option_ids:[option]}]);
    assert.equal(quote.subtotalCents,4400);
    assert.equal(quote.items[0].unit_price_cents,2200);
    assert.equal(quote.items[0].line_total_cents,4400);
    assert.equal(quote.items[0].item_key,"slice_bombom_uva");
    assert.deepEqual(quote.availabilityKeys,["category_fatias","slice_bombom_uva"]);
  }
  assert.equal(quoteCartItems([{product_id:"fatia-coco-cremoso-morango",variant_id:"fatia",quantity:1,option_ids:["sem-calda"]}]).subtotalCents,2200);
  assert.equal(quoteCartItems([{product_id:"fatia-prestigio",variant_id:"fatia",quantity:1,option_ids:["sem-calda"]}]).subtotalCents,2000);
});
