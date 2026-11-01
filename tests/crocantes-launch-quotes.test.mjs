import assert from "node:assert/strict";
import test from "node:test";
import { quoteCartItems } from "../supabase/functions/_shared/commerce-catalog.mjs";
const p=(product_id,variant_id,quantity=1)=>({product_id,variant_id,quantity,option_ids:[]});
test("PMG: preço servidor preserva os três sabores e tamanhos ao longo do tempo",()=>{
  const expected=[
    ["crocante-ninho","p",1590],["crocante-ninho","m",1890],["crocante-ninho","g",2090],
    ["trufada-pacoca","p",1490],["trufada-pacoca","m",1690],["trufada-pacoca","g",1890],
    ["trufada-coco-queimado","p",1490],["trufada-coco-queimado","m",1690],["trufada-coco-queimado","g",1890],
  ];
  for(const when of ["2026-10-15T13:00:00-03:00","2026-11-01T12:30:00-03:00"]){
    const q=quoteCartItems(expected.map(([id,size])=>p(id,size)),Date.parse(when));
    assert.equal(q.subtotalCents,expected.reduce((sum,i)=>sum+i[2],0));
    assert.deepEqual(q.items.map(i=>i.unit_price_cents),expected.map(i=>i[2]));
    assert.equal(new Set(q.items.map(i=>i.item_key)).size,9);
  }
});
test("PMG: um pedido de dois pacotes compromete apenas o SKU exato",()=>{
  const q=quoteCartItems([p("trufada-pacoca","p",2),p("trufada-pacoca","g")]);
  assert.deepEqual(q.availabilityKeys,["category_pipocas","trufada_pacoca_g","trufada_pacoca_p"]);
  assert.equal(q.subtotalCents,4470);
  assert.deepEqual(q.items.map(i=>i.size_label),["Pacote P","Pacote G"]);
});
test("Legado: não reabre 400ml nem Chocolate para nova venda",()=>{
  for(const bad of [p("crocante-ninho","400ml"),p("crocante-chocolate","400ml"),p("trufada-pacoca","400ml"),
    {...p("trufada-pacoca","p"),quantity:100},{...p("trufada-pacoca","p"),option_ids:["chocolate"]}])
    assert.throws(()=>quoteCartItems([bad]));
});
test("Fatia antiga permanece compatível no pedido misto",()=>{
  const q=quoteCartItems([p("crocante-ninho","p"),{...p("fatia-chocolate-morango","fatia"),option_ids:["sem-calda"]}]);
  assert.equal(q.subtotalCents,3790);
  assert.ok(q.availabilityKeys.includes("category_fatias"));
});
