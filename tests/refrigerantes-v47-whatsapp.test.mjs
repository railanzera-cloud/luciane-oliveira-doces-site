import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DRINKS as PRODUCT_DRINKS, STORE_CONFIG } from "../app/catalog.ts";
import { DRINKS as SERVER_DRINKS } from "../supabase/functions/_shared/drinks-catalog.mjs";
import { quoteCartItems } from "../supabase/functions/_shared/commerce-catalog.mjs";
// Disponibilidade TS usa aliases de bundler; a prova funcional é WebKit, mais contrato estático aqui.

const read=p=>readFileSync(p,"utf8");
const ids=["coca-cola-zero-220","fanta-laranja-220","guarana-antarctica-200","coca-cola-350"];
const prices=[400,400,300,600];

test("Somente quatro SKUs atuais; catálogo frontend espelha a Edge e preço",()=>{
 assert.equal(STORE_CONFIG.enabledExtras.drinks,true);
 assert.deepEqual(PRODUCT_DRINKS.map(p=>p.id),ids);
 assert.deepEqual(Object.keys(SERVER_DRINKS),ids);
 for(const [i,id] of ids.entries()){
   const p=PRODUCT_DRINKS[i],s=SERVER_DRINKS[id];
   assert.equal(p.kind,"drink");
   assert.equal(p.variants[0].id,s.variantId);
   assert.equal(p.variants[0].price*100,prices[i]);
   assert.equal(p.variants[0].whatsappLabel,s.label);
   assert.equal(p.image,s.image);
   assert.match(s.itemKey,/^drink_/);
   assert.match(read("app/menu-availability.ts"),/Object\.values\(DRINK_CATALOG\)/);
   assert.match(p.image,/^\/images\/refrigerante-/);
 }
 assert.ok(!PRODUCT_DRINKS.some(p=>p.id==="coca-cola-220"||p.id==="fanta-laranja-350"));
});

test("Cotação autoritativa suporta múltiplas bebidas e carrinho misto sem personalização",()=>{
 for(const [i,id] of ids.entries()){
   const server=SERVER_DRINKS[id];
   const quote=quoteCartItems([{product_id:id,variant_id:server.variantId,quantity:3,option_ids:[]}]);
   assert.equal(quote.subtotalCents,prices[i]*3);
   assert.deepEqual(quote.availabilityKeys,[server.itemKey]);
   assert.equal(quote.items[0].item_type,"drink");
   assert.throws(()=>quoteCartItems([{product_id:id,variant_id:"1l",quantity:1,option_ids:[]}]),/refrigerante e volume válidos/);
   assert.throws(()=>quoteCartItems([{product_id:id,variant_id:server.variantId,quantity:1,option_ids:["calda-ninho"]}]),/refrigerante e volume válidos/);
 }
 const combo=quoteCartItems([
   {product_id:"cascao-trufado-ninho-morango",variant_id:"unidade",quantity:1,option_ids:[]},
   {product_id:ids[0],variant_id:"220ml",quantity:2,option_ids:[]},
   {product_id:ids[2],variant_id:"200ml",quantity:1,option_ids:[]},
 ]);
 assert.equal(combo.subtotalCents,2000+800+300);
 assert.equal(combo.items.length,3);
});

test("Disponibilidade de bebidas é fail-closed; hidden nunca vai para compra",()=>{
 const menu=read("app/menu-availability.ts");
 assert.match(menu,/export function drinkStatus/);
 assert.match(menu,/snapshot.source === "supabase"/);
 assert.match(menu,/snapshot.statuses\[key\] \?\? "hidden"/);
 assert.match(menu,/for \(const drink of DRINKS\) statuses\[DRINK_ITEM_KEYS\[drink.id\]\] = "hidden"/);
 assert.match(menu,/\.\.\.DRINKS\.map\(drink =>/);
});

test("UX: bloco único recolhido depois dos doces, antes do recebimento; CTA mantém destino",()=>{
 const page=read("app/page.tsx"),component=read("components/drink-complements.tsx"),css=read("app/drink-complements-premium.css");
 const pos=page.indexOf('<DrinkComplements availability={availability}');
 assert.ok(pos>0);
 assert.ok(pos>page.indexOf('checkoutComplementItems.map((id) => {'));
 assert.ok(pos<page.indexOf('id="recebimento-opcoes"'));
 assert.equal((page.match(/<DrinkComplements availability/g)||[]).length,1);
 assert.match(component,/<details className="refreshment-later"/);
 assert.match(component,/<summary /);
 assert.match(component,/onChange\(drink,-1\)/);
 assert.match(component,/onChange\(drink,1\)/);
 assert.match(component,/quantity < 99/);
 assert.match(page,/bebidas: false, \/\/ O bloco de bebidas é separado/);
 assert.match(page,/sectionId === "recebimento" \? "recebimento-opcoes"/);
 const addDrinkBody=page.slice(page.indexOf("function changeDrink("),page.indexOf("function editItem("));
 assert.doesNotMatch(addDrinkBody,/(requestScroll|scrollToSection|window\.scrollTo|setAddedNotice|scrollIntoView)\(/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

test("WhatsApp: Cascão não repete 1 cascão; não eliminar quantidade, Pix ou sufixo de Tintim",()=>{
 const msg=read("app/order-checkout.ts"),tintim=read("lib/tintim.ts");
 assert.match(msg,/const showSize = item.kind !== "slice" && item.kind !== "chocotone" && item.kind !== "cone"/);
 assert.match(msg,/item.kind === "slice" \|\| item.kind === "cone" \|\| item.kind === "chocotone"/);
 assert.match(msg,/\$\{item.quantity\}x \$\{item.name\}/);
 assert.match(msg,/cleanWhatsAppText\(lines.join/);
 assert.match(msg,/PRÓXIMO PASSO — PAGAMENTO VIA PIX/);
 assert.match(tintim,/tintim/i);
});
