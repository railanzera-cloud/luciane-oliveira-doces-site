import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const read=path=>fs.readFileSync(new URL("../"+path,import.meta.url),"utf8");
const exports={};
vm.runInNewContext(ts.transpileModule(read("lib/crm-follow-up.ts"),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText,{exports});
const {crmQueueBucket}=exports;
const NOW=Date.parse("2026-10-27T12:00:00Z");
const due="2026-10-27T11:00:00Z";
const future="2026-10-27T13:00:00Z";
const normal={
 status:"waiting_customer", follow_up_status:"pending",follow_up_due_at:due,
 consent_status:"granted",commercial_opt_out:false,possible_purchase:false
};
test("somente vencidos com consentimento entram na fila para revisao imediata",()=>{
 assert.equal(crmQueueBucket(normal,NOW),"review_now");
 assert.equal(crmQueueBucket({...normal,consent_status:"unknown"},NOW),"blocked_due");
 assert.equal(crmQueueBucket({...normal,consent_status:"denied"},NOW),"blocked_due");
 assert.equal(crmQueueBucket({...normal,commercial_opt_out:true},NOW),"blocked_due");
 assert.equal(crmQueueBucket({...normal,possible_purchase:true},NOW),"blocked_due");
});
test("nao colocar atendimento encerrado, respondido ou futuro na fila vencida",()=>{
 assert.equal(crmQueueBucket({...normal,follow_up_due_at:future},NOW),"scheduled");
 assert.equal(crmQueueBucket({...normal,status:"in_progress"},NOW),"other");
 assert.equal(crmQueueBucket({...normal,status:"converted"},NOW),"other");
 assert.equal(crmQueueBucket({...normal,follow_up_status:"canceled"},NOW),"other");
 assert.equal(crmQueueBucket({...normal,follow_up_due_at:null},NOW),"other");
 assert.equal(crmQueueBucket({...normal,follow_up_due_at:"invalida"},NOW),"other");
});
test("navegacao informa vencidos bloqueados, preserva triagem, lista geral e Tintim",()=>{
 const ui=read("components/admin-crm-panel.tsx");
 for(const label of ["Para agora","Revisar","Triagem","Acompanhar","Contatos Tintim"])
  assert.ok(ui.includes(label),label);
 assert.match(ui,/view==="review"/);
 assert.match(ui,/crmQueueBucket\(/);
 assert.match(ui,/consent_status: item\.consent_status/);
 assert.match(ui,/possible_purchase: hasPurchaseSignal/);
 assert.match(ui,/Nenhum atendimento habilitado para revisão imediata/);
 assert.match(ui,/lembretes\s*vencidos que exigem conferência ou autorização/);
 assert.match(ui,/Nenhuma mensagem é enviada automaticamente/i);
 assert.doesNotMatch(ui,/automatic_sends_enabled\s*=\s*true|graph\.facebook\.com/);
});
test("mobile recolhe ajustes manuais e bloqueia reagendamento involuntario",()=>{
 const ui=read("components/admin-crm-panel.tsx");
 const css=read("components/admin-crm-panel.css");
 assert.match(ui,/<details className="crm-manual-controls">/);
 assert.match(ui,/Correções manuais do atendimento/);
 assert.match(ui,/Lembrete automático já ativo/);
 assert.match(ui,/item\.status==="waiting_customer" && item\.follow_up_status==="pending"\)/);
 assert.match(ui,/window\.confirm\("Você realmente enviou esta mensagem fora do CRM/);
 assert.match(css,/\.crm-manual-controls/);
 assert.match(css,/\.crm-queue-overview/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/\.crm-navigation button:last-child\{grid-column:1\/-1\}/);
});
test("prioridade do produto identificada continua e pesquisa filtra",()=>{
 const ui=read("components/admin-crm-panel.tsx");
 assert.match(ui,/item\.interest_label \? "Confirmado: "/);
 assert.match(ui,/mentionedName \? "Cliente mencionou: "/);
 assert.match(ui,/crmMentionedProductName\(mentions\[item\.conversation_id\]\?\.product_id\)/);
 assert.match(ui,/onlyWithProduct/);
 assert.match(ui,/Mostrar somente atendimentos com indicação de produto/);
 assert.match(ui,/crm_list_tintim_product_hints/);
 assert.match(ui,/crm_confirm_interest/);
 assert.match(ui,/crmSuggestedMessage\(draftInterest,signal\?\.ad_name,mention\?\.product_id\)/);
});
test("nenhuma funcao de envio ou mudanca financeira introduzida",()=>{
 const ui=read("components/admin-crm-panel.tsx");
 assert.match(ui,/eligible && !possiblePurchase/);
 assert.match(ui,/isDue &&/);
 assert.match(ui,/client\.rpc\("crm_record_action"/);
 assert.doesNotMatch(ui,/fetch\([^)]*graph\.facebook\.com/);
 const logic=read("lib/crm-follow-up.ts");
 assert.doesNotMatch(logic,/sendMessage\(|Purchase\(|insert.*orders/);
});
