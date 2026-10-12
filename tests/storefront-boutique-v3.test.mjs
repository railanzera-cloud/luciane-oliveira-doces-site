import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/storefront-boutique-v3.css", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");

test("v3 é camada isolada e posterior à boutique 2.1", () => {
  const oldIndex = layout.indexOf('import "./storefront-boutique.css";');
  const newIndex = layout.indexOf('import "./storefront-boutique-v3.css";');
  assert.ok(oldIndex >= 0 && newIndex > oldIndex);
  assert.ok(css.startsWith("/*"));
  assert.ok(!css.includes(".admin-"));
  assert.ok(!css.includes("@import"));
  assert.ok(!css.includes(":root {"));
  assert.ok(!css.includes("body {"));
  assert.ok(!css.includes("url(http"));
});

test("grade de fatias valoriza foto e coloca indisponíveis depois sem alterar catálogo", () => {
  assert.ok(page.includes('className="slice-grid"'));
  assert.ok(page.includes("SLICES.filter((slice) => sliceIsVisible(slice.id))"));
  assert.ok(page.includes(".sort((first, second) =>"));
  assert.ok(page.includes("sliceIsAvailable(second.id)"));
  assert.ok(page.includes("sliceIsAvailable(first.id)"));
  assert.ok(page.includes('className="boutique-slice-card-footer"'));
  assert.ok(page.includes("currency.format(variant.price)"));
  assert.ok(css.includes(".storefront .slice-media"));
  assert.ok(css.includes("aspect-ratio: 1 / 1.04"));
  assert.ok(css.includes(".storefront .slice-card.is-unavailable"));
});

test("preço do sabor é o do pote COM a combinação atual e não um sabor isolado", () => {
  assert.ok(page.includes("const currentPotPrice = popcornVariantUsable && popcornVariant"));
  assert.ok(page.includes("popcornPrice(popcornVariant.id, popcornOptionIds, promotionTime)"));
  assert.ok(page.includes("selected ? popcornOptionIds : [...popcornOptionIds, option.id]"));
  assert.ok(page.includes("const priceDifference = currentPotPrice !== null && potPriceWithOption !== null"));
  assert.ok(page.includes("currency.format(potPriceWithOption)"));
  assert.ok(page.includes("priceDifference > 0 ?"));
  assert.ok(page.includes("Mantém o preço"));
  assert.ok(page.includes("Se incluir"));
  assert.ok(!page.includes('popcornPrice(popcornVariant.id, [option.id], promotionTime)'));
  assert.ok(page.includes("togglePopcornOption(option)"));
  assert.ok(page.includes("popcornPromotionActive"));
});

test("carrinho exibe foto e mantém todas as ações comerciais", () => {
  assert.ok(page.includes('className="boutique-cart-product"'));
  assert.ok(page.includes("product.cardImage ?? product.image"));
  assert.ok(page.includes("itemUnitPrice(product, variant, item.optionIds, promotionTime)"));
  assert.ok(page.includes("changeCartQuantity(item.id, -1)"));
  assert.ok(page.includes("changeCartQuantity(item.id, 1)"));
  assert.ok(page.includes("editItem(item)"));
  assert.ok(page.includes("removeItem(item.id)"));
  assert.ok(page.includes("cartAvailabilityIssues(cart, availability)"));
});

test("checkout só adiciona navegação visual e preserva finalização", () => {
  assert.ok(page.includes('className="boutique-checkout-progress"'));
  for (const id of ["carrinho", "recebimento", "pagamento"])
    assert.ok(page.includes(`scrollToSection("${id}")`));
  assert.ok(page.includes('className="boutique-final-action" ref={inlineFinalActionRef}'));
  assert.ok(page.includes('typeof IntersectionObserver === "undefined"'));
  assert.ok(page.includes("observer.disconnect()"));
  assert.ok(page.includes("stickyUsesCheckoutAction && inlineFinalActionVisible"));
  assert.ok(page.includes("onClick={handleFinalAction}"));
  assert.ok(page.includes("onClick={handleStickyAction}"));
  assert.ok(page.includes("checkoutFingerprint"));
  assert.ok(page.includes("finishOnWhatsApp()"));
  assert.ok(page.includes("finishOnSite()"));
  assert.ok(page.includes('data-event={checkoutChannel === "whatsapp" ? "whatsapp_checkout" : "site_checkout"}'));
});

test("pagamentos ganham esclarecimentos sem alteração dos métodos aceitos", () => {
  for (const id of ["pix","dinheiro","credito","debito"]) {
    assert.ok(page.includes(`value: "${id}"`));
  }
  assert.ok(page.includes("value={method.value}"));
  assert.ok(page.includes("choosePayment"));
  assert.ok(page.includes("COMMERCE_CONFIG.onlinePaymentsEnabled"));
  assert.ok(page.includes("cardQuote"));
});

test("foco, contraste, toque e redução de movimento permanecem disponíveis", () => {
  assert.ok(css.includes("color: #fff8ee"));
  assert.ok(css.includes(".storefront .flavor-card:focus-within"));
  assert.ok(css.includes(".storefront .boutique-checkout-progress button:focus-visible"));
  assert.ok(css.includes("min-height: 55px"));
  assert.ok(css.includes("@media (max-width: 359px)"));
  assert.ok(css.includes("@media (prefers-reduced-motion: reduce)"));
});
