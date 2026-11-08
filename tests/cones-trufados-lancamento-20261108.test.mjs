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

test("Catálogo permanente registra três cones sem alterar outras categorias", () => {
  assert.equal(CONES.length, 3);
  assert.equal(STORE_CONFIG.enabledCategories.cones,true);
  assert.deepEqual(CONES.map(p=>[p.id,p.kind,p.name,p.variants[0].id,p.variants[0].price]),[
    ["cone-trufado-prestigio","cone","Prestígio","unidade",14],
    ["cone-trufado-dois-amores","cone","Dois Amores","unidade",14],
    ["cone-trufado-ferrero-rocher","cone","Ferrero Rocher","unidade",16],
  ]);
  assert.ok(CONES.every(p=>p.options.length===0 && p.image?.startsWith("/images/cone-trufado-")));
});

test("Cotação autoritativa reconhece os cones e cobra o preço correto", () => {
  const cases=[
    ["cone-trufado-prestigio","cone_prestigio",1400],
    ["cone-trufado-dois-amores","cone_dois_amores",1400],
    ["cone-trufado-ferrero-rocher","cone_ferrero_rocher",1600],
  ];
  for(const [product_id,item_key,cents] of cases) {
    const quote=quoteCartItems([{product_id,variant_id:"unidade",quantity:2,option_ids:[]}]);
    assert.equal(quote.subtotalCents,cents*2);
    assert.deepEqual(quote.availabilityKeys,["category_cones",item_key]);
    assert.deepEqual(quote.items.map(x=>({
      item_type:x.item_type,category_key:x.category_key,item_key:x.item_key,unit_price_cents:x.unit_price_cents,
      size_label:x.size_label,option_ids:x.option_ids,
    })),[{item_type:"cone",category_key:"category_cones",item_key,unit_price_cents:cents,size_label:"1 cone",option_ids:[]}]);
    assert.throws(()=>quoteCartItems([{product_id,variant_id:"400ml",quantity:1,option_ids:[]}]),/Cone Trufado válido/);
    assert.throws(()=>quoteCartItems([{product_id,variant_id:"unidade",quantity:1,option_ids:["calda-ninho"]}]),/Cone Trufado válido/);
  }
  assert.equal(quoteCartItems([{product_id:"fatia-prestigio",variant_id:"fatia",quantity:1,option_ids:["calda-ninho"]}]).subtotalCents,2000);
});

test("Catálogo público, URL e disponibilidade não reutilizam chaves das pipocas",()=>{
  assert.match(navigation,/id: "cones", name: "Cones Trufados"/);
  assert.match(navigation,/category === "cones"/);
  assert.match(menu,/cones: "category_cones"/);
  for(const id of ["cone_prestigio","cone_dois_amores","cone_ferrero_rocher"])
    assert.ok(menu.includes(id));
  assert.match(menu,/\[CATEGORY_ITEM_KEYS\.cones\]: "hidden"/);
  assert.match(menu,/for \(const cone of CONE_ITEMS\) statuses\[cone\.itemKey\] = "hidden"/);
  assert.match(migration,/'category_cones','Cones Trufados','category'/);
  assert.match(migration,/'cone_prestigio','Prestígio','product','category_cones','hidden'/);
  assert.match(migration,/order_items_type_check CHECK \(item_type = ANY/);
  assert.match(migration,/ON CONFLICT \(item_key\) DO NOTHING/);
});

test("Vitrine, seleção, quantidade e carrinho usam fluxo de cones separado",()=>{
  assert.ok(page.includes('format="Novidade no cardápio" name="Cones Trufados"'));
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

test("Painel permite disponibilidade independente sem afetar controles anteriores",()=>{
  assert.ok(admin.includes('admin-availability-tab-cones'));
  assert.ok(admin.includes('admin-availability-panel-cones'));
  assert.ok(admin.includes('Cones Trufados'));
  assert.ok(admin.includes('cones.map(item =>'));
  assert.ok(admin.includes('changeItemStatus(item, status)'));
  assert.ok(!migration.includes('UPDATE public.menu_availability SET status'));
});
