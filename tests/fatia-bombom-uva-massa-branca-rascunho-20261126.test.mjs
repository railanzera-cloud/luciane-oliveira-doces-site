import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { quoteCartItems } from "../supabase/functions/_shared/commerce-catalog.mjs";
import { formatAdminOrderItem } from "../lib/admin-order-item-display.ts";
import { SLICES, sliceSauceOptions } from "../app/catalog.ts";
const menu = readFileSync("app/menu-availability.ts", "utf8");
const admin = readFileSync("app/admin/page.tsx", "utf8");
const edge = readFileSync("supabase/functions/create-whatsapp-order/index.ts", "utf8");
const kitchen = readFileSync("lib/kitchen-manual-receipt.ts", "utf8");
const id = "fatia-bombom-uva-massa-branca", key = "slice_bombom_uva_massa_branca", name = "Bombom de Uva na Massa Branca";
const make = (product_id, quantity, option_ids) => ({product_id, variant_id: "fatia", quantity, option_ids});
test("nova fatia é SKU completo distinto com preço confirmado e foto própria aprovada", () => {
  const original = SLICES.find(p=>p.id==="fatia-bombom-uva");
  const product = SLICES.find(p=>p.id===id);
  assert.ok(original && product);
  assert.equal(original.variants[0].price,22);
  assert.equal(original.image,"/fatia-bombom-uva.avif");
  assert.equal(product.name,name);
  assert.equal(product.variants[0].price,20);
  assert.equal(product.image,"/fatia-bombom-uva-massa-branca-20261126.webp");
  assert.ok(product.image !== original.image);
  assert.deepEqual(sliceSauceOptions(id).map(o=>o.id),["calda-chocolate","calda-ninho","sem-calda"]);
});
test("pedido de uma, duas e diferentes fatias tem SKU, preço, calda e total corretos", () => {
  for(const sauce of ["calda-chocolate","calda-ninho","sem-calda"]){
    for(const n of [1,2]){
      const quote = quoteCartItems([make(id,n,[sauce])]);
      assert.equal(quote.subtotalCents,n*2000);
      assert.equal(quote.items[0].name,name);
      assert.equal(quote.items[0].item_key,key);
      assert.equal(quote.items[0].unit_price_cents,2000);
      assert.equal(quote.items[0].quantity,n);
      assert.deepEqual(quote.items[0].option_ids,[sauce]);
      assert.deepEqual(quote.availabilityKeys,["category_fatias",key]);
    }
  }
  const mixed=quoteCartItems([make("fatia-bombom-uva",1,["sem-calda"]),make(id,2,["calda-ninho"])]);
  assert.equal(mixed.subtotalCents,6200);
  assert.equal(mixed.items.length,2);
  assert.notEqual(mixed.items[0].item_key,mixed.items[1].item_key);
  assert.throws(()=>quoteCartItems([make(id,1,["calda-ninho","calda-chocolate"])]));
});
test("foto aprovada permite liberação remota; fallback permanece oculto e fatias sem imagem continuam protegidas", () => {
  assert.ok(menu.includes('"'+id+'": "'+key+'"'));
  assert.ok(menu.includes('statuses[SLICE_ITEM_KEYS["fatia-bombom-uva-massa-branca"]] = "hidden"'));
  const guards = menu.match(/for \(const slice of SLICES\) if \(!slice\.image\) statuses\[SLICE_ITEM_KEYS\[slice\.id\]\] = "hidden"/g);
  assert.equal(guards?.length,2);
  assert.ok(menu.includes("isDraft: true, pendingPhoto: true"));
  assert.ok(SLICES.find(p=>p.id===id)?.image, "novo SKU não é rascunho sem foto");
  assert.ok(admin.includes("Em preparação · foto pendente"));
  assert.ok(admin.includes("Boolean(item.isDraft)"));
  assert.ok(edge.includes('statuses.get(key) !== "available"'));
  assert.ok(edge.includes("await revalidateAvailability(quote.availabilityKeys)"));
});
test("painel de pedidos exibe a nova fatia com quantidade e calda corretas, cozinha usa nome do snapshot", () => {
  const quote=quoteCartItems([make(id,2,["calda-ninho"])]);
  const item=quote.items[0];
  const display=formatAdminOrderItem({name:item.name,quantity:2,size_label:"1 fatia",option_names:item.option_names});
  assert.deepEqual(display,{title:"2x "+name,detail:"2 fatias · Com calda de Ninho"});
  assert.ok(kitchen.includes("${html(item.quantity)}x ${html(item.name)}"));
});
