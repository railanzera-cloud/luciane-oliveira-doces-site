import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../lib/qz-print-client.ts",import.meta.url), "utf8");
const panel = await readFile(new URL("../components/admin-orders-panel.tsx",import.meta.url), "utf8");
const ast=ts.createSourceFile("qz.ts",source,ts.ScriptTarget.ES2022,true,ts.ScriptKind.TS);
let functionCode="";
function scan(node){
 if(ts.isFunctionDeclaration(node) && node.name?.text === "kitchenConnectionDeadline") {
   functionCode=node.getText(ast);
 }
 ts.forEachChild(node,scan);
}
scan(ast);
assert.ok(functionCode,"deadline helper present");
const emitted=ts.transpileModule(functionCode.replace(/^export\s+/, "")+"\n",{
 compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None},
}).outputText;
const deadline = new Function(emitted+";return kitchenConnectionDeadline;")();

test("o timeout da conexão local dá resposta mesmo quando QZ nunca resolve",async()=>{
 await assert.rejects(deadline(new Promise(()=>{}),15,"QZ Tray sem resposta"),/QZ Tray sem resposta/);
});
test("uma resposta rápida limpa o tempo limite e não quebra sucesso",async()=>{
 assert.equal(await deadline(Promise.resolve("conectado"),100,"falha"),"conectado");
 await assert.rejects(deadline(Promise.reject(new Error("recusado")),100,"tempo"),/recusado/);
});
test("carregamento e falhas da conexão exibem a etapa sem afetar pedidos",()=>{
 assert.match(source,/onProgress\?\.\("websocket"\)/);
 assert.match(source,/onProgress\?\.\("printers"\)/);
 assert.match(source,/qz\.websocket\.connect\(\{ retries: 1, delay: 1 \}\), 20000/);
 assert.match(source,/qz\.printers\.getDefault\(\)/);
 assert.match(panel,/printerConnectStage/);
 assert.match(panel,/setPrinterConnectError\(explanation\)/);
 assert.match(panel,/if \(!silent\) \{[\s\S]{0,70}setError\(" "\)/).not;
 assert.match(panel,/if \(!silent\) \{/);
 assert.match(panel,/setPrinterReady\(true\)/);
 assert.doesNotMatch(panel,/const printer = await connectKitchenPrinter[\s\S]{0,180}await drainPrintQueue/);
 assert.match(panel,/Conectar impressão 58 mm/);
});
