import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/page.tsx","utf8");
const css = readFileSync("app/storefront-collection-premium.css","utf8");
const layout = readFileSync("app/layout.tsx","utf8");

test("Home premium: tema escuro com contraste alto, fotos protagonistas e CTA de toque",()=>{
  assert.match(layout,/import "\.\/storefront-collection\.css";\s*import "\.\/storefront-collection-premium\.css";/);
  assert.match(css,/\.menu-entry\.is-neutral/);
  assert.match(css,/background:[\s\S]*linear-gradient\(145deg, #22130e/);
  assert.match(css,/\.collection-choice\[data-featured\]/);
  assert.match(css,/grid-column: 1 \/ -1/);
  assert.match(css,/\.collection-photo img/);
  assert.match(css,/\.collection-action/);
  assert.match(css,/min-height: 44px/);
  assert.match(css,/\.collection-choice:focus-visible/);
  assert.match(css,/prefers-reduced-motion: reduce/);
  assert.doesNotMatch(css,/background:\s*#f8efe3/);
});

test("Home premium: três categorias com fotografia original e preço de catálogo",()=>{
  assert.match(page,/name="Pipocas Trufadas"/);
  assert.match(page,/name=\{category.name\}/);
  assert.match(page,/isPot \? "Pote recheado" : "Bolo em fatias"/);
  assert.match(page,/TRUFADA_STARTING_PRICE = Math\.min/);
  assert.match(page,/price=\{currency\.format\(TRUFADA_STARTING_PRICE\)\}/);
  assert.match(page,/photo="\/images\/pipocas-trufadas-ninho-20261101\.webp"/);
  assert.match(page,/className="collection-pack-secondary"/);
  assert.match(page,/pipocas-trufadas-pacoca-20261101\.webp/);
  assert.match(page,/categoria/i);
  assert.match(page,/onClick=\{openLimitedCupEdition\}/);
  assert.match(page,/onClick=\{\(\) => selectCategory\(category.id\)\}/);
});

test("Home premium: layout mobile preserva espaço de leitura e não impõe números",()=>{
  assert.match(css,/@media \(max-width: 440px\)/);
  assert.match(css,/@media \(max-width: 350px\)/);
  assert.match(css,/@media \(min-width: 760px\)/);
  assert.match(css,/grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css,/\.collection-choice\[data-featured\] \{/);
  assert.doesNotMatch(page,/restam apenas [0-9]+/i);
  assert.match(page,/!available \? "Esgotado"/);
  assert.match(page,/!hasResolvedAvailability/);
});


test("Refino premium: hierarquia consciente e duas embalagens representadas como fotos reais",()=>{
  assert.match(page,/data-launch=\{format === "Novidade no cardápio"/);
  assert.match(page,/data-packs-card=\{format === "Pacotes com zíper"/);
  assert.match(page,/className="collection-pack-secondary"/);
  assert.match(css,/\.collection-choice\[data-featured\]/);
  assert.doesNotMatch(css,/\.collection-choice:first-child/);
  assert.match(css,/\.collection-photo\[data-packs\] img\.collection-pack-secondary/);
  assert.match(css,/\.collection-photo\[data-packs\]::after \{\s*content: none;/);
  assert.match(page,/<p className="collection-kicker">Cardápio artesanal<\/p>/);
  assert.doesNotMatch(page,/Três maneiras de adoçar seu momento/);
  assert.match(css,/\.collection-service \{[\s\S]*?background: none;[\s\S]*?border-top: 1px solid/);
});
