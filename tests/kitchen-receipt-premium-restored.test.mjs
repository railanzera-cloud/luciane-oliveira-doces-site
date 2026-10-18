import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../lib/qz-print-client.ts",import.meta.url),"utf8");
const tree = ts.createSourceFile("qz-print-client.ts",source,ts.ScriptTarget.ES2022,true,ts.ScriptKind.TS);
const functions = new Map();
for (const node of tree.statements) {
  if (ts.isFunctionDeclaration(node) && node.name) functions.set(node.name.text,node.getText(tree));
}
const needed = ["plain","wrap","money","paymentLine","receipt"];
for (const name of needed) assert.ok(functions.has(name),`Required renderer function ${name}`);
const compiled = ts.transpileModule(
  [...needed.map(name=>functions.get(name)), "export { receipt, wrap, paymentLine }"].join("\n"),
  {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}},
).outputText;
const {receipt,wrap,paymentLine} = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);

const sample = (changes={})=>({
 job:{kind:"initial",id:"test",claim_token:"test"},
 order:{
    order_number:1279,
    created_at:"2026-10-17T14:17:00Z",
    fulfillment_type:"delivery",
    payment_method:"mercado_pago_pix",
    payment_status:"paid",
    customer_name:"Luane Oliveira",
    customer_phone:null,
    street:"Avenida deputado Fausto Fernandes",
    street_number:"40",
    neighborhood:"Bairro tropical",
    complement:"Condominio Quartzo",
    reference:"Condominio fechado",
    notes:null,
    total:"66.00",
    cash_change_for:null,
    ...changes,
 },
 items:[{
   quantity:1,name:"Pipoca Gourmet",size_label:"1 litro",
   option_names:["Leitinho","Kinder Bueno","Nutella"],
 }],
});

test("restaura cabeçalho, número grande, data local e pagamento centralizado da etiqueta histórica",()=>{
  const raw=receipt(sample());
  assert.ok(raw.startsWith("\x1B@"));
  assert.ok(raw.includes("\x1B" + "a\x01"),"center");
  assert.ok(raw.includes("\x1D!\x11PEDIDO #1279\x1D!\x00"),"large order number");
  assert.ok(raw.includes("17/10/2026 11:17"),"Paragominas clock");
  assert.match(raw,/ENTREGA/);
  assert.match(raw,/PIX CONFIRMADO/);
  assert.ok(raw.includes("\x1B" + "E\x01"),"ESC/POS bold");
});
test("restaura nome grande, recheios, endereço rotulado e total sem inventar telefone",()=>{
  const raw=receipt(sample());
  const clean=raw.replace(/[\x00-\x1F]/g,"");
  assert.match(clean,/1x Pipoca Gourmet 1 litro/);
  for (const choice of ["+ Leitinho","+ Kinder Bueno","+ Nutella"]) assert.ok(clean.includes(choice),choice);
  assert.ok(raw.includes("CLIENTE"));
  assert.ok(raw.includes("\x1D!\x11Luane Oliveira\x1D!\x00"),"customer enlarged");
  assert.ok(raw.includes("Telefone: nao informado"));
  assert.doesNotMatch(raw,/Telefone: null/);
  for (const label of ["ENDERECO DE ENTREGA","Bairro: Bairro tropical","Complemento: Condominio Quartzo",
    "Referencia: Condominio fechado","TOTAL: R$ 66,00"]) assert.ok(raw.includes(label),label);
});
test("aceita e imprime comanda sem esperar pagamento, sem registrar Pix fictício",()=>{
  let x=sample({payment_status:"pending",payment_method:"manual_pix",order_status:"confirmed"});
  assert.equal(paymentLine(x),"PEDIDO CONFIRMADO");
  assert.match(receipt(x),/PEDIDO CONFIRMADO/);
  assert.doesNotMatch(receipt(x),/PIX CONFIRMADO|PIX PENDENTE/);
  x=sample({payment_status:"pending",payment_method:"card_on_delivery",fulfillment_type:"pickup"});
  assert.match(receipt(x),/PEDIDO CONFIRMADO/);
  assert.doesNotMatch(receipt(x),/ENDERECO DE ENTREGA/);
  x=sample({payment_status:"paid",payment_method:"manual_pix"});
  assert.match(receipt(x),/PIX CONFIRMADO/);
});
test("não corta palavras ou números longos; mantém observações, troco e reimpressão",()=>{
  const long="ComplementoSuperExtensoSemEspacosQueAntesSeriaCortado";
  const fragments=wrap(long).join("");
  assert.equal(fragments,long);
  const c=sample({notes:"Sem cobertura",payment_status:"pending",payment_method:"cash",cash_change_for:"100.00"});
  c.job.kind="reprint";
  const raw=receipt(c);
  assert.match(raw,/REIMPRESSAO/);
  assert.match(raw,/OBSERVACOES/);
  assert.match(raw,/Sem cobertura/);
  assert.match(raw,/TROCO PARA: R\$ 100,00/);
  assert.match(raw,/PEDIDO CONFIRMADO/);
});
test("altera apenas renderização da comanda; segurança QZ e cozinha preservados",async()=>{
  const panel=await readFile(new URL("../components/admin-orders-panel.tsx",import.meta.url),"utf8");
  const security=await readFile(new URL("../lib/qz-security.ts",import.meta.url),"utf8");
  assert.match(panel,/Modo Cozinha/);
  assert.match(panel,/Ligar automático/);
  assert.match(source,/installKitchenQzSecurity/);
  assert.match(source,/encoding: "ISO-8859-1"/);
  assert.match(source,/onProgress\?\.\("printers"\)/);
  assert.match(source,/claimPrintJob\(client, workerId\)/);
  assert.match(security,/setCertificatePromise\(\(resolve, reject\)/);
});
