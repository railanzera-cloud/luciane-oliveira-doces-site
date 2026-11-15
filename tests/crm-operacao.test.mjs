import test from "node:test";
import assert from "node:assert/strict";
import {
  crmCatalogAvailability,crmCatalogOptions,crmFriendlyAge,crmFriendlyReminder,
  crmRecentlyActive,
} from "../lib/crm-operacao.ts";
import { crmSuggestedMessage } from "../lib/crm-follow-up.ts";

const stock = [
  { item_key:"slice_chocolate_morango",name:"Chocolate com Morango",item_type:"slice",status:"sold_out",category_key:"category_fatias" },
  { item_key:"slice_prestigio",name:"Prestígio",item_type:"slice",status:"sold_out",category_key:"category_fatias" },
  { item_key:"cone_prestigio",name:"Prestígio",item_type:"product",status:"available",category_key:"category_cones" },
  { item_key:"cascao_folheado_geleia_morango_ninho",name:"Folheado — Geleia de Morango com Ninho",item_type:"product",status:"sold_out",category_key:"category_cones" },
  { item_key:"cascao_kinder_bueno",name:"Kinder Bueno e Nutella",item_type:"product",status:"available",category_key:"category_cones" },
  { item_key:"non_sellable",name:"Chocolate com Morango",item_type:"category",status:"available",category_key:"category_fatias" },
];

test("catálogo identifica Chocolate com Morango esgotado, ignorando categorias", () => {
  assert.equal(crmCatalogAvailability("Chocolate com Morango",stock)?.status,"sold_out");
  assert.equal(crmCatalogAvailability("chocolate COM morango",stock)?.item_key,"slice_chocolate_morango");
});

test("produto ambíguo exige a categoria explicitada, não escolhe SKU pelo anúncio", () => {
  assert.equal(crmCatalogAvailability(null,stock),null);
  assert.equal(crmCatalogAvailability("Prestígio",stock),null);
  const names=crmCatalogOptions(stock).map(row=>row.label);
  assert.ok(names.includes("Cascão Trufado — Prestígio"));
  assert.ok(names.includes("Fatia Artesanal — Prestígio"));
  assert.equal(crmCatalogAvailability("Cascão Trufado — Prestígio",stock)?.status,"available");
  assert.equal(crmCatalogAvailability("Fatia Artesanal — Prestígio",stock)?.status,"sold_out");
  assert.equal(crmCatalogAvailability("Prestígio",stock,"slice_prestigio"),null);
  assert.equal(crmCatalogAvailability("Não existe",stock),null);
});

test("Folheado comercial e nome operacional resolvem somente o SKU exato", () => {
  const key="cascao_folheado_geleia_morango_ninho";
  assert.equal(crmCatalogAvailability("Folheado com Ninho e Morango",stock)?.item_key,key);
  assert.equal(crmCatalogAvailability("Folheado — Geleia de Morango com Ninho",stock)?.item_key,key);
  assert.equal(crmCatalogAvailability("Folheado com Ninho e Morango",stock)?.status,"sold_out");
  const o=crmCatalogOptions(stock).find(x=>x.item_key===key);
  assert.equal(o?.label,"Folheado com Ninho e Morango");
  assert.equal(crmCatalogAvailability("Morango",stock),null);
});

test("indicação disponível não comprova quantidade física nem autorização", () => {
  const product=crmCatalogAvailability("Kinder Bueno e Nutella",stock);
  assert.equal(product?.status,"available");
  assert.equal(product?.item_key,"cascao_kinder_bueno");
  assert.ok(crmCatalogOptions(stock).find(x=>x.item_key==="cascao_kinder_bueno"));
});

test("janela de recência apenas organiza fila, não autoriza envio", () => {
  const now=Date.parse("2026-11-15T02:30:00.000Z");
  assert.equal(crmRecentlyActive("2026-11-15T02:20:00.000Z",now),true);
  assert.equal(crmRecentlyActive("2026-11-12T02:20:00.000Z",now),false);
  assert.equal(crmRecentlyActive("2026-11-15T03:00:00.000Z",now),false);
  assert.equal(crmRecentlyActive(null,now),false);
});

test("lembrete antigo não sugere urgência falsa", () => {
  const now=Date.parse("2026-11-15T02:30:00.000Z");
  assert.match(crmFriendlyReminder("2026-11-02T17:03:00.000Z",now),/Lembrete antigo/);
  assert.match(crmFriendlyReminder("2026-11-15T02:15:00.000Z",now),/conferir agora/);
  assert.equal(crmFriendlyAge("2026-11-15T02:29:30.000Z",now),"Agora mesmo");
});

test("rascunho personalizado não inventa estoque, preço ou escassez", () => {
  const draft=crmSuggestedMessage("Chocolate com Morango");
  assert.match(draft,/Chocolate com Morango/);
  assert.doesNotMatch(draft,/últimas unidades|restam|esgotando|desconto de|somente hoje/i);
  const fromAd=crmSuggestedMessage(null,"Anúncio Chocolate com Morango");
  assert.match(fromAd,/anúncio/);
  assert.doesNotMatch(fromAd,/você pediu|você comprou/i);
});
