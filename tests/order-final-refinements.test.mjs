import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const admin = await readFile(new URL('../components/admin-orders-panel.tsx', import.meta.url), 'utf8');
const tracking = await readFile(new URL('../app/pedido/page.tsx', import.meta.url), 'utf8');
function extract(source, name, dependencies) {
 const ast = ts.createSourceFile('test.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
 let found;
 function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) found = node.initializer.arguments[0].getText(ast);
  if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node.getText(ast);
  ts.forEachChild(node, visit);
 }
 visit(ast); assert.ok(found, name);
 const js = ts.transpileModule(`const fn = ${found};`, {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 return new Function(...Object.keys(dependencies), `${js}; return fn;`)(...Object.values(dependencies));
}
const deferred = () => { let resolve; const promise = new Promise(r => resolve=r); return {promise,resolve}; };
test('admin refresh queries again, shows loading, ignores stale responses and alerts once per new order', async () => {
 const requests=[]; const busy=[]; let shown; let alerts=0;
 const reload=extract(admin,'reload',{
  loadSequenceRef:{current:0},setLoading:v=>busy.push(v),setError:()=>{},client:{},searchedNumber:undefined,
  loadAdminOrders:()=>{const d=deferred();requests.push(d);return d.promise;},
  actionable:o=>o.order_status==='new',initializedRef:{current:false},knownActionableRef:{current:new Set()},
  playAlert:()=>alerts++,setOrders:v=>shown=v,printerReady:false,
 });
 let p=reload();requests[0].resolve([]);await p;
 p=reload();requests[1].resolve([{id:'1004',order_status:'new'}]);await p;
 assert.equal(alerts,1);assert.deepEqual(busy,[true,false,true,false]);
 const older=reload(), newer=reload(); requests[3].resolve([{id:'1004',order_status:'preparing'}]);await newer;
 requests[2].resolve([{id:'1004',order_status:'new'}]);await older;
 assert.equal(shown[0].order_status,'preparing');assert.equal(alerts,1);assert.equal(requests.length,4);
});
test('consumer refresh obtains confirmation, preparation, completion and later payment from backend', async () => {
 let latest,shown;let calls=0;const busy=[];
 const refresh=extract(tracking,'refresh',{token:'a'.repeat(48),loadSequenceRef:{current:0},setLoading:v=>busy.push(v),
 loadPublicOrderStatus:async()=>{calls++;return latest;},setOrder:v=>shown=v,rememberOrder:()=>{},setError:()=>{}});
 for(const [order_status,payment_status] of [['confirmed','pending'],['preparing','pending'],['completed','pending'],['completed','paid']]) {
  latest={order_status,payment_status};await refresh();assert.deepEqual(shown,latest);
 }
 assert.equal(calls,4);assert.deepEqual(busy,[true,false,true,false,true,false,true,false]);
 assert.match(tracking,/order_status === "completed" && order.payment_status !== "pending"/);
 assert.match(tracking,/visibilitychange/);
});
test('kitchen sound requires permission and a running audio context',()=>{
 let played=0;
 const context={state:'running',currentTime:0,destination:{},createOscillator:()=>({frequency:{setValueAtTime(){}},connect:()=>({connect(){}}),start:()=>played++,stop(){}}),createGain:()=>({gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}}})};
 const audioRef={current:context};
 extract(admin,'playAlert',{audioRef,alertsEnabled:false})();assert.equal(played,0);
 const play=extract(admin,'playAlert',{audioRef,alertsEnabled:true});play();assert.equal(played,1);
 context.state='suspended';play();assert.equal(played,1);
 let enabled;
 const get=extract(admin,'getAudioContext',{audioRef,createAudioContext:()=>context,setAlertsEnabled:v=>enabled=v});
 get();context.onstatechange();assert.equal(enabled,false);
 context.state='running';context.onstatechange();assert.equal(enabled,true);
});
test('sound activation resumes from user gesture and keeps suspended audio disabled',async()=>{
 let enabled=false,resumed=0,error='';
 const context={state:'suspended',resume:async()=>resumed++};
 const activate=extract(admin,'enableAlerts',{getAudioContext:()=>context,setAlertsEnabled:v=>enabled=v,setError:v=>error=v});
 await activate();assert.equal(resumed,1);assert.equal(enabled,false);assert.match(error,/Toque novamente/);
});

test('repeated manual clicks share a single in-flight refresh',async()=>{
 for(const [source,name] of [[admin,'reload'],[tracking,'refresh']]) {
  const d=deferred();let calls=0;
  const refresh=extract(source,'manualRefresh',{manualRefreshRef:{current:false},[name]:()=>{calls++;return d.promise;}});
  const first=refresh();await refresh();assert.equal(calls,1);d.resolve();await first;
  await refresh();assert.equal(calls,2);
 }
});

test('admin identifies receipt credit/debit and preserves manual payment state and legacy labels',()=>{
 const label=extract(admin,'paymentLabel',{});
 assert.equal(label({card_mode:'credit_single',payment_status:'pending'}),'Pendente — Crédito à vista (1x)');
 assert.equal(label({card_mode:'debit',payment_status:'paid'}),'Pago — Débito');
 assert.equal(label({payment_method:'card_on_delivery',payment_status:'pending',fulfillment_type:'pickup'}),'Cartão na retirada');
 assert.equal(label({payment_method:'manual_pix',payment_status:'pending'}),'Pix manual — aguardando conferência');
 assert.match(admin,/Não acrescente outra tarifa/);
 assert.match(tracking,/Acréscimo do cartão já incluído/);
});
