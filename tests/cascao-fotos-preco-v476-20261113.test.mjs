import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { CONES } from "../app/catalog.ts";

const catalog = await readFile(new URL("../app/catalog.ts", import.meta.url), "utf8");
const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("V4.7.6: troca somente as fotos de Kinder e Ninho Nutella sem lateral desfocada", () => {
  for (const id of ["cascao-trufado-kinder-bueno", "cascao-trufado-ninho-nutella-chocotone"]) {
    const entry = catalog.split(`id: "${id}"`)[1]?.split("options: [],")[0];
    assert.ok(entry, id);
    const edition = id === "cascao-trufado-ninho-nutella-chocotone" ? "v479" : "v476";
    assert.ok(entry.includes(`/images/${id}-20261113-${edition}.webp`), id);
    assert.ok(entry.includes(`/images/${id}-card-20261113-${edition}.webp`), id);
    assert.doesNotMatch(entry, /20261113-v475/);
    assert.match(entry, /price: 20, available: true/);
  }
  assert.ok(page.includes("cascao-trufado-kinder-bueno-card-20261113-v476.webp"));
  assert.ok(page.includes("cascao-trufado-trio-home-20261113-v474.webp"));
});

test("V4.7.6: preço do botão e da vitrine vem da mesma fonte comercial", () => {
  assert.equal(Math.min(...CONES.map(cone => cone.variants[0].price)), 18);
  assert.deepEqual(CONES.map(cone => cone.variants[0].price), [18, 18, 20, 20, 20, 20]);
  assert.ok(page.includes("const coneStartingPrice = Math.min("));
  assert.ok(page.includes('activeCategory === "cones" ? `A partir de ${currency.format(coneStartingPrice)}`'));
  assert.ok(page.includes("price={currency.format(coneStartingPrice)}"));
  assert.doesNotMatch(page, /A partir de R\$14/);
});
