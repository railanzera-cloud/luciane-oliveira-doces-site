import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
const page=readFileSync("app/page.tsx","utf8");
const css=readFileSync("app/storefront-vitrine-editorial-experiment.css","utf8");
test("CTA sticky do iPhone orienta sabor, tamanho e quantidade",()=>{
  assert.match(page,/!cupFlavorPreview \? "Escolher meu sabor" : !cupSizeId \? "Escolher tamanho"/);
  assert.match(page,/cupInlineActionVisible/);
  assert.match(page,/handleCupPurchaseAction/);
  assert.match(page,/requestScroll\("crocantes-sabores"\)/);
  assert.match(page,/requestScroll\("crocantes-tamanhos"\)/);
  assert.match(page,/requestScroll\("crocantes-quantidade"\)/);
});
test("adicionar pacote preserva checkout e continuar comprando",()=>{
  assert.match(page,/setAddedNotice\(\{/);
  assert.match(page,/requestScroll\("recebimento"\)/);
  assert.match(page,/function startAnotherCrocantes/);
  assert.match(page,/className="crocantes-cross-sell"/);
  assert.match(css,/boutique-added-other-actions\.has-crocantes-option/);
});
