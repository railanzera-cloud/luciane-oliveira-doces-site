import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";

const page = readFileSync("app/page.tsx", "utf8");
const catalog = readFileSync("app/catalog.ts", "utf8");
const backend = readFileSync("supabase/functions/_shared/commerce-catalog.mjs", "utf8");
const css = readFileSync("app/storefront-vitrine-editorial-experiment.css", "utf8");

test("nova identidade visual sem mudar IDs do estoque nem preço", () => {
  for (const name of ["Pipocas Trufadas", "Caramelo e Ninho", "Caramelo e Chocolate"]) {
    assert.ok(page.includes(name) || catalog.includes(name), `não encontrou ${name}`);
  }
  assert.match(page, /Pipocas <em>Trufadas<\/em>/);
  assert.match(page, /Pacote com zíper/);
  assert.doesNotMatch(page, /R$ 15,90 por copo|QUANTOS COPOS/);
  assert.match(catalog, /id: "crocante-ninho"/);
  assert.match(catalog, /id: "crocante-chocolate"/);
  assert.match(catalog, /id: "400ml", label: "Pacote"/);
  assert.match(catalog, /price: 15\.9/);
  assert.match(backend, /itemKey: "crocante_copo_ninho"/);
  assert.match(backend, /itemKey: "crocante_copo_chocolate"/);
  assert.match(backend, /priceCents: 1590/);
  assert.match(backend, /size_label: "Pacote"/);
});

test("duas fotografias otimizadas presentes e utilizadas nas duas superfícies", () => {
  for (const flavor of ["ninho", "chocolate"]) {
    const url = `/images/pipocas-trufadas-${flavor}.avif`;
    assert.ok(page.split(url).length >= 3, `home e detalhe devem usar ${url}`);
    assert.ok(catalog.includes(url), `catálogo deve usar ${url}`);
    const photo = readFileSync(`public${url}`);
    assert.ok(photo.length > 10000 && photo.subarray(4, 12).toString("ascii") === "ftypavif", `AVIF inválido para ${flavor}`);
    assert.ok(statSync(`public${url}`).size < 100_000, `foto não otimizada ${flavor}`);
  }
  assert.match(css, /object-fit:contain/);
});
