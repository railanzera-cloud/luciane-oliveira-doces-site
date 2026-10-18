import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const read = async path => readFile(new URL(path,import.meta.url),"utf8");
const helper = await read("../lib/kitchen-alert.ts");
const compiled = ts.transpileModule(helper,{compilerOptions:{
  module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,
}}).outputText;
const {pendingKitchenAlerts,KITCHEN_ALERT_REPEAT_MS,playKitchenChime} =
  await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const now=Date.parse("2026-10-17T22:20:00Z");
const base={
  id:"p1",order_number:180,created_at:"2026-10-17T22:19:00Z",
  sales_channel:"whatsapp",payment_status:"pending",order_status:"confirmed",
};
test("novos pedidos pendentes de Pix podem alertar antes do pagamento, sem retroativos",()=>{
  const rows=[base,{...base,id:"p2",order_number:181,
      created_at:"2026-10-17T21:50:00Z"},
    {...base,id:"p3",order_number:182,order_status:"cancelled"},
    {...base,id:"p4",order_number:183,payment_status:"refunded"}];
  assert.deepEqual(pendingKitchenAlerts(rows,now-10*60*1000,new Set(),now).map(x=>x.id),["p1"]);
  assert.equal(pendingKitchenAlerts(rows,now-10*60*1000,new Set(["p1"]),now).length,0);
});
test("janela máxima, data futura e inicialização sem gesto não geram alertas",()=>{
  assert.equal(pendingKitchenAlerts([base],0,new Set(),now).length,0);
  assert.equal(pendingKitchenAlerts([base],now+10000,new Set(),now).length,0);
  assert.equal(pendingKitchenAlerts([{...base,created_at:"2026-10-18T11:00:00Z"}],now-1000,new Set(),now).length,0);
  assert.equal(pendingKitchenAlerts([base],now-9*60*60*1000,new Set(),now+9*60*60*1000).length,0);
});
test("toque programa quatro notas e respeita audio suspenso",()=>{
  const schedule=[];
  const context={
    state:"running",currentTime:0,
    destination:{},
    createOscillator(){return {type:"",frequency:{setValueAtTime(v,t){schedule.push(["freq",v,t]);}},
      connect(){},start(t){schedule.push(["start",t]);},stop(t){schedule.push(["stop",t]);},
      disconnect(){},onended:null};},
    createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};},
  };
  playKitchenChime(context,"alto");
  assert.equal(schedule.filter(x=>x[0]==="start").length,4);
  assert.equal(KITCHEN_ALERT_REPEAT_MS,8000);
  context.state="suspended";
  schedule.length=0;playKitchenChime(context,"alto");
  assert.equal(schedule.length,0);
});
test("modo automático é opt-in autenticado, cronológico e mantém estado de pagamento",async()=>{
 const sql=await read("../supabase/migrations/20261017233000_kitchen_auto_mode_optin.sql");
 const panel=await read("../components/admin-orders-panel.tsx");
 const printer=await read("../lib/qz-print-client.ts");
 assert.match(sql,/auto_mode_enabled boolean NOT NULL DEFAULT false/);
 assert.match(sql,/lod_require_authenticated_staff\(\)/);
 assert.match(sql,/CREATE TRIGGER kitchen_auto_accept_whatsapp_on_insert/);
 assert.match(sql,/NEW\.sales_channel <> 'whatsapp'/);
 assert.match(sql,/NEW\.created_at >= c\.auto_mode_started_at/);
 assert.match(sql,/NEW\.created_at >= c\.accept_new_after/);
 assert.match(sql,/lod_crocante_print_allocation_ready\(p_order\.id\)/);
 assert.match(sql,/payment_status IN \('paid','pending'\)/);
 assert.match(sql,/source, changed_by/);
 assert.match(sql,/VALUES \(NEW\.id, 'new', 'confirmed', NEW\.payment_status, NEW\.payment_status, 'system', NULL\)/);
 assert.doesNotMatch(sql,/set\s+payment_status\s*=/i);
 assert.doesNotMatch(sql,/delete from public\.orders/i);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.admin_set_kitchen_auto_mode_v1/);
 assert.match(panel,/setKitchenAutoMode\(client, enabled\)/);
 assert.match(panel,/Reconhecer aviso e parar som/);
 assert.match(panel,/KITCHEN_ALERT_REPEAT_MS/);
 assert.match(panel,/setInterval\(\(\) => void reload\(true\), 20000\)/);
 assert.match(panel,/ensureKitchenPrinterConnected/);
 assert.match(printer,/PEDIDO CONFIRMADO/);
 assert.match(printer,/currentAccessToken/);
});
