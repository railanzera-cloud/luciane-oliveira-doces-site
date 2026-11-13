import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { quoteCartItems } from "../supabase/functions/_shared/commerce-catalog.mjs";
import { CONES, STORE_CONFIG } from "../app/catalog.ts";

const read = path => fs.readFileSync(path,"utf8");
const menu = read("app/menu-availability.ts");
const navigation = read("app/menu-navigation.ts");
const page = read("app/page.tsx");
const admin = read("app/admin/page.tsx");
const migration = read("supabase/migrations/20261108073000_cones_trufados_categoria_propria.sql");

test("Catálogo permanente preserva três sabores antigos e adiciona três cascões sem alterar outras categorias", () => {
  assert.equal(CONES.length, 6);
  assert.equal(STORE_CONFIG.enabledCategories.cones,true);
  assert.deepEqual(CONES.map(p=>[p.id,p.kind,p.name,p.variants[0].id,p.variants[0].price]),[
    ["cone-trufado-prestigio","cone","Prestígio","unidade",18],
    ["cone-trufado-dois-amores","cone","Dois Amores","unidade",18],
    ["cone-trufado-ferrero-rocher","cone","Ferrero Rocher","unidade",20],
    ["cascao-trufado-kinder-bueno","cone","Kinder Bueno","unidade",20],
    ["cascao-trufado-ninho-morango","cone","Ninho com Morango","unidade",20],
    ["cascao-trufado-ninho-nutella-chocotone","cone","Ninho Nutella e Chocotone","unidade",20],
  ]);
  assert.ok(CONES.every(p=>p.options.length===0 && p.image?.startsWith("/images/")));
});

test("Cotação autoritativa reconhece os cones e cobra o preço correto", () => {
  const cases=[
    ["cone-trufado-prestigio","cone_prestigio",1800],
    ["cone-trufado-dois-amores","cone_dois_amores",1800],
    ["cone-trufado-ferrero-rocher","cone_ferrero_rocher",2000],
    ["cascao-trufado-kinder-bueno","cascao_kinder_bueno",2000],
    ["cascao-trufado-ninho-morango","cascao_ninho_morango",2000],
    ["cascao-trufado-ninho-nutella-chocotone","cascao_ninho_nutella_chocotone",2000],
  ];
  for(const [product_id,item_key,cents] of cases) {
    const quote=quoteCartItems([{product_id,variant_id:"unidade",quantity:2,option_ids:[]}]);
    assert.equal(quote.subtotalCents,cents*2);
    assert.deepEqual(quote.availabilityKeys,["category_cones",item_key].sort());
    assert.deepEqual(quote.items.map(x=>({
      item_type:x.item_type,category_key:x.category_key,item_key:x.item_key,unit_price_cents:x.unit_price_cents,
      size_label:x.size_label,option_ids:x.option_ids,
    })),[{item_type:"cone",category_key:"category_cones",item_key,unit_price_cents:cents,size_label:"1 cascão",option_ids:[]}]);
    assert.throws(()=>quoteCartItems([{product_id,variant_id:"400ml",quantity:1,option_ids:[]}]),/Cascão Trufado válido/);
    assert.throws(()=>quoteCartItems([{product_id,variant_id:"unidade",quantity:1,option_ids:["calda-ninho"]}]),/Cascão Trufado válido/);
  }
  assert.equal(quoteCartItems([{product_id:"fatia-prestigio",variant_id:"fatia",quantity:1,option_ids:["calda-ninho"]}]).subtotalCents,2000);
});

test("Catálogo público, URL e disponibilidade não reutilizam chaves das pipocas",()=>{
  assert.match(navigation,/id: "cones", name: "Cascão Trufado"/);
  assert.match(navigation,/category === "cones"/);
  assert.match(menu,/cones: "category_cones"/);
  for(const id of ["cone_prestigio","cone_dois_amores","cone_ferrero_rocher","cascao_kinder_bueno","cascao_ninho_morango","cascao_ninho_nutella_chocotone"])
    assert.ok(menu.includes(id));
  assert.match(menu,/\[CATEGORY_ITEM_KEYS\.cones\]: "hidden"/);
  assert.match(menu,/for \(const cone of CONE_ITEMS\) statuses\[cone\.itemKey\] = "hidden"/);
  assert.match(migration,/'category_cones','Cones Trufados','category'/);
  assert.match(migration,/'cone_prestigio','Prestígio','product','category_cones','hidden'/);
  assert.match(migration,/order_items_type_check CHECK \(item_type = ANY/);
  assert.match(migration,/ON CONFLICT \(item_key\) DO NOTHING/);
});

test("Vitrine, seleção, quantidade e carrinho usam fluxo de cones separado",()=>{
  assert.ok(page.includes('format="Novidade no cardápio" name="Cascão Trufado"'));
  assert.ok(page.includes('activeCategory === "cones" && conesVisible'));
  assert.ok(page.includes('id="cones-sabores"'));
  assert.ok(page.includes('id="cones-quantidade"'));
  assert.ok(page.includes('function addOrUpdateCone()'));
  assert.ok(page.includes('cartRequiresWhatsApp'));
  assert.ok(page.includes('product.kind === "cone" ? "cones"'));
  assert.ok(page.includes('CONE_ITEM_KEYS[product.id]'));
  assert.ok(page.includes('setAddedNotice({\n        category: "cones"'));
  assert.ok(page.includes('requestScroll(wasEditing ? "carrinho" : "recebimento")'));
  assert.match(page,/onClick=\{addOrUpdateCone\}/);
  assert.ok(page.includes('categoryUrl(window.location.href, category)'));
  assert.ok(!page.includes('coneProductId === "fatia-prestigio"'));
});


test("UX: quatro categorias têm cartões visíveis e Trufadas não ficam no fim", () => {
  const start = page.indexOf('<div className="collection-menu" role="group" aria-label="Escolha uma categoria">');
  const menuBody = page.slice(start, page.indexOf('</div>',start));
  const cone = menuBody.indexOf('name="Cascão Trufado"');
  const trufadas = menuBody.indexOf('name="Pipocas Trufadas"');
  const remainder = menuBody.indexOf('visibleCategories.filter(category => category.id !== "cones")');
  assert.ok(start >= 0 && cone > 0 && trufadas > cone && remainder > trufadas);
  assert.ok(page.includes('data-launch={format === "Novidade no cardápio"'));
  assert.ok(page.includes('data-packs-card={format === "Pacotes com zíper"'));
  const css = read("app/cones-trufados-20261108.css");
  assert.ok(css.includes('grid-template-columns: repeat(2, minmax(0, 1fr))'));
  assert.ok(css.includes('.collection-choice[data-launch]'));
  assert.ok(css.includes('.collection-choice[data-packs-card]'));
  assert.ok(!css.includes('.cone-cross-sell'));
});

test("UX: segundo cone usa o mesmo cartão de complementos, sem botão ilegível avulso", () => {
  const complements = read("lib/checkout-complement-order.mjs");
  assert.ok(complements.includes('cones: ["cones", "trufadas", "fatias", "gourmet"]'));
  assert.ok(page.includes('addedNotice?.category === "cones" ? "cones"'));
  assert.ok(page.includes('cones: conesCanBeAdded'));
  assert.ok(page.includes('id === "cones" ? (addedNotice?.category === "cones" ? "Escolher outro cascão" : "Adicionar cascão trufado")'));
  assert.ok(page.includes('id === "cones" ? (addedNotice?.category === "cones" ? "Adicionar mais um sabor" : "Conhecer sabores")'));
  assert.ok(page.includes('id === "cones" ? (coneIsVisible("cascao-trufado-kinder-bueno") ? "/images/cascao-trufado-kinder-bueno-card-20261113-v476.webp" : "/images/cones-trufados-trio-card-20261108.webp")'));
  assert.ok(page.includes('if (id === "cones") startAnother("cones")'));
  assert.ok(page.includes('className="boutique-complement-choice"'));
  assert.ok(!page.includes('className="cone-cross-sell"'));
  assert.ok(page.includes('Quer completar seu pedido?'));
});

test("Painel permite disponibilidade independente sem afetar controles anteriores",()=>{
  assert.ok(admin.includes('admin-availability-tab-cones'));
  assert.ok(admin.includes('admin-availability-panel-cones'));
  assert.ok(admin.includes('Cascão Trufado'));
  assert.ok(admin.includes('cones.map(item =>'));
  assert.ok(admin.includes('changeItemStatus(item, status)'));
  assert.ok(!migration.includes('UPDATE public.menu_availability SET status'));
});
