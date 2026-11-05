import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  DELIVERY_LOCALITIES, normalizeDeliverySearch, searchDeliveryLocalities,
  deliveryLocalityById, deliveryLocalityByExactName, deliveryLegacyLocality, deliveryLocalityCanQuote,
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
  // 20 zonas especiais herdadas + 5 exemplos urbanos citados pelo proprietário.
  // Os outros 54 candidatos urbanos e 35 sem associação NÃO cobram automaticamente.
  assert.equal(DELIVERY_LOCALITIES.filter(locality => locality.status === "quoted").length, 25);
  assert.equal(DELIVERY_LOCALITIES.filter(locality => locality.zoneId === "cidade" && !deliveryLocalityCanQuote(locality)).length, 54);
  assert.equal(DELIVERY_LOCALITIES.filter(locality => !locality.zoneId).length, 35);
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
  assert.equal(deliveryLocalityById("ouro-preto").zoneId, "cidade");
  assert.equal(deliveryLocalityById("ouro-preto").status, "needs_review");
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
  assert.throws(() => quoteFulfillment(delivery("promissao-iv", "cidade")), /taxa de entrega confirmada/);
  assert.throws(() => quoteFulfillment(delivery("ouro-preto", "cidade")), /taxa de entrega confirmada/);
  assert.throws(() => quoteFulfillment(delivery("jaderlandia", "cidade")), /taxa de entrega confirmada/);
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
  assert.match(picker, /query\.trim\(\)\.length >= 2 && results\.length === 0/);
});
