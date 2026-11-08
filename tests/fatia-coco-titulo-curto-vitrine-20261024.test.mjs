import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { PRODUCTS } from "../app/catalog.ts";

const catalog = readFileSync("app/catalog.ts", "utf8");
const page = readFileSync("app/page.tsx", "utf8");
const backend = readFileSync("supabase/functions/_shared/commerce-catalog.mjs", "utf8");
const productId = "fatia-coco-cremoso-morango";
const approvedName = "Geleia de Morango com Coco Cremoso";

test("Nome aprovado é curto e suficiente, sem subtítulo repetido", () => {
  const product = PRODUCTS.find((p) => p.id === productId);
  assert.ok(product, "fatia preservada");
  assert.equal(product?.id, productId);
  assert.equal(product?.name, approvedName);
  assert.equal(product?.cardName, undefined);
  assert.equal(product?.subtitle, undefined);
  assert.equal(product?.variants[0].price, 20);
  assert.equal(product?.image, "/fatia-coco-cremoso-morango.webp");
  assert.match(page, /<strong>\{slice\.cardName \?\? slice\.name\}<\/strong>/);
  assert.match(page, /\{slice\.subtitle && <em>\{slice\.subtitle\}<\/em>\}/);
});

test("Nome atualizado é reproduzido no carrinho, WhatsApp e cotação do backend", () => {
  assert.match(page, /description: \x60\$\{sliceQuantity\}x \$\{selectedSlice\.cardName \?\? productLabel\(selectedSlice\)\}/);
  assert.match(page, /<strong>\{selectedSlice\.name\}<\/strong>/);
  assert.ok(catalog.includes('name: "'+approvedName+'"'));
  assert.ok(backend.includes(approvedName));
  assert.doesNotMatch(backend, /name: "Coco cremoso com geleia de morango na massa branca"/);
  assert.match(page, /function productCheckoutLabel\(product: Product\)/);
  assert.match(page, /return product\.cardName \?\? productLabel\(product\)/);
  assert.match(page, /<h3>\{productCheckoutLabel\(product\)\}<\/h3>/);
  assert.match(page, /name: productLabel\(product\), size: variant\.whatsappLabel/);
});

test("Sem duplicar a descrição no checkout e sem mexer no CSS comercial", () => {
  const css = readFileSync("app/storefront-checkout-premium.css", "utf8");
  const block = catalog.slice(catalog.indexOf('id: "'+productId+'"'),catalog.indexOf('id: "fatia-chocolate-cenoura"'));
  assert.doesNotMatch(block, /cardName:|subtitle:/);
  assert.ok(css.includes(".cart-item-subtitle"));
  assert.ok(css.includes(".summary-product-subtitle"));
  assert.ok(!page.includes('if (product.id === "fatia-coco-cremoso-morango") return product.name;'));
});
