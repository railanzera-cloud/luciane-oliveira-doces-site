import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/storefront-vitrine-editorial-experiment.css", import.meta.url), "utf8");
const release = readFileSync(new URL("../app/limited-cup-release.ts", import.meta.url), "utf8");

test("barra final do WhatsApp tem acabamento independente e preserva CTA comercial", () => {
  assert.ok(page.includes('stickyIsCheckoutReady && checkoutChannel === "whatsapp" ? "is-whatsapp" : ""'));
  assert.ok(page.includes('data-ready={checkoutReady ? "true" : "false"}'));
  assert.ok(css.includes('.mobile-sticky-bar.is-ready.is-whatsapp button:not(:disabled)'));
  assert.ok(css.includes('[data-event="whatsapp_checkout"][data-ready="true"]'));
  assert.ok(css.includes('color: #fff9ed'));
  assert.ok(page.includes('onClick={handleStickyAction}'));
  assert.ok(page.includes('onClick={handleFinalAction}'));
  assert.ok(page.includes('stickyUsesCheckoutAction && inlineFinalActionVisible'));
  assert.ok(page.includes('builderFlowActive && inlineBuilderActionVisible'));
  assert.ok(css.includes('.storefront:has('));
});

test("preço da montagem não se confunde com subtotal do carrinho e conserva valores", () => {
  assert.ok(page.includes('"Item em montagem"'));
  assert.ok(page.includes('"Subtotal do pedido"'));
  assert.ok(page.includes('"Total do pedido"'));
  assert.ok(page.includes("draftSubtotal"));
  assert.ok(page.includes("currency.format(hasEstimatedTotal ? orderTotal : cartSubtotal)"));
  assert.ok(page.includes('Pote fica por ${currency.format(potPriceWithOption)}'));
  assert.ok(page.includes("popcornPrice(popcornVariant.id, selected ? popcornOptionIds : [...popcornOptionIds, option.id], promotionTime)"));
});

test("terceiro tamanho ocupa largura completa somente quando realmente ha tres", () => {
  assert.ok(css.includes('#tamanhos .size-grid:has(> .size-card:nth-child(3):last-child) > .size-card:last-child'));
  assert.ok(css.includes('grid-column: 1 / -1;'));
  assert.ok(page.includes('onValueChange={choosePopcornVariant}'));
  assert.ok(page.includes('popcornSizeIsVisible(variant.id)'));
  assert.ok(page.includes('popcornSizeIsAvailable(variant.id)'));
});

test("acabamento acessível é isolado à vitrine sem alterar fotos ou lançamento", () => {
  assert.ok(css.includes('.storefront #configurador:has(.slice-builder)'));
  assert.ok(css.includes('.storefront .checkout-section .payment-option.is-selected'));
  assert.ok(css.includes('scroll-margin-bottom: calc(120px + env(safe-area-inset-bottom, 0px))'));
  assert.ok(css.includes('prefers-reduced-motion: reduce'));
  assert.ok(css.includes('ACABAMENTO DE CONVERSÃO — 14/10/2026'));
  assert.ok(!css.includes('.admin-'));
  assert.ok(page.includes("/images/categoria-pipocas-editorial-enquadrada-v107.webp"));
  assert.ok(page.includes("/images/categoria-fatias-editorial.webp"));
  assert.ok(page.includes('EDIÇÃO LIMITADA · 15/10'));
  assert.ok(release.includes('2026-10-15T12:00:00-03:00'));
});
