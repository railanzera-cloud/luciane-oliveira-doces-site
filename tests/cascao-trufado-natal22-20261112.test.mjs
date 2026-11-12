import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import { PRODUCTS, CONES as frontCones, CHOCOTONES as frontChocotones, STORE_CONFIG } from "../app/catalog.ts";
import { CONES as serverCones, CHOCOTONES as serverChocotones, quoteCartItems } from "../supabase/functions/_shared/commerce-catalog.mjs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const cases = [
  ["cascao-trufado-kinder-bueno", "cascao_kinder_bueno", "Kinder Bueno", "cascao-kinder-bueno"],
  ["cascao-trufado-ninho-morango", "cascao_ninho_morango", "Ninho com Morango", "cascao-ninho-morango"],
  ["cascao-trufado-ninho-nutella-chocotone", "cascao_ninho_nutella_chocotone", "Ninho com Nutella e Chocottone", "cascao-ninho-nutella-chocotone"],
];

test("novos cascões têm identidades independentes, imagens e preço R$20 idêntico no frontend e backend", () => {
  assert.equal(frontCones.length,6);
  assert.equal(Object.keys(serverCones).length,6);
  for (const [id,key,name,slug] of cases) {
    const front = PRODUCTS.find(x => x.id===id);
    assert.ok(front, id);
    assert.equal(front.kind,"cone");
    assert.equal(front.category,"Cascão Trufado");
    assert.equal(front.name,name);
    assert.equal(front.variants[0].id,"unidade");
    assert.equal(front.variants[0].price,20);
    assert.equal(front.image,`/images/${slug}-detail-20261112.webp`);
    assert.equal(front.cardImage,`/images/${slug}-card-20261112.webp`);
    assert.deepEqual([serverCones[id].itemKey,serverCones[id].name,serverCones[id].priceCents],[key,name,2000]);
    const result=quoteCartItems([{product_id:id,variant_id:"unidade",option_ids:[],quantity:2}]);
    assert.equal(result.subtotalCents,4000);
    assert.equal(result.items[0].item_type,"cone");
    assert.equal(result.items[0].name,`Cascão Trufado — ${name}`);
    assert.equal(result.items[0].size_label,"1 cascão");
    assert.deepEqual([...result.availabilityKeys].sort(),["category_cones",key].sort());
    assert.throws(()=>quoteCartItems([{product_id:id,variant_id:"fatia",option_ids:[],quantity:1}]),/Cascão Trufado válido/);
    assert.throws(()=>quoteCartItems([{product_id:id,variant_id:"unidade",option_ids:["nutella"],quantity:1}]),/Cascão Trufado válido/);
  }
});

test("os 3 sabores históricos conservam preço e ID, com nome comercial novo", () => {
  for(const [id,cents] of [["cone-trufado-prestigio",1400],["cone-trufado-dois-amores",1400],["cone-trufado-ferrero-rocher",1600]]) {
    assert.equal(serverCones[id].priceCents,cents);
    assert.equal(frontCones.find(x=>x.id===id).variants[0].price,cents/100);
    assert.equal(quoteCartItems([{product_id:id,variant_id:"unidade",quantity:1}]).items[0].item_type,"cone");
  }
});

test("quatro fatias natalinas custam R$22 cada, mesmo para pedido misto", () => {
  assert.equal(frontChocotones.length,4);
  assert.equal(Object.keys(serverChocotones).length,4);
  for(const product of frontChocotones) {
    assert.equal(product.variants[0].price,22);
    assert.equal(serverChocotones[product.id].priceCents,2200);
  }
  const mixed=[
    ...cases.map(([id])=>({product_id:id,variant_id:"unidade",option_ids:[],quantity:1})),
    ...frontChocotones.map(x=>({product_id:x.id,variant_id:"porcao",option_ids:[],quantity:1})),
  ];
  const quote=quoteCartItems(mixed);
  assert.equal(quote.subtotalCents,14800);
  assert.deepEqual(quote.items.map(x=>x.unit_price_cents),[2000,2000,2000,2200,2200,2200,2200]);
});

test("admin habilita novos cascões apenas via linhas próprias ocultas na migração", () => {
  const migration=read("supabase/migrations/20261112103000_cascao_trufado_novos_sabores.sql");
  const menu=read("app/menu-availability.ts");
  const page=read("app/page.tsx");
  const css=read("app/cones-trufados-20261108.css");
  assert.equal(STORE_CONFIG.enabledExtras.drinks,false);
  for(const [,key,name] of cases) {
    assert.ok(menu.includes(key),key);
    assert.ok(migration.includes(`'${key}', '${name}', 'product', 'category_cones', 'hidden'`));
  }
  assert.match(migration,/WHERE item_key = 'category_cones'/);
  assert.match(migration,/ON CONFLICT \(item_key\) DO NOTHING/);
  assert.doesNotMatch(migration,/UPDATE public\.menu_availability SET status/i);
  assert.match(menu,/for \(const cone of CONE_ITEMS\) statuses\[cone\.itemKey\] = "hidden"/);
  assert.match(page,/name="Cascão Trufado"/);
  assert.match(page,/coneIsVisible\(cone\.id\)/);
  assert.match(css,/max-width: 599px/);
  assert.match(css,/last-child:nth-child\(odd\)/);
});
