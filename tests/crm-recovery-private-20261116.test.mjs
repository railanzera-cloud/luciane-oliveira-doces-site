import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { privateRecoveryObservations } from '../supabase/functions/_shared/recovery-observation-store.mjs';
import { classifyRecoveryInterest } from '../supabase/functions/_shared/recovery-interest.mjs';
test('private persistence: real PostgreSQL ACL, idempotency, expiry, no raw body and metadata roundtrip',async()=>{
 const db=new PGlite();
 try {
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
 CREATE SCHEMA auth; CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT current_setting('request.jwt.claim.role',true) $$;
 CREATE TABLE public.crm_conversations(id uuid PRIMARY KEY);
 INSERT INTO public.crm_conversations VALUES('00000000-0000-4000-8000-000000000001');`);
 await db.exec(fs.readFileSync(new URL('../supabase/prepared/recovery-private-observations.sql',import.meta.url),'utf8'));
 const cid='00000000-0000-4000-8000-000000000001';
 const rpc=async(name,p)=>{
  try{
   if(name==='crm_recovery_store_observation') {
    const r=await db.query('select public.crm_recovery_store_observation($1,$2,$3,$4) value',[p.p_conversation_id,p.p_message_id,p.p_occurred_at,JSON.stringify(p.p_semantic)]);
    return {data:r.rows[0].value};
   }
   return {data:(await db.query('select * from public.crm_recovery_read_observations($1)',[p.p_conversation_id])).rows};
  }catch(error){throw error;}
 };
 const store=privateRecoveryObservations({rpc});
 await db.exec("SET request.jwt.claim.role='service_role'");
 const event={id:'wamid.syntheticprivate',verified:true,direction:'inbound',time_basis:'provider_timestamp',content_origin:'customer_text',conversation_key:cid,occurred_at:new Date().toISOString(),text:'Quero cascão de Prestígio'};
 assert.equal((await store.capture(cid,event)).stored,true);
 assert.equal((await store.capture(cid,event)).reason,'duplicate');
 await assert.rejects(store.capture(cid,{...event,text:'Já paguei'}));
 const rows=await store.read(cid);assert.equal(rows.length,1);assert.equal(rows[0].semantic.candidates[0].product_id,'cone-trufado-prestigio');
 assert.ok(!JSON.stringify(rows).includes('Quero cascão'));
 await assert.rejects(db.query('select public.crm_recovery_store_observation($1,$2,$3,$4)',[cid,'wamid.syntheticbad',event.occurred_at,JSON.stringify({...classifyRecoveryInterest(event.text),raw_text:'PRIVATE'})]));
 for(const role of ['anon','authenticated']) {
  const acl=await db.query(`select has_function_privilege($1,'public.crm_recovery_read_observations(uuid)','EXECUTE') allowed`,[role]);
  assert.equal(acl.rows[0].allowed,false);
  await db.exec(`SET ROLE ${role}`);await assert.rejects(db.query('select * from crm_recovery_private.observations'));await db.exec('RESET ROLE');
 }
 await db.exec("SET request.jwt.claim.role='authenticated'");await assert.rejects(store.read(cid));
 await db.exec("SET request.jwt.claim.role='service_role'; UPDATE crm_recovery_private.observations SET expires_at=now()-interval '1 second'");
 assert.deepEqual(await store.read(cid),[]);
 assert.equal((await db.query('select public.crm_recovery_purge_expired() n')).rows[0].n,1);
 assert.equal((await db.query('select public.crm_recovery_purge_expired() n')).rows[0].n,0);
 const rls=await db.query("select relrowsecurity from pg_class where oid='crm_recovery_private.observations'::regclass");assert.equal(rls.rows[0].relrowsecurity,true);
 }finally{await db.close();}
});
