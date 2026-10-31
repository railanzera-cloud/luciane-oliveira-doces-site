import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const exports={};
vm.runInNewContext(ts.transpileModule(read('lib/crm-assisted.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports});
const {assistedReviewProblems,assistedTiming}=exports;
const now=Date.now();
const expected={conversationId:'c',followUpId:'f',phone:'5591999999999',interest:'Prestígio'};
const good={eligible:true,reasons:[],checked_at:new Date(now).toISOString(),conversation_id:'c',follow_up_id:'f',phone_e164:expected.phone,interest_label:expected.interest};
test('cliente: somente revisão recente e do mesmo telefone/produto libera navegação',()=>{
 assert.equal(assistedReviewProblems(good,expected,now).length,0);
 for(const invalid of [null,{}, {...good,reasons:null},{...good,reasons:[123]}, {...good,checked_at:'invalid'}, {...good,checked_at:new Date(now-61000).toISOString()}, {...good,follow_up_id:'outro'}, {...good,conversation_id:'outro'}, {...good,phone_e164:'5591888888888'}, {...good,interest_label:'Outro'}, {...good,eligible:false}, {...good,interest_label:''}])
  assert.ok(assistedReviewProblems(invalid,expected,now).length>0);
});
test('cliente: bloqueio desconhecido falha fechado e apresenta motivo',()=>{
 assert.match(assistedReviewProblems({...good,reasons:['inbound_timestamp_unverified']},expected,now)[0],/horário original/);
 assert.match(assistedReviewProblems({...good,reasons:['future_policy']},expected,now)[0],/Contato bloqueado/);
});
test('cliente: relógio distingue prazo futuro, vencido e datas inválidas',()=>{
 assert.match(assistedTiming(new Date(now+600000).toISOString(),new Date(now-2100000).toISOString(),now),/35 min.*em 10 min/);
 assert.match(assistedTiming(new Date(now-900000).toISOString(),null,now),/Vencido há 15 min/);
 assert.match(assistedTiming('invalid',null,now),/indisponível/);
});
test('UI: todo acesso WhatsApp exige revisão e a gravação usa RPC transacional',()=>{
 const ui=read('components/admin-crm-panel.tsx');
 assert.match(ui,/const result = await checkAssisted\(item\);\s*tab.location.replace/);
 assert.match(ui,/if \(problems.length\) throw/);
 assert.match(ui,/tab.close\(\); throw e/);
 assert.match(ui,/crm_assisted_record_send/);
 assert.match(ui,/p_follow_up_id:item.follow_up_id/);
 assert.match(ui,/disabled=\{locked \|\| !canPrepare \|\| !isReviewed\}/);
 assert.doesNotMatch(ui, /href=\{crmWhatsAppLink/);
 assert.match(ui,/abortSignal\(AbortSignal.timeout/);
 assert.match(ui,/if \(actionLock.current\) return/);
});
