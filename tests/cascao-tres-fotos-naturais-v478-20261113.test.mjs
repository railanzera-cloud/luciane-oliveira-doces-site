import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { CONES } from "../app/catalog.ts";

const catalog = await readFile(new URL("../app/catalog.ts", import.meta.url), "utf8");
const flavors = [
  ["cascao-trufado-ninho-morango", "Ninho com Morango", 20, "morango inteiro"],
  ["cone-trufado-prestigio", "Prestígio", 18, "beijinho"],
  ["cone-trufado-ferrero-rocher", "Ferrero Rocher", 20, "bombom cortado"],
];

test("V4.7.8 substitui somente três fotografias pelos arquivos aprovados", () => {
  assert.equal(CONES.length, 6);
  for (const [id, name, price, expectedAlt] of flavors) {
    const product = CONES.find(p => p.id === id);
    assert.ok(product, id);
    assert.equal(product.name, name);
    assert.equal(product.variants[0].price, price);
    assert.equal(product.image, `/images/${id}-${id === "cone-trufado-ferrero-rocher" ? "20261114-v4713" : "20261113-v478"}.webp`);
    assert.equal(product.cardImage, `/images/${id}-card-${id === "cone-trufado-ferrero-rocher" ? "20261114-v4713" : "20261113-v478"}.webp`);
    assert.ok(product.imageAlt.includes(expectedAlt), name);
    const entry = catalog.split(`id: "${id}"`)[1]?.split("options: [],")[0];
    assert.ok(entry, id);
    assert.ok(!entry.includes("20261113-v475.webp") && !entry.includes("20261113-v477.webp"), name);
  }
});

test("V4.7.8 preserva os três outros sabores e a tabela de preços", () => {
  assert.deepEqual(CONES.map(p => [p.id, p.variants[0].price]), [
    ["cone-trufado-prestigio", 18],
    ["cascao-folheado-geleia-morango-ninho", 22],
    ["cone-trufado-ferrero-rocher", 20],
    ["cascao-trufado-kinder-bueno", 22],
    ["cascao-trufado-ninho-morango", 20],
    ["cascao-trufado-ninho-nutella-chocotone", 20],
  ]);
  assert.equal(CONES.find(p=>p.id==="cascao-folheado-geleia-morango-ninho")?.cardImage, "/images/cascao-folheado-geleia-morango-ninho-card-20261114-v4713.webp");
  assert.equal(CONES.find(p=>p.id==="cascao-trufado-kinder-bueno")?.cardImage, "/images/cascao-trufado-kinder-bueno-card-20261113-v476.webp");
  assert.equal(CONES.find(p=>p.id==="cascao-trufado-ninho-nutella-chocotone")?.cardImage, "/images/cascao-trufado-ninho-nutella-chocotone-card-20261113-v479.webp");
});
