import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { quoteCartItems } from "../supabase/functions/_shared/commerce-catalog.mjs";
const page=readFileSync("app/page.tsx","utf8"),backend=readFileSync("supabase/functions/_shared/commerce-catalog.mjs","utf8"),menu=readFileSync("app/menu-availability.ts","utf8");
const item=(product_id,variant_id)=>({product_id,variant_id,option_ids:[],quantity:1});
test("preço é da variante e não do frontend",()=>{
  const q=quoteCartItems([item("trufada-pacoca","p"),item("trufada-pacoca","g"),item("crocante-ninho","m")]);
  assert.deepEqual(q.items.map(x=>x.unit_price_cents),[1490,1890,1890]);
  assert.deepEqual(q.items.map(x=>x.size_label),["Pacote P","Pacote G","Pacote M"]);
  assert.equal(q.subtotalCents,5270);
});
test("backend e estoque respeitam a mesma chave do SKU",()=>{
  assert.match(backend,/getTrufadaVariant\(productId, variantId\)/);
  assert.match(backend,/availabilityKeys\.add\(variant\.itemKey\)/);
  assert.match(menu,/TRUFADA_STOCK_ITEM_KEYS\.every/);
  assert.match(menu,/stockChecked = Boolean\(valid\)/);
  assert.match(page,/stockRemaining\[exactKey\]/);
});
test("trufadas seguem canal WhatsApp sem perder tracking",()=>{
  assert.match(page,/cartContainsCrocantes/);
  assert.match(page,/setCheckoutChannel\("whatsapp"\)/);
  assert.match(page,/createWhatsAppOrder\(/);
  assert.match(page,/tintimWhatsAppUrl\(buildRegisteredOrderMessage/);
});
