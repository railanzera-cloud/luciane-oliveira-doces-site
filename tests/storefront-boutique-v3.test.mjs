import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/storefront-boutique-v3.css", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
const catalog = await readFile(new URL("../app/catalog.ts", import.meta.url), "utf8");

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
  assert.ok(page.includes('[["pix", "Pix"], ["dinheiro", "Dinheiro"], ["credito", "Cartão de crédito à vista"], ["debito", "Cartão de débito"]]'));
  for (const id of ["pix","dinheiro","credito","debito"])
    assert.ok(page.includes(`value === "${id}"`) || page.includes(`["${id}",`));
  assert.ok(page.includes("value={value}"));
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

test("Boutique 3.1 usa foto real do catálogo e mostra preço vivo no estágio de sabores", () => {
  assert.ok(page.includes('className="boutique-flavor-stage"'));
  assert.ok(page.includes("POPCORN.cardImage ?? POPCORN.image"));
  assert.ok(page.includes('className="boutique-flavor-stage-media"'));
  assert.ok(page.includes("currency.format(popcornPrice(popcornVariant.id, popcornOptionIds, promotionTime))"));
  assert.ok(css.includes(".storefront .boutique-flavor-stage"));
  assert.ok(css.includes(".storefront .boutique-slice-preview img"));
});

test("barra de ação não duplica botão de adicionar visível e preserva o checkout", () => {
  assert.ok(page.includes("inlineBuilderActionVisible"));
  assert.ok(page.includes('document.querySelector<HTMLElement>(".storefront .builder-card .add-button")'));
  assert.ok(page.includes("builderFlowActive && inlineBuilderActionVisible"));
  assert.ok(page.includes("stickyUsesCheckoutAction && inlineFinalActionVisible"));
  assert.ok(page.includes("observer.disconnect()"));
  assert.ok(page.includes("onClick={handleStickyAction}"));
  assert.ok(page.includes("onClick={handleFinalAction}"));
});

test("acabamento 3.1 permanece só no storefront e respeita tamanho/toque/movimento", () => {
  assert.ok(css.includes("Boutique 3.1"));
  assert.ok(css.includes("@media (max-width: 450px)"));
  assert.ok(css.includes("@media (max-width: 359px)"));
  assert.ok(css.includes("@media (prefers-reduced-motion: reduce)"));
  assert.ok(!css.includes(".admin-"));
  assert.ok(!css.includes(":root {"));
});


test("Boutique 3.2 usa fontes originais e exige novo build, sem reaproveitar assets compilados", () => {
  assert.ok(css.includes("Boutique 3.2 — acabamento"));
  assert.ok(page.includes("Chave enviada no WhatsApp após finalizar"));
  assert.ok(!page.includes("Pagamento combinado com a loja"));
  assert.ok(!page.includes("Combine o pagamento com a loja"));
  assert.ok(page.includes("Na maquininha, na retirada"));
  assert.ok(page.includes("Na maquininha, na entrega"));
  assert.ok(page.includes("Seu troco será"));
  assert.ok(page.includes('className="summary-address boutique-change-summary"'));
  assert.ok(css.includes(".storefront .change-box .segmented-control button[data-variant=\"default\"]"));
});
test("Cores visuais são indicativas, mantêm catálogo e regras de preço intocados", () => {
  for (const [id, tone] of [
    ["leitinho", "#f4e4c3"],
    ["kinder-bueno", "#dcb084"],
    ["choco-cookies-branco", "#e8dbc8"],
    ["choco-cookies-leite", "#875338"],
    ["nutella", "#6c381f"],
  ]) {
    assert.match(catalog, new RegExp('id: "' + id + '"[^\\n]*tone: "' + tone + '"'));
  }
  assert.ok(page.includes("popcornPrice(popcornVariant.id, popcornOptionIds, promotionTime)"));
  assert.ok(page.includes("itemUnitPrice(product, variant, item.optionIds, promotionTime)"));
});
test("Selo da fatia não cobre o valor; cartões mantêm preços e feedback visíveis", () => {
  assert.ok(css.includes(".storefront .slice-card.is-selected .slice-selected"));
  assert.ok(css.includes("top: 12px;"));
  assert.ok(css.includes("left: 12px;"));
  assert.ok(css.includes("bottom: auto;"));
  assert.ok(page.includes('className="boutique-slice-card-footer"'));
  assert.ok(page.includes('className="boutique-flavor-value"'));
  assert.ok(css.includes("@media (max-width: 430px)"));
});


test("Boutique 4.0 preserva escolhas e monta vitrine mais editorial", () => {
  assert.ok(css.includes("BOUTIQUE 4.0"));
  assert.ok(page.includes('className="boutique-category-edition"'));
  assert.ok(page.includes('className="slice-grid"'));
  assert.ok(page.includes("popcornPrice(popcornVariant.id, popcornOptionIds, promotionTime)"));
  assert.ok(css.includes(".storefront .slice-media {"));
  assert.ok(css.includes("aspect-ratio: 1 / .92"));
  assert.ok(css.includes(".storefront .flavor-card.is-selected"));
  assert.ok(css.includes(".storefront .flavor-card:focus-within"));
  assert.ok(css.includes("@media (prefers-reduced-motion: reduce)"));
});
test("Boutique 4.0 resume detalhes sem esconder totais nem perder edicao", () => {
  assert.ok(page.includes('className="boutique-order-recap" open={cartIssues.length > 0}'));
  assert.ok(page.includes("Toque para conferir ou editar"));
  assert.ok(page.includes("cart.map((item, index) =>"));
  assert.ok(page.includes("editItem(item)"));
  assert.ok(page.includes('className="summary-row summary-total"'));
  assert.ok(page.includes("cardQuote.feeCents / 100"));
  assert.ok(page.includes("onClick={handleFinalAction}"));
  assert.ok(page.includes("onClick={handleStickyAction}"));
});
test("Design de atelier não toca admin, catalogo, checkout comercial ou rastreamento", () => {
  assert.ok(!css.includes(".admin-"));
  assert.ok(!css.includes(":root {"));
  assert.ok(!css.includes("@import"));
  assert.ok(page.includes("finishOnWhatsApp()"));
  assert.ok(page.includes("finishOnSite()"));
  assert.ok(page.includes("checkoutFingerprint"));
  assert.ok(page.includes("onClick={() => removeItem(item.id)}"));
});


test("4.1 mantém navegação direta sem introduzir passos duplicados", () => {
  assert.ok(!page.includes('className="boutique-journey"'));
  assert.ok(!page.includes('className="boutique-category-edition"'));
  assert.ok(!page.includes("Atelier Gourmet"));
  assert.ok(!page.includes("Fatias da Casa"));
  assert.ok(page.includes('id="tamanhos"'));
  assert.ok(page.includes('id="sabores"'));
  assert.ok(page.includes('id="quantidade-pipocas"'));
  assert.ok(page.includes('requestScroll("calda-fatias")'));
  assert.ok(page.includes('requestScroll("quantidade-fatias")'));
});

test("checkout ao adicionar itens não referencia ícone inexistente", () => {
  assert.ok(page.includes("  ChevronDown,"));
  assert.ok(page.includes("<ChevronDown size={18}"));
  assert.ok(page.includes('className="boutique-order-recap"'));
  assert.ok(page.includes("cart.map((item, index) =>"));
});
test("4.1 usa foto REAL do pedido no checkout, sem preços inventados", () => {
  assert.ok(page.includes("const showcaseProduct = cart.length > 0"));
  assert.ok(page.includes('className="boutique-checkout-showcase"'));
  assert.ok(page.includes("showcaseProduct.cardImage ?? showcaseProduct.image"));
  assert.ok(page.includes("currency.format(cartSubtotal)"));
  assert.ok(page.includes("cartNeedsSizeReview"));
  assert.ok(page.includes('className="summary-row summary-total"'));
});
test("4.1 preserva escopo, toque, foco e redução de movimento", () => {
  assert.ok(css.includes("BOUTIQUE 4.1"));
  assert.ok(css.includes(".storefront .boutique-journey-step:focus-visible"));
  assert.ok(css.includes("@media (max-width: 359px)"));
  assert.ok(css.includes("@media (prefers-reduced-motion: reduce)"));
  assert.ok(!css.includes(".admin-"));
});

test("A finalização só aparece quando existir produto e mantém personalização limpa", () => {
  assert.ok(page.includes('cart.length > 0 && (\n      <section className="checkout-section"'));
  assert.ok(!page.includes('(activeCategory || cart.length > 0) && (\n      <section className="checkout-section"'));
  assert.ok(page.includes("finishOnWhatsApp()"));
  assert.ok(page.includes("finishOnSite()"));
});
