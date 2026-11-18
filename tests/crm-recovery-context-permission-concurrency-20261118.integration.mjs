import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setupContextPermissionDatabase} from './fixtures/recovery-permission-database.mjs';
import {classifyRecoveryInterest} from '../supabase/functions/_shared/recovery-interest.mjs';
// Fixed loopback/DB/user. Never use a project connection string or real contacts.
const enabled=process.env.GITHUB_ACTIONS==='true'&&process.env.LOD_LOCAL_POSTGRES_TEST==='1';
const args=['-X','-qAt','-v','ON_ERROR_STOP=1','-h','127.0.0.1','-p','5432','-U','postgres','-d','lod_permission_tests'];
function connection(name){
 const child=spawn('psql',args,{env:{...process.env,PGAPPNAME:name},stdio:['pipe','pipe','pipe']});
 let stdout='',stderr='';
 child.stdout.on('data',b=>{stdout+=b});child.stderr.on('data',b=>{stderr+=b});
 const done=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',code=>code===0?resolve(stdout):reject(Error(`local_postgres_test_failed:${code}:${stderr}`)));});
 // Register rejection immediately, including when awaiting a lock barrier.
 done.catch(()=>{});
 return {child,done,get output(){return stdout;}};
}
async function sql(text,name='lod_permission_fixture'){
 const c=connection(name);c.child.stdin.end(text);return c.done;
}
async function until(check){
 const end=Date.now()+15000;
 while(Date.now()<end){if(await check())return;await new Promise(r=>setTimeout(r,25));}
 throw Error('local_postgres_lock_barrier_timeout');
}
const cid='00000000-0000-4000-8000-000000000001',uid='00000000-0000-4000-8000-000000000002',fid='00000000-0000-4000-8000-000000000003',phone='5591000000000';
test('independent PostgreSQL connections serialize one contextual preparation; API roles cannot claim', {skip:!enabled,timeout:60000},async()=>{
 await setupContextPermissionDatabase({exec:sql},{cid,uid,fid,phone});
 const semantic=JSON.stringify(classifyRecoveryInterest('Quero cascão de Prestígio')).replaceAll("'","''");
 // Synthetic fixture only. Full signed capture/business gates are covered by
 // the PGlite integration; this test isolates live PostgreSQL transaction locks.
 await sql(`set request.jwt.claim.role='service_role';
 update crm_follow_ups set due_at=now()-interval '12 minutes';
 insert into crm_recovery_private.context_permission_scope(conversation_id,enabled) values('${cid}',true);
 insert into crm_whatsapp_message_events(id,conversation_id,message_id,direction,occurred_at,received_at,phone_e164)
 select gen_random_uuid(),'${cid}',id,direction,t,t,'${phone}' from (values
 ('wamid.race_interest','inbound',now()-interval '60 minutes'),
 ('wamid.race_offer','app_echo',now()-interval '59 minutes'),
 ('wamid.race_accept','inbound',now()-interval '58 minutes')) v(id,direction,t);
 select crm_recovery_store_observation('${cid}','wamid.race_interest',
  (select occurred_at from crm_whatsapp_message_events where message_id='wamid.race_interest'),'${semantic}'::jsonb);
 select crm_recovery_store_context_permission('${cid}','wamid.race_offer',
  (select occurred_at from crm_whatsapp_message_events where message_id='wamid.race_offer'),'offer',null,'context-recovery-1');
 select crm_recovery_store_context_permission('${cid}','wamid.race_accept',
  (select occurred_at from crm_whatsapp_message_events where message_id='wamid.race_accept'),'accept',null,'context-recovery-1');
 select crm_recovery_finish_due(follow_up_id,lease_token,revision,'shadow_candidate','{}',false)
 from crm_recovery_claim_due(ARRAY['${phone}']);`);
 const revision=(await sql(`select decision_revision from crm_recovery_private.due_checks where follow_up_id='${fid}';`)).trim();
 assert.match(revision,/^[a-f0-9]{32}$/);
 const reserve=`select crm_recovery_private.reserve_context_permission('${fid}','wamid.race_offer','${revision}','one_context_follow_up','${'a'.repeat(64)}');\n`;
 const first=connection('lod_permission_first');let second;
 try{
  first.child.stdin.write('BEGIN;\n'+reserve);
  await until(()=>first.output.includes('"state": "reserved"'));
  second=connection('lod_permission_second');second.child.stdin.end(reserve);
  // Deterministic evidence that a different backend is waiting on our lock.
  await until(async()=> (await sql("select count(*) from pg_stat_activity where application_name='lod_permission_second' and wait_event_type='Lock' and wait_event='advisory';",'lod_permission_barrier')).trim()==='1');
  first.child.stdin.end('COMMIT;\n');
  const a=JSON.parse((await first.done).trim()),b=JSON.parse((await second.done).trim());
  assert.equal(a.state,'reserved');assert.equal(b.state,'already_reserved');
  assert.equal(a.send_authorized,false);assert.equal(b.send_authorized,false);
  assert.ok(a.reservation_id);assert.ok(!('reservation_id' in b));
  assert.equal((await sql('select count(*) from crm_recovery_private.context_permission_uses;')).trim(),'1');
  assert.equal((await sql(`select crm_recovery_private.context_permission_state('${cid}')->>'state';`)).trim(),'used');
 }finally{
  if(first.child.exitCode===null)first.child.kill();if(second?.child.exitCode===null)second.child.kill();
 }
 for(const role of ['anon','authenticated','service_role']){
  await assert.rejects(sql(`set role ${role};\n${reserve}`),/permission denied/);
 }
});
