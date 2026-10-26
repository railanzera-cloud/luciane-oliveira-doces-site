import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read=(file)=>fs.readFileSync(new URL("../"+file,import.meta.url),"utf8");

test("ponte Tintim CRM em trigger nao exige abrir painel",()=>{
  const sql=read("supabase/migrations/20261026235500_crm_tintim_live_sync.sql");
  assert.match(sql,/CREATE TRIGGER crm_tintim_live_sync/);
  assert.match(sql,/AFTER INSERT OR UPDATE OF/);
  assert.match(sql,/public\.tintim_conversations/);
  assert.match(sql,/INSERT INTO public\.crm_customers/);
  assert.match(sql,/INSERT INTO public\.crm_conversations/);
  assert.match(sql,/ON CONFLICT\(tintim_conversation_id\) DO NOTHING/);
  assert.match(sql,/last_observed_at < now\(\)-interval '7 days'/);
  assert.match(sql,/EXCEPTION WHEN OTHERS THEN/);
});
test("sinal Comprou interrompe lembrete, sem confirmar receita",()=>{
  const sql=read("supabase/migrations/20261026235500_crm_tintim_live_sync.sql");
  assert.match(sql,/UPDATE public\.crm_follow_ups/);
  assert.match(sql,/resolution_reason='tintim_purchase_signal'/);
  assert.match(sql,/followup_held_purchase_signal/);
  assert.doesNotMatch(sql,/UPDATE public\.orders|INSERT INTO public\.orders|INSERT INTO public\.payments|UPDATE public\.payments/i);
  assert.doesNotMatch(sql,/INSERT INTO public\.crm_follow_ups|graph\.facebook\.com|automatic_sends_enabled\s*=\s*true/i);
});
test("procedimento preserva RLS e nao expoe escrita direta",()=>{
  const sql=read("supabase/migrations/20261026235500_crm_tintim_live_sync.sql");
  assert.match(sql,/SET search_path = ''/);
  assert.match(sql,/REVOKE ALL ON FUNCTION public\.crm_ingest_tintim_on_change\(\)/);
  assert.doesNotMatch(sql,/GRANT EXECUTE.*TO anon/i);
  assert.doesNotMatch(sql,/CREATE POLICY.*USING \(true\)/i);
});
