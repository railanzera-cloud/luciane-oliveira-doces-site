import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const catalog = await readFile(new URL("../app/catalog.ts", import.meta.url), "utf8");
const home = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const items = [
  ["cone-trufado-prestigio", "cone-trufado-prestigio", 18],
  ["cone-trufado-dois-amores", "cone-trufado-dois-amores", 18],
  ["cone-trufado-ferrero-rocher", "cone-trufado-ferrero-rocher", 20],
  ["cascao-trufado-kinder-bueno", "cascao-trufado-kinder-bueno", 20],
  ["cascao-trufado-ninho-morango", "cascao-trufado-ninho-morango", 20],
  ["cascao-trufado-ninho-nutella-chocotone", "cascao-trufado-ninho-nutella-chocotone", 20],
];

test("seis sabores mantêm identificadores e preços, mas agora apontam para fotos individuais atualizadas", () => {
  for (const [id, prefix, price] of items) {
    const parts = catalog.split(`id: "${id}"`);
    assert.equal(parts.length, 2, `SKU único ${id}`);
    const entry = parts[1].split("options: [],")[0];
    const edition = id === "cone-trufado-prestigio" ? "v477" : id === "cascao-trufado-kinder-bueno" || id === "cascao-trufado-ninho-nutella-chocotone" ? "v476" : "v475";
    assert.match(entry, new RegExp(`price: ${price}, available: true`), `Preço ${id}`);
    assert.ok(entry.includes(`/images/${prefix}-20261113-${edition}.webp`), `Foto ${id}`);
    assert.ok(entry.includes(`/images/${prefix}-card-20261113-${edition}.webp`), `Card ${id}`);
    assert.ok(!entry.includes("20261108.webp") && !entry.includes("20261113-v474.webp"), `Sem refs antigas ${id}`);
  }
});

test("capa com trio fica aprovada e complemento recebe miniatura nova sem alterar lógica", () => {
  assert.ok(home.includes("cascao-trufado-trio-home-20261113-v474.webp"));
  assert.ok(home.includes("cascao-trufado-kinder-bueno-card-20261113-v476.webp"));
  assert.ok(home.includes('photo.replace(".webp", "-360.webp")'));
  assert.ok(home.includes('<RadioGroup className="cone-flavor-grid"'));
  assert.ok(home.includes("cone.cardImage ?? cone.image"));
});
