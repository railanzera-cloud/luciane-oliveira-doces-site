import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { quoteCartItems } from "../supabase/functions/_shared/commerce-catalog.mjs";
import { sliceSauceOptions } from "../app/catalog.ts";

const page = readFileSync("app/page.tsx","utf8");
const css = readFileSync("app/mobile-refinamentos-funil-20261108.css","utf8");
const layout = readFileSync("app/layout.tsx","utf8");

test("Navegação usa divulgador único e secundário, sem falsos breadcrumbs", () => {
  assert.ok(page.includes('className="builder-utility-nav" aria-label="Navegação do cardápio"'));
  assert.ok(page.includes('className="builder-more-toggle" aria-expanded={otherCategoriesOpen}'));
  assert.ok(page.includes('aria-controls="builder-more-options"'));
  assert.ok(page.includes('className="builder-more-options" id="builder-more-options"'));
  assert.ok(page.includes('aria-label="Explorar outras categorias"'));
  assert.ok(page.includes('className="builder-more-option"'));
  assert.ok(page.includes('onClick={() => selectCategory(category.id)}'));
  assert.ok(page.includes('disabled={!categoryIsAvailable(category.id)}'));
  assert.ok(page.includes('onClick={returnToCategories}'));
  assert.ok(page.includes('onClick={openLimitedCupEdition}'));
  assert.ok(!page.includes('className="category-shortcuts"'));
  assert.ok(!page.includes('className="v7-navigation v7-navigation-pipocas"'));
});

test("Duas primeiras caldas e Sem calda ocupando linha inteira sem alterar semântica", () => {
  assert.ok(page.includes('option.id === "sem-calda" ? "is-without-sauce"'));
  assert.ok(css.includes('.slice-sauce-card.is-without-sauce'));
  assert.ok(css.includes('grid-column: 1 / -1'));
  assert.ok(css.includes('min-height: 62px'));
  assert.ok(page.includes('className="slice-sauce-choice" value={sliceOptionId}'));
  assert.ok(page.includes('setSliceOptionId("");'));
  assert.ok(page.includes('sliceSauceOptions(selectedSlice.id).map(option =>'));
  assert.deepEqual(sliceSauceOptions("fatia-ninho-morango").map(o=>o.id),["calda-ninho","calda-chocolate","sem-calda"]);
  assert.deepEqual(sliceSauceOptions("fatia-bombom-uva").map(o=>o.id),["calda-chocolate","calda-ninho","sem-calda"]);
});

test("Calda de Ninho continua grátis com mesmos nomes e preço autoritativo", () => {
  const q = quoteCartItems([{product_id:"fatia-ninho-morango",variant_id:"fatia",quantity:2,option_ids:["calda-ninho"]}]);
  assert.equal(q.subtotalCents,4400);
  assert.deepEqual(q.items[0].option_names,["Com calda de Ninho"]);
  assert.equal(quoteCartItems([{product_id:"fatia-ninho-morango",variant_id:"fatia",quantity:2,option_ids:["sem-calda"]}]).subtotalCents,4400);
  assert.equal(quoteCartItems([{product_id:"fatia-ninho-morango",variant_id:"fatia",quantity:2,option_ids:["calda-chocolate"]}]).subtotalCents,4400);
});

test("CTA de fatias orienta ao passo faltante e não obriga escolha padrão", () => {
  assert.ok(page.includes('activeCategory === "fatias" && selectedSlice && !sliceOptionId && builderFlowActive'));
  assert.ok(page.includes('? "Escolher calda"'));
  assert.ok(page.includes('if (!selectedSlice) requestScroll("fatias");'));
  assert.ok(page.includes('else if (!sliceOptionId) requestScroll("calda-fatias");'));
  assert.ok(page.includes('else addOrUpdateSlice();'));
  assert.ok(page.includes('setSelectionMessage("Escolha uma opção de calda ou sem calda para continuar.")'));
  assert.ok(!page.includes('"Escolher calda ou sem calda"'));
});

test("Resumo mais curto, área segura Instagram e redução de movimento não alteram conteúdo", () => {
  assert.ok(css.includes('.slice-builder .boutique-slice-preview'));
  assert.ok(css.includes('.slice-builder .boutique-slice-preview > img'));
  assert.ok(css.includes('object-fit: cover'));
  assert.ok(css.includes('env(safe-area-inset-bottom, 0px)'));
  assert.ok(css.includes('scroll-margin-top'));
  assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'));
  assert.ok(css.includes('.collection-choice .collection-copy'));
  assert.ok(css.includes('min-height: 44px'));
  assert.ok(layout.includes('import "./mobile-refinamentos-funil-20261108.css";'));
  assert.ok(page.includes("Cascão Trufado"));
  assert.ok(page.includes("Pipocas Trufadas"));
  assert.ok(page.includes("Fatias Artesanais"));
  assert.ok(page.includes("Pipocas Gourmet"));
  assert.ok(page.includes('className="builder-utility-nav" aria-label="Navegação do cardápio"'));
  assert.ok(page.includes('activeCategory === "cones" ? "Escolha um cone para começar."'));
});
