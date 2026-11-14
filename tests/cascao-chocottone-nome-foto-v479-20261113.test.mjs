import test from "node:test";
import assert from "node:assert/strict";
import { CONES as FRONT_CONES } from "../app/catalog.ts";
import { CONES as EDGE_CONES, quoteCartItems } from "../supabase/functions/_shared/commerce-catalog.mjs";

const id = "cascao-trufado-ninho-nutella-chocotone";
const skuKey = "cascao_ninho_nutella_chocotone";

test("V4.7.9: nome visível Chocottone com dois T e imagens individuais v479", () => {
  const product=FRONT_CONES.find(p=>p.id===id);
  assert.ok(product);
  assert.equal(product.name,"Ninho Nutella e Chocottone");
  assert.equal(product.image,`/images/${id}-20261113-v479.webp`);
  assert.equal(product.cardImage,`/images/${id}-card-20261113-v479.webp`);
  assert.match(product.imageAlt,/Chocottone/);
  assert.match(product.imageAlt,/pedaço de chocottone no topo/);
  assert.equal(product.variants[0].price,20);
  assert.equal(product.variants[0].id,"unidade");
});

test("V4.7.9: contrato Edge de origem só ajusta rótulo, preservando chave e preço", () => {
  assert.equal(EDGE_CONES[id].itemKey,skuKey);
  assert.equal(EDGE_CONES[id].name,"Ninho Nutella e Chocottone");
  assert.equal(EDGE_CONES[id].priceCents,2000);
  const quote=quoteCartItems([{product_id:id,variant_id:"unidade",quantity:2,option_ids:[]}]);
  assert.equal(quote.subtotalCents,4000);
  assert.equal(quote.items[0].product_id,id);
  assert.match(quote.items[0].name,/Ninho Nutella e Chocottone/);
  assert.ok(!quote.items[0].name.includes("Chocotone"));
});

test("V4.7.9: outros cinco sabores mantêm preços e versões de fotos", () => {
  const untouched = [
    ["cone-trufado-prestigio",18,"v478"],
    ["cascao-folheado-geleia-morango-ninho",22,"v4713"],
    ["cone-trufado-ferrero-rocher",20,"v4713"],
    ["cascao-trufado-kinder-bueno",22,"v476"],
    ["cascao-trufado-ninho-morango",20,"v478"],
  ];
  assert.equal(FRONT_CONES.length,6);
  for (const [productId,price,edition] of untouched) {
    const p=FRONT_CONES.find(item=>item.id===productId);
    assert.ok(p,productId);
    assert.equal(p.variants[0].price,price);
    assert.ok(p.cardImage.endsWith(`-${edition}.webp`),productId);
  }
});
