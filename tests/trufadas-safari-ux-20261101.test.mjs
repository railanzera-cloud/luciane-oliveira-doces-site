import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { quoteCartItems } from "../supabase/functions/_shared/commerce-catalog.mjs";

const page = readFileSync("app/page.tsx","utf8");
const css = readFileSync("app/storefront-vitrine-editorial-experiment.css","utf8");

test("Safari: três sabores ficam juntos no mobile, sem cartão isolado", () => {
  assert.match(css, /Safari UX refinement 20261101 - final/);
  assert.match(css, /\.limited-cup-duo\.is-trio\s*\{\s*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /\.limited-cup-duo\.is-trio \.limited-cup-duo-item:last-child\s*\{\s*grid-column:\s*auto;/);
  assert.match(page, /TRUFADA_PRODUCT_IDS\.map/);
  assert.match(page, /aria-pressed=\{selected\}/);
  assert.match(page, /selected \? "Selecionado" : "Escolher"/);
});

test("Safari: não anuncia esgotado antes de saber o sabor, nem habilita tamanho sem saldo", () => {
  assert.match(page, /!cupProduct \? "Escolha um sabor"/);
  assert.match(page, /disabled=\{!cupProduct \|\| cupAdding \|\| !available\}/);
  assert.match(page, /availability\.stockChecked && Boolean\(key && isItemAvailable\(availability, key\) && stock > 0\)/);
  assert.match(page, /aria-label=\{cupProduct && variant/);
});

test("Safari: subtotal e resumo usam preço exato do produto selecionado", () => {
  assert.match(page, /const cupStartingPrice = cupProduct\?\.variants\.find\(variant => variant\.id === "p"\)\?\.price \?\? 14\.9/);
  assert.match(page, /cupVariant \? currency\.format\(cupVariant\.price\)/);
  assert.match(page, /currency\.format\(\(cupVariant\?\.price \?\? cupStartingPrice\)/);
  assert.match(page, /description: `\$\{product\.name\} · \$\{variant\.label\} · \$\{qty\}/);
  const q = quoteCartItems([
    {product_id:"crocante-ninho",variant_id:"m",quantity:2,option_ids:[]},
    {product_id:"trufada-pacoca",variant_id:"g",quantity:1,option_ids:[]},
  ]);
  assert.equal(q.subtotalCents, 5670);
  assert.deepEqual(q.items.map(i=>i.size_label), ["Pacote M","Pacote G"]);
});

test("Safari: CTA flutuante só duplica ação quando a variante é válida e botão principal está fora da tela", () => {
  assert.match(page, /Boolean\(cupFlavorPreview && cupSizeId\) && cupCanOrder\)\) && !\(cupBuilderFlowActive && cupInlineActionVisible\)/);
  assert.match(page, /IntersectionObserver/);
  assert.match(page, /\.limited-cup-buy-cta/);
  assert.match(page, /rootMargin: "0px 0px -68px 0px"/);
  assert.match(css, /bottom: max\(14px, env\(safe-area-inset-bottom, 0px\)\)/);
  assert.match(page, /if \(latest\.usedFallback \|\| !latest\.snapshot\.ordersOpen \|\| !latest\.snapshot\.stockChecked/);
});

test("Safari: mantém foco, microinterações discretas e movimento reduzido", () => {
  assert.match(css, /\.limited-cup-size-option:focus-visible/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /touch-action: manipulation/);
  assert.match(css, /\.limited-cup-story-footer\s*\{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(page, /\b190 g\b|\b187 g\b|\b173 g\b/);
});
