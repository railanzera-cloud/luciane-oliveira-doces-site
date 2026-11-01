import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { readFileSync } from "node:fs";
import { quoteCartItems } from "../supabase/functions/_shared/commerce-catalog.mjs";
const load=p=>readFileSync(p,"utf8");
const release=load("app/limited-cup-release.ts"),page=load("app/page.tsx"),edge=load("supabase/functions/create-whatsapp-order/index.ts");
const compiled=ts.transpileModule(release,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const exports={};vm.runInNewContext(compiled,{exports});
test("fechamento da loja domina qualquer disponibilidade",()=>{
  assert.equal(exports.getLimitedCupPhase(false,true,false),"closed");
  assert.equal(exports.getLimitedCupPhase(true,true,false),"available");
  assert.equal(exports.getLimitedCupPhase(true,false,true),"sold-out");
  assert.equal(exports.getLimitedCupPhase(true,false,false),"unavailable");
});
test("preços P/M/G não são condicionados ao calendário antigo",()=>{
  const p=[{product_id:"crocante-ninho",variant_id:"p",option_ids:[],quantity:2},{product_id:"trufada-pacoca",variant_id:"m",option_ids:[],quantity:1}];
  for(const t of ["2026-10-15T12:01:00-03:00","2026-11-01T12:01:00-03:00"]){
    const q=quoteCartItems(p,Date.parse(t));
    assert.equal(q.subtotalCents,4870);
    assert.deepEqual(q.availabilityKeys,["category_pipocas","trufada_ninho_p","trufada_pacoca_m"]);
  }
});
test("loja, estoque e registro remoto impedem overselling",()=>{
  assert.match(page,/availability\.stockChecked/);
  assert.match(page,/latest\.usedFallback \|\| !latest\.snapshot\.ordersOpen/);
  assert.match(page,/!isItemAvailable\(latest\.snapshot, CATEGORY_ITEM_KEYS\.pipocas\)/);
  assert.match(page,/!exactKey \|\| !isItemAvailable\(latest\.snapshot, exactKey\)/);
  assert.match(edge,/rpc\/create_whatsapp_store_order/);
  assert.match(edge,/preview_disabled/);
});
