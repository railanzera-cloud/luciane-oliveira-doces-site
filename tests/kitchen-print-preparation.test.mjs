import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const sql = read("supabase/migrations/20261014230000_kitchen_print_preparation_DISABLED.sql");
const qz = read("lib/qz-print-client.ts");
const admin = read("components/admin-orders-panel.tsx");

const ACTIVE = ["new", "confirmed", "preparing", "ready", "ready_for_pickup", "out_for_delivery"];
const ACCEPTED = ["confirmed", "preparing", "ready", "ready_for_pickup", "out_for_delivery"];
function eligible(order) {
  if (!ACTIVE.includes(order.order_status) || ["failed", "cancelled", "refunded"].includes(order.payment_status)) return false;
  if (order.sales_channel === "site" && ["mercado_pago_pix", "mercado_pago_card"].includes(order.payment_method))
    return order.payment_status === "paid";
  if (order.sales_channel === "whatsapp" && order.payment_method === "manual_pix")
    return order.payment_status === "paid" && ACCEPTED.includes(order.order_status);
  if (order.sales_channel === "whatsapp" && ["cash", "card_on_delivery"].includes(order.payment_method))
    return ACCEPTED.includes(order.order_status);
  return false;
}
function order(payment_method, payment_status, order_status, sales_channel = "whatsapp") {
  return { payment_method, payment_status, order_status, sales_channel };
}
const scenarios = [
  ["Pix manual recém-registrado e ainda não pago", order("manual_pix","pending","new"),false],
  ["Pix manual pago mas ainda não aceito", order("manual_pix","paid","new"),false],
  ["Pix manual aceito mas ainda sem pagamento", order("manual_pix","pending","confirmed"),false],
  ["Pix manual pago E aceito", order("manual_pix","paid","confirmed"),true],
  ["Pix manual em preparo após confirmação", order("manual_pix","paid","preparing"),true],
  ["Dinheiro apenas registrado", order("cash","pending","new"),false],
  ["Dinheiro aceito para entrega", order("cash","pending","confirmed"),true],
  ["Cartão presencial apenas registrado", order("card_on_delivery","pending","new"),false],
  ["Cartão presencial aceito", order("card_on_delivery","pending","confirmed"),true],
  ["Pix online ainda não autorizado", order("mercado_pago_pix","pending","payment_pending","site"),false],
  ["Pix online aprovado oficialmente", order("mercado_pago_pix","paid","new","site"),true],
  ["Cartão online aprovado", order("mercado_pago_card","paid","new","site"),true],
  ["Cartão online recusado", order("mercado_pago_card","failed","payment_pending","site"),false],
  ["Pedido cancelado mesmo tendo recebido Pix", order("manual_pix","paid","cancelled"),false],
  ["Pedido estornado", order("mercado_pago_pix","refunded","new","site"),false],
  ["Pedido antigo já concluído", order("mercado_pago_pix","paid","completed","site"),false],
  ["Canal não reconhecido", order("manual_pix","paid","confirmed","site"),false]
];

for (const [name, item, allowed] of scenarios)
  test("regra de impressão: " + name, () => assert.equal(eligible(item), allowed));

test("script SQL inicia desligado, só ativa com corte temporal renovado", () => {
  assert.match(sql, /enabled boolean not null default false/);
  assert.match(sql, /values \(true, false, now\(\)\)/);
  assert.match(sql, /accept_new_after = case when p_enabled and not enabled then now\(\) else accept_new_after end/);
  assert.match(sql, /perform public\.lod_require_authenticated_staff\(\)/);
  assert.match(sql, /j\.created_at >= c\.accept_new_after/g);
  assert.match(sql, /o\.created_at >= c\.accept_new_after/g);
  assert.match(sql, /j\.status = 'pending'/);
  assert.match(sql, /for update of j skip locked/);
  assert.match(sql, /on conflict \(job_key\) do nothing/);
  assert.match(sql, /p_order\.payment_method = 'manual_pix'[\s\S]*p_order\.payment_status = 'paid'[\s\S]*p_order\.order_status in/);
  assert.match(sql, /p_order\.payment_method in \('cash','card_on_delivery'\)/);
  assert.match(sql, /p_order\.payment_method in \('mercado_pago_pix','mercado_pago_card'\)/);
  assert.match(sql, /o\.payment_status not in \('refunded','failed','cancelled'\)/);
  assert.match(sql, /previous\.status = 'printed'/);
  assert.doesNotMatch(sql, /delete from public\.(orders|print_jobs)/i);
});

test("o QZ se recusa a processar no banco atual sem a RPC de segurança", () => {
  assert.match(qz, /client\.rpc\("admin_get_kitchen_print_control"\)/);
  assert.match(qz, /if \(error\) throw new Error\("Fila protegida não instalada/);
  assert.match(qz, /if \(!\(await kitchenPrintIsEnabled\(client\)\)\) return 0;/);
  assert.ok(qz.indexOf("kitchenPrintIsEnabled(client)") < qz.indexOf("let printed = 0;"));
  assert.match(qz, /client\.rpc\("admin_verify_print_claim"/);
  assert.ok(qz.indexOf('client.rpc("admin_verify_print_claim"') < qz.indexOf("await printClaim(claim)"));
  assert.match(qz, /if \(verifyError \|\| stillEligible !== true\)/);
  assert.match(qz, /failPrintJob\(client, claim, "Comanda bloqueada/);
  assert.match(qz, /await completePrintJob\(client, claim\)/);
  assert.match(sql, /j\.claim_token = p_claim_token and j\.status = 'printing'/);
});

test("conectar USB/QZ não desencadeia impressão nem processa fila histórica", () => {
  const start = admin.indexOf("async function enablePrinter()");
  const stop = admin.indexOf("async function runOrderAction(", start);
  assert.ok(start > 0 && stop > start);
  const section = admin.slice(start, stop);
  assert.match(section, /connectKitchenPrinter\(client\)/);
  assert.match(section, /kitchenPrintIsEnabled\(client\)/);
  assert.doesNotMatch(section, /drainPrintQueue\(client\)|claimPrintJob\(/);
  assert.match(section, /Impressão automática desativada com segurança/);
});

test("simulação: backlog anterior e tentativas repetidas não viram comandas", () => {
  const cutoff = Date.parse("2026-10-14T18:00:00-03:00");
  const entries = [
    {id:"old", created:cutoff-86400000, orderCreated:cutoff-86400000,
      order:order("mercado_pago_pix","paid","completed","site")},
    {id:"abandoned",created:cutoff+1000,orderCreated:cutoff+1000,order:order("manual_pix","pending","new")},
    {id:"confirmed",created:cutoff+2000,orderCreated:cutoff+2000,order:order("cash","pending","confirmed")},
    {id:"paid",created:cutoff+3000,orderCreated:cutoff+3000,order:order("mercado_pago_pix","paid","new","site")}
  ];
  const claimed = new Set();
  const claim = () => {
    const next = entries.find((j)=>j.created>=cutoff && j.orderCreated>=cutoff && eligible(j.order) && !claimed.has(j.id));
    if (next) claimed.add(next.id);
    return next?.id ?? null;
  };
  assert.equal(claim(),"confirmed");
  assert.equal(claim(),"paid");
  assert.equal(claim(),null);
  assert.deepEqual([...claimed],["confirmed","paid"]);
});

test("reimpressão só de trabalho já impresso, requerida por atendente", () => {
  assert.match(sql,/j\.kind = 'reprint' and j\.requested_by is not null/);
  assert.match(sql,/previous\.kind = 'initial'/);
  assert.match(sql,/previous\.status = 'printed'/);
  assert.match(sql,/o\.order_status not in \('cancelled','payment_pending'\)/);
});

test("a POS-58 é selecionada por correspondência térmica, nunca por impressora padrão", () => {
  assert.match(qz, /await qz\.printers\.find\(\)/);
  assert.match(qz, /const thermal = names\.filter/);
  assert.match(qz, /thermal\.length === 1 \? thermal\[0\] : null/);
  assert.match(qz, /POS-58 correta antes de imprimir/);
  assert.doesNotMatch(qz, /qz\.printers\.getDefault/);
});
test("o QZ atualiza sessão, não armazena token vencido no handler", () => {
  assert.match(qz, /activeAuthClient\?\.auth\.getSession\(\)/);
  assert.match(qz, /const accessToken = session\?\.data\.session\?\.access_token/);
  assert.match(qz, /signedRequest\(\{ action: "sign", request \}\)/);
  assert.doesNotMatch(qz, /signedRequest\(accessToken,/);
});
test("teste de 58mm não acessa banco nem consome fila de pedidos", () => {
  const start = qz.indexOf("export async function testKitchenPrinter()");
  const stop = qz.indexOf("function plain(", start);
  assert.ok(start >= 0 && stop > start);
  const local = qz.slice(start,stop);
  assert.match(local, /TESTE LOCAL - IMPRESSORA/);
  assert.match(local, /Nenhum pedido comercial/);
  assert.match(local, /qz\.print\(config,/);
  assert.match(local, /String\.fromCharCode\(27\)/);
  assert.doesNotMatch(local, /claimPrintJob|print_jobs|claim\.order|client\.rpc/);
  const panel = admin.slice(admin.indexOf("async function printLocalTest()"),admin.indexOf("async function runOrderAction("));
  assert.match(panel, /testKitchenPrinter\(\)/);
});
test("eventos perdidos no Realtime são retomados pelo polling seguro em primeiro plano", () => {
  assert.match(admin, /window\.setInterval\(\(\) => \{/);
  assert.match(admin, /document\.visibilityState === "visible"\) void processPrints\(\)/);
  assert.match(admin, /\}, 15000\)/);
  assert.match(qz, /if \(!\(await kitchenPrintIsEnabled\(client\)\)\) return 0/);
});
