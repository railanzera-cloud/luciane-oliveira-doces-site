import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("app/page.tsx", "utf8");
const css = readFileSync("app/storefront-vitrine-editorial-experiment.css", "utf8");
const checkout = readFileSync("app/order-checkout.ts", "utf8");

test("Trufadas permanentes: selecao expressiva com acessibilidade sem alterar avancos", () => {
  assert.equal((page.match(/className="limited-cup-card-check"/g) ?? []).length, 2);
  assert.match(page, /className="limited-cup-choice-confirmed" role="status"/);
  assert.match(page, /aria-pressed=\{cupFlavorPreview === "ninho"\}/);
  assert.match(page, /aria-pressed=\{cupFlavorPreview === "chocolate"\}/);
  assert.match(page, /requestScroll\("crocantes-quantidade"\)/);
  assert.match(css, /\.limited-cup-duo-item\.is-selected \.limited-cup-card-check/);
  assert.match(css, /\.limited-cup-duo-item:focus-visible/);
});

test("Trufadas: subtotal reage apenas a alteracao com movimento reduzido", () => {
  assert.match(page, /key=\{\x60\$\{cupFlavorPreview \?\? "unit"\}-\$\{cupQuantity\}\x60\}/);
  assert.match(page, /currency\.format\(15\.9 \* \(cupFlavorPreview \? cupQuantity : 1\)\)/);
  assert.match(css, /trufadas-subtotal-update/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /\.mini-quantity button:not\(:disabled\)/);
  assert.match(css, /\.mini-quantity button:disabled/);
});

test("Trufadas: carrinho e exploracao permitem mais produtos, sem ignorar disponibilidade", () => {
  assert.match(page, /className="limited-cup-to-cart" onClick=\{\(\) => requestScroll\("carrinho"\)\}/);
  assert.match(page, /className="limited-cup-more-intro"/);
  assert.match(page, /categoryIsAvailable\("pipocas"\) && \(/);
  assert.match(page, /fatiasAvailable && \(/);
  assert.match(page, /className="limited-cup-more-slices" onClick=\{\(\) => selectCategory\("fatias"\)\}/);
  assert.match(page, /onClick=\{\(\) => selectCategory\("pipocas"\)\}/);
  assert.match(css, /#configurador\.is-cup-discovery \{/);
});

test("Trufadas: callback principal, limite de estoque, fotos e observador intactos", () => {
  assert.match(page, /onClick=\{handleCupPurchaseAction\}/);
  assert.match(page, /onClick=\{handleStickyAction\}/);
  assert.match(page, /threshold: 0\.45, rootMargin: "0px 0px -68px 0px"/);
  assert.match(page, /!\(cupBuilderFlowActive && cupInlineActionVisible\)/);
  assert.match(page, /qty \+ alreadyInCart > confirmedStock/);
  assert.match(page, /trackMetaEvent\("AddToCart"/);
  assert.match(page, /pipocas-trufadas-ninho\.avif\?v=20261017-zoom2/);
  assert.match(page, /pipocas-trufadas-chocolate\.avif\?v=20261017-zoom2/);
  assert.match(checkout, /item\.product_id === "crocante-ninho"/);
  assert.match(checkout, /item\.product_id === "crocante-chocolate"/);
});
