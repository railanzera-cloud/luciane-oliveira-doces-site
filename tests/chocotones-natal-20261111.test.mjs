import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CHOCOTONES, CATEGORY_ITEM_KEYS, quoteCartItems } from "../supabase/functions/_shared/commerce-catalog.mjs";

const files = (p) => readFileSync(new URL("../"+p,import.meta.url),"utf8");
const offers = [
  ["chocotone-ninho-nutella", "chocotone_ninho_nutella", 1899],
  ["chocotone-ferrero-rocher", "chocotone_ferrero_rocher", 1899],
  ["chocotone-casadinho", "chocotone_casadinho", 1699],
  ["chocotone-morango-brigadeiro-branco-chocolate", "chocotone_morango_brigadeiro_branco_chocolate", 1899],
];

test("Natal tem quatro SKUs próprios, valores autoritativos e tipo distinto", () => {
  assert.equal(Object.keys(CHOCOTONES).length,4);
  assert.equal(CATEGORY_ITEM_KEYS.natal,"category_natal");
  for (const [id,key,cents] of offers) {
    assert.deepEqual([CHOCOTONES[id].itemKey,CHOCOTONES[id].priceCents],[key,cents]);
    const quote = quoteCartItems([{product_id:id,variant_id:"porcao",option_ids:[],quantity:2}],Date.UTC(2026,10,11));
    assert.equal(quote.items[0].item_type,"chocotone");
    assert.equal(quote.items[0].size_label,"1 fatia");
    assert.equal(quote.items[0].unit_price_cents,cents);
    assert.equal(quote.items[0].line_total_cents,2*cents);
    assert.deepEqual(quote.availabilityKeys,["category_natal",key].sort());
  }
});

test("Natal aceita pedidos mistos e rejeita variante/opções forjadas", () => {
  const quote=quoteCartItems([
    {product_id:"chocotone-casadinho",variant_id:"porcao",option_ids:[],quantity:1},
    {product_id:"cone-trufado-prestigio",variant_id:"unidade",option_ids:[],quantity:1}
  ]);
  assert.equal(quote.subtotalCents,1699+1400);
  assert.deepEqual(quote.items.map(x=>x.item_type),["chocotone","cone"]);
  assert.throws(()=>quoteCartItems([{product_id:"chocotone-casadinho",variant_id:"inteiro",quantity:1}]),/fatia individual de Chocottone/);
  assert.throws(()=>quoteCartItems([{product_id:"chocotone-casadinho",variant_id:"porcao",quantity:1,option_ids:["calda-chocolate"]}]),/fatia individual de Chocottone/);
  assert.throws(()=>quoteCartItems([{product_id:"chocotone-casadinho",variant_id:"porcao",quantity:100}]),/Quantidade inválida/);
});

test("front não deixa Natal disponível por fallback e permanece com refrigerantes desligados", () => {
  const cat=files("app/catalog.ts");
  const statuses=files("app/menu-availability.ts");
  assert.match(cat,/CHOCOTONES = PRODUCTS\.filter/);
  assert.match(cat,/drinks:\s*false/);
  assert.match(statuses,/\[CATEGORY_ITEM_KEYS\.natal\]: "hidden"/);
  assert.match(statuses,/for \(const chocotone of CHOCOTONE_ITEMS\) statuses\[chocotone\.itemKey\] = "hidden"/);
  assert.match(statuses,/CHOCOTONE_ITEM_KEYS/);
});

test("entrada sazonal preserva 4 categorias e controles de quantidades 0-99", () => {
  const home=files("app/page.tsx");
  const component=files("components/christmas-collection.tsx");
  const nav=files("app/menu-navigation.ts");
  assert.match(home,/className="natal-home-ribbon"/);
  assert.match(home,/className="collection-menu"/);
  assert.match(nav,/requested === "natal"/);
  assert.match(component,/CHOCOTONES\.filter/);
  assert.match(component,/count === 0 \?/);
  assert.match(component,/onAdjust\(product, -1\)/);
  assert.match(home,/function adjustChristmas\(product: Product, delta: -1 \| 1\)/);
  assert.match(home,/function continueChristmas\(\)/);
  assert.match(home,/scrollRequest\.id === "category-entry-natal"/);
  assert.match(home,/const natalPicking = activeCategory === "natal" && builderEngaged/);
  assert.match(home,/const stickyUsesCheckoutAction = !builderFlowActive && !cupBuilderFlowActive && !natalPicking/);
  assert.match(home,/requestScroll\("recebimento"\);/);
  assert.match(component,/id="natal-sabores"/);
  assert.match(component,/Continuar pedido/);
  assert.match(home,/CHOCOTONES\.some\(p => p\.id === item\.productId\)/);
  assert.match(home,/if \(product\.kind === "chocotone"\)/);
});

test("admin expõe os quatro sabores e permanece condicionado ao cadastro remoto", () => {
  const admin=files("app/admin/page.tsx");
  const c=files("app/menu-availability.ts");
  assert.match(admin,/availabilitySection === "natal"/);
  assert.match(admin,/natalItems\.map/);
  assert.match(admin,/Edição Especial de Natal/);
  assert.match(c,/\[CATEGORY_ITEM_KEYS\.natal\]/);
});

// A vitrine sazonal também deve ser descoberta após um pedido iniciado em outro anúncio.
test("Natal está presente nas recomendações contextuais e o CTA duplicado é suprimido", () => {
  const home=files("app/page.tsx");
  const css=files("app/colecao-natal-2026.css");
  assert.match(home,/addedNotice\?\.category === "natal" \? "natal"/);
  assert.match(home,/natal: natalCanBeAdded/);
  assert.match(home,/id === "natal" \? "Fatias de Chocottone"/);
  assert.match(home,/id === "natal"\) startAnother\("natal"\)/);
  assert.match(home,/className="boutique-complement-choice" data-natal=\{id === "natal" \|\| undefined\}/);
  assert.match(home,/natalPicking && natalInlineActionVisible/);
  assert.match(home,/setNatalInlineActionVisible\(Boolean\(entry\?\.isIntersecting\)\)/);
  assert.match(home,/document\.querySelector<HTMLElement>\("\.storefront \.natal-continue"\)/);
  assert.match(css,/natal-home-ribbon::before/);
  assert.match(css,/natal-home-ribbon::after/);
  assert.match(css,/boutique-complement-choice\[data-natal\]/);
});


test("Natal V4 identifica fatias recheadas sem modificar SKUs, preços ou quantidades", () => {
  const home = files("app/page.tsx");
  const collection = files("components/christmas-collection.tsx");
  const catalog = files("app/catalog.ts");
  const admin = files("app/admin/page.tsx");
  const css = files("app/colecao-natal-2026.css");
  const metadata = files("app/layout.tsx");
  assert.match(home,/Fatias de Chocottone/);
  assert.doesNotMatch(home,/Chocotones [Rr]echeados/);
  assert.match(collection,/Escolha suas fatias\./);
  assert.match(collection,/por fatia/);
  assert.match(collection,/fatia selecionada/);
  assert.match(collection,/natal-product-heading/);
  assert.match(css,/V4 — Fatias de Chocottone/);
  assert.match(css,/mobile-sticky-bar\.is-natal-step/);
  assert.match(metadata,/Fatias de Chocottone/);
  assert.match(admin,/Fatias de Chocottone/);
  assert.match(catalog,/label: "1 fatia", whatsappLabel: "1 fatia"/);
  for (const [id, key, cents] of offers) {
    const quote = quoteCartItems([{product_id:id,variant_id:"porcao",quantity:1}]);
    assert.equal(quote.items[0].item_type,"chocotone");
    assert.equal(quote.items[0].product_id,id);
    assert.equal(quote.items[0].item_key,key);
    assert.equal(quote.items[0].unit_price_cents,cents);
    assert.equal(quote.items[0].size_label,"1 fatia");
    assert.match(quote.items[0].name,/^Fatia de Chocottone — /);
  }
});
