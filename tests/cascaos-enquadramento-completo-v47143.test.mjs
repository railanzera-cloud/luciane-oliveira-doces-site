import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CONES } from "../app/catalog.ts";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const expected = new Map([
  ["cone-trufado-prestigio", "cascao-prestigio-inteiro-card-20261114-v47143.webp"],
  ["cascao-folheado-geleia-morango-ninho", "cascao-folheado-inteiro-card-20261114-v47143.webp"],
  ["cone-trufado-ferrero-rocher", "cascao-ferrero-inteiro-card-20261114-v47143.webp"],
  ["cascao-trufado-kinder-bueno", "cascao-kinder-inteiro-card-20261114-v47143.webp"],
  ["cascao-trufado-ninho-morango", "cascao-ninho-morango-inteiro-card-20261114-v47143.webp"],
  ["cascao-trufado-ninho-nutella-chocotone", "cascao-ninho-nutella-chocottone-inteiro-card-20261114-v47143.webp"],
]);

test("V4.7.14.3: seis Cascões com fotos dos cards integras e versao de cache nova", () => {
  assert.equal(CONES.length, 6);
  for (const cone of CONES) {
    const filename = expected.get(cone.id);
    assert.ok(filename, "SKU inesperado " + cone.id);
    assert.equal(cone.cardImage, "/images/" + filename);
    assert.ok(cone.image?.startsWith("/images/"), "foto ampliada preservada para " + cone.id);
    assert.ok(cone.variants[0].price > 0);
  }
  assert.match(page, /cascao-kinder-inteiro-card-20261114-v47143\.webp/);
});

test("Menor preco na faixa flutuante segue disponibilidade real do Supabase", () => {
  assert.match(page, /const sellableConePrices = CONES\.filter\(cone => cone\.available && cone\.variants\[0\]\.available && coneIsAvailable\(cone\.id\)\)/);
  assert.match(page, /const coneStartingPrice = Math\.min\(/);
  assert.match(page, /activeCategory === "cones" \? `A partir de \$\{currency\.format\(coneStartingPrice\)\}`/);
  assert.equal(CONES.find(c => c.id === "cone-trufado-prestigio")?.variants[0].price, 18);
  assert.equal(CONES.find(c => c.id === "cascao-trufado-kinder-bueno")?.variants[0].price, 22);
});
