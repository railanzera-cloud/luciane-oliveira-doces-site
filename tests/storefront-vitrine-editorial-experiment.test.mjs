import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
const [page,layout,css] = await Promise.all([
  readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/layout.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/storefront-vitrine-editorial-experiment.css",import.meta.url),"utf8"),
]);
test("vitrine experimental é uma camada posterior e restrita à tela inicial",()=>{
  assert.ok(layout.indexOf('import "./storefront-vitrine-editorial-experiment.css";') > layout.indexOf('import "./storefront-boutique-v3.css";'));
  assert.ok(css.includes(".storefront .menu-entry.is-neutral"));
  assert.ok(!css.includes(".admin-"));
  assert.ok(!css.includes(".checkout-"));
  assert.ok(!css.includes(".builder-"));
});
test("fotografias e legendas são elementos independentes e a ação é explícita",()=>{
  assert.ok(page.includes('className="category-option-media"'));
  assert.ok(page.includes('className="category-option-copy"'));
  assert.ok(page.includes('className="category-option-action"'));
  assert.ok(page.includes('"Escolher pipocas" : "Ver as fatias"'));
  assert.ok(page.includes("onClick={() => selectCategory(category.id)}"));
  assert.ok(page.includes('disabled={!available}'));
  assert.ok(css.includes("grid-template-columns: minmax(0,44%) minmax(0,56%)"));
  assert.ok(css.includes(".category-option-media img"));
});
test("informações e regras operacionais continuam acessíveis",()=>{
  assert.ok(page.includes("{DELIVERY_TIME_ESTIMATE} O prazo começa após a confirmação da loja."));
  assert.ok(page.includes("Entrega a partir de R$8 ou retirada em Paragominas"));
  assert.ok(page.includes("visibleCategories.map((category)"));
  assert.ok(page.includes("categoryIsAvailable(category.id)"));
  assert.ok(page.includes("cover.cardImage ?? cover.image"));
  assert.ok(page.includes("Esgotado"));
});
test("acessibilidade, mobile estreito e movimento reduzido cobertos",()=>{
  for(const rule of ["max-width:359px","min-width:600px","min-width:980px","prefers-reduced-motion:reduce",":focus-visible"]){
    assert.ok(css.includes(rule),rule);
  }
});
