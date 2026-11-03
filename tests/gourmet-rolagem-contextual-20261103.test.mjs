import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../lib/gourmet-guided-scroll.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
const exports = {};
new Function("exports", outputText)(exports);
const { gourmetFlavorScrollTop } = exports;
const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const layout = readFileSync(new URL("../app/gourmet-steps.css", import.meta.url), "utf8");
const holiday = readFileSync(new URL("../app/gourmet-feriado-20261102.css", import.meta.url), "utf8");

test("rolagem contextual mostra o pote e primeira opção na mesma dobra", () => {
  const scroll = gourmetFlavorScrollTop({ scrollY: 1200, stageY: 350, firstFlavorY: 620, viewportHeight: 844 });
  const stageY = 350 - (scroll - 1200);
  const firstY = 620 - (scroll - 1200);
  assert.ok(stageY >= 50 && stageY <= 100);
  assert.ok(firstY >= 230 && firstY <= 844 * .58);
});

test("viewport curto privilegia escolha acessível, sem rolagem negativa", () => {
  const scroll = gourmetFlavorScrollTop({ scrollY: 900, stageY: 280, firstFlavorY: 590, viewportHeight: 568 });
  assert.ok(scroll >= 900);
  assert.ok(590 - (scroll - 900) <= 329);
  assert.equal(gourmetFlavorScrollTop({ scrollY: 0, stageY: 5, firstFlavorY: 120, viewportHeight: 844 }), 0);
});

test("rolagem especial somente para recheios Gourmet, preço e demais passos preservados", () => {
  assert.match(page, /step === "flavor"[\s\S]*?"#sabores \.boutique-flavor-stage"/);
  assert.match(page, /gourmetFlavorScrollTop\(\{/);
  assert.match(page, /"#quantidade-pipocas \.quantity-row"/);
  assert.match(page, /requestScroll\("gourmet-flavor-action"\)/);
  assert.match(page, /popcornPrice\(popcornVariant.id, popcornOptionIds, promotionTime\)/);
  assert.match(page, /Ao combinar, vale o sabor de maior valor/);
  assert.doesNotMatch(page, /Ao combinar sabores, vale o preço do conjunto mais caro escolhido/);
});

test("estilos dos três tamanhos e barra flutuante independem da campanha", () => {
  assert.match(layout, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(layout, /mobile-sticky-bar\.is-gourmet-step/);
  assert.match(layout, /#sabores \.boutique-flavor-stage/);
  assert.doesNotMatch(holiday, /#tamanhos \.size-grid/);
  assert.doesNotMatch(holiday, /mobile-sticky-bar\.is-gourmet-step/);
});
