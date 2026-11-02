import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const page = readFileSync("app/page.tsx", "utf8");
const css = readFileSync("app/storefront-vitrine-editorial-experiment.css", "utf8");

test("Trufadas: cabeçalho superior compartilhado; configurador sem repetição de número e título", () => {
  assert.match(page, /<div className="entry-heading">/);
  assert.match(page, /showLimitedCupView \? "Pipocas Trufadas" : "Pipocas Gourmet"/);
  assert.match(page, /id="crocantes-sabores" aria-label="Pacotes P, M e G/);
  assert.match(page, /<span>Escolha seu sabor<\/span>/);
  assert.match(page, /<h2>Escolha o tamanho<\/h2>/);
  assert.match(page, /<strong>Seu pacote<\/strong>/);
  assert.doesNotMatch(page, /className="limited-cup-flow-progress"/);
  assert.doesNotMatch(page, /className="limited-cup-story-heading"/);
  assert.doesNotMatch(page, />0[123] · (?:ESCOLHA|QUANTIDADE)/);
});

test("Trufadas: sabor, tamanho e preço são revelados progressivamente", () => {
  const titles = ["Escolha seu sabor", "Escolha o tamanho", "Seu pacote"];
  const indices = titles.map(label => page.indexOf(label, page.indexOf('id="edicao-crocante"')));
  assert.ok(indices.every(n => n > 0) && indices[0] < indices[1] && indices[1] < indices[2]);
  assert.match(page, /\{cupProduct && \(\s*<div className="limited-cup-size-section"/);
  assert.match(page, /\{cupProduct && cupVariant && \(\s*<div className="limited-cup-buy"/);
  assert.match(page, /TRUFADA_PRODUCT_IDS\.map/);
  assert.match(page, /product\.image && <img src=\{product\.image\}/);
  assert.match(page, /TRUFADA_SIZES\.map/);
  assert.match(page, /currency\.format\(variant\.price\)/);
  assert.match(page, /currency\.format\(cupVariant\.price \* cupQuantity\)/);
  assert.match(page, /setCupSizeId\(null\)/);
  assert.match(page, /setCupQuantity\(1\)/);
  assert.doesNotMatch(page, /className="limited-cup-sale-compact"/);
  assert.match(page, /\(cupVariant \|\| cupPhase !== "available"\) && \(/);
});

test("Trufadas: compra fiel ao estado de abertura, seleção e estoque remoto", () => {
  assert.match(page, /!availability\.ordersOpen \? "Pedidos pausados"/);
  assert.match(page, /cupPhase === "sold-out" \? "Pacotes esgotados"/);
  assert.match(page, /cupPhase === "unavailable" \? "Disponibilidade indisponível"/);
  assert.match(page, /cupRemaining <= 3/);
  assert.match(page, /qty \+ alreadyInCart > confirmedStock/);
  assert.match(page, /latest\.usedFallback/);
  assert.match(page, /cupPhase !== "available"/);
  assert.match(page, /aria-pressed=\{cupSizeId === size\}/);
  assert.match(page, /setCart\(\(current\) => \[\.\.\.current/);
  assert.match(page, /trackMetaEvent\("AddToCart"/);
  assert.match(page, /requestScroll\("recebimento"\)/);
});

test("Trufadas: entrada é suave como Gourmet; barra flutuante observa CTA que aparece depois", () => {
  assert.match(page, /window\.scrollTo\(\{ top, behavior: reducedMotion \? "instant" : "smooth" \}\)/);
  assert.match(page, /target\.querySelector<HTMLElement>\("\.limited-cup-selection-heading"\)/);
  assert.match(page, /requestEditorialScroll\("edicao-crocante"\)/);
  assert.match(page, /requestEditorialScroll\("tamanhos"\)/);
  assert.match(page, /\[showLimitedCupView, cupSalesEnabled, cupFlavorPreview, cupSizeId\]/);
  assert.match(page, /setCupInlineActionVisible\(false\)/);
  assert.match(page, /&& !\(cupBuilderFlowActive && cupInlineActionVisible\)/);
});

test("Trufadas: tamanhos profundos, toque responsivo e reducao de movimento", () => {
  assert.match(css, /#configurador\.is-cup-discovery \.limited-cup-size-section/);
  assert.match(css, /#configurador\.is-cup-discovery \.limited-cup-size-intro/);
  assert.match(css, /#configurador\.is-cup-discovery \.limited-cup-size-option\[aria-pressed="true"\]/);
  assert.match(css, /#configurador\.is-cup-discovery \.limited-cup-size-check/);
  assert.match(css, /animation: trufadas-size-select/);
  assert.match(css, /animation: trufadas-stage-reveal/);
  assert.match(css, /@media \(hover:hover\) and \(pointer:fine\)/);
  assert.match(css, /@media \(max-width:359px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test("Trufadas: outras categorias e fluxo financeiro não foram reescritos", () => {
  assert.match(page, /function selectCategory\(category: CategoryId, shouldScroll = true\)/);
  assert.match(page, /activeCategory === "pipocas" && pipocasVisible/);
  assert.match(page, /activeCategory === "fatias"/);
  assert.match(page, /function handleFinalAction\(/);
  assert.match(page, /function addCrocantesCup\(/);
});
