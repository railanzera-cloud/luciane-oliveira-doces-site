import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const panel=await readFile(new URL("../components/admin-orders-panel.tsx",import.meta.url),"utf8");
const qz=await readFile(new URL("../lib/qz-print-client.ts",import.meta.url),"utf8");
const css=await readFile(new URL("../app/globals.css",import.meta.url),"utf8");
const oldLogic=await readFile(new URL("../supabase/migrations/20261017233000_kitchen_auto_mode_optin.sql",import.meta.url),"utf8");
test("notebook: proteção de tela é opcional, com suspensão local ainda documentada",()=>{
 assert.match(panel,/navigator\.wakeLock\.request\("screen"\)/);
 assert.match(panel,/document\.addEventListener\("visibilitychange", visible\)/);
 assert.match(panel,/wakeLock|WakeLockSentinel/);
 assert.match(panel,/KEEP_SCREEN_AWAKE_KEY/);
 assert.match(panel,/setKeepScreenAwake\(next\)/);
 assert.match(panel,/não conseguiu impedir a tela de apagar/);
 assert.match(css,/admin-kitchen-awake-controls/);
});
test("reconexão automática sem duplicar conexões nem exigir clique quando Chrome acorda",()=>{
 assert.match(panel,/document\.addEventListener\("visibilitychange", onResume\)/);
 assert.match(panel,/window\.addEventListener\("focus", onResume\)/);
 assert.match(panel,/PRINTER_RETRY_INTERVAL_MS = 60 \* 1000/);
 assert.match(panel,/setInterval\(\(\) => void check\(\), 30000\)/);
 assert.match(panel,/await enablePrinter\(true\)/);
 assert.match(panel,/if \(!kitchenMode\?\.enabled\) return/);
 assert.match(panel,/PRINTER_RECONNECT_KEY/);
 assert.match(qz,/if \(connectionInProgress\) return connectionInProgress/);
 assert.match(qz,/connectionInProgress = null/);
 assert.match(qz,/export async function isKitchenPrinterOnline\(/);
 assert.match(qz,/if \(!qz\.websocket\.isActive\(\)\) await connectKitchenPrinter\(accessToken\)/);
});
test("botão da impressora não tem spinner constante da fila de impressão",()=>{
 assert.match(panel,/setPrinting\(true\)/);
 assert.match(panel,/setConnectingPrinter\(true\)/);
 assert.match(panel,/disabled=\{connectingPrinter\}/);
 assert.match(panel,/<Printer size=\{17\} \/>/);
 assert.doesNotMatch(panel,/\{printing \? <LoaderCircle/);
 assert.match(panel,/Fila: <strong>\{printing \? "Processando em segundo plano"/);
 assert.match(panel,/disabled=\{connectingPrinter\}/);
});
test("timeout no QZ evita travar processamento e sinaliza papel incerto",()=>{
 assert.match(qz,/qz\.print\(config/);
 assert.match(qz,/qz\.print\(config,[\s\S]{0,160}45000/);
 assert.match(qz,/Confira se o papel saiu antes de pedir reimpressão/);
 assert.match(qz,/await failPrintJob\(client, claim, failure\)/);
 assert.doesNotMatch(qz,/setInterval\(/);
});
test("não altera pagamento nem regras de aceitação e não troca a etiqueta premium",()=>{
 assert.match(qz,/PEDIDO #/);
 assert.match(qz,/ENDERECO DE ENTREGA/);
 assert.match(qz,/PEDIDO CONFIRMADO/);
 assert.match(qz,/installKitchenQzSecurity/);
 assert.match(oldLogic,/auto_mode_enabled boolean NOT NULL DEFAULT false/);
 assert.match(panel,/setKitchenAutoMode\(client, enabled\)/);
 assert.doesNotMatch(panel,/confirmOfflinePayment\(client, order\.id\)\s*;[\s\S]{0,200}enablePrinter/);
});
test("timeout é finito e libera futuras conexões",async()=>{
 const ast=ts.createSourceFile("qz.ts",qz,ts.ScriptTarget.ES2022,true,ts.ScriptKind.TS);
 const decl=ast.statements.find(x=>ts.isFunctionDeclaration(x)&&x.name?.text==="kitchenConnectionDeadline");
 assert.ok(decl);
 const script=ts.transpileModule(decl.getText(ast).replace(/^export\s+/,""),{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None},
 }).outputText;
 const deadline=new Function(script+";return kitchenConnectionDeadline;")();
 await assert.rejects(deadline(new Promise(()=>{}),15,"Sem resposta"),/Sem resposta/);
 assert.equal(await deadline(Promise.resolve("ok"),100,"Falha"),"ok");
});
