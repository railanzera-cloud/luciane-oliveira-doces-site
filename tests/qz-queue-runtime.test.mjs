import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../lib/qz-print-client.ts', import.meta.url), 'utf8');
function harness(options = {}) {
  const calls = [];
  let active = options.active ?? true;
  let taken = false;
  const claim = {job:{id:'job',claim_token:'token',kind:'initial'},
    order:{order_number:42,created_at:new Date().toISOString(),payment_method:'cash',payment_status:'pending',fulfillment_type:'pickup',total:15.9},items:[]};
  const fakeQz = {
    security:{setCertificatePromise(){},setSignatureAlgorithm(){},setSignaturePromise(){}},
    websocket:{isActive:()=>active,async connect(){calls.push('connect');if(options.connectFails)throw Error('QZ indisponível');active=true;}},
    printers:{async find(){return options.printers ?? ['POS-58(copy of 1)'];}},
    configs:{create:()=>({})},
    async print(){calls.push('print');if(options.printFails)throw Error('conexão interrompida');},
  };
  const client = {
    auth:{async getSession(){return {data:{session:null}};}},
    async rpc(name){calls.push(name);if(name==='admin_get_kitchen_print_control')return {data:{enabled:options.enabled??true}};
      if(name==='admin_verify_print_claim')return {data:options.eligible??true};throw Error('RPC inesperada');},
  };
  const stripped = source.replace(/^import[\s\S]*?from "[^"\n]+";\n/gm, '')
    .replace('const imported = await import("qz-tray");','const imported = { default: fakeQz };');
  const js = ts.transpileModule(stripped,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  const exports = {};
  vm.runInNewContext(js, {exports,crypto:webcrypto,fakeQz,window:{localStorage:{getItem:()=>null,setItem(){}}},fetch(){throw Error('Nenhuma requisição externa permitida');},
    getSupabasePublicConfiguration:()=>({url:'https://fixture.invalid',publishableKey:'fixture'}),
    async claimPrintJob(){calls.push('claim');if(taken)return null;taken=true;return claim;},
    async completePrintJob(){calls.push('complete');if(options.completeFails)throw Error('banco sem conexão');},
    async failPrintJob(_client,_claim,message){calls.push({failure:message});if(options.failRecordFails)throw Error('banco indisponível');},
  });
  return {api:exports,client,calls,disconnect:()=>{active=false;}};
}
async function connected(options){const h=harness(options);await h.api.connectKitchenPrinter(h.client);return h;}

test('fila desativada não reclama nem envia comandas',async()=>{
  const h=await connected({enabled:false});assert.equal(await h.api.drainPrintQueue(h.client),0);assert.ok(!h.calls.includes('claim'));assert.ok(!h.calls.includes('print'));
});
test('cancelamento após claim bloqueia envio e conclusão',async()=>{
  const h=await connected({eligible:false});assert.equal(await h.api.drainPrintQueue(h.client),0);assert.ok(!h.calls.includes('print'));assert.ok(!h.calls.includes('complete'));
});
test('conclusão ocorre somente após confirmação disponível do QZ',async()=>{
  const h=await connected({});assert.equal(await h.api.drainPrintQueue(h.client),1);assert.ok(h.calls.indexOf('print')<h.calls.indexOf('complete'));assert.equal(h.calls.filter(x=>x==='print').length,1);
});
test('rejeição após início de envio permanece ambígua e não repete automaticamente',async()=>{
  const h=await connected({printFails:true});await assert.rejects(h.api.drainPrintQueue(h.client),/envio pode ter ocorrido.*Confira o papel/);assert.ok(!h.calls.includes('complete'));assert.equal(await h.api.drainPrintQueue(h.client),0);assert.equal(h.calls.filter(x=>x==='print').length,1);
});
test('perda do retorno de conclusão não transforma envio em nova tentativa',async()=>{
  const h=await connected({completeFails:true});await assert.rejects(h.api.drainPrintQueue(h.client),/envio pode ter ocorrido/);assert.equal(await h.api.drainPrintQueue(h.client),0);assert.equal(h.calls.filter(x=>x==='print').length,1);
});
test('falha simultânea no QZ e no banco mantém alerta operacional original',async()=>{
  const h=await connected({printFails:true,failRecordFails:true});await assert.rejects(h.api.drainPrintQueue(h.client),/envio pode ter ocorrido.*conferência operacional/);assert.ok(!h.calls.includes('complete'));
});
test('QZ indisponível antes do envio não marca impressão concluída',async()=>{
  const h=await connected({connectFails:true});h.disconnect();await assert.rejects(h.api.drainPrintQueue(h.client),/impressão não enviada/);assert.ok(!h.calls.includes('print'));assert.ok(!h.calls.includes('complete'));
});
test('websocket recuperado envia uma vez e conclui depois',async()=>{
  const h=await connected({});h.disconnect();assert.equal(await h.api.drainPrintQueue(h.client),1);assert.ok(h.calls.indexOf('connect')<h.calls.indexOf('print'));
});
test('impressora desconectada não escolhe outro equipamento',async()=>{
  const h=harness({printers:['Microsoft Print to PDF','Epson']});await assert.rejects(h.api.connectKitchenPrinter(h.client),/Não encontrei a impressora POS-58/);assert.ok(!h.calls.includes('print'));
});
test('sessão expirada impede chamada remota de assinatura',async()=>{
  const h=harness();const js=ts.transpileModule(source.slice(source.indexOf('async function signedRequest('),source.indexOf('async function qzModule(')),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const fn=vm.runInNewContext(js+'; signedRequest', {activeAuthClient:h.client});await assert.rejects(fn({action:'sign',request:'fixture'}),/Sessão expirada/);
});
