import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { SLICES, quoteCartItems } from "../supabase/functions/_shared/commerce-catalog.mjs";

const frontend = await readFile(new URL("../app/catalog.ts", import.meta.url), "utf8");
const backend = await readFile(new URL("../supabase/functions/_shared/commerce-catalog.mjs", import.meta.url), "utf8");
const crm = await readFile(new URL("../lib/crm-follow-up.ts", import.meta.url), "utf8");

test("fatia mantém SKU, fotos e status com preço atualizado para R$22", () => {
  const item = SLICES["fatia-coco-cremoso-morango"];
  assert.ok(item);
  assert.equal(item.id, "fatia-coco-cremoso-morango");
  assert.equal(item.itemKey, "slice_coco_cremoso_morango");
  assert.equal(item.name, "Geleia de Morango com Ninho");
  assert.equal(item.priceCents, 2200);

  const start = frontend.indexOf('id: "fatia-coco-cremoso-morango"');
  const end = frontend.indexOf("\n  },", start);
  assert.ok(start >= 0 && end > start);
  const card = frontend.slice(start, end);
  assert.match(card, /name: "Geleia de Morango com Ninho"/);
  assert.match(card, /image: "\/fatia-coco-cremoso-morango\.webp"/);
  assert.match(card, /cardImage: "\/fatia-coco-cremoso-morango-card\.webp"/);
  assert.match(card, /available: true/);
  assert.match(card, /price: 22/);
  assert.doesNotMatch(card, /name: "Geleia de Morango com Coco Cremoso"/);
  assert.match(backend, /"fatia-coco-cremoso-morango".*name: "Geleia de Morango com Ninho", priceCents: 2200/);
});

test("preço de R$22 chega à cotação sem alterar produto ou calda", () => {
  const q = quoteCartItems([{
    product_id: "fatia-coco-cremoso-morango",
    variant_id: "fatia",
    quantity: 1,
    option_ids: ["calda-ninho"]
  }]);
  assert.equal(q.subtotalCents, 2200);
  assert.equal(q.items[0].name, "Geleia de Morango com Ninho");
  assert.equal(q.items[0].item_key, "slice_coco_cremoso_morango");
  assert.deepEqual(q.items[0].option_names, ["Com calda de Ninho"]);
});

test("CRM preserva reconhecimento de anuncios antigos e mostra nome atualizado", () => {
  assert.match(crm, /"fatia-coco-cremoso-morango": "Geleia de Morango com Ninho"/);
  assert.match(crm, /(?:coco cremoso\|geleia de morango com coco cremoso\|geleia de morango com ninho)/);
});
