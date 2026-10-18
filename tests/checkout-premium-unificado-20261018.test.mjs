import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const page = readFileSync("app/page.tsx", "utf8");
const layout = readFileSync("app/layout.tsx", "utf8");
const css = readFileSync("app/storefront-checkout-premium.css", "utf8");
const oldCss = readFileSync("app/storefront-vitrine-editorial-experiment.css", "utf8");
const checkout = readFileSync("app/order-checkout.ts", "utf8");
test("Trufadas: mensagem curta conserva sabor e regras estruturais", () => {
  assert.ok(page.includes("description: `${qty}x Pipocas Trufadas · ${product.name}`,"));
  assert.ok(!page.includes("description: `${qty}x Pipocas Trufadas · ${product.name} · pacote com zíper`,"));
  assert.ok(page.includes("<p>{addedNotice.description}</p>"));
  assert.ok(page.includes("qty + alreadyInCart > confirmedStock"));
  assert.ok(page.includes("createWhatsAppOrder({"));
  assert.ok(checkout.includes('item.product_id === "crocante-ninho"'));
  assert.ok(checkout.includes('item.product_id === "crocante-chocolate"'));
});
test("UI checkout isolada em CSS posterior e fiel à identidade", () => {
  assert.ok(layout.includes('import "./storefront-vitrine-editorial-experiment.css";\nimport "./storefront-checkout-premium.css";'));
  for (const value of ["checkout-premium-20261018", ".storefront #carrinho.checkout-section", ".storefront #carrinho .order-card", ".storefront #carrinho .summary-card", ".storefront #carrinho .payment-option.is-selected", ".storefront #carrinho .choice-card.is-selected", ".storefront #carrinho .field-group input", "prefers-reduced-motion:reduce", "@media(max-width:359px)"]) assert.ok(css.includes(value), value);
});
test("Barra flutuante preserva observadores e handlers", () => {
  assert.ok(page.includes('stickyUsesCheckoutAction ? "is-checkout-flow" : ""'));
  assert.ok(page.includes("!(stickyUsesCheckoutAction && inlineFinalActionVisible)"));
  assert.ok(page.includes("!(cupBuilderFlowActive && cupInlineActionVisible)"));
  assert.ok(page.includes('threshold: 0.45, rootMargin: "0px 0px -68px 0px"'));
  assert.ok(page.includes("onClick={handleStickyAction}"));
  assert.ok(page.includes("onClick={handleFinalAction}"));
  assert.ok(css.includes(".mobile-sticky-bar.is-checkout-flow"));
  assert.ok(oldCss.includes("trufadas-subtotal-update"));
});
test("Fluxos de compras, pagamentos e atendimento preservados", () => {
  for(const value of ["onValueChange={chooseFulfillment}", "onValueChange={choosePayment}", "onClick={() => changeCartQuantity(item.id, 1)}", "onClick={() => removeItem(item.id)}", 'onClick={() => startAnother("fatias")}', 'onClick={() => startAnother("pipocas")}', "checkoutReady", "cartAvailabilityIssues(cart, availability)"]) assert.ok(page.includes(value), value);
});
