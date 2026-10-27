import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read=p=>fs.readFileSync(new URL("../"+p,import.meta.url),"utf8");
const css=read("app/globals.css");
const crmcss=read("components/admin-crm-panel.css");
const ui=read("components/admin-crm-panel.tsx");

test("abas do admin sao estaticas no mobile sem alterar desktop/loja",()=>{
 const scoped=css.slice(css.lastIndexOf("CRM mobile Safari"));
 assert.match(scoped,/@media \(max-width: 700px\)/);
 assert.match(scoped,/\.admin-page \.admin-main-tabs/);
 assert.match(scoped,/position: relative/);
 assert.match(scoped,/top: auto/);
 assert.doesNotMatch(scoped,/\.storefront|\.mobile-sticky-bar/);
 assert.match(css,/\.admin-main-tabs\s*\{\s*position: sticky/);
});
test("diagnosticos acessiveis e recolhidos por padrao",()=>{
 assert.match(ui,/<details className="crm-engine-details">/);
 assert.match(ui,/<summary>O que falta para ativar o envio automático/);
 assert.match(ui,/<details className="crm-audit-reasons">/);
 assert.match(ui,/audit\.blockers\.map\(code/);
 assert.match(crmcss,/\.crm-engine-details>summary:focus-visible/);
 assert.match(crmcss,/\.crm-audit-reasons>summary:focus-visible/);
});
test("lista paginada somente visualmente, sem truncar dados",()=>{
 assert.match(ui,/const \[listLimit, setListLimit\] = useState\(15\)/);
 assert.match(ui,/setListLimit\(15\); \}, \[view, search, onlyWithProduct\]/);
 assert.match(ui,/filteredVisible\.slice\(0, listLimit\)/);
 assert.match(ui,/displayedVisible\.map\(item/);
 assert.match(ui,/setListLimit\(previous=>previous\+15\)/);
 assert.match(ui,/candidates\.slice\(0,listLimit\)/);
 assert.match(ui,/crm_list_opportunities/);
});
test("refresh em segundo plano nao esconde a lista do CRM",()=>{
 assert.match(ui,/const \[loading, setLoading\] = useState\(true\)/);
 assert.match(ui,/const \[refreshing, setRefreshing\] = useState\(false\)/);
 assert.match(ui,/setRefreshing\(true\)/);
 assert.match(ui,/setLoading\(false\); setRefreshing\(false\)/);
 assert.doesNotMatch(ui,/const refresh = useCallback\(async \(\) => \{\s*setLoading\(true\)/);
});
test("sinal tintim diferente de mensagem e automacao permanece desligada",()=>{
 assert.match(ui,/Cadastro\/etapa Tintim atualizada:/);
 assert.match(ui,/Fatia mencionada pelo cliente:/);
 assert.match(ui,/Salvar produto confirmado/);
 assert.match(ui,/crm_automation_operational_report/);
 assert.match(ui,/crm_automation_queue_items/);
 assert.match(ui,/nenhuma mensagem é enviada automaticamente/);
 assert.doesNotMatch(ui,/graph\.facebook\.com|automatic_sends_enabled\s*=\s*true/i);
});
