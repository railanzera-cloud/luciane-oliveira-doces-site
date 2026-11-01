import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
const p=readFileSync("app/page.tsx","utf8");
const css=readFileSync("app/storefront-vitrine-editorial-experiment.css","utf8");
test("Trufadas: escolha de três sabores acessível em cartões individuais",()=>{
  assert.match(p,/TRUFADA_PRODUCT_IDS\.map/);
  assert.match(p,/className="limited-cup-card-check"/);
  assert.match(p,/aria-pressed=\{selected\}/);
  assert.match(p,/aria-controls="crocantes-tamanhos"/);
  assert.match(css,/\.limited-cup-duo-item:focus-visible/);
});
test("Tamanho e quantidade não usam preço fixo de Ninho antigo",()=>{
  assert.match(p,/TRUFADA_SIZES\.map/);
  assert.match(p,/onClick=\{\(\) => selectCupSize\(size\)\}/);
  assert.match(p,/currency\.format\(\(cupVariant\?\.price/);
  assert.match(p,/cupRemaining/);
});
test("Trufadas impedem compra sem disponibilidade comprovada",()=>{
  assert.match(p,/availability\.stockChecked/);
  assert.match(p,/!cupCanOrder/);
  assert.match(p,/qty \+ alreadyInCart > confirmedStock/);
  assert.match(p,/requestScroll\("recebimento"\)/);
});
