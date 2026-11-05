import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  DELIVERY_LOCALITIES, OWNER_CONFIRMED_TEN, normalizeDeliverySearch, searchDeliveryLocalities,
  deliveryLocalityById, deliveryLocalityByExactName, deliveryLegacyLocality, deliveryLocalityCanQuote,
  deliveryLocalityTextMatches, deliveryLegacyReviewState, deliveryLegacySpecificCandidate, deliveryLegacySpecialMentionCount,
} from "../supabase/functions/_shared/delivery-localities.mjs";
import {
  DELIVERY_ZONES, quoteFulfillment, deliveryZoneMismatchMessage,
} from "../supabase/functions/_shared/commerce-catalog.mjs";
import {
  queryAfterDeliverySelectionChange, deliverySuggestionLayout,
} from "../components/delivery-picker-logic.mjs";

test("catalogue includes 114 distinct known locality candidates, without default fares", () => {
  assert.equal(DELIVERY_LOCALITIES.length, 114);
  assert.equal(new Set(DELIVERY_LOCALITIES.map(locality => locality.id)).size, 114);
  for (const locality of DELIVERY_LOCALITIES) {
    assert.ok(locality.id && locality.label);
    if (locality.zoneId) assert.ok(DELIVERY_ZONES[locality.zoneId], locality.id);
    else assert.equal(locality.status, "needs_review");
    assert.equal(deliveryLocalityCanQuote(locality), locality.status === "quoted");
  }
  // 20 especiais herdadas, 5 exemplos urbanos prévios e 33 localidades
  // agora homologadas pelo proprietário: 28 a R$ 8 + 5 a R$ 10.
  assert.equal(DELIVERY_LOCALITIES.filter(locality => locality.status === "quoted").length, 58);
  assert.equal(DELIVERY_LOCALITIES.filter(locality => locality.zoneId === "cidade" && !deliveryLocalityCanQuote(locality)).length, 30);
  assert.equal(DELIVERY_LOCALITIES.filter(locality => !locality.zoneId).length, 26);
});

test("33 operator-confirmed localities have the exact approved delivery fees", () => {
  const ten = ["ouro-preto","juparana","aragao","laercio-cabeline","sidney-rosa"];
  const eight = [
    "tropical","camboata","jardim-atlantico","cidade-nova","celio-miranda",
    "jaderlandia","uraim","morada-verde","angelim","morada-dos-ventos",
    "nova-conquista","morada-do-sol","parica","presidente-juscelino","promissao",
    "jardelandia","novo-horizonte","camboata-ii","guanabara","nova-esperanca",
    "olga-moreira","uraim-i","jardim-bela-vista","bela-vista","guilherme-gabriel",
    "industrial","promissao-iv","setor-industrial",
  ];
  assert.equal(eight.length, 28);
  assert.equal(ten.length, 5);
  assert.deepEqual([...OWNER_CONFIRMED_TEN].sort(), [...ten].sort());
  for (const [id,expected] of [...eight.map(id => [id, 800]), ...ten.map(id => [id, 1000])]) {
    const locality = deliveryLocalityById(id);
    assert.ok(locality, id);
    assert.equal(locality.status, "quoted", id);
    assert.equal(quoteFulfillment(delivery(id, locality.zoneId)).delivery_fee_cents, expected, id);
  }
  assert.equal(deliveryLocalityById("juparana").zoneId, "juparana");
  assert.equal(deliveryLocalityById("juparana-empresa").zoneId, "juparana-empresa");
  assert.equal(quoteFulfillment(delivery("juparana-empresa", "juparana-empresa")).delivery_fee_cents, 1000);
  assert.equal(DELIVERY_LOCALITIES.filter(locality => !deliveryLocalityCanQuote(locality)).length, 56);
  assert.equal(deliveryLocalityById("laercio-cabeline-ii").status, "needs_review",
    "confirmation of Laércio Cabeline must not release Laércio Cabeline II");
});

test("Portuguese spelling, roman numerals and common name variants find the intended place", () => {
  assert.equal(normalizeDeliverySearch("Promissão II"), "promissao 2");
  assert.equal(normalizeDeliverySearch("Promissao 2"), "promissao 2");
  assert.equal(searchDeliveryLocalities("promissao 2")[0].id, "promissao-ii");
  assert.equal(searchDeliveryLocalities("açaisal")[0].id, "acaizal");
  assert.equal(searchDeliveryLocalities("Saisal")[0].id, "acaizal");
  assert.equal(searchDeliveryLocalities("nagibao")[0].id, "nagibao");
  assert.equal(searchDeliveryLocalities("florbiante")[0].id, "flamboyant");
  assert.equal(deliveryLocalityByExactName("AÇAISAL").id, "acaizal");
  assert.equal(deliveryLegacyLocality("cidade", "Promissão III").id, "promissao-iii");
});

test("specific rates override generic city, including official neighborhood names", () => {
  assert.equal(deliveryLocalityById("acaizal").zoneId, "acaizal");
  assert.equal(deliveryLocalityById("nagibao").zoneId, "nagibao");
  assert.equal(deliveryLocalityById("promissao-ii").zoneId, "cidade");
  assert.equal(deliveryLocalityById("jardim-elandia-grafia-a-confirmar").zoneId, null);
  assert.equal(deliveryLocalityById("area-rural-de-paragominas").zoneId, null);
  assert.equal(deliveryLocalityById("ouro-preto").zoneId, "ouro-preto");
  assert.equal(deliveryLocalityById("ouro-preto").status, "quoted");
  assert.equal(deliveryLocalityById("flamboyant").status, "quoted");
});

const delivery = (localityId, zoneId, neighborhood = deliveryLocalityById(localityId)?.label) => ({
  type: "delivery", locality_id: localityId, zone_id: zoneId,
  neighborhood, street: "Rua Exemplo", number: "12",
});
test("server binds the selected locality to the price and canonical name", () => {
  let quote = quoteFulfillment(delivery("promissao-ii", "cidade"));
  assert.equal(quote.delivery_fee_cents, 800);
  assert.equal(quote.neighborhood, "Promissão II");
  quote = quoteFulfillment({ ...delivery("acaizal", "acaizal"), delivery_fee_cents: 0 });
  assert.equal(quote.delivery_fee_cents, 1000, "do not trust browser price");
  assert.equal(quote.delivery_zone_id, "acaizal");
  quote = quoteFulfillment(delivery("nagibao", "nagibao"));
  assert.equal(quote.delivery_fee_cents, 4000);
  assert.equal(quoteFulfillment({ type:"pickup" }).delivery_fee_cents, 0);
});

test("cannot claim special destinations at city rate, including edited payloads", () => {
  assert.throws(() => quoteFulfillment(delivery("acaizal", "cidade")), /Bairro e taxa/);
  assert.throws(() => quoteFulfillment(delivery("nagibao", "cidade")), /Bairro e taxa/);
  assert.throws(() => quoteFulfillment(delivery("promissao-ii", "acaizal")), /Bairro e taxa/);
  assert.throws(() => quoteFulfillment(delivery("acaizal", "acaizal", "Promissão II")), /bairro informado não corresponde/i);
  assert.throws(() => quoteFulfillment(delivery("nao-existe", "cidade")), /Selecione um bairro/);
  assert.equal(quoteFulfillment(delivery("promissao-iv", "cidade")).delivery_fee_cents, 800);
  assert.throws(() => quoteFulfillment(delivery("ouro-preto", "cidade")), /Bairro e taxa/);
  assert.throws(() => quoteFulfillment(delivery("juparana", "cidade")), /Bairro e taxa/);
  assert.equal(quoteFulfillment(delivery("jaderlandia", "cidade")).delivery_fee_cents, 800);
  assert.throws(() => quoteFulfillment(delivery("flamboyant", "acaizal")), /Bairro e taxa/);
});

test("legacy free-text guard catches special alias rather than only exact label", () => {
  assert.match(deliveryZoneMismatchMessage("cidade", "Açaisal"), /Açaizal/);
  assert.match(deliveryZoneMismatchMessage("cidade", "Saisal"), /Açaizal/);
  assert.match(deliveryZoneMismatchMessage("cidade", "Nagib Demachki"), /Nagibão/);
  assert.throws(() => quoteFulfillment({
    type: "delivery", zone_id: "cidade", neighborhood: "Açaisal",
    street: "Rua Exemplo", number: "12",
  }), /taxa de entrega específica/);
});


test("legacy checkout detects special destinations with typos and extra delivery directions", () => {
  const specialExamples = [
    ["Açaizal próximo à praça", "Açaizal"],
    ["Açaisall", "Açaizal"],
    ["Nagibaoo", "Nagibão"],
    ["Bairro Novo Canaã, ao lado do mercado", "Bairro Novo Canaã"],
    ["perto da Floraplac MDF", "Floraplac MDF"],
    ["Juparanã Empresa, portaria lateral", "Juparanã Empresa"],
  ];
  for (const [entered, canonical] of specialExamples) {
    const candidate = deliveryLegacySpecificCandidate(entered);
    assert.ok(candidate, entered);
    assert.match(deliveryZoneMismatchMessage("cidade", entered), /taxa de entrega específica/, entered);
    assert.throws(() => quoteFulfillment({
      type:"delivery", zone_id:"cidade", neighborhood:entered,
      street:"Rua Exemplo", number:"12",
    }), /taxa de entrega específica/, entered);
    assert.equal(DELIVERY_ZONES[candidate.zoneId].priceCents > 800, true);
  }
  for (const city of ["Promissão II", "Flamboyant", "Cidade Nova", "Jaderlândia"]) {
    assert.equal(deliveryLegacySpecificCandidate(city), null, city);
    assert.equal(deliveryZoneMismatchMessage("cidade", city), "", city);
  }
  assert.equal(deliveryLegacySpecificCandidate("Açaizal ou Aeroporto"), null,
    "não escolher uma das duas regiões especiais quando ambas aparecem no texto");
  assert.equal(deliveryLegacySpecialMentionCount("Açaizal ou Aeroporto"), 2);
  assert.match(deliveryZoneMismatchMessage("cidade", "Açaizal ou Aeroporto"), /mais de uma região/);
  assert.throws(() => quoteFulfillment({
    type: "delivery", zone_id: "cidade", neighborhood: "Açaizal ou Aeroporto",
    street: "Rua Exemplo", number: "12",
  }), /mais de uma região/);
  assert.equal(deliveryLegacySpecialMentionCount("Juparanã"), 1);
  assert.equal(deliveryLegacySpecialMentionCount("Juparanã Empresa, portaria lateral"), 1);
  assert.equal(deliveryLegacySpecificCandidate("Juparanã Empresa, portaria lateral")?.id, "juparana-empresa");
  assert.equal(deliveryLegacySpecificCandidate("Juparanã")?.id, "juparana");
  assert.equal(deliveryLegacySpecificCandidate("abc"), null);
});


test("legacy review gate supports phased rollout without changing old clients by default", () => {
  assert.equal(deliveryLegacyReviewState("Alto do Vale"), "pending");
  assert.equal(deliveryLegacyReviewState("Laércio Cabeline II"), "pending");
  assert.equal(deliveryLegacyReviewState("Cidade Nova"), "quoted");
  assert.equal(deliveryLegacyReviewState("Sidney Rosa"), "quoted");
  assert.equal(deliveryLegacyReviewState("Centro"), "unknown");
  assert.equal(deliveryLegacyReviewState(""), "unknown");
  const legacy = neighborhood => ({
    type: "delivery", zone_id: "cidade", neighborhood,
    street: "Rua Exemplo", number: "12",
  });
  // Sem o flag, a fase de deploy backend compatível NÃO rejeita uma aba antiga.
  assert.equal(quoteFulfillment(legacy("Alto do Vale")).delivery_fee_cents, 800);
  const previousDeno = globalThis.Deno;
  try {
    globalThis.Deno = { env: { get: key => key === "DELIVERY_LEGACY_REVIEW_GUARD" ? "true" : undefined } };
    for (const neighborhood of ["Alto do Vale", "Laércio Cabeline II"]) {
      assert.throws(() => quoteFulfillment(legacy(neighborhood)), /precisa de confirmação da taxa/,
        "O modo intermediário bloqueia apenas locais conhecidos e pendentes.");
    }
    assert.equal(quoteFulfillment(legacy("Cidade Nova")).delivery_fee_cents, 800,
      "Bairro homologado segue aceito em aba antiga.");
    assert.equal(quoteFulfillment(legacy("Centro")).delivery_fee_cents, 800,
      "Localidade não reconhecida ainda depende do flag estrito posterior.");
    assert.equal(quoteFulfillment(delivery("juparana", "juparana")).delivery_fee_cents, 1000,
      "A flag não interfere na escolha explícita de uma tarifa especial.");
    assert.throws(() => quoteFulfillment(delivery("alto-do-vale", "cidade")), /taxa de entrega confirmada/,
      "O novo checkout rejeita locais pendentes independentemente de flags.");
  } finally {
    if (previousDeno === undefined) delete globalThis.Deno;
    else globalThis.Deno = previousDeno;
  }
});

test("both order channels transmit locality ID and preserve their existing checkout behavior", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const picker = await readFile(new URL("../components/delivery-locality-picker.tsx", import.meta.url), "utf8");
  assert.match(page, /<DeliveryLocalityPicker/);
  assert.match(page, /locality_id: deliveryLocalityId/g);
  assert.equal((page.match(/locality_id: deliveryLocalityId/g) ?? []).length, 2);
  assert.match(page, /deliveryLocalityId, neighborhood, address/);
  assert.match(page, /deliveryLocalityCanQuote\(selectedDeliveryLocality\) && selectedDeliveryZone/);
  assert.match(picker, /role="combobox"/);
  assert.match(picker, /aria-autocomplete="list"/);
  assert.match(picker, /onKeyDown=/);
  assert.match(picker, /A confirmar/);
  assert.match(picker, /deliveryLocalityCanQuote\(locality\)/);
  assert.match(picker, /deliveryLocalityCanQuote\(selected\)/);
  assert.doesNotMatch(page, /Outro bairro dentro da cidade/);
});


test("search field preserves active typing but resets when external selection changes", () => {
  assert.equal(queryAfterDeliverySelectionChange({
    previousId: "promissao-i", nextId: "", nextLabel: "",
    clearedByTyping: true,
  }), null, "the text being typed must not disappear when onClear fires");
  assert.equal(queryAfterDeliverySelectionChange({
    previousId: "promissao-i", nextId: "", nextLabel: "",
    clearedByTyping: false,
  }), "", "external clearing should reset a stale selected name");
  assert.equal(queryAfterDeliverySelectionChange({
    previousId: "promissao-i", nextId: "acaizal", nextLabel: "Açaizal",
  }), "Açaizal", "new selection updates input");
  assert.equal(queryAfterDeliverySelectionChange({
    previousId: "acaizal", nextId: "acaizal", nextLabel: "Açaizal",
  }), null, "unrelated rerenders must not overwrite a user's search");
});

test("iPhone visual viewport positions results away from the virtual keyboard", () => {
  const compact = deliverySuggestionLayout({
    fieldTop: 235, fieldBottom: 287, viewportTop: 0, viewportHeight: 360,
  });
  assert.equal(compact.placement, "above", "not enough room under input");
  assert.ok(compact.maxHeight <= 223 && compact.maxHeight >= 72);
  const regular = deliverySuggestionLayout({
    fieldTop: 120, fieldBottom: 172, viewportTop: 0, viewportHeight: 760,
  });
  assert.equal(regular.placement, "below");
  assert.equal(regular.maxHeight, 320);
  const scrolled = deliverySuggestionLayout({
    fieldTop: 400, fieldBottom: 450, viewportTop: 320, viewportHeight: 280,
  });
  assert.equal(scrolled.placement, "below");
  assert.ok(scrolled.maxHeight <= 138);
  assert.equal(deliverySuggestionLayout({ fieldTop: 0, fieldBottom: 0 }).maxHeight, 72);
});

test("dropdown is full-width on desktop and adapts to visualViewport on mobile", async () => {
  const picker = await readFile(new URL("../components/delivery-locality-picker.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/delivery-locality.css", import.meta.url), "utf8");
  assert.match(picker, /clearingByTypingRef\.current = true/);
  assert.match(picker, /queryAfterDeliverySelectionChange/);
  assert.match(picker, /window\.visualViewport\?\.addEventListener\("resize"/);
  assert.match(picker, /data-placement=\{listPlacement\}/);
  assert.match(css, /delivery-fields > \.delivery-locality-picker,[\s\S]*grid-column:1 \/ -1/);
  assert.match(css, /delivery-locality-results\[data-placement="above"\]/);
  assert.match(picker, /results\.length === 0/);
  assert.match(picker, /query\.trim\(\)\.length >= 2 && \(results\.length === 0 \|\| approximateResults\)/);
});


test("misspellings suggest candidates, never automatically select or quote their rates", () => {
  const matches = searchDeliveryLocalities("promisao 2");
  assert.ok(matches.length > 0, "one missing letter can yield suggestions");
  assert.equal(matches[0].id, "promissao-ii");
  assert.equal(deliveryLocalityTextMatches("promisao 2", matches[0]), false);
  assert.equal(searchDeliveryLocalities("nagibaoo")[0]?.id, "nagibao");
  assert.equal(searchDeliveryLocalities("saizal")[0]?.id, "acaizal", "explicit alias remains higher priority");
  assert.deepEqual(searchDeliveryLocalities("xx"), [], "very short unknown queries must not generate noise");
  assert.deepEqual(searchDeliveryLocalities("x".repeat(80)), [], "pasted text cannot launch expensive fuzzy work");
  // The new search does NOT create IDs or grant any rate to an unreviewed area.
  assert.equal(deliveryLocalityByExactName("promisao 2"), null);
  assert.throws(() => quoteFulfillment(delivery("promisao-ii", "cidade")), /Selecione um bairro/);
  assert.throws(() => quoteFulfillment(delivery("alto-do-vale", "cidade")), /taxa de entrega confirmada/);
  const afterSelection = quoteFulfillment(delivery(matches[0].id, "cidade"));
  assert.equal(afterSelection.neighborhood, "Promissão II");
  assert.equal(afterSelection.delivery_fee_cents, 800);
});

test("touch selection remains mounted until click and remains keyboard accessible", async () => {
  const picker = await readFile(new URL("../components/delivery-locality-picker.tsx", import.meta.url), "utf8");
  assert.match(picker, /pointerInsideOptionsRef\.current/);
  assert.match(picker, /onPointerDownCapture=/);
  assert.match(picker, /onPointerCancel=/);
  assert.match(picker, /onClick=\{\(\) => choose\(locality\)\}/);
  assert.match(picker, /onKeyDown=/);
  assert.match(picker, /Sugestões parecidas/);
  assert.match(picker, /deliveryLocalityTextMatches/);
  assert.match(picker, /maxLength=\{80\}/);
});


test("tampered zone identifiers cannot resolve inherited object members or affect pricing", () => {
  for (const unsafe of ["__proto__", "constructor", "toString", "hasOwnProperty", "prototype"]) {
    assert.throws(() => quoteFulfillment({
      type: "delivery", zone_id: unsafe, neighborhood: "Promissão II",
      locality_id: "promissao-ii", street: "Rua Exemplo", number: "12",
    }), /região de entrega válida/i, unsafe);
    assert.equal(deliveryZoneMismatchMessage(unsafe, "Açaizal"), "", unsafe);
  }
  assert.throws(() => quoteFulfillment({
    type: "delivery", zone_id: "cidade", locality_id: "acaizal",
    street: "Rua Exemplo", number: "12",
  }), /Bairro e taxa de entrega não correspondem/);
  assert.equal(quoteFulfillment(delivery("promissao-ii", "cidade")).delivery_fee_cents, 800);
  assert.equal(quoteFulfillment(delivery("acaizal", "acaizal")).delivery_fee_cents, 1000);
});

test("site and WhatsApp Edge handlers both use the same server delivery quote", async () => {
  const site = await readFile(new URL("../supabase/functions/create-order/index.ts", import.meta.url), "utf8");
  const whatsapp = await readFile(new URL("../supabase/functions/create-whatsapp-order/index.ts", import.meta.url), "utf8");
  const catalog = await readFile(new URL("../supabase/functions/_shared/commerce-catalog.mjs", import.meta.url), "utf8");
  for (const handler of [site, whatsapp]) {
    assert.match(handler, /quoteFulfillment\(input\.fulfillment\)/);
    assert.match(handler, /\.\.\.fulfillment/);
    assert.match(handler, /fulfillment\.delivery_fee_cents/);
  }
  assert.match(catalog, /Object\.hasOwn\(DELIVERY_ZONES, zoneId\)/);
  assert.match(catalog, /deliveryLocalityCanQuote\(locality\)/);
  assert.match(catalog, /locality\.zoneId !== zone\.id/);
});


test("summary makes unpriced delivery explicit without showing a misleading total", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const style = await readFile(new URL("../app/delivery-locality.css", import.meta.url), "utf8");
  assert.match(page, /fulfillment === "entrega" && !selectedDeliveryZone && \(/);
  assert.match(page, /className="summary-row summary-delivery-pending"/);
  assert.match(page, /<strong>A confirmar<\/strong>/);
  assert.match(page, /O total ficará disponível após confirmar a taxa do bairro/);
  assert.match(page, /cart\.length > 0 && \(/);
  assert.match(page, /fulfillment === "entrega" && selectedDeliveryZone && \(/);
  assert.match(style, /\.summary-delivery-pending-note/);
  assert.equal(quoteFulfillment({ type:"pickup" }).delivery_fee_cents, 0);
  assert.throws(() => quoteFulfillment(delivery("alto-do-vale", "cidade")), /taxa de entrega confirmada/);
});
