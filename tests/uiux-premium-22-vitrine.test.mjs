import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../app/storefront-vitrine-editorial-experiment.css", import.meta.url), "utf8");

test("A vitrine usa CTA unificado para pote e fatias sem duplicar botoes", () => {
  assert.ok(page.includes('"Montar meu pote" : "Escolher minha fatia"'));
  assert.ok(page.includes('onClick={() => selectCategory(category.id)}'));
  assert.ok(page.includes('disabled={!available}'));
  assert.ok(page.includes('aria-label={`${category.name}${available ?'));
  const block = page.slice(page.indexOf('<span className="category-option-copy">'), page.indexOf('</button>',page.indexOf('<span className="category-option-copy">')));
  assert.ok(block.includes('className="category-option-action"'));
  assert.ok(block.includes('<ChevronRight className="category-option-arrow" size={16}'));
  assert.ok(!block.includes('size={20} aria-hidden="true" />'));
});

test("O acabamento Premium 2.2 fica escopado na vitrine e adapta telas pequenas", () => {
  const finish = styles.split("Premium 2.2 — Vitrine de categorias:")[1];
  assert.ok(finish);
  assert.ok(finish.includes('.menu-entry.is-neutral .category-option-copy > .category-option-action'));
  assert.ok(finish.includes('.category-option-arrow'));
  assert.ok(finish.includes('position: static'));
  assert.ok(finish.includes('pointer-events: none'));
  assert.ok(finish.includes('max-width: 359px'));
  assert.ok(finish.includes('prefers-reduced-motion: reduce'));
  assert.ok(!finish.includes('.admin-'));
  assert.ok(!finish.includes('.mobile-sticky-bar'));
  assert.ok(!finish.includes('.limited-cup-teaser'));
});

test("Fotografias, precos e conclusao comercial permanecem intactos", () => {
  for(const unchanged of [
    '/images/categoria-pipocas-editorial-enquadrada-v107.webp',
    '/images/categoria-fatias-editorial.webp',
    'onClick={openLimitedCupEdition}',
    'Pote fica por ${currency.format(potPriceWithOption)}',
    'onClick={handleStickyAction}',
    'onClick={handleFinalAction}'
  ]) assert.ok(page.includes(unchanged), unchanged);
});
