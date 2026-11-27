import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { quoteCartItems } from "../supabase/functions/_shared/commerce-catalog.mjs";
import { formatAdminOrderItem } from "../lib/admin-order-item-display.ts";
import { SLICES, sliceSauceOptions } from "../app/catalog.ts";
const id="fatia-oreo-ninho-chocolate",key="slice_oreo_ninho_chocolate",name="Oreo com Ninho e Chocolate";
const make=(product_id,quantity,option_ids)=>({product_id,variant_id:"fatia",quantity,option_ids});
test("Oreo: SKU próprio, R$22, foto exclusiva e caldas padrao; Massa Branca permanece R$20",()=>{
 const p=SLICES.find(x=>x.id===id);
 assert.equal(p.name,name);assert.equal(p.variants[0].price,22);assert.equal(p.image,"/fatia-oreo-ninho-chocolate-20261127.webp");
 assert.equal(SLICES.find(x=>x.id==="fatia-bombom-uva-massa-branca").variants[0].price,20);
 assert.deepEqual(sliceSauceOptions(id).map(x=>x.id),["calda-chocolate","calda-ninho","sem-calda"]);
});
test("Oreo: cotacao, quantidades e caldas preservam SKU e valores de pedidos",()=>{
 for(const sauce of ["calda-chocolate","calda-ninho","sem-calda"])for(const n of [1,2]){
  const q=quoteCartItems([make(id,n,[sauce])]);const item=q.items[0];
  assert.equal(q.subtotalCents,n*2200);assert.equal(item.name,name);assert.equal(item.item_key,key);assert.equal(item.unit_price_cents,2200);assert.equal(item.quantity,n);assert.deepEqual(item.option_ids,[sauce]);assert.deepEqual(q.availabilityKeys,["category_fatias",key]);
 }
 const mixed=quoteCartItems([make(id,2,["sem-calda"]),make("fatia-bombom-uva-massa-branca",1,["sem-calda"])]);assert.equal(mixed.subtotalCents,6400);
 assert.throws(()=>quoteCartItems([make(id,1,["calda-ninho","calda-chocolate"])]));
});
test("Oreo: admin liberavel com foto; fallback oculto e comanda usa snapshot",()=>{
 const menu=readFileSync("app/menu-availability.ts","utf8");
 assert.ok(menu.includes('"'+id+'": "'+key+'"'));assert.ok(menu.includes('statuses[SLICE_ITEM_KEYS["'+id+'"]] = "hidden"'));
 const q=quoteCartItems([make(id,2,["calda-ninho"])]), item=q.items[0];
 assert.deepEqual(formatAdminOrderItem({name:item.name,quantity:2,size_label:"1 fatia",option_names:item.option_names}),{title:"2x "+name,detail:"2 fatias · Com calda de Ninho"});
});
