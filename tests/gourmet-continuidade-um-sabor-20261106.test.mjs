import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { quoteCartItems } from "../supabase/functions/_shared/commerce-catalog.mjs";

const page=readFileSync(new URL("../app/page.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../app/gourmet-steps.css",import.meta.url),"utf8");
const valid=(size,ids)=>quoteCartItems([{product_id:"pipoca-gourmet",variant_id:size,option_ids:ids,quantity:1}],Date.parse("2026-11-06T18:00:00-03:00")).subtotalCents;

test("um sabor é um pedido plenamente válido em qualquer tamanho",()=>{
  assert.equal(valid("500ml",["leitinho"]),2500);
  assert.equal(valid("750ml",["leitinho"]),3900);
  assert.equal(valid("1l",["leitinho"]),4900);
  assert.equal(valid("1l",["leitinho","ovomaltine"]),4900);
  assert.equal(valid("1l",["leitinho","nutella"]),5800);
});

test("legenda aprovada confirma a liberdade de escolher de 1 até o limite real",()=>{
  assert.match(page,/Escolha de 1 até \$\{popcornMaxOptions\} sabores\. Você decide quantos combinar\./);
  assert.match(page,/className="gourmet-flavor-progress"/);
  assert.match(page,/const popcornMaxOptions = popcornVariant\?\.maxOptions \?\? 0/);
});

test("revisão compacta retém a remoção de sabores, sem repetir o limite e a instrução",()=>{
  assert.match(page,/className="boutique-flavor-summary gourmet-combination-review"/);
  assert.match(page,/>Seus sabores<\/span>/);
  assert.match(page,/onClick=\{\(\) => togglePopcornOption\(flavor\)\}/);
  assert.match(page,/aria-label=\{\x60Remover \$\{flavor\.name\} da combinação\x60\}/);
  assert.doesNotMatch(page,/className="gourmet-combination-size"/);
  assert.doesNotMatch(page,/className="gourmet-combination-hint"/);
  assert.match(css,/#sabores \.gourmet-removable-tag/);
  assert.match(css,/min-height: 44px/);
});

test("uma única barra contextualmente reutilizada não compete com ações inline",()=>{
  assert.match(page,/const gourmetContinueAvailable = builderFlowActive && activeCategory === "pipocas"/);
  assert.match(page,/popcornReady && popcornOptionIds\.length < popcornMaxOptions/);
  assert.match(page,/gourmetFlavorsInView && !gourmetNextStepInlineVisible && !inlineBuilderActionVisible/);
  assert.match(page,/document\.querySelector<HTMLElement>\("#sabores \.flavor-continue"\)/);
  assert.match(page,/document\.querySelector<HTMLElement>\("#quantidade-pipocas \.quantity-row"\)/);
  assert.match(page,/&& gourmetFlavorsInView && !gourmetContinueAvailable/);
  assert.match(page,/onClick=\{gourmetContinueAvailable \? \(\) => requestScroll\("gourmet-quantity-action"\) : handleStickyAction\}/);
  assert.match(page,/is-gourmet-flavor-continue/);
  assert.match(page,/popcornOptionIds\.length === 1 \? "sabor" : "sabores"/);
  assert.match(css,/mobile-sticky-bar\.is-gourmet-flavor-continue/);
  assert.match(css,/safe-area-inset-bottom/);
  assert.match(css,/is-gourmet-flavor-continue button:focus-visible/);
});

test("preço, quantidade, scroll automático no limite e carrinho mantidos",()=>{
  assert.match(page,/requestScroll\("gourmet-quantity-action"\)/);
  assert.match(page,/if \(!alreadySelected && popcornOptionIds\.length \+ 1 === popcornMaxOptions\)/);
  assert.match(page,/setPopcornOptionIds\(\(current\) => \{/);
  assert.match(page,/const popcornReady = Boolean\(/);
  assert.match(page,/const nextItem: Omit<CartItem, "id"> = \{/);
  assert.match(page,/addOrUpdatePopcorn/);
  assert.match(page,/current\.length >= popcornMaxOptions/);
});
