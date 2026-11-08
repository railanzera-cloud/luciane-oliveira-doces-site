import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/page.tsx", "utf8");
const css = readFileSync("app/category-navigation-refinement-20261108.css", "utf8");
const layout = readFileSync("app/layout.tsx", "utf8");

test("Navegação secundária fica recolhida, com destinos visíveis somente sob demanda", () => {
  assert.match(page, /const \[otherCategoriesOpen, setOtherCategoriesOpen\] = useState\(false\)/);
  assert.ok(page.includes('className="builder-more-toggle" aria-expanded={otherCategoriesOpen}'));
  assert.ok(page.includes('aria-controls="builder-more-options"'));
  assert.ok(page.includes('aria-label="Explorar outras categorias" hidden={!otherCategoriesOpen}'));
  assert.ok(page.includes("setOtherCategoriesOpen(open => !open)"));
  assert.ok(page.includes('visibleCategories.filter(category => category.id !== activeCategory)'));
  assert.ok(page.includes('disabled={!categoryIsAvailable(category.id)}'));
  assert.ok(page.includes('onClick={() => selectCategory(category.id)}'));
  assert.ok(page.includes('onClick={openLimitedCupEdition}'));
  assert.ok(page.includes('onClick={returnToCategories}'));
  assert.ok(!page.includes('className="category-shortcuts"'));
  assert.ok(!page.includes('className="v7-navigation v7-navigation-pipocas"'));
});

test("Troca de categoria e retorno fecham opções, com Escape e toque externo", () => {
  assert.ok(page.includes('document.addEventListener("pointerdown", dismissOutside)'));
  assert.ok(page.includes('document.addEventListener("keydown", dismissEscape)'));
  assert.ok(page.includes('event.key !== "Escape"'));
  assert.match(page, /function selectCategory\([\s\S]*?setOtherCategoriesOpen\(false\);/);
  assert.match(page, /function returnToCategories\([\s\S]*?setOtherCategoriesOpen\(false\);/);
  assert.match(page, /function openLimitedCupEdition\([\s\S]*?setOtherCategoriesOpen\(false\);/);
});

test("Primeira rolagem aponta ao passo acionável sem alterar etapas posteriores", () => {
  assert.ok(page.includes('function scrollToCategoryEntry(category: CategoryId)'));
  assert.ok(page.includes('category === "pipocas" ? "tamanhos" : category === "fatias" ? "fatias" : "cones-sabores"'));
  for (const category of ["pipocas", "fatias", "cones"]) {
    assert.ok(page.includes(`scrollRequest.id === "category-entry-${category}"`));
  }
  assert.ok(page.includes('requestScroll(`category-entry-${category}`)'));
  assert.ok(page.includes('window.visualViewport?.height ?? window.innerHeight'));
  assert.ok(page.includes('Math.max(145, Math.round(viewportHeight * .24))'));
  assert.ok(page.includes('window.matchMedia("(prefers-reduced-motion: reduce)")'));
  // Retém progressão Gourmet, caldas, quantidades e CTAs da barra.
  assert.ok(page.includes('requestScroll("gourmet-flavor-action")'));
  assert.ok(page.includes('requestScroll("gourmet-quantity-action")'));
  assert.ok(page.includes('requestScroll("calda-fatias")'));
  assert.ok(page.includes('requestScroll("cones-quantidade")'));
});

test("Acabamento discreto e alvo acessível sem sobreposição de componentes comerciais", () => {
  assert.ok(layout.includes('import "./category-navigation-refinement-20261108.css";'));
  assert.match(css, /\.builder-utility-nav/);
  assert.match(css, /grid-column: 1 \/ -1/);
  assert.match(css, /\.builder-more-options/);
  assert.match(css, /position: absolute/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /max-width: 699px/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(css, /(?:\.slice-card|\.cone-flavor-card|\.size-card|\.mobile-sticky-bar|\.boutique-slice-preview)/);
});
