import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
const src=p=>readFileSync(p,"utf8");
const page=src("app/page.tsx"),catalog=src("app/catalog.ts"),backend=src("supabase/functions/_shared/commerce-catalog.mjs");
test("Trufadas: nomes e IDs históricos protegidos na linha expandida",()=>{
  assert.match(catalog,/id: "crocante-ninho"/);
  assert.match(catalog,/id: "crocante-chocolate"/);
  assert.match(catalog,/retired: true/);
  assert.match(catalog,/name: "Ninho"/);
  assert.match(catalog,/name: "Paçoca"/);
  assert.match(catalog,/name: "Coco Queimado"/);
  assert.match(backend,/getTrufadaVariant/);
  assert.match(page,/showLimitedCupView \? "Pipocas Trufadas"/);
  assert.doesNotMatch(page,/Escolha entre Ninho e Chocolate/);
});
test("Vitrine premium mostra três sabores com imagens distintas",()=>{
  assert.match(page,/TRUFADA_PRODUCT_IDS\.map/);
  assert.match(page,/product\.image/);
  assert.match(page,/aria-pressed=\{selected\}/);
  assert.match(page,/limited-cup-duo is-trio/);
  assert.match(catalog,/pipocas-trufadas-ninho-20261101.webp/);
  assert.match(catalog,/pipocas-trufadas-pacoca-20261101.webp/);
  assert.match(catalog,/pipocas-trufadas-coco-queimado-20261101.webp/);
});
test("Preço acompanha variante P M G, sem converter gramagem não confirmada",()=>{
  assert.match(page,/cupVariant\?\.price/);
  assert.match(catalog,/id: "p"/);
  assert.match(catalog,/id: "m"/);
  assert.match(catalog,/id: "g"/);
  assert.doesNotMatch(page,/187\s*g|173\s*g|240\s*g/);
});
