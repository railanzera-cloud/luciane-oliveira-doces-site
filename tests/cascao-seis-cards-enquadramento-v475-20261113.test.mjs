import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const catalog = await readFile(new URL("../app/catalog.ts", import.meta.url), "utf8");
const home = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const items = [
  ["cone-trufado-prestigio", "cone-trufado-prestigio", 18],
  ["cascao-folheado-geleia-morango-ninho", "cascao-folheado-geleia-morango-ninho", 22],
  ["cone-trufado-ferrero-rocher", "cone-trufado-ferrero-rocher", 20],
  ["cascao-trufado-kinder-bueno", "cascao-trufado-kinder-bueno", 22],
  ["cascao-trufado-ninho-morango", "cascao-trufado-ninho-morango", 20],
  ["cascao-trufado-ninho-nutella-chocotone", "cascao-trufado-ninho-nutella-chocotone", 20],
];

test("Seis Cascões: IDs e preços preservados, fotos completas como cards", () => {
  const cardById = {
    "cone-trufado-prestigio": "prestigio",
    "cascao-folheado-geleia-morango-ninho": "folheado",
    "cone-trufado-ferrero-rocher": "ferrero",
    "cascao-trufado-kinder-bueno": "kinder",
    "cascao-trufado-ninho-morango": "ninho-morango",
    "cascao-trufado-ninho-nutella-chocotone": "ninho-nutella-chocottone",
  };
  for (const [id, prefix, price] of items) {
    const parts = catalog.split(`id: "${id}"`);
    assert.equal(parts.length,2,`SKU único ${id}`);
    const entry=parts[1].split("options: [],")[0];
    const edition = ["cone-trufado-ferrero-rocher", "cascao-folheado-geleia-morango-ninho"].includes(id) ? "20261114-v4713" : ["cone-trufado-prestigio", "cascao-trufado-ninho-morango"].includes(id) ? "20261113-v478" : id === "cascao-trufado-ninho-nutella-chocotone" ? "20261113-v479" : "20261114-v47142";
    const mainPhoto = id === "cascao-trufado-kinder-bueno" ? "/images/cascao-trufado-kinder-bueno-nutella-real-20261114-v47142.webp" : `/images/${prefix}-${edition}.webp`;
    assert.match(entry,new RegExp(`price: ${price}, available: true`));
    assert.ok(entry.includes(`image: "${mainPhoto}"`), `Principal ${id}`);
    assert.ok(entry.includes(`cardImage: "/images/cascao-${cardById[id]}-inteiro-card-20261114-v47143.webp"`), `Card ${id}`);
  }
});

test("capa com trio fica aprovada e complemento recebe miniatura nova sem alterar lógica", () => {
  assert.ok(home.includes("cascao-trufado-trio-home-20261114-v4713.webp"));
  assert.ok(home.includes("cascao-kinder-inteiro-card-20261114-v47143.webp"));
  assert.ok(home.includes('photo.replace(".webp", "-360.webp")'));
  assert.ok(home.includes('<RadioGroup className="cone-flavor-grid"'));
  assert.ok(home.includes("cone.cardImage ?? cone.image"));
});
