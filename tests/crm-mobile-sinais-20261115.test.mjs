import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const root=(p)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const ui=root("components/admin-crm-panel.tsx");
const css=root("components/admin-crm-panel.css");

test("sinais recentes não são apresentados como mensagens verificadas",()=>{
  assert.match(ui,/Atividade recente/);
  assert.match(ui,/Registros de entrada das últimas 48 horas/);
  assert.match(ui,/Confirme as mensagens reais no WhatsApp/);
  assert.doesNotMatch(ui,/Conversas com mensagem recebida nas últimas 48 horas/);
});

test("ausência de saída registrada não presume que a Luciane não respondeu",()=>{
  assert.match(ui,/Sem saída registrada \(\{newLeads.length\}\)/);
  assert.match(ui,/Isso NÃO significa que a loja deixou de responder/);
  assert.doesNotMatch(ui,/Sem resposta da loja \(\{newLeads.length\}\)/);
});

test("o CRM do iPhone apresenta oportunidade antes do diagnóstico e evita contadores duplicados",()=>{
  assert.match(ui,/<details className="crm-observed-times">/);
  assert.match(ui,/<summary>Consultar horários registrados<\/summary>/);
  assert.match(ui,/<details className="crm-manual-product">/);
  assert.match(ui,/Produto não encontrado\? Informar manualmente/);
  assert.match(css,/@media\(max-width:700px\)/);
  assert.match(css,/\.crm-panel \.crm-briefing-numbers\{display:none\}/);
});

test("registro de consentimento exige evidência explícita; nenhuma automação ou pagamento acionado",()=>{
  assert.match(ui,/autorização comercial explícita, com evidência verificável na conversa/);
  assert.match(ui,/Visitar o site ou comprar não autoriza mensagens promocionais/);
  assert.match(ui,/crm_assisted_followup_review/);
  assert.match(ui,/crm_assisted_record_send/);
  assert.doesNotMatch(ui,/automatic_sends_enabled\s*=\s*true|graph\.facebook\.com\/.*\/messages/);
});
