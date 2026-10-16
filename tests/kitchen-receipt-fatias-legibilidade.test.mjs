import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../lib/qz-print-client.ts", import.meta.url), "utf8");
const ast = ts.createSourceFile("qz-print-client.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const names = new Set(["plain", "wrap", "money", "paymentLine", "receipt"]);
const functions = ast.statements
  .filter((node) => ts.isFunctionDeclaration(node) && node.name && names.has(node.name.text))
  .map((node) => node.getText(ast));
assert.equal(functions.length, names.size, "Todas as funções reais do recibo devem estar presentes");
const compiled = ts.transpileModule(functions.join("\n\n"), {
  compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2022 },
}).outputText;
const receipt = new Function(compiled + "\nreturn receipt;")();

function fixture(items, overrides = {}) {
  return {
    job: { kind: "initial" },
    order: {
      order_number: 1275,
      created_at: "2026-10-16T19:40:13.722Z",
      fulfillment_type: "delivery",
      payment_method: "manual_pix",
      payment_status: "paid",
      customer_name: "Cliente Exemplo",
      customer_phone: null,
      street: "Rua Exemplo",
      street_number: "57",
      neighborhood: "Centro",
      complement: "Casa",
      reference: "Perto da torre",
      total: 30,
      ...overrides,
    },
    items,
  };
}

test("fatia única: 1x significa quantidade, não repetir '1 fatia' como segundo item", () => {
  const print = receipt(fixture([{
    quantity: 1,
    name: "Chocolate com Morango",
    size_label: "1 fatia",
    option_names: ["Com calda de chocolate"],
  }]));
  assert.match(print, /1x FATIA - Chocolate com Morango/);
  assert.match(print, /> Com calda de chocolate/);
  assert.doesNotMatch(print, /Chocolate com Morango 1 fatia/);
  assert.doesNotMatch(print, /2x FATIA/);
  assert.match(print, /PIX CONFIRMADO/);
  assert.match(print, /TOTAL: R\$ 30,00/);
});

test("duas fatias com e sem calda continuam duas unidades, sem rótulos duplicados", () => {
  const print = receipt(fixture([
    { quantity: 2, name: "Chocolate com Morango", size_label: "1 fatia", option_names: ["Com calda de chocolate"] },
    { quantity: 1, name: "Chocolatudo", size_label: "1 fatia", option_names: ["Sem calda, por favor"] },
  ]));
  assert.match(print, /2x FATIA - Chocolate com Morango/);
  assert.match(print, /1x FATIA - Chocolatudo/);
  assert.match(print, /> Com calda de chocolate/);
  assert.match(print, /> Sem calda, por favor/);
  assert.doesNotMatch(print, /1 fatia/);
});

test("Pipocas Gourmet e Copos Crocantes mantêm títulos, unidades e complementos anteriores", () => {
  const print = receipt(fixture([
    { quantity: 1, name: "Pipoca Gourmet", size_label: "500 ml", option_names: ["Leitinho", "Ovomaltine"] },
    { quantity: 1, name: "Pipocas Crocantes - Chocolate", size_label: "400 ml", option_names: [] },
  ]));
  assert.match(print, /1x Pipoca Gourmet 500 ml/);
  assert.match(print, /\+ Leitinho/);
  assert.match(print, /\+ Ovomaltine/);
  assert.match(print, /1x Pipocas Crocantes - Chocolate/);
  assert.match(print, /400 ml/);
  assert.doesNotMatch(print, /FATIA/);
});

test("nome fica em largura e altura duplas e depois retorna ao formato normal", () => {
  const print = receipt(fixture([], { customer_name: "Thallyta Silva" }));
  const customerBlock = print.split("CLIENTE")[1];
  assert.ok(customerBlock, "Seção cliente não pode desaparecer");
  assert.ok(customerBlock.includes("\x1B\x45\x01\x1D\x21\x11THALLYTA") === false, "não forçar caixa alta sem autorização");
  assert.ok(customerBlock.includes("\x1B\x45\x01\x1D\x21\x11Thallyta Silva\x1D\x21\x00\x1B\x45\x00"),
    "nome deve estar em negrito, largura dupla e altura dupla com estilo restaurado");
  assert.match(customerBlock, /Telefone: nao informado/);
  assert.match(customerBlock, /ENDERECO DE ENTREGA/);
});

test("nomes longos quebram em no máximo 16 caracteres no papel 58 mm", () => {
  const name = "Nome Sobrenome Muito Comprido";
  const print = receipt(fixture([], { customer_name: name }));
  const enlargedName = print.split("\x1D\x21\x11")[2].split("\x1D\x21\x00")[0];
  const lines = enlargedName.split("\n");
  assert.ok(lines.length >= 2, "nomes maiores que 16 caracteres devem ocupar mais de uma linha");
  assert.ok(lines.every((line) => line.length <= 16), "largura dupla deve respeitar 16 colunas");
  assert.equal(lines.join(" ").replace(/\s+/g, " ").trim(), name);
});

test("o formatador não cria pedidos, altera Pix ou chama a impressora", () => {
  const beginning = source.indexOf("function receipt(");
  const end = source.indexOf("async function printClaim(", beginning);
  const onlyFormatter = source.slice(beginning, end);
  assert.ok(beginning >= 0 && end > beginning);
  assert.doesNotMatch(onlyFormatter, /qz\.print|claimPrintJob|completePrintJob|client\.rpc|orders\.insert/);
  assert.match(onlyFormatter, /paymentLine\(claim\)/);
});
