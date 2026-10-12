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

test("calda tem contraste explícito em ambos os estados e mantém valores existentes", () => {
  const original = "#503421";
  const selector = ".storefront .slice-sauce-choice .slice-sauce-card";
  const sauceStyle = boutique.slice(boutique.indexOf("/* Boutique 2.1"));
  assert.ok(sauceStyle.includes("background: #302016"));
  assert.ok(sauceStyle.includes("color: #fff6e9"));
  assert.ok(sauceStyle.includes(".slice-sauce-copy strong"));
  assert.ok(sauceStyle.includes(".slice-sauce-copy small"));
  assert.ok(sauceStyle.includes(".slice-sauce-card.is-selected"));
  assert.ok(sauceStyle.includes(":focus-within"));
  assert.ok(!sauceStyle.includes(`color: ${original}`));
  assert.ok(home.includes("option.name"));
  assert.ok(home.includes('option.id === "calda-chocolate"'));
  assert.ok(home.includes('value={sliceOptionId}'));
  assert.ok(home.includes('onValueChange={value =>'));
  assert.ok(home.includes('requestScroll("quantidade-fatias")'));
});

test("o interior deixa explícitas as opções e o produto selecionado, sem passos extras", () => {
  assert.ok(home.includes('className="boutique-slice-preview"'));
  assert.ok(home.includes('className="boutique-flavor-summary"'));
  assert.ok(home.includes('className="boutique-flavor-tags"'));
  assert.ok(home.includes('Sem cobertura adicional'));
  assert.ok(home.includes('Cobertura de chocolate'));
  assert.ok(home.includes("SLICE_OPTIONS.map(option =>"));
  assert.ok(boutique.includes(".storefront .slice-card-copy strong"));
  assert.ok(boutique.includes(".storefront .cart-item-value strong"));
  assert.ok(boutique.includes(".storefront .summary-card"));
});
