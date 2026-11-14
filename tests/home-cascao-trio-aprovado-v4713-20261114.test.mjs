import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const catalog = readFileSync(new URL("../app/catalog.ts", import.meta.url), "utf8");

test("V4.7.13: somente capa da categoria Cascão usa o trio originalmente aprovado", () => {
  const cover = "cascao-trufado-trio-home-20261114-v4713.webp";
  const fallback = "cones-trufados-trio-20261108.webp";
  assert.equal(page.split(cover).length - 1, 1);
  assert.ok(page.includes('photo={coneIsVisible("cascao-trufado-kinder-bueno") ? "/images/' + cover + '" : "/images/' + fallback + '"}'));
  assert.ok(page.includes('photoWidth={1122}'));
  assert.ok(page.includes('photo.replace(".webp", "-360.webp")'));
  assert.ok(!page.includes("cascao-trufado-trio-home-20261113-v474.webp"));
});

test("V4.7.13: fotos individuais e catálogo dos Cascões permanecem intactos", () => {
  for (const asset of [
    "cone-trufado-prestigio-20261113-v478.webp",
    "cascao-trufado-ninho-morango-20261113-v478.webp",
    "cone-trufado-ferrero-rocher-20261113-v478.webp",
    "cascao-trufado-ninho-nutella-chocotone-20261113-v479.webp",
    "cascao-trufado-kinder-bueno-20261113-v476.webp",
  ]) assert.ok(catalog.includes(asset), asset);
  assert.ok(catalog.includes('Ninho Nutella e Chocottone'));
  assert.ok(!catalog.includes('cascao-trufado-trio-home-20261114-v4713.webp'), "foto da capa não entra nas imagens individuais");
});
