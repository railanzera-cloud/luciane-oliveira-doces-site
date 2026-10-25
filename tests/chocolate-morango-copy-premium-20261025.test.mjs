import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const page=readFileSync("app/page.tsx","utf8");
const checkout=readFileSync("app/order-checkout.ts","utf8");
const catalog=readFileSync("app/catalog.ts","utf8");
test("Mensagem do novo lote é convidativa, mas não promete estoque pronto",()=>{
  assert.match(page,/Chocolate com Morango: reserve sua fatia/);
  assert.match(page,/A fornada pronta esgotou/);
  assert.match(page,/próxima produção está prevista por volta das/);
  assert.match(page,/fatias para pré-reserva/);
  assert.match(page,/Finalizar pré-reserva no WhatsApp/);
  assert.match(page,/Finalizar pedido no WhatsApp/);
});
test("WhatsApp identifica pré-reserva registrada, sem confundir com pagamento",()=>{
  assert.match(checkout,/PRÉ-RESERVA REGISTRADA — CHOCOLATE COM MORANGO/);
  assert.match(checkout,/Próxima fornada prevista:/);
  assert.match(checkout,/Esta reserva ainda não comprova pagamento/);
  assert.match(checkout,/item.product_id === "fatia-chocolate-morango"/);
  assert.match(checkout,/timeZone:"America\/Belem"/);
  assert.match(checkout,/buildRegisteredOrderMessage/);
});
test("Escopo é apenas de comunicação, com preço e ações preservados",()=>{
  assert.match(catalog,/id: "fatia-chocolate-morango"/);
  assert.match(catalog,/price: 22/);
  assert.match(page,/trackMetaEvent\("AddToCart"/);
  assert.match(page,/void finishOnWhatsApp/);
});
