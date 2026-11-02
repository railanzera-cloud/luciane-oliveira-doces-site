import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

const src = readFileSync("lib/qz-print-client.ts", "utf8");
const ast = ts.createSourceFile("lib/qz-print-client.ts", src, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
const findFunction = name => {
  const fn = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(fn, name+" não encontrado");
  return fn.getText(ast).replace(/^export\s+/, "");
};
const declarations = ast.statements.filter(node => ts.isVariableStatement(node))
  .map(node => node.getText(ast)).find(text => /\bkitchenWorkerId\b/.test(text));
assert.ok(declarations, "Identidade da estação deve ser mantida no escopo do módulo");
const compiled = ts.transpileModule(
  [declarations,findFunction("getKitchenWorkerId"),findFunction("drainPrintQueue")].join("\n"),
  { compilerOptions: {target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None} },
).outputText;
const run = (claimPrintJob, printClaim=async()=>{}, completePrintJob=async()=>{}, failPrintJob=async()=>{}) =>
  new Function("claimPrintJob","printClaim","completePrintJob","failPrintJob",
    compiled+"\nreturn {drainPrintQueue,getKitchenWorkerId};"
  )(claimPrintJob,printClaim,completePrintJob,failPrintJob);

test("regressão: usa a identificação definida, sem workerId solto", () => {
  assert.doesNotMatch(src,/claimPrintJob\(client,\s*workerId\)/);
  assert.match(src,/claimPrintJob\(client, getKitchenWorkerId\(\)\)/);
  assert.match(src,/globalThis\.crypto\?\.randomUUID\?\.\(\)/);
  assert.match(src,/lod-kitchen-/);
});
test("cada aba recebe worker estável e diferente, no formato aceito pelo banco", () => {
  const a = run(async()=>null), b = run(async()=>null);
  const id = a.getKitchenWorkerId();
  assert.match(id,/^lod-kitchen-[a-f0-9-]{36}$/i);
  assert.ok(id.length>=8 && id.length<=120);
  assert.equal(a.getKitchenWorkerId(),id);
  assert.notEqual(b.getKitchenWorkerId(),id);
});
test("sem comandos pendentes, consulta uma vez e não imprime nem confirma", async () => {
  const used=[],completed=[],failed=[];
  const q=run(async(_client,worker)=>{used.push(worker);return null;},
    async()=>{throw Error("Não pode imprimir sem job");},
    async(...args)=>completed.push(args),async(...args)=>failed.push(args));
  assert.equal(await q.drainPrintQueue({},10),0);
  assert.equal(used.length,1);
  assert.match(used[0],/^lod-kitchen-/);
  assert.equal(completed.length,0);
  assert.equal(failed.length,0);
});
test("pedido pendente é claimado e confirmado uma vez após impressão", async () => {
  const calls=[],completed=[],failed=[];
  const job={job:{id:"job",claim_token:"token"}};
  const q=run(async(_client,id)=>{calls.push(id);return calls.length===1?job:null;},
    async(received)=>assert.equal(received,job),
    async(_client,received)=>completed.push(received),
    async(_client,received)=>failed.push(received));
  assert.equal(await q.drainPrintQueue({}),1);
  assert.equal(calls.length,2);
  assert.equal(calls[0],calls[1]);
  assert.deepEqual(completed,[job]);
  assert.equal(failed.length,0);
});
test("falha física no QZ não marca impresso; registra erro do job original", async () => {
  const completed=[],failed=[];
  const job={job:{id:"job",claim_token:"token"}};
  const q=run(async()=>job,async()=>{throw Error("POS-58 não respondeu");},
    async(...args)=>completed.push(args),async(_client,received,message)=>failed.push({received,message}));
  await assert.rejects(q.drainPrintQueue({},1),/POS-58 não respondeu/);
  assert.equal(completed.length,0);
  assert.equal(failed.length,1);
  assert.equal(failed[0].received,job);
  assert.equal(failed[0].message,"POS-58 não respondeu");
});
