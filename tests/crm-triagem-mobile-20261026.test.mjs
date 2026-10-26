import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read=p=>fs.readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("CRM tem triagem compacta, busca e resumo sem abrir todos os contatos",()=>{
 const view=read("components/admin-crm-panel.tsx");
 const css=read("components/admin-crm-panel.css");
 assert.match(view,/setSearch\(/);
 assert.match(view,/filteredVisible/);
 assert.match(view,/aria-label="Buscar contatos do CRM"/);
 assert.match(view,/setExpanded\(/);
 assert.match(view,/isExpanded &&/);
 assert.match(view,/Ver atendimento/);
 assert.match(view,/crm-card-compact/);
 assert.match(css,/\.crm-card-compact/);
 assert.match(css,/\.crm-search/);
 assert.match(view,/Triagem/);
});
test("acoes sensiveis sao explicitas e backend continua proprietario do follow-up",()=>{
 const view=read("components/admin-crm-panel.tsx");
 assert.match(view,/Já respondi · lembrar 45 min/);
 assert.match(view,/window\.confirm\("Confirmar que este cliente comprou/);
 assert.match(view,/window\.confirm\("O cliente pediu para não receber mensagens/);
 assert.match(view,/crm_record_action/);
 assert.match(view,/consent_granted/);
 assert.match(view,/commercial_opt_out/);
 assert.doesNotMatch(view,/graph\.facebook\.com\/v\d+.*\/messages/);
});
