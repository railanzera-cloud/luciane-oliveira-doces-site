// Auditoria pré-release das tarifas, sem consultar pedidos ou alterar Supabase.
// Execute: node scripts/audit-delivery-contract.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  DELIVERY_LOCALITIES, deliveryLocalityCanQuote,
  normalizeDeliverySearch, searchDeliveryLocalities,
} from "../supabase/functions/_shared/delivery-localities.mjs";
import {
  DELIVERY_ZONES, quoteFulfillment,
} from "../supabase/functions/_shared/commerce-catalog.mjs";

const sampleAddress = { street: "Rua Teste", number: "12" };
const totals = { all: 0, quoted: 0, pending: 0, special: 0, urbanQuoted: 0, urbanPending: 0 };
const ids = new Set();

for (const locality of DELIVERY_LOCALITIES) {
  assert.ok(locality.id && locality.label, "Identificador e nome obrigatórios.");
  assert.ok(!ids.has(locality.id), `ID de localidade duplicado: ${locality.id}`);
  ids.add(locality.id);
  totals.all++;
  if (locality.zoneId !== null) {
    assert.ok(Object.hasOwn(DELIVERY_ZONES, locality.zoneId),
      `Zona inexistente no catálogo de preços: ${locality.id}`);
  }
  const quoteInput = {
    type: "delivery", locality_id: locality.id,
    zone_id: locality.zoneId ?? "cidade", neighborhood: locality.label,
    ...sampleAddress,
  };
  if (deliveryLocalityCanQuote(locality)) {
    const quote = quoteFulfillment(quoteInput);
    assert.equal(quote.delivery_zone_id, locality.zoneId, locality.id);
    assert.equal(quote.neighborhood, locality.label, locality.id);
    assert.equal(quote.delivery_fee_cents, DELIVERY_ZONES[locality.zoneId].priceCents, locality.id);
    assert.ok(Number.isSafeInteger(quote.delivery_fee_cents) && quote.delivery_fee_cents > 0);
    totals.quoted++;
    if (locality.zoneId === "cidade") totals.urbanQuoted++;
    else totals.special++;
  } else {
    assert.throws(() => quoteFulfillment(quoteInput), /taxa de entrega confirmada/,
      `Localidade pendente não pode cotar: ${locality.id}`);
    totals.pending++;
    if (locality.zoneId === "cidade") totals.urbanPending++;
  }
  for (const alias of locality.aliases) {
    assert.ok(normalizeDeliverySearch(alias), `Alias vazio: ${locality.id}`);
    assert.ok(searchDeliveryLocalities(alias).some(candidate => candidate.id === locality.id),
      `Alias não encontra a própria localidade: ${locality.id} / ${alias}`);
  }
}

assert.deepEqual(totals, {
  all: 114, quoted: 25, pending: 89,
  special: 20, urbanQuoted: 5, urbanPending: 54,
}, "Aprovação de novas localidades requer atualização consciente da matriz de homologação.");

assert.equal(quoteFulfillment({ type: "pickup" }).delivery_fee_cents, 0);
for (const zoneId of ["__proto__", "constructor", "toString", "hasOwnProperty"]) {
  assert.throws(() => quoteFulfillment({
    type: "delivery", zone_id: zoneId, locality_id: "promissao-ii", ...sampleAddress,
  }), /região de entrega válida/);
}
for (const file of ["create-order", "create-whatsapp-order"]) {
  const handler = await readFile(new URL(`../supabase/functions/${file}/index.ts`, import.meta.url), "utf8");
  assert.match(handler, /quoteFulfillment\(input\.fulfillment\)/,
    `${file} deve usar o catálogo compartilhado no backend`);
  assert.match(handler, /\.\.\.fulfillment/,
    `${file} deve persistir o resultado validado, não o preço do navegador`);
}
console.log("Contrato comercial de entrega verificado (pré-release, sem deploy):");
console.log(JSON.stringify(totals, null, 2));
console.log("Nenhuma localidade pendente cotável; retirada grátis; tarifa validada nos dois canais.");
