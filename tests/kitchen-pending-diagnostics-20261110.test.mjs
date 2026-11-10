import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readFileSync } from "node:fs";
import ts from "typescript";

const now = Date.parse("2026-11-10T20:28:00Z");
const ago = ms => new Date(now - ms).toISOString();
const job = (overrides = {}) => ({
  id: "job-1736", order_uuid: "order-1736", kind: "initial", status: "pending",
  created_at: ago(7 * 60000), updated_at: ago(7 * 60000), attempts: 0,
  ...overrides,
});
const source = readFileSync("lib/kitchen-print-health.ts", "utf8");
const panel = readFileSync("components/admin-orders-panel.tsx", "utf8");
const qz = readFileSync("lib/qz-print-client.ts", "utf8");
const css = readFileSync("app/globals.css", "utf8");
const js = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022,
}}).outputText;
const health = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));

test("comanda pending com zero tentativa identifica pedido e idade, sem classificá-la como printing", () => {
  const issue = health.summarizeKitchenPrintIssues([job()], new Set(["order-1736"]), now);
  assert.ok(issue);
  assert.equal(issue.kind, "delayed");
  assert.equal(issue.jobs[0].order_uuid, "order-1736");
  assert.equal(issue.jobs[0].status, "pending");
  assert.equal(issue.jobs[0].attempts, 0);
  assert.equal(issue.jobs[0].ageMinutes, 7);
  assert.equal(health.summarizeKitchenPrintIssues([job()],new Set(),now),null);
});

test("comanda pendente recente não gera alarme e impressão concluída é descartada", () => {
  const recent = job({created_at: ago(40000),updated_at: ago(40000)});
  assert.equal(health.summarizeKitchenPrintIssues([recent],new Set(["order-1736"]),now),null);
  assert.equal(health.summarizeKitchenPrintIssues([job({status:"printed"})],new Set(["order-1736"]),now),null);
});

test("comanda printing travada e falha registrada têm indicações distintas", () => {
  const printing=health.summarizeKitchenPrintIssues([job({
    id:"job-1700",status:"printing",attempts:1,updated_at:ago(6*60000),
  })],new Set(["order-1736"]),now);
  assert.equal(printing.jobs[0].status,"printing");
  assert.equal(printing.jobs[0].ageMinutes,6);
  const failed=health.summarizeKitchenPrintIssues([job({
    id:"job-err",status:"failed",updated_at:ago(1000),
  })],new Set(),now);
  assert.equal(failed.kind,"failed");
  assert.equal(failed.jobs[0].status,"failed");
});

test("alerta misto não esconde pendências atrás de falha registrada", () => {
  const issue=health.summarizeKitchenPrintIssues([
    job({id:"job-f",order_uuid:"other",status:"failed"}),
    job(),
  ],new Set(["order-1736"]),now);
  assert.equal(issue.kind,"failed");
  assert.deepEqual(issue.jobs.map(j=>j.status).sort(),["failed","pending"]);
});

test("consulta de diagnóstico continua exclusivamente read-only e limita janela", async () => {
  const calls=[];
  const chain={
    select(v){calls.push(["select",v]);return this},
    gte(k,v){calls.push(["gte",k,v]);return this},
    in(k,v){calls.push(["in",k,v]);return this},
    order(k,v){calls.push(["order",k,v]);return this},
    async limit(n){calls.push(["limit",n]);return {data:[job()],error:null}},
  };
  const client={from(name){assert.equal(name,"print_jobs");return chain}};
  const issue=await health.loadKitchenPrintIssue(client,null,new Set(["order-1736"]),now);
  assert.equal(issue.jobs[0].status,"pending");
  assert.equal(calls.at(-1)[1],100);
  assert.ok(!calls.some(([verb])=>["rpc","insert","update","delete"].includes(verb)));
});

test("painel mostra diagnóstico e usa apenas processamento da fila existente para pending", () => {
  assert.match(panel, /admin-kitchen-issue-jobs/);
  assert.match(panel, /Pedido #\$\{order\.order_number\}/);
  assert.match(panel, /Na fila · não assumida/);
  assert.match(panel, /Em impressão · sem conclusão/);
  assert.match(panel, /Falha registrada/);
  assert.match(panel, /Tentativas: \{job\.attempts\}/);
  assert.match(panel, /não crie uma reimpressão/i);
  assert.match(panel, /if \(printerReady\) void processPrints\(\)/);
  assert.match(panel, /admin-stalled-print-jobs/);
  assert.match(panel, /O automático ligado no Supabase não comprova conexão QZ/);
  assert.match(css, /\.admin-kitchen-issue-job/);
  assert.match(qz, /await claimPrintJob\(client, getKitchenWorkerId\(\)\)/);
  assert.doesNotMatch(panel, /job\.status === "pending"[\s\S]{0,100}recoverStalledPrintJob/);
});
