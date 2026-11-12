import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = name => readFileSync(new URL("../"+name, import.meta.url),"utf8");
const page = source("app/page.tsx");
const css = source("app/storefront-checkout-premium.css");
const catalog = source("app/catalog.ts");

test("refrigerantes opcionais ficam recolhidos, após os doces, sem reviver vitrine extensa", () => {
  assert.match(catalog, /enabledExtras:\s*\{\s*drinks:\s*true/);
  assert.match(page,/DrinkComplements availability=\{availability\}/);
  assert.match(source("components/drink-complements.tsx"),/<details className="refreshment-later"/);
  const first = page.indexOf('checkoutComplementItems.map((id) => {');
  const drink = page.indexOf('<DrinkComplements availability={availability}');
  const receiving = page.indexOf('id="recebimento-opcoes"');
  assert.ok(first >= 0 && drink > first && receiving > drink);
});

test("adicionar doce ainda conduz à confirmação e sugestões existentes", () => {
  assert.match(page,/requestScroll\("recebimento"\)/);
  assert.match(page,/className="boutique-added-continuity"/);
  assert.match(page,/checkoutComplementItems\.map/);
  assert.match(page,/Quer completar seu pedido\?/);
});

test("caminho de entrega ou retirada aponta para escolha, não para complementos", () => {
  assert.match(page,/id="recebimento-opcoes"/);
  assert.match(page,/if \(!receiving\) return "recebimento-opcoes";/);
  assert.match(page,/requestScroll\(sectionId === "recebimento" \? "recebimento-opcoes" : sectionId\)/);
  assert.match(page,/onClick=\{\(\) => scrollToSection\("recebimento-opcoes"\)\}/);
  assert.match(css,/#recebimento-opcoes\s*\{\s*scroll-margin-top:/);
});

test("adicionar doces conserva o início de recebimento e sticky foca próximo campo", () => {
  assert.match(page,/const destination = wasEditing \? "carrinho" : "recebimento"/);
  assert.match(page,/function handleStickyAction\(\)/);
  assert.match(page,/function handleFinalAction\(\)/);
  assert.match(page,/requestScroll\(cart\.length \? nextCheckoutSection\(\) : "carrinho"\)/);
  assert.match(page,/value=\{fulfillment\} onValueChange=\{chooseFulfillment\}/);
  assert.match(page,/requestScroll\(nextCheckoutSection\(value as Fulfillment\)\)/);
});
