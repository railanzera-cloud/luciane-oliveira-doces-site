import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const catalog = await readFile(new URL("../app/catalog.ts", import.meta.url), "utf8");
const home = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

const flavors = [
  ["cascao-trufado-kinder-bueno", "kinder-bueno", "Kinder Bueno"],
  ["cascao-trufado-ninho-morango", "ninho-morango", "Ninho com Morango"],
  ["cascao-trufado-ninho-nutella-chocotone", "ninho-nutella-chocotone", "Ninho Nutella e Chocotone"],
];

test("os três sabores novos têm fotos V4.7.4 únicas no catálogo, sem alterar seus preços", () => {
  for (const [id, slug, name] of flavors) {
    const entry = catalog.match(new RegExp(`id: "${id}"[\\s\\S]*?options: \\[\\],`))?.[0];
    assert.ok(entry, `Produto não encontrado: ${name}`);
    assert.match(entry, /price: 20, available: true/);
    assert.ok(entry.includes(`/images/cascao-trufado-${slug}-20261113-v474.webp`));
    assert.ok(entry.includes(`/images/cascao-trufado-${slug}-card-20261113-v474.webp`));
    assert.ok(!entry.includes("20261112-v44"), `Imagem antiga em ${name}`);
  }
});

test("home preserva fallback e usa trio natural com variante de 360 px", () => {
  assert.match(home, /cascao-trufado-trio-home-20261113-v474\\.webp/);
  assert.match(home, /photo\\.replace\\("\\.webp", "-360.webp"\\)/);
  assert.match(home, /cone-trufado-prestigio-20261108-v2\\.webp/);
  assert.doesNotMatch(home, /cascao-trufado-trio-home-20261112-v44\\.webp/);
});

test("somente três fotos dos sabores novos são trocadas", () => {
  assert.match(catalog, /cone-trufado-prestigio-20261108-v2\\.webp/);
  assert.match(catalog, /cone-trufado-dois-amores-20261108\\.webp/);
  assert.match(catalog, /cone-trufado-ferrero-rocher-20261108\\.webp/);
  assert.match(home, /<RadioGroup className="cone-flavor-grid"/);
  assert.match(home, /cone\\.cardImage \\?\\? cone\\.image/);
  assert.match(home, /setConeQuantity\\(1\\)/);
  assert.match(home, /price=\\{currency\\.format\\(Math\\.min/);
});
