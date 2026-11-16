import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyMetaLinkage } from '../scripts/meta-linkage-readonly.mjs';
const config={userToken:'synthetic-user-secret',appToken:'synthetic-app-secret',appId:'101',wabaId:'202',phoneId:'303',callback:'https://example.invalid/callback',version:'v27.0'};
const responses=()=>[{id:'303',is_on_biz_app:true,platform_type:'CLOUD_API'},{data:[{id:'303'}]},
 {data:[{whatsapp_business_api_data:{id:'101'}}]},
 {data:[{object:'whatsapp_business_account',callback_url:config.callback,fields:[{name:'messages'}]}]}];
test('read-only audit verifies linkage without printing tokens or internal IDs',async()=>{
 const data=responses();const result=await verifyMetaLinkage(config,{fetchImpl:async(url,init)=>{
  assert.equal(init.method,'GET');assert.equal(init.redirect,'error');assert.ok(!url.includes('secret'));
  return {ok:true,json:async()=>data.shift()};
 }});
 assert.equal(result.ok,true);assert.equal(result.echoes_subscribed,false);
 assert.ok(!JSON.stringify(result).includes('secret'));assert.ok(!JSON.stringify(result).includes('303'));
});
test('missing credential, failed reads and truncated listing cannot certify linkage',async()=>{
 assert.equal((await verifyMetaLinkage({})).ok,false);
 assert.equal((await verifyMetaLinkage(config,{fetchImpl:async()=>{throw Error('SECRET');}})).reason,'authenticated_meta_read_failed');
 const data=responses();data[1].paging={next:'SECRET'};
 assert.equal((await verifyMetaLinkage(config,{fetchImpl:async()=>({ok:true,json:async()=>data.shift()})})).ok,false);
});
