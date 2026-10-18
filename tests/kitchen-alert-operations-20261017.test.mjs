import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function loadHelper(path) {
  const source = await readFile(new URL(path,import.meta.url),"utf8");
  const js=ts.transpileModule(source,{compilerOptions:{
    module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,
  }}).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
}
const alerts=await loadHelper("../lib/kitchen-alert.ts");
const health=await loadHelper("../lib/kitchen-print-health.ts");
const now=Date.parse("2026-10-17T23:00:00Z");
const date = t => new Date(now - t).toISOString();
const job=(changes={})=>({
  id:"job-1",order_uuid:"order-1",kind:"initial",
  status:"pending",created_at:date(180000),updated_at:date(180000),attempts:0,
  ...changes,
});
test("o toque normal é finito e agrupado, sem timer infinito nem reconhecimento",async()=>{
  const panel=await readFile(new URL("../components/admin-orders-panel.tsx",import.meta.url),"utf8");
  assert.equal(alerts.KITCHEN_ALERT_REPEAT_MS,5000);
  assert.equal(alerts.KITCHEN_ALERT_VISIBLE_MS,12000);
  assert.equal(alerts.KITCHEN_ALERT_GROUP_MS,10000);
  assert.match(panel,/lastNormalBurstRef/);
  assert.match(panel,/initialOrdersLoadedRef.current = true/);
  assert.match(panel,/secondChimeTimerRef.current = window.setTimeout/);
  assert.match(panel,/normalBannerTimerRef.current = window.setTimeout/);
  assert.doesNotMatch(panel,/setInterval\(playAlert,/);
  assert.doesNotMatch(panel,/Reconhecer aviso e parar som/);
  assert.match(panel,/role="status" aria-live="polite"/);
});
test("não toca para pedido anterior, já informado, cancelado ou futuro",()=>{
  const order={id:"order-1",order_number:2,created_at:date(10000),
    sales_channel:"whatsapp",payment_status:"pending",order_status:"confirmed"};
  assert.deepEqual(alerts.pendingKitchenAlerts([order],now-20000,new Set(),now).map(x=>x.id),["order-1"]);
  assert.deepEqual(alerts.pendingKitchenAlerts([order],now-20000,new Set(["order-1"]),now),[]);
  assert.deepEqual(alerts.pendingKitchenAlerts([{...order,order_status:"cancelled"}],now-20000,new Set(),now),[]);
  assert.deepEqual(alerts.pendingKitchenAlerts([{...order,created_at:date(-30000)}],now-20000,new Set(),now),[]);
  assert.deepEqual(alerts.pendingKitchenAlerts([{...order,created_at:date(3600000)}],now-7200000,new Set(),now),[]);
});
test("trabalho impresso e pendência recente não acionam alarme de falha",()=>{
  const ids=new Set(["order-1"]);
  assert.equal(health.summarizeKitchenPrintIssues([job({status:"printed"})],ids,now),null);
  assert.equal(health.summarizeKitchenPrintIssues([job({created_at:date(30000),updated_at:date(30000)})],ids,now),null);
  assert.equal(health.summarizeKitchenPrintIssues([job()],new Set(),now),null);
  assert.equal(health.summarizeKitchenPrintIssues([job({created_at:date(7*3600000),updated_at:date(7*3600000)})],ids,now),null);
});
test("pendência atrasada gera alerta diferente de erro de impressão real",()=>{
  const ids=new Set(["order-1"]);
  const delay=health.summarizeKitchenPrintIssues([job()],ids,now);
  assert.equal(delay.kind,"delayed");
  assert.match(delay.message,/aguardando impressão/);
  const failed=health.summarizeKitchenPrintIssues([job({status:"failed"})],new Set(),now);
  assert.equal(failed.kind,"failed");
  assert.match(failed.message,/falha de impressão/);
  assert.equal(health.KITCHEN_ERROR_ALERT_INTERVAL_MS,30000);
  assert.equal(health.KITCHEN_PRINT_DELAY_MS,120000);
});
test("alarme especial se resolve quando job vira printed; novo erro recebe outra identidade",()=>{
  const ids=new Set(["order-1"]);
  const failure=job({status:"failed"});
  const issue=health.summarizeKitchenPrintIssues([failure],ids,now);
  assert.equal(health.summarizeKitchenPrintIssues([{...failure,status:"printed"}],ids,now),null);
  const another=health.summarizeKitchenPrintIssues([job({id:"job-2",status:"failed"})],ids,now);
  assert.notEqual(issue.id,another.id);
});
test("consulta ao Supabase é somente leitura, autenticada, filtrada por corte da fila",async()=>{
  const calls=[];
  const query={
    select(x){calls.push(["select",x]);return this},
    gte(a,b){calls.push(["gte",a,b]);return this},
    in(a,b){calls.push(["in",a,b]);return this},
    order(a,b){calls.push(["order",a,b]);return this},
    async limit(n){calls.push(["limit",n]);return {data:[job({status:"failed"})],error:null}},
  };
  const client={from(table){assert.equal(table,"print_jobs");return query}};
  const issue=await health.loadKitchenPrintIssue(client,date(1800000),new Set(),now);
  assert.equal(issue.kind,"failed");
  assert.deepEqual(calls.find(x=>x[0]==="in")[2],["pending","printing","failed"]);
  assert.equal(calls.at(-1)[1],100);
  assert.ok(calls.every(x=>!["update","insert","delete"].includes(x[0])));
  const src=await readFile(new URL("../lib/kitchen-print-health.ts",import.meta.url),"utf8");
  assert.doesNotMatch(src,/\.rpc\("admin_(confirm|transition)/);
  assert.match(src,/\.select\("id,order_uuid,kind,status,created_at,updated_at,attempts"\)/);
});
