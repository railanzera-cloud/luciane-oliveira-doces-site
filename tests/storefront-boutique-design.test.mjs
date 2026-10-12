import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const boutique = await readFile(new URL("../app/storefront-boutique.css", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
const home = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("layout carrega a camada boutique DEPOIS dos estilos existentes", () => {
  const original = layout.indexOf('import "./globals.css";');
  const enhancement = layout.indexOf('import "./storefront-boutique.css";');
  assert.ok(original >= 0 && enhancement > original);
});

test("camada boutique é isolada do painel e não define regras globais", () => {
  assert.ok(boutique.startsWith("/*"));
  assert.ok(boutique.includes(".storefront {"));
  assert.ok(!boutique.includes(".admin-"));
  assert.ok(!boutique.includes("@import"));
  assert.ok(!boutique.includes("url(http"));
  assert.ok(!boutique.includes(":root {"));
  assert.ok(!boutique.includes("body {"));
  assert.ok(!boutique.includes("footer {"));
  assert.ok(!boutique.includes("!important;\n} *"));
});

test("entrada e escolhas correspondem a componentes existentes", () => {
  const selectors = [
    ".category-options", ".category-option-media", ".category-option-copy",
    ".category-option-arrow", ".builder-card", ".step-heading",
    ".size-card", ".flavor-card", ".slice-card", ".slice-media",
    ".quantity-control", ".primary-cta", ".checkout-section",
    ".order-card", ".summary-card", ".payment-option", ".mobile-sticky-bar",
  ];
  for (const selector of selectors) {
    assert.ok(boutique.includes(`.storefront ${selector}`), `Estilo ausente: ${selector}`);
    assert.ok(home.includes(selector.slice(1)), `Elemento visual não existe no checkout: ${selector}`);
  }
});

test("acessibilidade preserva teclado, toque e redução de movimento", () => {
  assert.ok(boutique.includes(".storefront .category-option:focus-visible"));
  assert.ok(boutique.includes(".storefront .flavor-card:focus-within"));
  assert.ok(boutique.includes("@media (prefers-reduced-motion: reduce)"));
  assert.ok(boutique.includes("@media (max-width: 359px)"));
  assert.ok(boutique.includes("@media (min-width: 980px)"));
  assert.ok(boutique.includes("min-height: 46px"));
  assert.ok(!boutique.includes("outline: none"));
  assert.ok(!boutique.includes("pointer-events: none;\n} /* buttons"));
});

test("nenhum componente de pagamento, campanha ou gatilho foi modificado pela etapa visual", () => {
  const pageLines = home.split("\n");
  assert.ok(pageLines.some(line => line.includes("handleFinalAction")));
  assert.ok(pageLines.some(line => line.includes("handleStickyAction")));
  assert.ok(pageLines.some(line => line.includes("selectCategory(category.id)")));
  assert.ok(pageLines.some(line => line.includes("choosePopcornVariant")));
  assert.ok(pageLines.some(line => line.includes("togglePopcornOption")));
  assert.ok(pageLines.some(line => line.includes("addOrUpdatePopcorn")));
  assert.ok(pageLines.some(line => line.includes("addOrUpdateSlice")));
});
