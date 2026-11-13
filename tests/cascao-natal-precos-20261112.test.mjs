import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CONES as FRONT_CONES, CHOCOTONES as FRONT_NATAL } from "../app/catalog.ts";
import { CONES as SERVER_CONES, CHOCOTONES as SERVER_NATAL, quoteCartItems } from "../supabase/functions/_shared/commerce-catalog.mjs";


const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const novos = [
  ["cascao-trufado-kinder-bueno", "cascao_kinder_bueno", "Kinder Bueno"],
  ["cascao-trufado-ninho-morango", "cascao_ninho_morango", "Ninho com Morango"],
  ["cascao-trufado-ninho-nutella-chocotone", "cascao_ninho_nutella_chocotone", "Ninho Nutella e Chocottone"],
];
const anteriores = [
  ["cone-trufado-prestigio", 1800],
  ["cone-trufado-dois-amores", 1800],
  ["cone-trufado-ferrero-rocher", 2000],
];
const natal = [
  "chocotone-ninho-nutella",
  "chocotone-ferrero-rocher",
  "chocotone-casadinho",
  "chocotone-morango-brigadeiro-branco-chocolate",
];

test("Cascão Trufado: 6 sabores, 3 novos a R$20, fotos V4.7.4 e IDs exclusivos", () => {
  assert.equal(FRONT_CONES.length, 6);
  assert.equal(Object.keys(SERVER_CONES).length, 6);
  for (const [id, key, name] of novos) {
    const front = FRONT_CONES.find(p => p.id === id);
    assert.ok(front, id);
    assert.equal(front.name, name);
    assert.equal(front.category, "Cascão Trufado");
    assert.equal(front.kind, "cone");
    assert.equal(front.variants[0].price, 20);
    assert.equal(front.variants[0].label, "1 cascão");
    assert.equal(front.options.length, 0);
    const imageVersion = id === "cascao-trufado-ninho-morango" ? "v478" : id === "cascao-trufado-ninho-nutella-chocotone" ? "v479" : "v476";
    assert.match(front.image, new RegExp("^/images/" + id + "-20261113-" + imageVersion + "\\.webp$"));
    assert.match(front.cardImage, new RegExp("^/images/" + id + "-card-20261113-" + imageVersion + "\\.webp$"));
    assert.ok(read("app/menu-availability.ts").includes(`"${id}": "${key}"`));
    assert.equal(SERVER_CONES[id].itemKey, key);
    assert.equal(SERVER_CONES[id].priceCents, 2000);
    const quote = quoteCartItems([{ product_id: id, variant_id: "unidade", option_ids: [], quantity: 2 }]);
    assert.equal(quote.subtotalCents, 4000);
    assert.deepEqual(quote.availabilityKeys, ["category_cones", key].sort());
    assert.equal(quote.items[0].size_label, "1 cascão");
    assert.match(quote.items[0].name, /^Cascão Trufado — /);
    assert.throws(() => quoteCartItems([{ product_id: id, variant_id: "porcao", quantity: 1 }]), /Cascão Trufado válido/);
    assert.throws(() => quoteCartItems([{ product_id: id, variant_id: "unidade", option_ids: ["calda-ninho"], quantity: 1 }]), /Cascão Trufado válido/);
  }
  assert.equal(novos.length, 3);
});

test("Sabores anteriores usam preços atualizados pela Luciane e mantêm seus SKUs", () => {
  for (const [id, cents] of anteriores) {
    const front = FRONT_CONES.find(p => p.id === id);
    assert.equal(Math.round(front.variants[0].price * 100), cents);
    assert.equal(SERVER_CONES[id].priceCents, cents);
    const quote = quoteCartItems([{ product_id: id, variant_id: "unidade", quantity: 1 }]);
    assert.equal(quote.subtotalCents, cents);
  }
});

test("As quatro fatias de Chocottone são R$22 em frontend e servidor", () => {
  assert.equal(FRONT_NATAL.length, 4);
  for (const id of natal) {
    const front = FRONT_NATAL.find(p => p.id === id);
    assert.equal(front.variants[0].price, 22, id);
    assert.equal(SERVER_NATAL[id].priceCents, 2200, id);
    const quote = quoteCartItems([{ product_id: id, variant_id: "porcao", quantity: 2 }]);
    assert.equal(quote.subtotalCents, 4400, id);
    assert.equal(quote.items[0].item_type, "chocotone");
  }
  const mix = quoteCartItems([
    { product_id: "cascao-trufado-kinder-bueno", variant_id: "unidade", quantity: 1 },
    { product_id: "chocotone-casadinho", variant_id: "porcao", quantity: 1 },
  ]);
  assert.equal(mix.subtotalCents, 4200);
});

test("Admin, vitrine e banco reutilizam category_cones sem liberar novos sabores automaticamente", () => {
  const page = read("app/page.tsx");
  const admin = read("app/admin/page.tsx");
  const navigation = read("app/menu-navigation.ts");
  const migration = read("supabase/migrations/20261112074500_cascao_trufado_tres_sabores.sql");
  assert.match(page, /name="Cascão Trufado"/);
  assert.match(page, /Cascão Trufado/);
  assert.match(navigation, /name: "Cascão Trufado"/);
  assert.ok(admin.includes("<h2>Cascão Trufado</h2>"));
  assert.ok(page.includes("CONES.filter(cone => coneIsVisible(cone.id)).map"));
  assert.ok(read("app/cones-trufados-20261108.css").includes("last-child:nth-child(odd)"));
  assert.ok(migration.includes("UPDATE public.menu_availability"));
  assert.ok(!migration.includes("SET status"));
  for (const [id, key] of novos) {
    assert.match(migration, new RegExp("'" + key + "'[\\s\\S]{0,110}'hidden'"));
    assert.ok(read("app/menu-availability.ts").includes("for (const cone of CONE_ITEMS) statuses[cone.itemKey] = \"hidden\""));
    assert.ok(read("app/menu-availability.ts").includes(`"${id}": "${key}"`));
  }
});
