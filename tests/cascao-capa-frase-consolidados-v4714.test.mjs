import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CONES } from "../app/catalog.ts";
import { CONES as BACKEND } from "../supabase/functions/_shared/commerce-catalog.mjs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("bloco trust-section: apenas a frase editorial aprovada, mantendo footer jurídico separado",()=>{
 const page=read("app/page.tsx");
 assert.match(page,/<section className="trust-section">[\s\S]*?<p className="eyebrow">Luciane Oliveira Doces<\/p><h2>Cada doce é preparado para tornar seu momento ainda mais especial\.<\/h2>/);
 assert.doesNotMatch(page,/Feito em Paragominas com muito recheio e cuidado em cada pedido/);
 assert.match(page,/<StorefrontLegalFooter \/>/);
 assert.match(read("components/storefront-legal-footer.tsx"),/BUSINESS_IDENTITY\.taxId/);
});
test("foto da capa PR53 mantida, sem perder seis produtos, preços e identidade jurídica",()=>{
 const page=read("app/page.tsx");
 assert.match(page,/cascao-trufado-trio-home-20261114-v4713\.webp/);
 assert.equal(CONES.length,6);
 assert.equal(CONES.find(p=>p.id==="cascao-folheado-geleia-morango-ninho")?.variants[0].price,22);
 assert.equal(CONES.find(p=>p.id==="cascao-trufado-kinder-bueno")?.variants[0].price,22);
 assert.equal(BACKEND["cascao-trufado-kinder-bueno"].priceCents,2200);
 assert.equal(BACKEND["cone-trufado-dois-amores"].retired,true);
 assert.match(read("app/layout.tsx"),/1491655855979140/);
 assert.match(read("app/layout.tsx"),/s\.tintim\.app/);
});
