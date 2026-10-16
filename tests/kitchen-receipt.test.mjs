import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Executa somente as funcoes puras do recibo. Nao cria pedidos nem conecta
// QZ, Supabase, Cloudflare ou impressora fisica.
const source = readFileSync(new URL("../lib/qz-print-client.ts", import.meta.url), "utf8");
const start = source.indexOf("function plain(value:");
const end = source.indexOf("async function printClaim(", start);
assert.ok(start >= 0 && end > start, "Bloco do formatador localizado");
const transpiled = ts.transpileModule(source.slice(start, end), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;
const context = vm.createContext({ Intl, Date, String, Number });
const formatter = vm.runInContext(transpiled + "\n({ receipt, wrap, paymentLine })", context);

function sample(overrides = {}) {
  const order = {
    order_number: 1257, created_at: "2026-10-16T01:42:00.000Z",
    customer_name: "Lu lu", customer_phone: null, notes: null,
    fulfillment_type: "pickup", neighborhood: null, street: null,
    street_number: null, complement: null, reference: null,
    payment_method: "manual_pix", payment_status: "paid",
    cash_change_for: null, total: "55.00",
    ...overrides,
  };
  return {
    job: { kind: "initial" },
    order,
    items: [{
      quantity: 1, name: "Pipoca Gourmet", size_label: "1 litro",
      option_names: ["Leitinho", "Ovomaltine", "Kinder Bueno"],
    }],
  };
}

test("comanda real #1257: cabecalho em destaque, data da loja e Pix confirmado", () => {
  const paper = formatter.receipt(sample());
  assert.match(paper, /\x1D\x21\x11PEDIDO #1257\x1D\x21\x00/);
  assert.match(paper, /15\/10\/2026 22:42/);
  assert.match(paper, /RETIRADA/);
  assert.match(paper, /PIX CONFIRMADO/);
  assert.match(paper, /1x Pipoca Gourmet 1 litro/);
  for (const flavor of ["Leitinho", "Ovomaltine", "Kinder Bueno"]) {
    assert.ok(paper.includes("+ " + flavor), flavor);
  }
  assert.match(paper, /CLIENTE[\s\S]*Lu lu[\s\S]*Telefone: nao informado/);
  assert.match(paper, /TOTAL: R\$ 55,00/);
  assert.doesNotMatch(paper, /(?:null|undefined|NaN)/i);
  assert.doesNotMatch(paper, /ENDERECO DE ENTREGA/);
});

test("entrega imprime endereco, bairro, complemento, referencia e telefone", () => {
  const paper = formatter.receipt(sample({
    fulfillment_type: "delivery", customer_phone: "91999999999",
    street: "Rua do Comercio", street_number: "123",
    neighborhood: "Bairro Centro", complement: "Casa 2",
    reference: "Portao azul", notes: "Sem contato por chamada",
  }));
  for (const text of [
    "ENTREGA", "ENDERECO DE ENTREGA", "Rua do Comercio, 123",
    "Bairro: Bairro Centro", "Complemento: Casa 2", "Referencia: Portao azul",
    "Telefone: 91999999999", "OBSERVACOES", "Sem contato por chamada",
  ]) assert.ok(paper.includes(text), text);
  assert.doesNotMatch(paper, /(?:null|undefined)/i);
});

test("endereco incompleto nao mostra nulidade tecnica e identifica dados ausentes", () => {
  const paper = formatter.receipt(sample({ fulfillment_type: "delivery" }));
  assert.match(paper, /Endereco nao informado/);
  assert.match(paper, /Telefone: nao informado/);
  assert.doesNotMatch(paper, /(?:null|undefined)/i);
});

test("pagamentos distintos sao claros sem afirmar recebimento indevidamente", () => {
  assert.equal(formatter.paymentLine(sample().order ? sample() : null), "PIX CONFIRMADO");
  assert.equal(formatter.paymentLine(sample({ payment_method: "mercado_pago_pix" })), "PIX CONFIRMADO");
  assert.equal(formatter.paymentLine(sample({ payment_method: "mercado_pago_card" })), "CARTAO ONLINE CONFIRMADO");
  assert.equal(formatter.paymentLine(sample({ payment_method: "cash", payment_status: "pending" })), "DINHEIRO NA RETIRADA");
  assert.equal(formatter.paymentLine(sample({ payment_method: "card_on_delivery", payment_status: "pending", fulfillment_type: "delivery" })), "CARTAO NA ENTREGA");
  assert.equal(formatter.paymentLine(sample({ payment_method: "manual_pix", payment_status: "pending" })), "PAGAMENTO A CONFERIR");
});

test("troco e reimpressao aparecem apenas quando se aplicam", () => {
  const claim = sample({ payment_method: "cash", payment_status: "pending", cash_change_for: "100.00" });
  claim.job.kind = "reprint";
  const paper = formatter.receipt(claim);
  assert.match(paper, /\*\*\* REIMPRESSAO \*\*\*/);
  assert.match(paper, /TROCO PARA: R\$ 100,00/);
  assert.doesNotMatch(formatter.receipt(sample()), /REIMPRESSAO|TROCO PARA/);
});

test("quebra de linha preserva informacoes compridas, sem cortar dados", () => {
  const input = "Rua " + "A".repeat(70);
  const result = Array.from(formatter.wrap(input));
  assert.ok(result.every(l => l.length <= 32));
  assert.equal(result.join("").replace(/^Rua/, ""), "A".repeat(70));
  const paper = formatter.receipt(sample({
    fulfillment_type: "delivery", street: "A".repeat(70), street_number: "91",
  }));
  assert.equal((paper.match(/A{6,}/g) ?? []).join("").length, 70);
});

test("caracteres nao imprimiveis sao removidos de dados de clientes", () => {
  const paper = formatter.receipt(sample({
    customer_name: "Ana\x1B@",
    notes: "Observação\x1B comando",
  }));
  assert.match(paper, /Ana /);
  assert.match(paper, /Observacao comando/);
  assert.doesNotMatch(paper, /Ana\x1B@/);
});
