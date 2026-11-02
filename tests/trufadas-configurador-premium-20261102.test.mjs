import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const page = readFileSync("app/page.tsx", "utf8");
const css = readFileSync("app/storefront-vitrine-editorial-experiment.css", "utf8");

test("Trufadas: o cabeçalho comum permanece; interior não repete o título da categoria", () => {
  assert.match(page, /<div className="entry-heading">/);
  assert.match(page, /showLimitedCupView \? "Pipocas Trufadas" : "Pipocas Gourmet"/);
  assert.match(page, /<div className="limited-cup-flow-progress" role="group"/);
  assert.doesNotMatch(page, /<div className="limited-cup-story-heading">/);
  assert.match(page, /data-state=\{cupFlavorPreview \? "complete" : "current"\}/);
  assert.match(page, /data-state=\{cupSizeId \? "current" : "pending"\}/);
});

test("Trufadas: percurso mantém sabor, tamanho, quantidade e fotos homologadas", () => {
  const indices = ["01 · ESCOLHA SEU SABOR", "02 · ESCOLHA O TAMANHO", "03 · QUANTIDADE"].map(x => page.indexOf(x));
  assert.ok(indices.every(index => index !== -1));
  assert.ok(indices[0] < indices[1] && indices[1] < indices[2]);
  assert.match(page, /TRUFADA_PRODUCT_IDS\.map/);
  assert.match(page, /product\.image && <img src=\{product\.image\}/);
  assert.match(page, /aria-pressed=\{selected\}/);
  assert.match(page, /TRUFADA_SIZES\.map/);
  assert.match(page, /cupVariant \? "Subtotal" : "A partir de"/);
  assert.doesNotMatch(page, /className="limited-cup-sale-compact"/);
});

test("Trufadas: botão distingue pedidos pausados, estoque indisponível e seleção incompleta", () => {
  assert.match(page, /const cupActionLabel = cupAdding \? "Conferindo estoque…"/);
  assert.match(page, /!availability\.ordersOpen \? "Pedidos pausados"/);
  assert.match(page, /cupPhase === "sold-out" \? "Pacotes esgotados"/);
  assert.match(page, /cupPhase === "unavailable" \? "Disponibilidade indisponível"/);
  assert.match(page, /!cupFlavorPreview \? "Escolher sabor"/);
  assert.match(page, /!cupSizeId \? "Escolher tamanho"/);
  assert.match(page, /!cupCanOrder \? cupRemaining <= 0/);
  assert.match(page, /\{cupActionLabel\}/);
  assert.match(page, /\? cupActionLabel/);
  assert.match(page, /cupPhase !== "available"/);
  assert.match(page, /cupVariant && availability\.stockChecked && availability\.ordersOpen/);
});

test("Trufadas: estoque consultado e compra cruzada não anunciam venda aberta quando fechada", () => {
  assert.match(page, /available \? "Em estoque" : "Esgotado"/);
  assert.match(page, /Saldo consultado:/);
  assert.match(page, /cart\.length > 0 \? "COMPLETE SEU PEDIDO" : "CONHEÇA TAMBÉM"/);
  assert.match(page, /cart\.length > 0 \? "Que tal mais uma delícia\?" : "Explore outras delícias"/);
  assert.match(page, /qty \+ alreadyInCart > confirmedStock/);
  assert.match(page, /requestScroll\("recebimento"\)/);
});

test("Trufadas: feedback tátil isolado e respeito a movimento reduzido", () => {
  assert.match(css, /#configurador\.is-cup-discovery \.limited-cup-flow-progress/);
  assert.match(css, /\.limited-cup-flow-step\[data-state="current"\]/);
  assert.match(css, /\.limited-cup-duo\.is-trio \.limited-cup-duo-item:active:not\(:disabled\)/);
  assert.match(css, /\.limited-cup-size-option:active:not\(:disabled\)/);
  assert.match(css, /@media \(hover: hover\) and \(pointer: fine\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
