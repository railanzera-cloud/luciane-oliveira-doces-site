import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../lib/kitchen-print-health.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022,
} }).outputText;
const health = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
const panel = await readFile(new URL("../components/admin-orders-panel.tsx", import.meta.url), "utf8");
const qz = await readFile(new URL("../lib/qz-print-client.ts", import.meta.url), "utf8");
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
const now = Date.parse("2026-11-12T18:30:00Z");
const ago = ms => new Date(now - ms).toISOString();
const job = (id, changes = {}) => ({
  id, order_uuid: `order-${id}`, kind: "initial", status: "pending",
  created_at: ago(5 * 60_000), updated_at: ago(4 * 60_000), attempts: 0,
  ...changes,
});

test("job elegível não assumido é diferente de QZ sem conclusão e de falha", () => {
  const jobs = [
    job("1763"),
    job("1764", { status: "printing", attempts: 1 }),
    job("1765", { status: "failed", attempts: 1 }),
    job("1766", { attempts: 2 }),
  ];
  const active = new Set(jobs.map(j => j.order_uuid));
  const issue = health.summarizeKitchenPrintIssues(jobs, active, now);
  assert.equal(issue.kind, "failed");
  assert.deepEqual(issue.details.map(item => item.stage), [
    "not_claimed", "unconfirmed", "failed", "awaiting_retry",
  ]);
  assert.deepEqual(issue.details.map(item => item.order_uuid), jobs.map(j => j.order_uuid));
  assert.equal(issue.details[0].attempts, 0);
  assert.match(issue.message, /falha de impressão/);
});

test("alerta não reaparece por pedido cancelado/concluído nem por pendência recente", () => {
  const cancelled = job("cancelled");
  const completed = job("completed");
  const recent = job("recent", { created_at: ago(30_000), updated_at: ago(30_000) });
  const issue = health.summarizeKitchenPrintIssues(
    [cancelled, completed, recent], new Set([recent.order_uuid]), now,
  );
  assert.equal(issue, null);
  const delayed = health.summarizeKitchenPrintIssues(
    [job("active")], new Set(["order-active"]), now,
  );
  assert.equal(delayed.kind, "delayed");
  assert.equal(delayed.details[0].stage, "not_claimed");
  assert.match(delayed.message, /aguardando impressão/);
});

test("painel exibe números e etapas reais sem confundir aparelho com notebook remoto", () => {
  assert.match(panel, /printIssue\.details\.slice\(0, 8\)\.map/);
  assert.match(panel, /Pedido #\$\{related\.order_number\}/);
  assert.match(panel, /Ainda não assumida pelo notebook \(0 tentativas\)/);
  assert.match(panel, /Assumida pelo QZ, sem confirmação de conclusão/);
  assert.match(panel, /Falha registrada no processamento da comanda/);
  assert.match(panel, /o estado do notebook não é monitorado remotamente/);
  assert.match(panel, /setPrinterLastVerifiedAt\(Date\.now\(\)\)/);
  assert.match(panel, /const online = await isKitchenPrinterOnline\(\)/);
  assert.match(qz, /export async function isKitchenPrinterOnline\(/);
  assert.match(qz, /qz\.printers\.find\(\)/);
  assert.match(css, /\.admin-kitchen-issue-list/);
});

test("diagnóstico não reivindica, recupera nem imprime comanda automaticamente", () => {
  assert.match(source, /client\.from\("print_jobs"\)/);
  assert.match(source, /\.select\("id,order_uuid,kind,status,created_at,updated_at,attempts"\)/);
  assert.doesNotMatch(source, /\.insert\(|\.update\(|\.delete\(|\.rpc\(/);
  assert.match(panel, /checked=\{recoveryAcknowledged\}/);
  assert.match(panel, /Não saiu — recuperar/);
  assert.match(qz, /await claimPrintJob\(client, getKitchenWorkerId\(\)\)/);
  assert.match(qz, /await completePrintJob\(client, claim\)/);
});
