import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { quoteCartItems } from "../supabase/functions/_shared/commerce-catalog.mjs";
const c=readFileSync("app/catalog.ts","utf8"),m=readFileSync("app/menu-availability.ts","utf8");
const s=readFileSync("supabase/functions/_shared/commerce-catalog.mjs","utf8");
const migrate=readFileSync("supabase/migrations/20261024153000_fatia_coco_cremoso_morango.sql","utf8");
const pname="Coco cremoso com geleia de morango na massa branca",pid="fatia-coco-cremoso-morango",key="slice_coco_cremoso_morango";
test("Fatia nova usa identificador estável, nome completo e R$ 20 nos dois catálogos",()=>{
  const section=c.slice(c.indexOf('id: "'+pid+'"'),c.indexOf('id: "fatia-chocolate-cenoura"'));
  assert.match(section,/kind: "slice"/);
  assert.ok(section.includes('name: "'+pname+'"'));
  assert.match(section,/price: 20/);
  assert.match(section,/options: SLICE_OPTIONS/);
  assert.ok(m.includes('"'+pid+'": "'+key+'"'));
  assert.ok(s.includes('"'+pid+'": Object.freeze('));
  assert.ok(s.includes('priceCents: 2000'));
});
test("Backend valida a nova fatia e calcula preço autoritativo sem pedido real",()=>{
 const quote=quoteCartItems([{product_id:pid,variant_id:"fatia",quantity:2,option_ids:["sem-calda"]}]);
 assert.equal(quote.subtotalCents,4000);
 assert.deepEqual(quote.availabilityKeys,["category_fatias",key]);
 assert.equal(quote.items[0].name,pname);
 assert.equal(quote.items[0].unit_price_cents,2000);
 assert.equal(quote.items[0].item_key,key);
 assert.throws(()=>quoteCartItems([{product_id:pid,variant_id:"400ml",quantity:1,option_ids:[]}]),/Escolha uma fatia válida/);
});
test("Registro de disponibilidade não altera produtos existentes",()=>{
 assert.ok(migrate.includes("'"+key+"'"));
 assert.match(migrate,/ON CONFLICT \(item_key\) DO NOTHING/);
 assert.doesNotMatch(migrate,/UPDATE\s+public\.menu_availability|DELETE FROM/);
});
