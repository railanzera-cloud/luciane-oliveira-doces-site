import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const catalog = await readFile(new URL("../app/catalog.ts", import.meta.url), "utf8");
const home = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

const flavors = [
  ["cascao-trufado-kinder-bueno", "kinder-bueno", "Kinder Bueno"],
  ["cascao-trufado-ninho-morango", "ninho-morango", "Ninho com Morango"],
  ["cascao-trufado-ninho-nutella-chocotone", "ninho-nutella-chocotone", "Ninho Nutella e Chocottone"],
];

test("cada sabor novo mantém id, preço e fotos isoladas V4.7.4", () => {
  for (const [id, slug, name] of flavors) {
    const parts = catalog.split(`id: "${id}"`);
    assert.equal(parts.length, 2, `ID único: ${name}`);
    const entry = parts[1].split("options: [],")[0];
    const edition = slug === "ninho-morango" ? "v478" : slug === "ninho-nutella-chocotone" ? "v479" : "v476";
    assert.ok(entry.includes("price: 20, available: true"), `Preço preservado: ${name}`);
    assert.ok(entry.includes(`/images/cascao-trufado-${slug}-20261113-${edition}.webp`));
    assert.ok(entry.includes(`/images/cascao-trufado-${slug}-card-20261113-${edition}.webp`));
    assert.ok(!entry.includes("20261112-v44"), `Sem foto antiga: ${name}`);
  }
});

test("capa da categoria usa trio atualizado e mantém fallback", () => {
  assert.ok(home.includes("cascao-trufado-trio-home-20261113-v474.webp"));
  assert.ok(home.includes('photo.replace(".webp", "-360.webp")'));
  assert.ok(home.includes("cone-trufado-prestigio-20261108-v2.webp"));
  assert.ok(!home.includes("cascao-trufado-trio-home-20261112-v44.webp"));
});

test("outros três sabores preservam identidade e preço com fotos padronizadas", () => {
  for (const file of [
    "cone-trufado-prestigio-20261113-v478.webp",
    "cone-trufado-dois-amores-20261113-v475.webp",
    "cone-trufado-ferrero-rocher-20261113-v478.webp",
  ]) assert.ok(catalog.includes(file), `Arquivo histórico preservado: ${file}`);
  assert.ok(home.includes('<RadioGroup className="cone-flavor-grid"'));
  assert.ok(home.includes("cone.cardImage ?? cone.image"));
  assert.ok(home.includes("setConeQuantity(1)"));
  assert.ok(home.includes("coneStartingPrice"));
});
