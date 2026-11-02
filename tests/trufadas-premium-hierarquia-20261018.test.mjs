import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
const p=readFileSync("app/page.tsx","utf8");
const css=readFileSync("app/storefront-vitrine-editorial-experiment.css","utf8");
test("Jornada Trufadas segue sabor, tamanho, quantidade e pedido",()=>{
  const i=["01 · ESCOLHA SEU SABOR","02 · ESCOLHA O TAMANHO","03 · QUANTIDADE"].map(x=>p.indexOf(x));
  assert.ok(i.every(x=>x>0));assert.ok(i[0]<i[1]&&i[1]<i[2]);
  assert.match(p,/id="crocantes-sabores"/);
  assert.match(p,/id="crocantes-tamanhos"/);
  assert.match(p,/id="crocantes-quantidade"/);
  assert.match(p,/currency\.format\(\(cupVariant\?\.price/);
});
test("Trufadas verificam saldo exato antes de adicionar",()=>{
  assert.match(p,/const exactKey = trufadaStockItemKey\(product\.id, variant\.id\)/);
  assert.match(p,/qty \+ alreadyInCart > confirmedStock/);
  assert.match(p,/latest\.usedFallback/);
  assert.match(p,/trackMetaEvent\("AddToCart"/);
});
test("Vitrine e CTA flutuante mantêm contraste e observação do botão",()=>{
  assert.match(css,/\.limited-cup-size-option:focus-visible/);
  assert.match(css,/prefers-reduced-motion: reduce/);
  assert.match(p,/cupInlineActionVisible/);
  assert.match(p,/handleCupPurchaseAction/);
});
