import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  crmEvidenceKind,crmEvidenceCopy,crmTriagePriority,crmInspectWhatsAppNumber
} from "../lib/crm-triagem.ts";

const official = {conversation_id:"conv",meta_last_inbound_at:"2026-11-15T12:30:00Z",
  tintim_last_inbound_at:"2026-11-15T12:31:00Z",tintim_time_basis:"webhook_received"};
const observed="2026-11-15T12:30:40Z";

test("somente evidência de Meta alinhada à conversa recebe classificação oficial",()=>{
  assert.equal(crmEvidenceKind(observed,official,true),"official_matching");
  assert.equal(crmEvidenceKind("2026-11-14T10:00:00Z",official,true),"official_historical");
  assert.match(crmEvidenceCopy("official_matching"),/Meta/);
  assert.match(crmEvidenceCopy("official_historical"),/anterior/);
});

test("horário do webhook Tintim nunca vira horário original verificado",()=>{
  const onlyTintim={...official,meta_last_inbound_at:null};
  assert.equal(crmEvidenceKind(observed,onlyTintim,true),"tintim_webhook_matching");
  assert.match(crmEvidenceCopy("tintim_webhook_matching"),/webhook/);
  assert.equal(crmEvidenceKind(observed,{...onlyTintim,tintim_time_basis:"provider_timestamp"},true),"tintim_provider_matching");
  assert.equal(crmEvidenceKind(null,onlyTintim,true),"tintim_historical");
});

test("ausência ou erro da RPC deve falhar de forma conservadora",()=>{
  assert.equal(crmEvidenceKind(observed,official,false),"unavailable");
  assert.equal(crmEvidenceKind(observed,undefined,true),"none");
  assert.equal(crmEvidenceKind("invalid",official,true),"official_historical");
  assert.doesNotMatch(crmEvidenceCopy("unavailable"),/comprovada|confirmada/i);
});

test("triagem por importância não libera clientes com compra sinalizada ou opt-out",()=>{
  const base={evidence:"tintim_webhook_matching",confirmedInterest:false,
    mentionedProduct:true,adHint:false,possiblePurchase:false,optedOut:false};
  assert.ok(crmTriagePriority({...base,evidence:"official_matching"})>crmTriagePriority(base));
  assert.ok(crmTriagePriority({...base,confirmedInterest:true})>crmTriagePriority(base));
  assert.equal(crmTriagePriority({...base,possiblePurchase:true}),-1);
  assert.equal(crmTriagePriority({...base,optedOut:true}),-1);
});

test("inspeção WhatsApp abre somente o número, sem texto de marketing",()=>{
  const link=crmInspectWhatsAppNumber("5591999887766");
  assert.equal(link,"https://wa.me/5591999887766");
  assert.doesNotMatch(link,/text=|utm_|[?]/);
  for(const phone of [null,"","911234567","5511<script>","5500000000000"]){
    assert.equal(crmInspectWhatsAppNumber(phone),null);
  }
});

test("RPC é só metadados, exige staff e não pode ser executada pelo anon",()=>{
  const sql=fs.readFileSync(new URL("../supabase/migrations/20261115135500_crm_conversation_evidence_staff_readonly.sql",import.meta.url),"utf8");
  assert.match(sql,/PERFORM public\.crm_require_staff\(\)/);
  assert.match(sql,/REVOKE ALL ON FUNCTION public\.crm_list_conversation_evidence\(\)/);
  assert.match(sql,/FROM PUBLIC, anon, authenticated/);
  assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.crm_list_conversation_evidence\(\)/);
  assert.match(sql,/TO authenticated/);
  assert.match(sql,/e\.provider='meta'/);
  assert.match(sql,/e\.time_basis/);
  assert.doesNotMatch(sql,/\b(?:INSERT INTO|UPDATE|DELETE FROM) public\./i);
  assert.doesNotMatch(sql,/message_body|phone_e164|consent_evidence|graph\.facebook/i);
});

test("painel mantém preflight para envio assistido, mas permite revisar número sem envio",()=>{
  const ui=fs.readFileSync(new URL("../components/admin-crm-panel.tsx",import.meta.url),"utf8");
  assert.match(ui,/crm_list_conversation_evidence/);
  assert.match(ui,/crmEvidenceKind\(/);
  assert.match(ui,/crmInspectWhatsAppNumber\(/);
  assert.match(ui,/href=\{inspectUrl\}/);
  assert.match(ui,/rel="noopener noreferrer"/);
  assert.match(ui,/const result = await checkAssisted\(item\)/);
  assert.match(ui,/crm_assisted_record_send/);
  assert.match(ui,/Você já respondeu manualmente a este cliente/);
  assert.match(ui,/Você verificou no WhatsApp que o cliente realmente respondeu/);
  assert.match(ui,/Você conferiu autorização comercial explícita/);
  assert.doesNotMatch(ui,/automatic_sends_enabled\s*=\s*true|graph\.facebook\.com\/.*\/messages/);
});
