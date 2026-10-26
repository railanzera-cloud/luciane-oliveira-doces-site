import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read=path=>fs.readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("corrige nomes de 1 caractere vindos do Tintim sem perder lead",()=>{
 const sql=read("supabase/migrations/20261026221500_crm_tintim_short_names_fix.sql");
 assert.match(sql,/CREATE OR REPLACE FUNCTION public\.crm_sync_recent_tintim/);
 assert.match(sql,/v_name:=left\(btrim\(coalesce\(t\.contact_name,''\)\),100\)/);
 assert.match(sql,/char_length\(v_name\)<2 THEN v_name:='Contato WhatsApp'/);
 assert.match(sql,/ON CONFLICT\(phone_e164\) DO NOTHING/);
 assert.match(sql,/ON CONFLICT\(tintim_conversation_id\) DO NOTHING/);
 assert.doesNotMatch(sql,/INSERT INTO public\.orders\b|UPDATE public\.orders\b/);
});

test("navegacao CRM comporta quatro filtros em duas linhas no iPhone",()=>{
 const css=read("components/admin-crm-panel.css");
 const panel=read("components/admin-crm-panel.tsx");
 assert.match(css,/\.crm-navigation\{display:grid;grid-template-columns:1fr 1fr\}/);
 assert.match(css,/\.crm-navigation button:last-child\{grid-column:auto\}/);
 for(const view of ['"due"','"new"','"active"','"tintim"'])assert.ok(panel.includes(view));
});
