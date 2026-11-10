import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = file => readFileSync(new URL("../" + file, import.meta.url), "utf8");

test("após adicionar: prioriza atalhos de doces, depois bebidas e então recebimento", () => {
  const page = read("app/page.tsx");
  const start = page.indexOf('className="boutique-added-continuity"');
  const end = page.indexOf('className="step-heading checkout-step-heading"', start);
  assert.ok(start > 0 && end > start, "Bloco de pós-adição e recebimento devem existir");
  const flow = page.slice(start, end);
  const sweets = flow.indexOf("checkoutComplementItems.length > 0");
  const drinks = flow.indexOf("<DrinkComplements availability=");
  assert.ok(sweets >= 0 && drinks > sweets, "Doces devem aparecer antes da oferta de bebidas");
  assert.match(flow, /Escolha outro doce, se desejar/);
  assert.match(flow, /checkoutComplementItems\.map/);
  assert.match(flow, /startAnotherCrocantes/);
  assert.match(page, /!addedNotice && STORE_CONFIG\.enabledExtras\.drinks && <DrinkComplements compact/);
});

test("atalhos de categorias em 2 colunas usam fotografias existentes e áreas acionáveis", () => {
  const page = read("app/page.tsx");
  const css = read("app/storefront-checkout-premium.css");
  assert.match(page, /className="boutique-complement-choice"/);
  assert.match(page, /<img src=\{photo\}/);
  assert.match(css, /\.boutique-complement-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s);
  assert.match(css, /\.boutique-complement-choice\s*\{[^}]*min-height:\s*132px/s);
});

test("bebidas com quatro miniaturas mantêm toque 44px e sem mensagem que expanda o bloco", () => {
  const comp = read("components/drink-complements.tsx");
  const css = read("app/drink-complements-20261110.css");
  assert.match(comp, /DRINKS\.filter\(drink => drinkStatus/);
  assert.match(comp, /className="refreshment-count"/);
  assert.match(comp, /className="refreshment-action-row"/);
  assert.match(comp, /className="sr-only" role="status"/);
  assert.match(comp, /data-drink-id=\{drink\.id\}/);
  assert.match(css, /\.refreshment-add\s*\{[^}]*min-height:\s*44px/s);
  assert.match(css, /\.refreshment-grid\s*\{[^}]*repeat\(2, minmax\(0, 1fr\)\)/s);
});

test("mudanças no carrinho preservam a posição visual da bebida sem rolar para outra etapa", () => {
  const page = read("app/page.tsx");
  assert.match(page, /useLayoutEffect\(\(\) => \{\s*const anchor = drinkViewportAnchor\.current/s);
  assert.match(page, /getBoundingClientRect\(\)\.top - anchor\.top/);
  assert.match(page, /window\.scrollTo\(\{ top: Math\.max\(0, window\.scrollY \+ shift\), behavior: "instant" \}\)/);
  assert.match(page, /const selectedCard = document\.querySelector<HTMLElement>/);
  const start = page.indexOf("function addDrink("), end = page.indexOf("function editItem(", start);
  assert.ok(start > 0 && end > start);
  assert.doesNotMatch(page.slice(start, end), /requestScroll\(|scrollToSection\(/);
});
