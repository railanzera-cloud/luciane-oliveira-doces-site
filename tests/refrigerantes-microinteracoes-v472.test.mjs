import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const component = readFileSync("components/drink-complements.tsx", "utf8");
const css = readFileSync("app/drink-complements-premium.css", "utf8");
const checkout = readFileSync("app/page.tsx", "utf8");

test("Refrigerantes: abertura reversível preserva details nativo, teclado e fechamento completo", () => {
  assert.match(component, /<details ref=\{offerRef\} className="refreshment-later"/);
  assert.match(component, /<summary onClick=\{toggleOffer\}/);
  assert.match(component, /event\.preventDefault\(\)/);
  assert.match(component, /const expanding = !details\.open \|\| details\.dataset\.collapsing === "true"/);
  assert.match(component, /onTransitionEnd=\{finishCollapse\}/);
  assert.match(component, /const finishCollapse/);
  assert.match(component, /details\.open = false/);
  assert.match(component, /cancelPendingClose/);
  assert.match(css, /grid-template-rows:0fr/);
  assert.match(css, /grid-template-rows:1fr/);
  assert.match(css, /box-sizing:border-box;overflow:hidden/);
});

test("Refrigerantes: tempos curtos, feedback tátil e acessibilidade", () => {
  assert.match(css, /grid-template-rows 260ms/);
  assert.match(component, /prefers-reduced-motion: reduce/);
  assert.match(css, /#acompanhamentos > summary:active/);
  assert.match(css, /#acompanhamentos button:not\(:disabled\):active/);
  assert.match(css, /refreshment-count-confirm/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /animation:none !important/);
});

test("Refrigerantes: mesmas variantes, sem rolagem nova, sem alterar CTAs ou layout inicial", () => {
  assert.match(component, /const visible = DRINKS\.filter/);
  assert.match(component, /drinkStatus\(availability, drink\.id\) !== "hidden"/);
  assert.match(component, /adjust\(drink,-1\)/);
  assert.match(component, /adjust\(drink,1\)/);
  assert.match(component, /quantity < 99/);
  assert.match(component, /aria-live="polite"/);
  assert.match(component, /window\.scrollBy\(\{ top: delta/);
  assert.doesNotMatch(component.slice(component.indexOf("const toggleOffer"), component.indexOf("// Quando o carrinho acima cresce")), /scrollTo|scrollIntoView|scrollBy/);
  assert.equal((checkout.match(/<DrinkComplements availability=\{availability\}/g) ?? []).length, 1);
  assert.match(checkout, /id="recebimento-opcoes"/);
});
