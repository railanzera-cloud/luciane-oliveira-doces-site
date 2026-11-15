import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const panel = await readFile(new URL("../components/admin-orders-panel.tsx", import.meta.url), "utf8");
const source = await readFile(new URL("../lib/kitchen-manual-receipt.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022,
}}).outputText;
const receipt = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
const base = {
 order_number:1810, order_id:"test", created_at:"2026-11-15T15:36:00Z",
 customer_name:'Test <img src=x onerror=alert(1)>', customer_phone:"5599999999999",
 fulfillment_type:"delivery", street:"Rua & Um", street_number:"2", neighborhood:"Centro",
 complement:'Bloco "A"',reference:null,notes:"Sem <script>exec</script>",
 payment_status:"pending", payment_method:"manual_pix", total:50,
 order_items:[{quantity:2,name:"Fatia de Chocolate",size_label:"1 fatia",option_names:["Morango & Ninho"]}],
};

test("contingência imprime documento HTML escapado sem executar dados do pedido",()=>{
 const doc=receipt.buildKitchenManualReceiptDocument(base);
 assert.match(doc,/PEDIDO #1810/);
 assert.match(doc,/PIX MANUAL PENDENTE/);
 assert.match(doc,/COMANDA MANUAL/);
 assert.match(doc,/Rua &amp; Um/);
 assert.match(doc,/&lt;img src=x onerror=alert\(1\)&gt;/);
 assert.match(doc,/Sem &lt;script&gt;exec&lt;\/script&gt;/);
 assert.doesNotMatch(doc,/<script>exec<\/script>/);
 assert.match(doc,/Morango &amp; Ninho/);
 assert.match(doc,/@media print/);
});
test("comanda manual não altera banco, pagamento, status nem QZ e exige clique para imprimir",()=>{
 assert.doesNotMatch(source,/\.rpc\(|\.from\(|qz\.print|fetch\(/);
 assert.match(source,/getElementById\("printKitchenReceipt"\)\?\.addEventListener\("click"/);
 assert.match(source,/preview\.print\(\)/);
 assert.match(panel,/openKitchenManualReceipt\(order\)/);
 assert.match(panel,/Comanda manual \(sem QZ\)/);
 assert.match(panel,/\["new", "confirmed", "preparing"/);
 assert.match(panel,/order\.sales_channel !== "site" \|\| order\.payment_status === "paid"/);
});
test("consulta instável do QZ é reconfirmada antes de derrubar status, sem imprimir automaticamente",()=>{
 assert.match(panel,/consecutivePrinterCheckFailuresRef\.current \+= 1/);
 assert.match(panel,/consecutivePrinterCheckFailuresRef\.current < 2/);
 assert.match(panel,/if \(online\) \{\s*consecutivePrinterCheckFailuresRef\.current = 0/);
 assert.match(panel,/printingRef\.current\) return/);
 assert.match(panel,/Reconexão pendente:/);
});
