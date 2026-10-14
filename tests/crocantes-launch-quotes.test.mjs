import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { quoteCartItems } from "../supabase/functions/_shared/commerce-catalog.mjs";
const source=readFileSync(new URL("../supabase/functions/_shared/commerce-catalog.mjs",import.meta.url),"utf8");
const ninho={product_id:"crocante-ninho",variant_id:"400ml",option_ids:[],quantity:2};
const chocolate={product_id:"crocante-chocolate",variant_id:"400ml",option_ids:[],quantity:1};

test("o calendário não condiciona a cotação dos Crocantes",()=>{
  const dates=["2026-10-14T09:00:00-03:00","2026-10-15T11:59:59-03:00","2026-10-15T12:00:00-03:00"];
  const quotes=dates.map(date=>quoteCartItems([ninho,chocolate],Date.parse(date)));
  for(const q of quotes){
    assert.equal(q.subtotalCents,4770);
    assert.deepEqual(q.items.map(i=>[i.product_id,i.quantity,i.unit_price_cents,i.line_total_cents]),[
      ["crocante-ninho",2,1590,3180],["crocante-chocolate",1,1590,1590]]);
    assert.deepEqual(q.availabilityKeys,["category_pipocas","crocante_copo_chocolate","crocante_copo_ninho"]);
  }
  assert.doesNotMatch(source,/CROCANTES_OPEN_AT_MS|Vendas dos copos Crocantes a partir/);
});
test("a composição com fatia preserva a cotação existente",()=>{
  const q=quoteCartItems([ninho,{product_id:"fatia-chocolate-morango",variant_id:"fatia",option_ids:["sem-calda"],quantity:1}]);
  assert.equal(q.subtotalCents,5380);
  assert.ok(q.availabilityKeys.includes("category_fatias"));
});
test("o servidor continua rejeitando SKU, sabor, tamanho e quantidades inválidas",()=>{
  for(const invalid of [
    {...ninho,variant_id:"1l"},{...ninho,option_ids:["chocolate"]},
    {...ninho,quantity:100},{product_id:"crocante-inventado",variant_id:"400ml",option_ids:[],quantity:1}
  ])assert.throws(()=>quoteCartItems([invalid]));
});
test("o fluxo mantém registro comercial e integração Tintim",()=>{
  const page=readFileSync(new URL("../app/page.tsx",import.meta.url),"utf8");
  assert.ok(page.includes('return `Pipocas Crocantes — ${product.name}`'));
  assert.ok(page.includes("tintimWhatsAppUrl(buildRegisteredOrderMessage"));
});
