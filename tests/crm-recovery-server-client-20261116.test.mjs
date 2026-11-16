import test from 'node:test';
import assert from 'node:assert/strict';
import {createRecoveryServerClient} from '../supabase/functions/_shared/recovery-server-client.mjs';
test('native REST adapter preserves exact count, paging and filters with SELECT-only table access',async()=>{
 const c=createRecoveryServerClient('https://example.invalid','synthetic-server-key',{fetchImpl:async(url,init)=>{
  const u=new URL(url);assert.equal(u.pathname,'/rest/v1/crm_conversations');
  assert.equal(u.searchParams.get('select'),'id,status');assert.equal(u.searchParams.get('offset'),'2');
  assert.equal(u.searchParams.get('limit'),'2');assert.equal(u.searchParams.get('status'),'in.(in_progress,waiting_customer)');
  assert.equal(init.method,'GET');assert.equal(init.redirect,'error');assert.ok(!url.includes('synthetic-server-key'));
  return new Response(JSON.stringify([{id:'synthetic'}]),{headers:{'content-range':'2-2/3'}});
 }});
 const r=await c.from('crm_conversations').select('id,status').in('status',['in_progress','waiting_customer']).order('id').range(2,3);
 assert.equal(r.count,3);assert.equal(r.data[0].id,'synthetic');
 assert.equal(c.from('orders').update,undefined);
 assert.throws(()=>c.from('auth.users'));assert.throws(()=>c.rpc('crm_record_action'));
 assert.throws(()=>c.from('orders').select('*'));
 assert.throws(()=>c.from('orders').select('id').eq('id','x),or(id.neq.x'));
});
test('only private RPCs can POST; errors are opaque and absent count stays unknown',async()=>{
 const calls=[];const c=createRecoveryServerClient('https://example.invalid','synthetic-server-key',{fetchImpl:async(url,init)=>{
  calls.push(init);return new Response('0');
 }});
 assert.equal((await c.rpc('crm_recovery_purge_expired')).data,0);assert.equal(calls[0].method,'POST');
 const r=await c.from('orders').select('id').limit(2);assert.equal(r.count,null);
 const bad=createRecoveryServerClient('https://example.invalid','synthetic-server-key',{fetchImpl:async()=>{throw Error('PRIVATE');}});
 assert.deepEqual(await bad.rpc('crm_recovery_purge_expired'),{data:null,error:{code:'source_request_failed'}});
 assert.throws(()=>createRecoveryServerClient('https://user:secret@example.invalid','key'));
});
