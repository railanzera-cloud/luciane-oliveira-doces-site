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
  assert.match(page, /description: \x60\$\{sliceQuantity\}x \$\{selectedSlice\.cardName \?\? productLabel\(selectedSlice\)\}/);
  assert.match(page, /<strong>\{selectedSlice\.name\}<\/strong>/);
  assert.match(catalog, /name: "Coco cremoso com geleia de morango na massa branca"/);
  assert.ok(backend.includes(fullName));
  assert.doesNotMatch(backend, /Coco Cremoso com Morango/);
});

test("Fatia coco não repete massa branca e geleia no checkout ou WhatsApp", () => {
  const page = readFileSync("app/page.tsx", "utf8");
  const css = readFileSync("app/storefront-checkout-premium.css", "utf8");
  assert.match(page, /if \(product\.id === "fatia-coco-cremoso-morango"\) return product\.name/);
  assert.match(page, /function productCheckoutLabel\(product: Product\)/);
  assert.match(page, /return product\.cardName \?\? productLabel\(product\)/);
  assert.match(page, /description: \`\$\{sliceQuantity\}x \$\{selectedSlice\.cardName \?\? productLabel\(selectedSlice\)\}/);
  assert.match(page, /<h3>\{productCheckoutLabel\(product\)\}<\/h3>/);
  assert.match(page, /<strong>\{productCheckoutLabel\(product\)\}<\/strong>/);
  assert.match(page, /className="cart-item-subtitle"/);
  assert.match(page, /className="summary-product-subtitle"/);
  assert.match(css, /\.cart-item-subtitle/);
  assert.match(css, /\.summary-product-subtitle/);
  assert.match(page, /name: productLabel\(product\), size: variant\.whatsappLabel/);
  assert.match(page, /return product\.subtitle\s*\? \`\$\{product\.name\} \(\$\{product\.subtitle\.toLowerCase\(\)\}\)\`/);
});
