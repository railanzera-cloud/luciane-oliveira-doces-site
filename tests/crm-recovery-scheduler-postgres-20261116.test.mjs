import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
test('scheduler authorization ledger: one tick, one nonce, bounded age, RLS and expiry',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create schema auth;create function auth.role() returns text language sql as $$select nullif(current_setting('request.jwt.claim.role',true),'')$$;
 create table public.crm_conversations(id uuid primary key);`);
 await db.exec(fs.readFileSync(new URL('../supabase/prepared/recovery-private-observations.sql',import.meta.url),'utf8'));
 await db.exec('create table crm_recovery_private.due_checks(follow_up_id uuid primary key,expires_at timestamptz)');
 await db.exec(fs.readFileSync(new URL('../supabase/migrations/20261116164957_crm_recovery_scheduler_auth.sql',import.meta.url),'utf8'));
 await db.exec("set request.jwt.claim.role='service_role'");
 const current=(await db.query('select now()::text stamp,(floor(extract(epoch from now())/300)*300)::bigint tick')).rows[0];
 const nonce='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
 const consume=async(id=nonce,stamp=current.stamp,tick=Number(current.tick))=>(await db.query('select public.crm_recovery_consume_scheduler_nonce($1,$2,$3) ok',[id,stamp,tick])).rows[0].ok;
 assert.equal(await consume(),true);assert.equal(await consume(),false);
 assert.equal(await consume(other),false); // same tick, different signed request
 assert.equal(await consume(other,new Date(Date.parse(current.stamp)-91000).toISOString(),Number(current.tick)-300),false);
 assert.equal(await consume(other,new Date(Date.parse(current.stamp)+31000).toISOString(),Number(current.tick)-300),false);
 assert.equal(await consume(other,current.stamp,Number(current.tick)-900),false);
 assert.equal(await consume(other,current.stamp,Number(current.tick)+1),false);
 const row=(await db.query('select * from crm_recovery_private.scheduler_invocations')).rows[0];
 assert.deepEqual(Object.keys(row).sort(),['expires_at','nonce','received_at','tick']);
 for(const role of ['anon','authenticated','service_role']){
  await db.exec(`set role ${role}`);await assert.rejects(db.query('select * from crm_recovery_private.scheduler_invocations'));await db.exec('reset role');
 }
 for(const role of ['anon','authenticated'])assert.equal((await db.query("select has_function_privilege($1,'public.crm_recovery_consume_scheduler_nonce(uuid,timestamptz,bigint)','EXECUTE') ok",[role])).rows[0].ok,false);
 await db.exec("set request.jwt.claim.role='authenticated'");await assert.rejects(consume(other));
 await db.exec("set request.jwt.claim.role='service_role';begin");
 await db.exec('revoke execute on function public.crm_recovery_consume_scheduler_nonce(uuid,timestamptz,bigint) from service_role');
 assert.equal((await db.query("select has_function_privilege('service_role','public.crm_recovery_consume_scheduler_nonce(uuid,timestamptz,bigint)','EXECUTE') ok")).rows[0].ok,false);
 await db.exec('rollback');
 assert.equal((await db.query("select has_function_privilege('service_role','public.crm_recovery_consume_scheduler_nonce(uuid,timestamptz,bigint)','EXECUTE') ok")).rows[0].ok,true);
 await db.exec("set request.jwt.claim.role='service_role';update crm_recovery_private.scheduler_invocations set expires_at=now()-interval '1 second'");
 assert.equal((await db.query('select public.crm_recovery_purge_expired() n')).rows[0].n,1);
 assert.equal((await db.query('select count(*)::int n from crm_recovery_private.scheduler_invocations')).rows[0].n,0);
 assert.equal((await db.query("select relrowsecurity from pg_class where oid='crm_recovery_private.scheduler_invocations'::regclass")).rows[0].relrowsecurity,true);
 }finally{await db.close();}
});
