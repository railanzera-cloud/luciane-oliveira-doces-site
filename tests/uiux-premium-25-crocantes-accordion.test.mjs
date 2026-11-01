import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
const page=readFileSync("app/page.tsx","utf8"),css=readFileSync("app/storefront-vitrine-editorial-experiment.css","utf8");
test("escolha de sabor mantém seleção e limpa tamanho e quantidade",()=>{
  assert.match(page,/function selectCupFlavor\(flavor: TrufadaProductId\)/);
  assert.match(page,/if \(cupFlavorPreview === flavor\) return/);
  assert.match(page,/setCupFlavorPreview\(flavor\)/);
  assert.match(page,/setCupSizeId\(null\)/);
  assert.match(page,/setCupQuantity\(1\)/);
});
test("seleção acessível separa sabor e tamanho",()=>{
  assert.match(page,/aria-pressed=\{selected\}/);
  assert.match(page,/aria-pressed=\{cupSizeId === size\}/);
  assert.match(page,/aria-controls="crocantes-tamanhos"/);
  assert.match(page,/id="crocantes-tamanhos"/);
  assert.match(page,/role="group" aria-label="Tamanho do pacote"/);
  assert.match(css,/\.limited-cup-size-option:focus-visible/);
});
