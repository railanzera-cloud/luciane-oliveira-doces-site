import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

const css = readFileSync(new URL("../app/storefront-vitrine-editorial-experiment.css", import.meta.url), "utf8");
const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const premium = css.slice(css.indexOf("UI/UX PREMIUM 2.1 — seleção luminosa"));

test("o tamanho horizontal mantém o layout e compartilha o destaque selecionado", () => {
  const compactLayout = css.split("/* Etapa 1 — terceira medida")[1].split("/* Etapa 2 —")[0];
  assert.ok(compactLayout.includes("grid-column: 1 / -1"));
  assert.ok(compactLayout.includes(".size-card:last-child:not(.is-selected)"));
  assert.ok(premium.includes("#tamanhos .size-card.is-selected:not(.is-unavailable)"));
  assert.ok(premium.includes("at 4% -16%"));
  assert.ok(premium.includes("at 100% -16%"));
  assert.ok(premium.includes(".selected-check"));
  assert.ok(premium.includes('button[role="radio"][data-state="checked"]'));
});
test("os sabores selecionados têm iluminação refinada sem mudar dimensões", () => {
  assert.ok(premium.includes("#sabores .flavor-card.is-selected"));
  assert.ok(premium.includes("inset 3px 0 0 #f7c995"));
  assert.ok(premium.includes(".boutique-flavor-picked"));
  assert.ok(premium.includes('button[role="checkbox"][data-state="checked"]'));
  assert.ok(css.includes(".storefront #sabores .flavor-card {\n  min-height: 84px;"));
  assert.ok(premium.includes("prefers-reduced-motion: reduce"));
  assert.ok(!premium.includes(".admin-"));
});
test("preço, checkout, fotos, tamanho e seleção comercial permanecem intactos", () => {
  for(const statement of [
    "onValueChange={choosePopcornVariant}",
    "togglePopcornOption(option)",
    "Pote fica por ${currency.format(potPriceWithOption)}",
    "handleStickyAction",
    "/images/categoria-pipocas-editorial-enquadrada-v107.webp",
    "EDIÇÃO LIMITADA · DISPONÍVEL"
  ]) assert.ok(page.includes(statement),statement);
});
