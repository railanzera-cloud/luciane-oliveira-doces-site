import test from "node:test";
import assert from "node:assert/strict";
import {
  crmCatalogAvailability, crmFriendlyAge, crmFriendlyReminder,
  crmRecentlyActive,
} from "../lib/crm-operacao.ts";
import { crmSuggestedMessage } from "../lib/crm-follow-up.ts";

const stock = [
  { item_key:"slice_chocolate_morango", name:"Chocolate com Morango", status:"sold_out", category_key:"category_fatias" },
  { item_key:"slice_prestigio", name:"Prestígio", status:"sold_out", category_key:"category_fatias" },
  { item_key:"cone_prestigio", name:"Prestígio", status:"available", category_key:"category_cones" },
];

test("estoque esgotado aparece para produto confirmado sem inferir quantidade", () => {
  assert.equal(crmCatalogAvailability("Chocolate com Morango",stock)?.status,"sold_out");
  assert.equal(crmCatalogAvailability("chocolate COM morango",stock)?.item_key,"slice_chocolate_morango");
});

test("produto não confirmado ou ambíguo não recebe status inventado", () => {
  assert.equal(crmCatalogAvailability(null,stock),null);
  assert.equal(crmCatalogAvailability("Prestígio",stock),null);
  assert.equal(crmCatalogAvailability("Prestígio",stock,"slice_prestigio")?.status,"sold_out");
  assert.equal(crmCatalogAvailability("Não existe",stock),null);
});

test("48 horas define fila de conversas recentes sem autorizar envio", () => {
  const now=Date.parse("2026-11-15T02:30:00.000Z");
  assert.equal(crmRecentlyActive("2026-11-15T02:20:00.000Z",now),true);
  assert.equal(crmRecentlyActive("2026-11-12T02:20:00.000Z",now),false);
  assert.equal(crmRecentlyActive("2026-11-15T03:00:00.000Z",now),false);
  assert.equal(crmRecentlyActive(null,now),false);
});

test("lembrete antigo não sugere urgência falsa em minutos", () => {
  const now=Date.parse("2026-11-15T02:30:00.000Z");
  assert.match(crmFriendlyReminder("2026-11-02T17:03:00.000Z",now),/Lembrete antigo/);
  assert.match(crmFriendlyReminder("2026-11-15T02:15:00.000Z",now),/conferir agora/);
  assert.equal(crmFriendlyAge("2026-11-15T02:29:30.000Z",now),"Agora mesmo");
});

test("rascunho personalizado não afirma escassez ou preço não observados", () => {
  const draft=crmSuggestedMessage("Chocolate com Morango");
  assert.match(draft,/Chocolate com Morango/);
  assert.doesNotMatch(draft,/últimas unidades|restam|esgotando|desconto de|somente hoje/i);
  const fromAd=crmSuggestedMessage(null,"Anúncio Chocolate com Morango");
  assert.match(fromAd,/anúncio/);
  assert.doesNotMatch(fromAd,/você pediu|você comprou/i);
});
