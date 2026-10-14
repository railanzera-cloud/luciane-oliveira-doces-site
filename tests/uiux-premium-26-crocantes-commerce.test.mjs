import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const file=(name)=>readFileSync(new URL("../"+name,import.meta.url),"utf8");
const page=file("app/page.tsx"), catalog=file("app/catalog.ts"), back=file("supabase/functions/_shared/commerce-catalog.mjs"), rel=file("app/limited-cup-release.ts"), menu=file("app/menu-availability.ts"), edge=file("supabase/functions/create-whatsapp-order/index.ts"), sql=file("supabase/migrations/20261014190000_crocantes_lancamento.sql");
test("dois copos independentes, mesmo preço, sem misturar sabores",()=>{
for(const id of ["crocante-ninho","crocante-chocolate"]){assert.ok(catalog.includes('id: "'+id+'"'));assert.ok(back.includes('"'+id+'": Object.freeze'));}
assert.ok(catalog.includes("price: 15.9"));assert.ok(back.includes("priceCents: 1590"));assert.ok(catalog.includes("400 ml · 190 g"));assert.ok(back.includes('optionIds.length !== 0'));assert.ok(back.includes('item_type: "popcorn"'));
});
test("liberação 15/10 às 12h de Paragominas é verificada no backend",()=>{
assert.ok(rel.includes("2026-10-15T12:00:00-03:00"));assert.ok(back.includes("2026-10-15T12:00:00-03:00"));assert.ok(back.includes("if (now < CROCANTES_OPEN_AT_MS) throw"));assert.ok(edge.includes("quoteCartItems(input.items)"));
});
test("estoque remoto exclusivo e preço calculado no backend",()=>{
for(const key of ["crocante_copo_ninho","crocante_copo_chocolate"]){assert.ok(menu.includes(key));assert.ok(sql.includes(key));assert.ok(back.includes(key));}
assert.ok(menu.includes('statuses[key] = "sold_out"'));assert.ok(back.includes("availabilityKeys.add(cup.itemKey)"));assert.ok(sql.includes("on conflict (item_key) do nothing"));
});
test("carrinho existente, quantidade e somente WhatsApp com copos",()=>{
assert.ok(page.includes("async function addCrocantesCup()"));assert.ok(page.includes('setCart((current) => [...current'));assert.ok(page.includes('setCheckoutChannel("whatsapp")'));assert.ok(page.includes("cartContainsCrocantes"));assert.ok(page.includes("!cartContainsCrocantes && ("));assert.ok(page.includes("onClick={() => void addCrocantesCup()}"));assert.ok(page.includes('onClick={() => requestScroll("carrinho")}'));assert.ok(page.includes("createWhatsAppOrder({"));assert.ok(page.includes("tintimWhatsAppUrl(buildRegisteredOrderMessage"));
});
