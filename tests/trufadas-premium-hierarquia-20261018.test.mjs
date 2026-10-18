import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("app/page.tsx", "utf8");
const css = readFileSync("app/storefront-vitrine-editorial-experiment.css", "utf8");
const checkout = readFileSync("app/order-checkout.ts", "utf8");

test("Trufadas: subtotal contextual sem mudar preço nem lógica de estoque", () => {
  assert.match(page, /className="limited-cup-buy-composition"/);
  assert.match(page, /className="limited-cup-buy-estimate" aria-live="polite" aria-atomic="true"/);
  assert.match(page, /currency\.format\(15\.9 \* \(cupFlavorPreview \? cupQuantity : 1\)\)/);
  assert.match(page, /cupCanOrder \? `Adicionar \$\{cupQuantity\}/);
  assert.match(page, /const confirmedStock = latest\.snapshot\.stockRemaining/);
  assert.match(page, /qty \+ alreadyInCart > confirmedStock/);
  assert.match(page, /trackMetaEvent\("AddToCart"/);
});

test("Trufadas: observação contextual da CTA flutuante mantida", () => {
  assert.match(page, /document\.querySelector<HTMLElement>\("\.storefront \.limited-cup-buy-cta"\)/);
  assert.match(page, /threshold: 0\.45, rootMargin: "0px 0px -68px 0px"/);
  assert.match(page, /!\(cupBuilderFlowActive && cupInlineActionVisible\)/);
  assert.match(page, /if \(typeof cupBuilderFlowActive !== "undefined" && cupBuilderFlowActive\) handleCupPurchaseAction\(\)/);
  assert.match(page, /: "Preço por pacote"/);
});

test("Trufadas: design é limitado ao configurador e fotos aprovadas preservadas", () => {
  assert.match(css, /Pipocas Trufadas — refinamento premium de hierarquia/);
  assert.match(css, /#configurador \.limited-cup-buy-composition/);
  assert.match(css, /#configurador \.limited-cup-buy-cta/);
  assert.match(page, /pipocas-trufadas-ninho\.avif\?v=20261017-zoom2/);
  assert.match(page, /pipocas-trufadas-chocolate\.avif\?v=20261017-zoom2/);
  assert.match(page, /CROCANTES_ITEM_KEYS\[product\.id\]/);
  assert.match(checkout, /item\.product_id === "crocante-ninho"/);
  assert.match(checkout, /item\.product_id === "crocante-chocolate"/);
});
