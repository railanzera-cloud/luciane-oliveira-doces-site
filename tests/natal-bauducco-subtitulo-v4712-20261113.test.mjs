import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CHOCOTONES } from "../app/catalog.ts";

const read = file => readFileSync(new URL("../" + file, import.meta.url), "utf8");
const component = read("components/christmas-collection.tsx");
const styles = read("app/colecao-natal-2026.css");

test("V4.7.12: todos os quatro cards de Natal mostram origem da massa sob o nome do sabor", () => {
  assert.equal(CHOCOTONES.length, 4);
  const cardHeading = component.match(/<div className="natal-product-heading">([\s\S]*?)<\/div>/)?.[1] ?? "";
  assert.ok(cardHeading.includes('<span className="natal-product-base">Chocottone Bauducco</span>'));
  assert.ok(cardHeading.indexOf("<h4>") < cardHeading.indexOf("Chocottone Bauducco"));
  assert.ok(cardHeading.indexOf("Chocottone Bauducco") < cardHeading.indexOf("Brigadeiro branco"));
  assert.ok(component.includes("visible.map(product => {"), "um componente para todos os sabores");
  assert.ok(!component.includes('className="natal-collection-intro"\n'), "introdução da categoria preservada");
});

test("V4.7.12: marca discreta e grid responsivo sem mudar valores, fotos ou interações", () => {
  assert.match(styles,/\.storefront \.natal-product-base\s*\{/);
  assert.match(styles,/color:#e4c6a2/);
  assert.match(styles,/min-height:80px/);
  assert.match(styles,/@media \(max-width:359px\)/);
  assert.match(styles,/min-height:94px/);
  assert.match(component,/className="natal-product-price"/);
  assert.match(component,/onAdjust\(product, 1\)/);
  assert.match(component,/className="natal-product-note">Brigadeiro branco/);
  assert.deepEqual(CHOCOTONES.map(p => p.variants[0].price), [22,22,22,22]);
});
