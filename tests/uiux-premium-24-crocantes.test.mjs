import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
const page=readFileSync("app/page.tsx","utf8"),css=readFileSync("app/storefront-vitrine-editorial-experiment.css","utf8"),rel=readFileSync("app/limited-cup-release.ts","utf8");
test("vitrine identifica formato, sabores e tamanhos; configurador exibe preço da variante",()=>{
  assert.match(page,/Ninho, Paçoca e Coco Queimado · P, M e G/);
  assert.match(page,/currency.format\(variant.price\)/);
  assert.match(page,/limited-cup-duo is-trio/);
});
test("detalhes e tamanho permanecem acessíveis com foco e estados",()=>{
  assert.match(page,/aria-pressed=\{selected\}/);
  assert.match(page,/aria-pressed=\{cupSizeId === size\}/);
  assert.match(page,/role="group" aria-label="Tamanho do pacote"/);
  assert.match(page,/aria-live="polite"/);
  assert.match(css,/\.limited-cup-size-option:focus-visible/);
});
test("fechamento e estoque continuam bloqueando compra",()=>{
  assert.match(page,/cupPhase === "closed" \? "LOJA FECHADA"/);
  assert.match(page,/cupCanOrder/);
  assert.match(page,/!latest\.snapshot\.stockChecked/);
  assert.match(rel,/if \(!ordersOpen\) return "closed"/);
});
