import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { readFileSync } from "node:fs";

const src=(p)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const messageSource=src("app/order-checkout.ts");
const page=src("app/page.tsx");
const css=src("app/storefront-vitrine-editorial-experiment.css");
const code=ts.transpileModule(messageSource.replace(/^import\s[^\n]+\n/,""),{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}
}).outputText;
const exports={};
vm.runInNewContext(code,{exports,Intl,URL,crypto:globalThis.crypto});

const sample={
  customer_name:"Cliente de Teste",notes:"[TESTE DE HOMOLOGAÇÃO — NÃO PREPARAR / NÃO COBRAR]",
  items:[{product_id:"crocante-ninho",variant_id:"400ml",option_ids:[],
    name:"Pipocas Crocantes — Caramelo com Leite Ninho",
    size:"400 ml",kind:"popcorn",options:[],quantity:2,unit_price:15.90}],
  fulfillment:"retirada",neighborhood:"",street:"",number:"",complement:"",reference:"",
  payment:"pix",needs_change:false,cash_received_cents:null,
  subtotal:31.80,delivery_fee:0,total:31.80,currency:"BRL"
};
const secretPix={holder:"Titular",key:"PIX-SENTINELA-NAO-MOSTRAR",keyType:"CPF"};

test("homologação conserva itens/preço, mas nunca solicita Pix ou comprovante",()=>{
  const message=exports.buildRegisteredOrderMessage(sample,1232,"",secretPix,true);
  assert.match(message,/PEDIDO #1232/);
  assert.match(message,/2x Pipocas Crocantes/);
  assert.match(message,/R\$ 31,80/);
  assert.match(message,/TESTE DE HOMOLOGAÇÃO/);
  assert.match(message,/NÃO EFETUAR PAGAMENTO/);
  assert.doesNotMatch(message,/PIX-SENTINELA-NAO-MOSTRAR|Chave Pix|Titular:|Vou fazer o Pix|enviar o comprovante|Valor a pagar/);
});
test("mensagem de pedido real mantém Pix, chave e instruções como antes",()=>{
  const realOrder={...sample,notes:""};
  const message=exports.buildRegisteredOrderMessage(realOrder,1233,"",secretPix);
  assert.match(message,/PEDIDO #1233/);
  assert.match(message,/PRÓXIMO PASSO — PAGAMENTO VIA PIX/);
  assert.match(message,/PIX-SENTINELA-NAO-MOSTRAR/);
  assert.match(message,/Vou fazer o Pix e enviar o comprovante/);
  assert.doesNotMatch(message,/TESTE DE HOMOLOGAÇÃO|NÃO EFETUAR PAGAMENTO/);
});
test("e-commerce Crocantes conciso, sem bloquear por estreia",()=>{
  assert.match(page,/cupSalesEnabled \? \(/);
  assert.ok(page.includes('className="limited-cup-sale-compact"'));
  assert.ok(page.includes('className="limited-cup-stock-note"'));
  assert.ok(page.includes('!cupSalesEnabled && <div id="limited-cup-flavor-panel"'));
  assert.ok(page.includes('Caramelizadas com leite em pó.'));
  assert.ok(page.includes('LOJA FECHADA'));
  assert.ok(!page.includes('ESTREIA · QUINTA, 15/10, ÀS 12H'));
  assert.ok(page.includes('R$ 15,90 por pacote'));
  assert.ok(css.includes('.limited-cup-sale-compact'));
});
test("compras adicionais identificam outro copo e mantêm o fluxo original",()=>{
  assert.equal((page.match(/cartContainsCrocantes \? "Adicionar outro pacote" : "Adicionar pacote Trufado"/g)||[]).length,2);
  assert.ok(page.includes('className="crocantes-cross-sell"'));
  assert.ok(page.includes('onClick={startAnotherCrocantes}'));
  assert.ok(page.includes('PIX_DETAILS), attribution'));
  assert.ok(page.includes('Depois de finalizar no WhatsApp, faça o Pix'));
  assert.ok(!page.includes('Teste de homologação: não faça Pix nem envie comprovante'));
});
