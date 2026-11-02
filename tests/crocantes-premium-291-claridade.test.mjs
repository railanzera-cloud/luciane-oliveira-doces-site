import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
const page=readFileSync("app/page.tsx","utf8"),css=readFileSync("app/storefront-vitrine-editorial-experiment.css","utf8");
test("seleção de novo sabor reinicia só o rascunho da edição",()=>{
  assert.match(page,/function selectCupFlavor\(flavor: TrufadaProductId\)/);
  assert.match(page,/if \(cupFlavorPreview === flavor\) return/);
  assert.match(page,/setCupSizeId\(null\)/);
  assert.match(page,/setCupQuantity\(1\)/);
});
test("três etapas são claras sem repetir caramelo como nome",()=>{
  assert.match(page,/Escolha seu sabor/);
  assert.match(page,/Escolha o tamanho/);
  assert.match(page,/Seu pacote/);
  assert.match(page,/product\.name/);
  assert.doesNotMatch(page,/Caramelo e Chocolate/);
  assert.match(css,/\.limited-cup-duo-item\.is-selected/);
});
test("loja fechada não libera inclusão",()=>{
  assert.match(page,/cupPhase !== "available"/);
  assert.match(page,/LOJA FECHADA/);
  assert.match(page,/cupCanOrder/);
});
