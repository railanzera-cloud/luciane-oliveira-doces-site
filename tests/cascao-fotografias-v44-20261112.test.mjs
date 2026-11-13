import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const catalog=fs.readFileSync("app/catalog.ts","utf8");
const page=fs.readFileSync("app/page.tsx","utf8");
const style=fs.readFileSync("app/cones-trufados-20261108.css","utf8");
const packer=fs.readFileSync("scripts/finish-cascao-v44-cloudflare.py","utf8");
const menu=fs.readFileSync("app/menu-availability.ts","utf8");
const server=fs.readFileSync("supabase/functions/_shared/commerce-catalog.mjs","utf8");

test("V4.7.4: home mantém trio de três cascões com fotografia natural",()=>{
 assert.match(page,/photo=\{coneIsVisible\("cascao-trufado-kinder-bueno"\) \? "\/images\/cascao-trufado-trio-home-20261113-v474\.webp"/);
 assert.match(page,/photo\.replace\("\.webp", "-360\.webp"\)/);
 assert.match(page,/id === "cones" \? \(coneIsVisible\("cascao-trufado-kinder-bueno"\)/);
 assert.match(page,/\/images\/cones-trufados-trio-20261108\.webp/);
 assert.doesNotMatch(page,/photo=\{coneIsVisible\("cascao-trufado-kinder-bueno"\) \? "\/images\/cascao-trufado-kinder-bueno-20261112\.webp"/);
});

test("V4.7.5: seis imagens de sabor atualizadas sem mudar o grid",()=>{
 const flavors=["kinder-bueno","ninho-morango","ninho-nutella-chocotone"];
 for(const flavor of flavors){
   const edition = flavor === "ninho-morango" ? "v475" : "v476";
   assert.match(catalog,new RegExp("image: \"/images/cascao-trufado-"+flavor+"-20261113-"+edition+"\\.webp\""));
   assert.match(catalog,new RegExp("cardImage: \"/images/cascao-trufado-"+flavor+"-card-20261113-"+edition+"\\.webp\""));
 }
 for(const flavor of ["prestigio","dois-amores","ferrero-rocher"]) {
   const photoEdition = flavor === "prestigio" ? "v477" : "v475";
   assert.ok(catalog.includes(`image: "/images/cone-trufado-${flavor}-20261113-${photoEdition}.webp"`));
   assert.ok(catalog.includes(`cardImage: "/images/cone-trufado-${flavor}-card-20261113-v475.webp"`));
 }
 assert.match(style,/\.cone-flavor-photo \{/);
 assert.match(style,/aspect-ratio: 4 \/ 5/);
 assert.match(style,/grid-template-columns: repeat\(3,minmax\(0,1fr\)\)/);
});

test("V4.4: montagem preserva fotos de Natal e originais e aplica apenas crop/resize",()=>{
 assert.match(packer,/crop\(\(0,70,1122,840\)\)/);
 assert.match(packer,/crop\(\(236,85,886,898\)\)/);
 assert.match(packer,/Image\.Resampling\.LANCZOS/);
 assert.match(packer,/PRIOR_SHA/);
 assert.match(packer,/NATAL_SHA/);
 assert.match(packer,/if result\.read\(name\)!=original\.read\(name\)/);
 assert.match(packer,/if result\.read\(name\)!=prior\.read\(name\)/);
 assert.match(packer,/len\(photos\)==11/);
 assert.doesNotMatch(packer,/ImageEnhance|ImageFilter|ImageDraw/);
});

test("V4.4: preços/checkout/códigos de disponibilidade não são alterados pela troca visual",()=>{
 assert.match(catalog,/name: "Kinder Bueno", available: true/);
 assert.match(catalog,/name: "Ninho com Morango", available: true/);
 assert.match(catalog,/name: "Ninho Nutella e Chocotone", available: true/);
 for(const id of ["cascao-trufado-kinder-bueno","cascao-trufado-ninho-morango","cascao-trufado-ninho-nutella-chocotone"]){
  const start=catalog.indexOf('id: "'+id+'"');
  assert.ok(start>=0,id);
  assert.match(catalog.slice(start,start+650),/price: 20, available: true/,id);
 }
 assert.match(server,/priceCents: 2000/);
 assert.match(server,/priceCents: 2200/);
 assert.match(menu,/cascao_kinder_bueno/);
 assert.match(menu,/cascao_ninho_morango/);
 assert.match(menu,/cascao_ninho_nutella_chocotone/);
 assert.match(catalog,/drinks: true/); // Agora bebidas dependem da liberação remota por SKU, sem alterar Cascões.
 assert.match(page,/function addOrUpdateCone\(\)/);
});
