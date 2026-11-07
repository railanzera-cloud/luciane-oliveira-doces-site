import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const checkout = await readFile(new URL("../app/storefront-checkout-premium.css", import.meta.url), "utf8");
const home = await readFile(new URL("../app/storefront-collection-premium.css", import.meta.url), "utf8");
const catalog = await readFile(new URL("../app/catalog.ts", import.meta.url), "utf8");

test("miniaturas Gourmet fazem crop contextual sem trocar fotos ou identidade comercial", () => {
  assert.match(catalog, /image: "\/pipoca-gourmet\.jpeg"/);
  assert.match(page, /className="boutique-cart-image" data-gourmet=\{product\.id === POPCORN\.id \|\| undefined\}/);
  assert.match(page, /className="boutique-added-photo" data-gourmet=\{justAddedProduct\?\.id === POPCORN\.id \|\| undefined\}/);
  assert.ok(page.includes('viewBox={context === "cart" ? "70 360 760 860" : "130 430 640 720"}'));
  assert.ok(page.includes('<image href="/pipoca-gourmet.jpeg" x="0" y="0" width="900" height="1600"'));
  assert.ok(page.includes('<GourmetCheckoutCrop context="cart" />'));
  assert.ok(page.includes('<GourmetCheckoutCrop context="added" />'));
  assert.ok(page.includes("src={product.cardImage ?? product.image}"), "Demais produtos conservam fotos originais");
  assert.ok(page.includes("src={justAddedProduct.cardImage ?? justAddedProduct.image}"));
  assert.match(checkout, /\.gourmet-checkout-crop\s*\{[^}]*width: 100%;[^}]*height: 100%/);
  assert.doesNotMatch(checkout, /\.boutique-cart-image\[data-gourmet="true"\] img\s*\{/);
  assert.doesNotMatch(checkout, /\.boutique-added-photo\[data-gourmet="true"\] img\s*\{/);
  assert.doesNotMatch(checkout, /\.slice-media[^\n]*object-position:/);
});

test("checkout mostra fotos maiores, mas mantém espaços úteis no mobile estreito", () => {
  assert.match(checkout, /#carrinho \.boutique-cart-image\s*\{[^}]*width: 76px;[^}]*height: 86px/);
  assert.match(checkout, /#carrinho \.boutique-added-photo\s*\{[^}]*width: 66px;[^}]*height: 74px/);
  assert.match(checkout, /@media \(max-width: 450px\)[\s\S]*?boutique-cart-image \{ flex-basis: 69px; width: 69px; height: 80px;/);
  assert.match(checkout, /@media \(max-width: 359px\)[\s\S]*?boutique-cart-image \{ flex-basis: 61px; width: 61px; height: 73px;/);
  assert.ok(page.includes('className="cart-item-info"'));
  assert.ok(page.includes('className="boutique-added-message"'));
});

test("home bloqueia callout e arraste somente em fotos das categorias sem interromper navegação", () => {
  assert.match(home, /\.menu-entry\.is-neutral \.collection-photo img\s*\{[^}]*pointer-events: none/);
  assert.match(home, /\.menu-entry\.is-neutral \.collection-photo,[\s\S]*?-webkit-touch-callout: none/);
  assert.match(page, /className="collection-photo"[^\n]+onContextMenu=\{\(event\) => event\.preventDefault\(\)\}/);
  assert.ok(page.includes('className="collection-choice"'));
  assert.ok(page.includes('onClick={onClick}'));
  assert.ok(page.includes('draggable={false}'));
  assert.doesNotMatch(home, /\.storefront \{\s*-webkit-touch-callout: none/);
});

test("checkout não abre callout nas miniaturas; texto, botões e fotos de produtos continuam utilizáveis", () => {
  for (const name of ["boutique-cart-image", "boutique-added-photo", "boutique-complement-media"]) {
    assert.match(checkout, new RegExp("#carrinho \\." + name + " img"));
    assert.match(page, new RegExp('className="' + name + '"[^\\n]*onContextMenu=\\{\\(event\\) => event\\.preventDefault\\(\\)\\}'));
  }
  assert.match(checkout, /-webkit-touch-callout: none/);
  assert.match(checkout, /-webkit-user-drag: none/);
  assert.match(checkout, /pointer-events: none/);
  assert.ok(page.includes("editItem(item)"));
  assert.ok(page.includes("startAnother("));
  assert.ok(page.includes('className="boutique-flavor-stage-media"'));
  assert.doesNotMatch(checkout, /#carrinho\s*\{\s*pointer-events: none/);
});
