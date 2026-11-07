import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {isPopcornPromotionActive, POPCORN_PROMOTION} from "../supabase/functions/_shared/popcorn-promotion.mjs";
import {quoteCartItems, POPCORN_PRICES_CENTS} from "../supabase/functions/_shared/commerce-catalog.mjs";

const page=readFileSync("app/page.tsx","utf8");
const css=readFileSync("app/gourmet-feriado-20261102.css","utf8");
const permanentCss=readFileSync("app/gourmet-steps.css","utf8");
const creative=readFileSync("lib/storefront-campaign-creative.ts","utf8");
const component=readFileSync("components/storefront-campaign-editorial.tsx","utf8");

test("campanha editorial é informação e os únicos cartões de escolha são radio buttons",()=>{
  assert.match(component, /<aside className="gourmet-feriado-edition"/);
  assert.doesNotMatch(component, /type="button"|<button|<input|role="radio"|gourmet-feriado-price-list/);
  assert.match(page, /<StorefrontCampaignEditorial campaign=\{GOURMET_HOLIDAY_CREATIVE\}/);
  assert.match(page, /<RadioGroup className="size-grid"/);
  assert.match(page, /<RadioGroupItem id=\{\x60size-\$\{variant.id\}\x60\}/);
  assert.match(permanentCss, /#tamanhos \.size-grid[\s\S]*?grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(page, /className="gourmet-feriado-price-list"/);
});

test("o botão flutuante vai à opção real de tamanho, sabor ou ao carrinho",()=>{
  assert.match(page, /function scrollToGourmetControl\(step: "size" \| "flavor" \| "quantity"\)/);
  assert.match(page, /#tamanhos \.size-card:not\(\.is-unavailable\)/);
  assert.match(page, /#sabores \.flavor-card:not\(\.is-disabled\)/);
  assert.match(page, /#quantidade-pipocas \.quantity-row/);
  assert.match(page, /if \(!popcornVariantUsable\) requestScroll\("gourmet-size-action"\)/);
  assert.match(page, /else if \(!popcornReady\) requestScroll\("gourmet-flavor-action"\)/);
  assert.match(page, /else addOrUpdatePopcorn\(\)/);
  assert.match(page, /window\.scrollTo\(\{ top: desired, behavior: reducedMotion \? "instant" : "smooth" \}\)/);
  assert.doesNotMatch(page, /window\.setTimeout\(\(\) => scrollToSection\("sabores"\), 30\)/);
  assert.match(page, /is-gourmet-step/);
  assert.match(page, /const \[gourmetFlavorsInView, setGourmetFlavorsInView\]/);
  assert.match(page, /IntersectionObserver/);
  assert.match(page, /builderFlowActive && activeCategory === "pipocas" && gourmetFlavorsInView/);
  assert.match(permanentCss, /mobile-sticky-bar\.is-gourmet-step/);
});

test("Leitinho não recebe selo de desconto e somente grupos especiais exibem economia",()=>{
  assert.match(page, /const regularSpecialPrice = .*option\.pricingGroup && option\.pricingGroup > 1/);
  assert.match(page, /const savedToday = !includesNutella && regularSpecialPrice !== null/);
  assert.match(page, /optionCombination\.includes\("nutella"\)/);
  assert.match(page, /popcornPromotionActive && popcornOptionIds\.length === 0 && !selected && !disabled && savedToday > 0 && available/);
  assert.match(page, /Economize \{currency\.format\(savedToday\)\}/);
  assert.match(page, /\(!popcornPromotionActive \|\| option\.id === "nutella"\) && !selected && !disabled/);
  assert.doesNotMatch(page, /Sem adicional hoje/);
  assert.match(css, /gourmet-feriado-saving/);
});

test("cartões mostram Até 2/3 sabores sem backticks ou cifrões artificiais",()=>{
  assert.match(page, /<small>Até \{variant\.maxOptions\} sabores<\/small>/);
  assert.doesNotMatch(page, /<small>`Até \$\{variant\.maxOptions\} sabores`<\/small>/);
  assert.match(page, /<b>\{currency\.format\(itemUnitPrice\(POPCORN, variant, popcornOptionIds, promotionTime\)\)\}<\/b>/);
});

test("Leitinho disponível exibe preço base, mas sem preço riscado ou falsa economia",()=>{
  // Na promoção, todos os recheios disponíveis exibem preço;
  // só os grupos mais caros recebem preço riscado e 'Economize'.
  assert.match(page, /potPriceWithOption !== null && \(!popcornPromotionActive \|\| available\)/);
  assert.match(page, /popcornPromotionActive && !selected && !disabled && regularSpecialPrice !== null && savedToday > 0/);
  assert.match(page, /popcornPromotionActive && popcornOptionIds\.length === 0 && !selected && !disabled && savedToday > 0 && available/);
  assert.match(page, /option\.pricingGroup > 1/);
  assert.doesNotMatch(page, /Sem adicional hoje/);
  for(const size of ["500ml","750ml","1l"]){
    const price=POPCORN_PRICES_CENTS[1][size];
    const item={product_id:"pipoca-gourmet",variant_id:size,option_ids:["leitinho"],quantity:1};
    assert.equal(quoteCartItems([item],POPCORN_PROMOTION.endsAt-1).subtotalCents,price);
    assert.equal(quoteCartItems([item],POPCORN_PROMOTION.endsAt).subtotalCents,price);
  }
});

test("criativo da campanha conserva expiração e não governa a precificação",()=>{
  assert.match(creative, /POPCORN_PROMOTION\.id/);
  assert.match(creative, /Só até 23h59/);
  assert.match(creative, /Sujeito à disponibilidade dos sabores/);
  assert.doesNotMatch(creative, /pricesCents|unit_price_cents|quoteCartItems/);
  const end=POPCORN_PROMOTION.endsAt;
  assert.equal(isPopcornPromotionActive(end-1),true);
  assert.equal(isPopcornPromotionActive(end),false);
  for(const size of ["500ml","750ml","1l"]){
    const item={product_id:"pipoca-gourmet",variant_id:size,option_ids:["leitinho","nutella"],quantity:1};
    assert.equal(quoteCartItems([item],end).subtotalCents,POPCORN_PRICES_CENTS[3][size]);
    assert.equal(quoteCartItems([item],end-1).subtotalCents,POPCORN_PRICES_CENTS[3][size],
      "Nutella não participa nem combinada com Leitinho");
  }
});

test("nenhuma mudança nos endpoints de checkout, no fluxo de trufadas ou impressão",()=>{
  const wa=readFileSync("supabase/functions/create-whatsapp-order/index.ts","utf8");
  const admin=readFileSync("components/admin-orders-panel.tsx","utf8");
  const client=readFileSync("lib/qz-print-client.ts","utf8");
  assert.match(wa,/quoteCartItems\(input\.items, Date\.now\(\)\)/);
  assert.match(admin,/Conectar impressão 58 mm/);
  assert.match(client,/getKitchenWorkerId/);
});
