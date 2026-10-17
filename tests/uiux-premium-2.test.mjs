import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/storefront-vitrine-editorial-experiment.css", import.meta.url), "utf8");

test("premium 2.0 esclarece preco sem modificar precificacao", () => {
  assert.ok(page.includes("popcornPrice(popcornVariant.id, selected ? popcornOptionIds : [...popcornOptionIds, option.id], promotionTime)"));
  assert.ok(page.includes("const priceDifference = currentPotPrice !== null && potPriceWithOption !== null"));
  assert.ok(page.includes("Math.max(0, potPriceWithOption - currentPotPrice)"));
  assert.ok(page.includes("currency.format(flavorPotPrice ?? potPriceWithOption)"));
  assert.ok(page.includes("className=\"sr-only\">Preço do pote com este sabor"));
  assert.ok(page.includes("Pote fica por ${currency.format(potPriceWithOption)}"));
  assert.ok(page.includes("Com ${option.name}, o pote fica por ${currency.format(potPriceWithOption)}"));
  assert.ok(page.includes("!popcornOptionIds.length && priceDifference === 0"));
  assert.ok(page.includes('"Preço base"'));
  assert.ok(!page.includes("+ ${currency.format(priceDifference)} no total"));
  assert.ok(page.includes('Remover sabor ${option.name}'));
});
test("premium 2.0 preserva etapas, CTA e protecao do teclado", () => {
  assert.ok(page.includes('aria-current={!paymentReady && fulfillment && addressReady ? "step" : undefined}'));
  assert.ok(page.includes("onClick={handleStickyAction}"));
  assert.ok(page.includes("stickyUsesCheckoutAction && inlineFinalActionVisible"));
  assert.ok(page.includes('className="mobile-sticky-price" aria-live="polite"'));
  assert.ok(css.includes(".storefront:has("));
  assert.ok(css.includes("input:is([type=\"text\"]"));
  assert.ok(css.includes("UI/UX PREMIUM 2.0"));
  assert.ok(css.includes("env(safe-area-inset-bottom, 0px)"));
  assert.ok(css.includes("prefers-reduced-motion: reduce"));
  assert.ok(css.includes("min-height: 48px"));
});
test("premium 2.0 permanece escopado e nao altera campanhas e fotos", () => {
  assert.ok(page.includes("/images/categoria-pipocas-editorial-enquadrada-v107.webp"));
  assert.ok(page.includes("/images/categoria-fatias-editorial.webp"));
  assert.ok(page.includes("PIPOCAS TRUFADAS · DISPONÍVEL"));
  assert.ok(!css.includes(".admin-"));
  assert.equal((css.match(/UI\/UX PREMIUM 2\.0/g) || []).length, 1);
});
