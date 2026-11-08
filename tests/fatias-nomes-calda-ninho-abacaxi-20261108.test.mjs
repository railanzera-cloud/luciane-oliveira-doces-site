import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { quoteCartItems } from "../supabase/functions/_shared/commerce-catalog.mjs";
import { sliceSauceOptions } from "../app/catalog.ts";

const front = readFileSync("app/catalog.ts", "utf8");
const backend = readFileSync("supabase/functions/_shared/commerce-catalog.mjs", "utf8");
const page = readFileSync("app/page.tsx", "utf8");
const menu = readFileSync("app/menu-availability.ts", "utf8");
const admin = readFileSync("app/admin/page.tsx", "utf8");
const migration = readFileSync("supabase/migrations/20261108060000_renomear_fatias_rascunho_abacaxi.sql", "utf8");

test("dois sabores mantêm IDs, preços e fotos, sem subtítulos repetidos", () => {
  const n = front.slice(front.indexOf('id: "fatia-ninho-morango"'), front.indexOf('id: "fatia-prestigio"'));
  const c = front.slice(front.indexOf('id: "fatia-coco-cremoso-morango"'), front.indexOf('id: "fatia-chocolate-cenoura"'));
  assert.match(n, /name: "Brigadeiro Branco com Morango"/);
  assert.match(n, /price: 22/);
  assert.match(n, /image: "\/fatia-ninho-morango.jpeg"/);
  assert.doesNotMatch(n, /subtitle:|cardName:/);
  assert.match(c, /name: "Geleia de Morango com Coco Cremoso"/);
  assert.match(c, /price: 20/);
  assert.match(c, /image: "\/fatia-coco-cremoso-morango.webp"/);
  assert.doesNotMatch(c, /subtitle:|cardName:/);
  assert.ok(menu.includes('"fatia-ninho-morango": "slice_ninho_morango"'));
  assert.ok(menu.includes('"fatia-coco-cremoso-morango": "slice_coco_cremoso_morango"'));
  assert.ok(backend.includes('name: "Brigadeiro Branco com Morango", priceCents: 2200'));
  assert.ok(backend.includes('name: "Geleia de Morango com Coco Cremoso", priceCents: 2000'));
});

test("checkout cotado usa novos nomes e R$22/R$20 preservados", () => {
  const cases = [
    ["fatia-ninho-morango", "Brigadeiro Branco com Morango", 2200, "slice_ninho_morango"],
    ["fatia-coco-cremoso-morango", "Geleia de Morango com Coco Cremoso", 2000, "slice_coco_cremoso_morango"],
  ];
  for (const [id,name,price,key] of cases) {
    const q = quoteCartItems([{product_id:id,variant_id:"fatia",quantity:1,option_ids:["calda-ninho"]}]);
    assert.equal(q.subtotalCents,price);
    assert.equal(q.items[0].name,name);
    assert.equal(q.items[0].unit_price_cents,price);
    assert.equal(q.items[0].item_key,key);
    assert.deepEqual(q.items[0].option_names,["Com calda de Ninho"]);
  }
});

test("calda de Ninho é gratuita, não pré-selecionada e respeita a ordem contextual", () => {
  assert.ok(front.includes('id: "calda-ninho", name: "Com calda de Ninho"'));
  assert.ok(front.includes('const NINHO_FIRST_SLICE_IDS = new Set(["fatia-ninho-morango", "fatia-coco-cremoso-morango"])'));
  assert.deepEqual(sliceSauceOptions("fatia-ninho-morango").map(o => o.id), ["calda-ninho","calda-chocolate","sem-calda"]);
  assert.deepEqual(sliceSauceOptions("fatia-coco-cremoso-morango").map(o => o.id), ["calda-ninho","calda-chocolate","sem-calda"]);
  assert.deepEqual(sliceSauceOptions("fatia-chocolate-morango").map(o => o.id), ["calda-chocolate","calda-ninho","sem-calda"]);
  assert.deepEqual(sliceSauceOptions("fatia-bombom-uva").map(o => o.id), ["calda-chocolate","calda-ninho","sem-calda"]);
  assert.ok(page.includes('sliceSauceOptions(selectedSlice.id).map(option =>'));
  assert.ok(page.includes('value={sliceOptionId} onValueChange='));
  assert.ok(page.includes('setSliceOptionId("");'));
  assert.ok(page.includes('Escolha uma opção. Sem custo adicional.'));
  assert.ok(!page.includes('Cobertura de chocolate'));
  assert.ok(!page.includes('Sem cobertura adicional'));
  for (const id of ["calda-chocolate","calda-ninho","sem-calda"]) {
    const q = quoteCartItems([{product_id:"fatia-prestigio",variant_id:"fatia",quantity:2,option_ids:[id]}]);
    assert.equal(q.subtotalCents,4000);
    assert.equal(q.items[0].option_ids[0],id);
    assert.equal(q.items[0].option_names.length,1);
  }
  assert.throws(()=>quoteCartItems([{product_id:"fatia-prestigio",variant_id:"fatia",quantity:1,option_ids:["calda-ninho","calda-chocolate"]}]),/Escolha uma fatia válida/);
});

test("Abacaxi com Brigadeiro Branco: preço, foto e status inicial oculto até autorização", () => {
  const slice = front.slice(front.indexOf('id: "fatia-abacaxi-doce-leite"'), front.indexOf('id: "coca-cola-220"'));
  assert.ok(front.includes('export const SLICE_DRAFTS: ReadonlyArray<'));
  assert.match(slice, /name: "Abacaxi com Brigadeiro Branco"/);
  assert.match(slice, /image: "\/fatia-abacaxi-brigadeiro-branco-20261108\.jpeg"/);
  assert.match(slice, /cardImage: "\/fatia-abacaxi-brigadeiro-branco-card-20261108\.webp"/);
  assert.match(slice, /price: 20/);
  assert.ok(menu.includes('"fatia-abacaxi-doce-leite": "slice_abacaxi_doce_leite"'));
  assert.ok(menu.includes('statuses[SLICE_ITEM_KEYS["fatia-abacaxi-doce-leite"]] = "hidden"'));
  assert.ok(admin.includes('changeItemStatus(item, status)'));
  assert.ok(backend.includes('name: "Abacaxi com Brigadeiro Branco", priceCents: 2000'));
  assert.ok(!backend.includes('name: "Abacaxi com Doce de Leite"'));
  const quoted = quoteCartItems([{product_id:"fatia-abacaxi-doce-leite",variant_id:"fatia",quantity:1,option_ids:["sem-calda"]}]);
  assert.equal(quoted.subtotalCents,2000);
  assert.equal(quoted.items[0].name,"Abacaxi com Brigadeiro Branco");
  assert.deepEqual(quoted.availabilityKeys.sort(), ["category_fatias","slice_abacaxi_doce_leite"].sort());
  assert.match(migration, /'slice_abacaxi_doce_leite',[\s\S]*?'hidden'::public\.item_status/);
  assert.match(migration, /ON CONFLICT \(item_key\) DO NOTHING/);
});

test("migração altera apenas nomes, preserva todas as disponibilidades existentes", () => {
  assert.ok(migration.includes("'slice_ninho_morango'"));
  assert.ok(migration.includes("'slice_coco_cremoso_morango'"));
  assert.doesNotMatch(migration, /UPDATE\s+public\.menu_availability[\s\S]*?SET\s+status/i);
  assert.doesNotMatch(migration, /DELETE\s+FROM/i);
});
