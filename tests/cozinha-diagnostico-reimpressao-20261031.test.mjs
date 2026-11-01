import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
const panel=readFileSync("components/admin-orders-panel.tsx","utf8");
const printer=readFileSync("lib/qz-print-client.ts","utf8");
const health=readFileSync("lib/kitchen-print-health.ts","utf8");
test("operadora pode reimprimir comanda WhatsApp e site, inclusive concluída",()=>{
 assert.doesNotMatch(panel,/order\.sales_channel !== "whatsapp" && actionable\(order\)/);
 assert.match(panel,/\["confirmed", "preparing", "ready", "ready_for_pickup", "out_for_delivery", "completed"\]/);
 assert.match(panel,/Reimprimir comanda/);
 assert.match(panel,/await createReprint\(client, order\.id\)/);
});
test("reimpressão não é enfileirada sem sessão QZ ou sem inicial registrada",()=>{
 assert.match(panel,/if \(!printerReady \|\| !printerOnline\)/);
 assert.match(panel,/\.from\("print_jobs"\)/);
 assert.match(panel,/\.eq\("kind", "initial"\)\.eq\("status", "printed"\)/);
 const idxPreflight=panel.indexOf('.eq("kind", "initial").eq("status", "printed")');
 const idxCreate=panel.indexOf("await createReprint(client, order.id)");
 assert.ok(idxPreflight>0&&idxPreflight<idxCreate);
 assert.match(panel,/window\.confirm\(\x60Reimprimir a comanda/);
 assert.match(panel,/segunda etiqueta/);
 const reprintBody=panel.split("  async function reprint(order: AdminOrder) {")[1]?.split("  const visibleOrders")[0] ?? "";
 assert.ok(reprintBody.length>100);
 assert.doesNotMatch(reprintBody,/confirmOfflinePayment|payment_status\s*=/);
});
test("comunica estado local e incerteza de papel físico",()=>{
 assert.match(panel,/Impressora neste dispositivo:/);
 assert.match(panel,/no celular aparecer "Não conectada" é esperado/);
 assert.match(panel,/não\s+garante sessão local ativa nem saída do papel/);
 assert.match(health,/j\.status === "pending" \|\| j\.status === "printing"/);
 assert.match(printer,/await completePrintJob\(client, claim\)/);
 assert.match(printer,/Confira se o papel saiu antes de pedir reimpressão/);
});
