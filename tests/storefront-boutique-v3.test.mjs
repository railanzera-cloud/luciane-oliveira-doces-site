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
    ["leitinho", "#f2e3c8"],
    ["kinder-bueno", "#d6ae88"],
    ["choco-cookies-branco", "#e5d7c8"],
    ["choco-cookies-leite", "#563126"],
    ["nutella", "#45281f"],
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
  assert.ok(!page.includes('className="boutique-category-edition"'));
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
test("4.3 mantém fotos no carrinho e confirmação, sem terceiro painel fotográfico", () => {
  assert.ok(!page.includes("const showcaseProduct = cart.length > 0"));
  assert.ok(!page.includes('className="boutique-checkout-showcase"'));
  assert.ok(page.includes('className="boutique-checkout-brief"'));
  assert.ok(page.includes('className="boutique-cart-image"'));
  assert.ok(page.includes('className="boutique-added-photo"'));
  assert.ok(page.includes('className="summary-row summary-total"'));
  assert.ok(page.includes("currency.format(cartSubtotal)"));
  assert.ok(page.includes("currency.format(orderTotal)"));
});
test("4.1 preserva escopo, toque, foco e redução de movimento", () => {
  assert.ok(css.includes("BOUTIQUE 4.3"));
  assert.ok(css.includes(".storefront .flavor-card:focus-within"));
  assert.ok(css.includes("@media (max-width: 359px)"));
  assert.ok(css.includes("@media (prefers-reduced-motion: reduce)"));
  assert.ok(!css.includes(".admin-"));
});

test("Checkout vazio fica visualmente oculto sem remover controle de finalização", () => {
  assert.ok(page.includes('(activeCategory || cart.length > 0) && ('));
  assert.ok(page.includes('className={`checkout-section ${cart.length === 0 ? "is-empty-cart" : ""}`}'));
  assert.ok(css.includes('.storefront .checkout-section.is-empty-cart { display: none; }'));
  assert.ok(page.includes("finishOnWhatsApp()"));
  assert.ok(page.includes("finishOnSite()"));
});


test("4.2 unifica o pós-adicionar de fatias e pipocas diretamente no recebimento", () => {
  assert.ok(page.includes('const destination = wasEditing ? "carrinho" : "recebimento";'));
  assert.equal(page.split('const destination = wasEditing ? "carrinho" : "recebimento";').length - 1, 2);
  assert.ok(!page.includes('scrollToSection("item-adicionado")'));
  assert.ok(!page.includes('id="item-adicionado"'));
  assert.ok(!page.includes('className="added-panel"'));
  assert.ok(page.includes('requestScroll(destination);'));
});
test("4.2 mostra confirmação compacta e mais produtos na mesma área das escolhas de recebimento", () => {
  assert.ok(page.includes('className="boutique-added-continuity"'));
  assert.ok(page.includes('className="boutique-added-photo"'));
  assert.ok(page.includes("justAddedProduct.cardImage ?? justAddedProduct.image"));
  assert.ok(page.includes("Quer adicionar mais alguma coisa?"));
  assert.ok(page.includes('onClick={() => startAnother(category)}'));
  assert.ok(page.includes('id="recebimento"'));
  assert.ok(page.includes('id="receive-delivery"'));
  assert.ok(page.includes('id="receive-pickup"'));
  assert.ok(css.includes(".storefront .boutique-added-other-actions button:focus-visible"));
  assert.ok(css.includes("@media (max-width: 359px)"));
});


test("4.2.2: todas as amostras têm cor completa, sem anel ou halo", () => {
  const lastRule = css.lastIndexOf(".storefront .flavor-tone {");
  assert.ok(lastRule >= 0, "Regra final das amostras ausente");
  const block = css.slice(lastRule, css.indexOf("}", lastRule) + 1);
  assert.match(block, /border:\s*0\s*;/);
  assert.match(block, /box-shadow:\s*none\s*;/);
  assert.match(block, /background-clip:\s*border-box\s*;/);
  assert.ok(css.includes("BOUTIQUE 4.2.2"));
});
test("4.2.2: amostras contrastam sem alterar valores ou nomes", () => {
  for (const [id, tone] of [
    ["leitinho", "#f2e3c8"],
    ["choco-nute", "#7a432a"],
    ["ovomaltine", "#8a5232"],
    ["kinder-bueno", "#d6ae88"],
    ["choco-cookies-branco", "#e5d7c8"],
    ["choco-cookies-leite", "#563126"],
    ["kinder-bueno-crisp", "#c88752"],
    ["nutella", "#45281f"],
  ]) {
    assert.match(catalog, new RegExp('id: "' + id + '"[^\\n]*tone: "' + tone + '"'));
  }
  assert.ok(page.includes("currency.format(popcornPrice(popcornVariant.id, popcornOptionIds, promotionTime))"));
});


test("4.3 botão flutuante indica o próximo dado sem adicionar etapas", () => {
  assert.ok(page.includes("const checkoutNextActionLabel = !fulfillment"));
  for (const label of ["Entrega ou retirada", "Completar entrega", "Informar seu nome",
      "Informar celular", "Conferir troco", "Escolher pagamento"]) {
    assert.ok(page.includes('"' + label + '"'), label);
  }
  assert.ok(page.includes("checkoutReady ? finalButtonLabel : checkoutNextActionLabel"));
  assert.ok(page.includes("if (stickyUsesCheckoutAction) handleFinalAction();"));
  assert.ok(page.includes("requestScroll(cart.length ? nextCheckoutSection() : \"carrinho\")"));
  assert.ok(page.includes("checkoutFingerprint"));
});
test("4.3 refinamento mantém miniaturas, etapa de recebimento e finalizações", () => {
  assert.ok(!css.includes(".boutique-checkout-showcase"));
  assert.ok(css.includes(".storefront .boutique-checkout-brief h2"));
  assert.ok(css.includes(".storefront .checkout-main"));
  assert.ok(css.includes("@media (min-width: 700px)"));
  assert.ok(css.includes("@media (prefers-reduced-motion: reduce)"));
  assert.ok(page.includes('id="recebimento"'));
  assert.ok(page.includes('id="pagamento"'));
  assert.ok(page.includes("finishOnWhatsApp()"));
  assert.ok(page.includes("finishOnSite()"));
  assert.ok(!css.includes(".admin-"));
});


test("4.4 observação é opcional, salva e se abre ao restaurar texto preenchido", () => {
  assert.ok(page.includes("const [notesExpanded, setNotesExpanded] = useState(false)"));
  assert.ok(page.includes("setNotesExpanded(Boolean(restoredNotes.trim()))"));
  assert.ok(page.includes("setNotesExpanded(false)"));
  assert.ok(page.includes('aria-expanded={notesExpanded} aria-controls="order-notes-content"'));
  assert.ok(page.includes('hidden={!notesExpanded}'));
  assert.ok(page.includes('value={notes} onChange={event => setNotes(event.target.value)}'));
  assert.ok(page.includes("notes: notes.trim()"));
  assert.ok(page.includes("Observação adicionada ao pedido"));
});
test("4.4 agrupa avisos, mas preserva preço, alerta e finalização", () => {
  for (const fragment of ['className="boutique-cart-details"', "Informações sobre o pedido",
    "Pipocas calculadas pela tabela atual", "Pedido mantido somente nesta aba",
    'className="checkout-availability-alert"', 'className="cart-subtotal"',
    'className="cart-add-more"', 'className="summary-row summary-total"']) {
    assert.ok(page.includes(fragment), fragment);
  }
  assert.ok(page.includes("finishOnWhatsApp()"));
  assert.ok(page.includes("finishOnSite()"));
  assert.ok(css.includes(".storefront .boutique-cart-details > summary:focus-visible"));
  assert.ok(css.includes(".storefront .boutique-notes-content[hidden]"));
  assert.ok(!css.includes(".admin-"));
});
