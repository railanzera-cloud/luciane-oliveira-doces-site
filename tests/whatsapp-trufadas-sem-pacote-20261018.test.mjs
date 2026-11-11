import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../app/order-checkout.ts", import.meta.url), "utf8");
const ast = ts.createSourceFile("order-checkout.ts", source, ts.ScriptTarget.ES2022, true);
const funcs = new Map();
for (const statement of ast.statements) {
  if (ts.isFunctionDeclaration(statement) && statement.name)
    funcs.set(statement.name.text, statement.getText(ast));
}
const names = ["cleanWhatsAppText","cleanWhatsAppField","formatOrderMoney",
  "paymentDescription","buildRegisteredOrderMessage"];
for (const name of names) assert.ok(funcs.has(name), `Função ausente: ${name}`);
const code = [
  'const money = new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});',
  ...names.map(name => funcs.get(name)),
  "export { buildRegisteredOrderMessage };",
].join("\n");
const js = ts.transpileModule(code, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
}}).outputText;
const { buildRegisteredOrderMessage } = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
);

const item = (product_id,name,size,kind="popcorn") => ({
  product_id, variant_id:"400ml", option_ids:[], name, size, kind,
  quantity:1, unit_price:15.90, options:[],
});
const order = items => ({
  customer_name:"Luiza Galvão", notes:"",
  items,
  fulfillment:"entrega", neighborhood:"Tropical", street:"Avenida Deputado Fausto Fernandes",
  number:"40", complement:"Condomínio Quartzo", reference:"Quarto condomínio",
  payment:"credito", card_fee:2.58, card_basis_points:305, needs_change:false,
  cash_received_cents:null, subtotal:73.80, delivery_fee:8, total:84.38, currency:"BRL",
});

test("mensagem de pedido registrado omite Pacote nos dois sabores de Trufadas", () => {
  const txt = buildRegisteredOrderMessage(order([
    item("crocante-chocolate","Pipocas Trufadas — Caramelo e Chocolate","Pacote"),
    item("crocante-ninho","Pipocas Trufadas — Caramelo e Ninho","Pacote"),
  ]),1317,"",{holder:"",key:"",keyType:""},false);
  assert.match(txt,/1x Pipocas Trufadas — Caramelo e Chocolate\n/);
  assert.match(txt,/1x Pipocas Trufadas — Caramelo e Ninho\n/);
  assert.doesNotMatch(txt,/Chocolate Pacote|Ninho Pacote/);
  assert.match(txt,/\*PEDIDO #1317\*/);
  assert.match(txt,/Entrega • Crédito à vista/);
  assert.match(txt,/Acréscimo \(3,05%\):/);
  assert.match(txt,/Condomínio Quartzo/);
});
test("demais produtos e outros tamanhos não perdem a descrição original", () => {
  const txt = buildRegisteredOrderMessage(order([
    item("pipoca-gourmet","Pipoca Gourmet","1 litro"),
    item("qualquer-produto","Produto avulso","Pacote"),
    item("crocante-ninho","Pipocas Trufadas — Caramelo e Ninho","750 ml"),
  ]),1318,"",{holder:"",key:"",keyType:""},false);
  assert.match(txt,/Pipoca Gourmet 1 litro/);
  assert.match(txt,/Produto avulso Pacote/);
  assert.match(txt,/Pipocas Trufadas — Caramelo e Ninho 750 ml/);
});
test("tamanhos novos aparecem no WhatsApp sem ocultar P M ou G",()=>{
  const txt=buildRegisteredOrderMessage(order([
    item("trufada-pacoca","Pipocas Trufadas — Paçoca","Pacote P"),
    item("crocante-ninho","Pipocas Trufadas — Ninho","Pacote G"),
  ]),1320,"",{holder:"",key:"",keyType:""},false);
  assert.match(txt,/Pipocas Trufadas — Paçoca Pacote P/);
  assert.match(txt,/Pipocas Trufadas — Ninho Pacote G/);
});
test("legado continua sem sufixo Pacote e novos IDs ficam preservados",async()=>{
  const catalog=await readFile(new URL("../app/catalog.ts",import.meta.url),"utf8");
  const backend=await readFile(new URL("../supabase/functions/_shared/commerce-catalog.mjs",import.meta.url),"utf8");
  assert.match(catalog,/id: "crocante-ninho"/);
  assert.match(catalog,/id: "crocante-chocolate"/);
  assert.match(catalog,/id: "trufada-pacoca"/);
  assert.match(backend,/getTrufadaVariant/);
  assert.match(source,/isTrufada && item.size.trim\(\).toLowerCase\(\) === "pacote"/);
});


test("Natal V4.1: WhatsApp informa todos os sabores sem repetir a unidade '1 fatia'", () => {
  const christmas = (product_id, name, price) => ({
    ...item(product_id, `Fatia de Chocottone — ${name}`, "1 fatia", "chocotone"),
    variant_id: "porcao", unit_price: price,
  });
  const selected = [
    christmas("chocotone-casadinho","Casadinho",16.99),
    christmas("chocotone-ferrero-rocher","Ferrero Rocher",18.99),
    christmas("chocotone-ninho-nutella","Ninho com Nutella",18.99),
    christmas("chocotone-morango-brigadeiro-branco-chocolate","Morango com Brigadeiro Branco e Chocolate",18.99),
  ];
  const checkout = {
    ...order(selected), payment:"pix",
    subtotal:73.96, delivery_fee:8, total:81.96,
    card_fee:0, card_basis_points:0,
  };
  const message = buildRegisteredOrderMessage(checkout,1743,"",{
    holder:"Exemplo de teste", key:"chave-de-teste", keyType:"chave",
  },false);
  for (const selectedItem of selected) {
    assert.ok(message.includes(`1x ${selectedItem.name}\n`),
      "Sabor deve permanecer identificado sem sufixo: " + selectedItem.name);
  }
  assert.doesNotMatch(message,/Fatia de Chocottone[^\n]* 1 fatia/);
  assert.match(message,/Produtos: R\$ 73,96/);
  assert.match(message,/Entrega: R\$ 8,00/);
  assert.match(message,/Total: R\$ 81,96/);
  assert.match(message,/PRÓXIMO PASSO — PAGAMENTO VIA PIX/);
  assert.match(message,/\*PEDIDO #1743\*/);
});

test("Natal V4.1: várias fatias do mesmo sabor preservam o multiplicador e os outros tamanhos", () => {
  const selected = [
    {...item("chocotone-casadinho","Fatia de Chocottone — Casadinho","1 fatia","chocotone"), variant_id:"porcao",quantity:3},
    item("pipoca-gourmet","Pipoca Gourmet","750 ml","popcorn"),
  ];
  const message = buildRegisteredOrderMessage(order(selected),1744,"",{holder:"",key:"",keyType:""},false);
  assert.match(message,/3x Fatia de Chocottone — Casadinho\n/);
  assert.doesNotMatch(message,/Casadinho 1 fatia/);
  assert.match(message,/1x Pipoca Gourmet 750 ml\n/);
});
