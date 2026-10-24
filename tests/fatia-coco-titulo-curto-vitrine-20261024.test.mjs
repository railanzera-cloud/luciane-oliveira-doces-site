import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { PRODUCTS } from "../app/catalog.ts";

const catalog = readFileSync("app/catalog.ts", "utf8");
const page = readFileSync("app/page.tsx", "utf8");
const backend = readFileSync("supabase/functions/_shared/commerce-catalog.mjs", "utf8");
const productId = "fatia-coco-cremoso-morango";
const fullName = "Coco cremoso com geleia de morango na massa branca";

test("Nome abreviado aparece só na vitrine da nova fatia", () => {
  const product = PRODUCTS.find((p) => p.id === productId);
  assert.ok(product, "nova fatia preservada");
  assert.equal(product?.cardName, "Coco Cremoso com Morango");
  assert.equal(product?.subtitle, "Geleia de morango · Massa branca");
  assert.equal(product?.name, fullName);
  assert.equal(product?.variants[0].price, 20);
  assert.equal(product?.image, "/fatia-coco-cremoso-morango.webp");
  assert.match(page, /<strong>\{slice\.cardName \?\? slice\.name\}<\/strong>/);
  assert.match(page, /\{slice\.subtitle && <em>\{slice\.subtitle\}<\/em>\}/);
});

test("O fluxo de pedido e WhatsApp usa o nome comercial completo", () => {
  assert.match(page, /description: \x60\$\{sliceQuantity\}x \$\{productLabel\(selectedSlice\)\}/);
  assert.match(page, /<strong>\{selectedSlice\.name\}<\/strong>/);
  assert.match(catalog, /name: "Coco cremoso com geleia de morango na massa branca"/);
  assert.ok(backend.includes(fullName));
  assert.doesNotMatch(backend, /Coco Cremoso com Morango/);
});
