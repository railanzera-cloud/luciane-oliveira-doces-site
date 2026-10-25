import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const page=readFileSync("app/page.tsx","utf8");
const checkout=readFileSync("app/order-checkout.ts","utf8");
const catalog=readFileSync("app/catalog.ts","utf8");
test("Mensagem do novo lote é convidativa, mas não promete estoque pronto",()=>{
  assert.match(page,/Chocolate com Morango: garanta sua fatia para hoje/);
  assert.match(page,/Última fornada de hoje/);
  assert.match(page,/preparando mais 3 bolos/);
  assert.match(page,/Entrega ou retirada <b>ainda hoje<\/b>/);
  assert.match(page,/Produção limitada para hoje · R\$ 22 por fatia/);
  assert.match(page,/Finalizar pré-reserva no WhatsApp/);
  assert.match(page,/Finalizar pedido no WhatsApp/);
});
test("WhatsApp identifica pré-reserva registrada, sem confundir com pagamento",()=>{
  assert.match(checkout,/PRÉ-RESERVA PARA HOJE — CHOCOLATE COM MORANGO/);
  assert.match(checkout,/última fornada de hoje/);
  assert.match(checkout,/Entrega ou retirada ainda hoje/);
  assert.match(checkout,/Pedido ainda não marcado como pago/);
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
