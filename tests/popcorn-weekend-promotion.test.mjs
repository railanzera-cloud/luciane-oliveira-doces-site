import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { POPCORN_PROMOTION, isPopcornPromotionActive, promotionalPopcornPriceCents } from "../supabase/functions/_shared/popcorn-promotion.mjs";
import { quoteCartItems } from "../supabase/functions/_shared/commerce-catalog.mjs";
const original = await readFile(new URL("../app/catalog.ts",import.meta.url),"utf8");
const compiled = ts.transpileModule(original,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText
  .replace("../supabase/functions/_shared/popcorn-promotion.mjs",new URL("../supabase/functions/_shared/popcorn-promotion.mjs",import.meta.url).href);
const catalog = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const item=(size,flavors)=>({product_id:"pipoca-gourmet",variant_id:size,option_ids:flavors,quantity:1});
test("janela de Paragominas termina 12/10 às 00h, exclusive",()=>{
  assert.equal(POPCORN_PROMOTION.startsAt,Date.parse("2026-10-10T03:00:00Z"));
  assert.equal(POPCORN_PROMOTION.endsAt,Date.parse("2026-10-12T03:00:00Z"));
  assert.equal(isPopcornPromotionActive(POPCORN_PROMOTION.endsAt-1),true);
  assert.equal(isPopcornPromotionActive(POPCORN_PROMOTION.endsAt),false);
});
test("preço promocional dos três tamanhos é o mesmo no frontend/backend",()=>{
 const before=POPCORN_PROMOTION.endsAt-1;
 for(const [size,price] of [["500ml",2500],["750ml",3900],["1l",4900]]){
   assert.equal(catalog.popcornPrice(size,["leitinho"],before)*100,price);
   assert.equal(quoteCartItems([item(size,["leitinho"])],before).subtotalCents,price);
   assert.equal(quoteCartItems([item(size,["kinder-bueno"])],before).subtotalCents,price);
 }
});
test("após meia-noite o preço permanente de cada conjunto é restabelecido",()=>{
 const after=POPCORN_PROMOTION.endsAt;
 for(const [size,price] of [["500ml",2500],["750ml",3900],["1l",4900]]){
   assert.equal(promotionalPopcornPriceCents(size,9999,after),9999);
   assert.notEqual(quoteCartItems([item(size,["kinder-bueno"])],after).subtotalCents,price);
 }
});
test("a regra não altera sabores inválidos nem máximo por tamanho",()=>{
 for(const size of ["500ml","750ml"])assert.throws(()=>quoteCartItems([item(size,["leitinho","kinder-bueno","nutella"])],POPCORN_PROMOTION.startsAt));
 assert.throws(()=>quoteCartItems([item("500ml",["sabor-inexistente"])],POPCORN_PROMOTION.startsAt));
});
