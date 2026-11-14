import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CONES as frontend, CHOCOTONES } from "../app/catalog.ts";
import { CONES as backend, quoteCartItems } from "../supabase/functions/_shared/commerce-catalog.mjs";
import { CONE_ITEM_KEYS } from "../app/menu-availability.ts";
const read = p => readFileSync(new URL("../" + p, import.meta.url),"utf8");
test("V4.7.13: seis sabores, Dois Amores aposentado sem modificar Casadinho do Natal",()=>{
 assert.equal(frontend.length,6);
 assert.ok(!frontend.some(p=>p.id==="cone-trufado-dois-amores"));
 assert.equal(backend["cone-trufado-dois-amores"].retired,true);
 assert.equal(backend["cone-trufado-dois-amores"].itemKey,"cone_dois_amores");
 assert.throws(()=>quoteCartItems([{product_id:"cone-trufado-dois-amores",variant_id:"unidade",quantity:1}]),/descontinuado/);
 assert.ok(CHOCOTONES.some(p=>p.id==="chocotone-casadinho"));
});
test("Folheado real 4:5 com Ninho e geleia: SKU novo e preço R$22 por unidade nas duas camadas",()=>{
 const f=frontend.find(p=>p.id==="cascao-folheado-geleia-morango-ninho");
 assert.ok(f); assert.equal(f.name,"Folheado — Geleia de Morango com Ninho");
 assert.equal(f.variants[0].price,22); assert.equal(backend["cascao-folheado-geleia-morango-ninho"].priceCents,2200);
 assert.equal(CONE_ITEM_KEYS["cascao-folheado-geleia-morango-ninho"],"cascao_folheado_geleia_morango_ninho");
 assert.equal(f.image,"/images/cascao-folheado-geleia-morango-ninho-20261114-v4713.webp");
 assert.equal(f.cardImage,"/images/cascao-folheado-geleia-morango-ninho-card-20261114-v4713.webp");
 const quote=quoteCartItems([{product_id:"cascao-folheado-geleia-morango-ninho",variant_id:"unidade",quantity:2,option_ids:[]}]);
 assert.equal(quote.subtotalCents,4400);
 assert.deepEqual(quote.availabilityKeys,["category_cones","cascao_folheado_geleia_morango_ninho"].sort());
});
test("Kinder Bueno e Nutella: nome comercial e preço mudam sem mudar IDs",()=>{
 const id="cascao-trufado-kinder-bueno",f=frontend.find(p=>p.id===id),b=backend[id];
 assert.equal(f.name,"Kinder Bueno e Nutella");assert.equal(b.name,f.name);
 assert.equal(f.variants[0].price,22); assert.equal(b.priceCents,2200);
 assert.equal(b.itemKey,"cascao_kinder_bueno");
 assert.equal(quoteCartItems([{product_id:id,variant_id:"unidade",quantity:1}]).subtotalCents,2200);
});
test("Ferrero: novo arquivo de foto, sem mudar preço, SKU, WhatsApp, Meta ou Tintim",()=>{
 const f=frontend.find(p=>p.id==="cone-trufado-ferrero-rocher");
 assert.equal(f.variants[0].price,20);
 assert.match(f.image,/20261114-v4713\\.webp$/);
 assert.match(f.cardImage,/card-20261114-v4713\\.webp$/);
 assert.match(f.imageAlt,/bombom cortado/);
 assert.match(read("app/page.tsx"),/tintimWhatsAppUrl/);
 assert.match(read("app/layout.tsx"),/1491655855979140/);
});
test("Migração não executada: novo Folheado oculto, Dois Amores retirado sem deletar registros",()=>{
 const sql=read("supabase/migrations/20261114080000_cascao_folheado_bueno_nutella.sql");
 assert.match(sql,/cascao_folheado_geleia_morango_ninho/);
 assert.match(sql,/hidden/);
 assert.match(sql,/cone_dois_amores/);
 assert.doesNotMatch(sql,/DELETE FROM|TRUNCATE/i);
});
