import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
const page=readFileSync("app/page.tsx","utf8"),css=readFileSync("app/storefront-vitrine-editorial-experiment.css","utf8"),rel=readFileSync("app/limited-cup-release.ts","utf8");
test("vitrine oferece três sabores individuais sem mistura de sabores",()=>{
  assert.match(page,/TRUFADA_PRODUCT_IDS = \["crocante-ninho", "trufada-pacoca", "trufada-coco-queimado"\]/);
  assert.match(page,/TRUFADA_PRODUCT_IDS\.map/);
  assert.match(page,/aria-pressed=\{selected\}/);
  assert.match(page,/cupVariant\?\.price/);
  assert.doesNotMatch(page,/190 g/);
});
test("loja e estoque continuam substituindo datas promocionais",()=>{
  assert.match(page,/cupPhase === "closed" \? "LOJA FECHADA"/);
  assert.match(page,/cupLaunchCopy.description/);
  assert.match(rel,/if \(!ordersOpen\) return "closed"/);
  assert.match(rel,/if \(anyCupAvailable\) return "available"/);
  assert.match(css,/\.limited-cup-story-availability-kicker/);
});
test("atalho de Gourmet não compete com a escolha de Trufadas",()=>{
  assert.match(page,/onClick=\{\(\) => selectCategory\("pipocas"\)\}/);
  assert.match(page,/Prefere os potes recheados\?/);
  assert.match(css,/\.limited-cup-duo-item\.is-selected/);
});
