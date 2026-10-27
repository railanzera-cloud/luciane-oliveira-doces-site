import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read=p=>fs.readFileSync(new URL("../"+p,import.meta.url),"utf8");
const ui=read("components/admin-crm-panel.tsx");
const sql=read("supabase/migrations/20261027006000_crm_confirm_interest.sql");
const css=read("components/admin-crm-panel.css");

test("equipe confirma produto independente do agendamento de 45 minutos",()=>{
 assert.match(ui,/client\.rpc\("crm_confirm_interest"/);
 assert.match(ui,/p_conversation_id:id,p_interest:label/);
 assert.match(ui,/Salvar produto confirmado/);
 assert.match(ui,/Não (?:cria|alter[a-z]*) nem altera lembretes|Salvar não cria nem altera lembretes/);
 assert.match(ui,/p_interest: null/);
 assert.match(sql,/UPDATE public\.crm_conversations/);
 assert.match(sql,/interest_basis='staff_confirmed'/);
 assert.doesNotMatch(sql,/\b(?:INSERT|UPDATE|DELETE)\s+(?:INTO\s+|FROM\s+)?public\.crm_follow_ups/);
});
test("proteção: o admin autenticado deve estar na ACL da equipe",()=>{
 assert.match(sql,/PERFORM public\.crm_require_staff\(\)/);
 assert.match(sql,/SECURITY DEFINER SET search_path=public,pg_temp/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.crm_confirm_interest\(uuid,text\) FROM PUBLIC,anon,authenticated/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.crm_confirm_interest\(uuid,text\) TO authenticated/);
 assert.match(sql,/converted','closed','lost/);
 assert.match(sql,/crm_invalid_interest/);
 assert.match(sql,/crm_conversation_not_found/);
 assert.doesNotMatch(sql,/\b(?:INSERT|UPDATE|DELETE)\s+(?:INTO\s+|FROM\s+)?public\.orders\b|automatic_sends_enabled\s*=\s*true/i);
});
test("rascunho aparece antes do vencimento, sem disponibilizar link de envio",()=>{
 assert.match(ui,/item\.status==="waiting_customer" && item\.follow_up_status==="pending"/);
 assert.match(ui,/!isDue && <p className="crm-due-info">Rascunho preparado para revisão/);
 assert.match(ui,/isDue && \(eligible && !possiblePurchase/);
 assert.match(ui,/crmSuggestedMessage\(draftInterest,signal\?\.ad_name,mention\?\.product_id\)/);
 assert.match(ui,/crmWhatsAppLink\(item\.phone_e164,draftInterest,signal\?\.ad_name,mention\?\.product_id\)/);
 assert.match(ui,/const draftInterest = item\.interest_label/);
});
test("cards compactos exibem produto e pesquisa encontra menção identificada",()=>{
 assert.match(ui,/Cliente mencionou: /);
 assert.match(ui,/Anúncio relacionado: /);
 assert.match(ui,/Confirmado: /);
 assert.match(ui,/crmMentionedProductName\(mentions\[item\.conversation_id\]\?\.product_id\)/);
 assert.match(ui,/\[visible,search,signals,mentions,view\]/);
 assert.match(css,/\.crm-product-recap/);
 assert.match(css,/\.crm-confirm-product/);
});
test("aviso não afirma que automação envia mensagens nem que menção é compra",()=>{
 assert.match(ui,/nenhuma mensagem é enviada automaticamente/);
 assert.match(ui,/Não confirma pedido, escolha final nem autorização para disparo/);
 assert.doesNotMatch(ui,/graph\.facebook\.com|automatic_sends_enabled\s*=\s*true/);
});
