// Read-only release gate: archived Supabase sources, immutable hashes and contract parity.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const at = (relative) => path.join(repoRoot, relative);
const manifest = JSON.parse(await readFile(at("docs/edge-release/rollback/20261105/manifest.json"), "utf8"));
const v14 = await import("../docs/edge-release/rollback/20261105/create-order-v14/commerce-catalog.mjs");
const v26 = await import("../docs/edge-release/rollback/20261105/create-whatsapp-order-v26/functions/_shared/commerce-catalog.mjs");
const candidate = await import("../supabase/functions/_shared/commerce-catalog.mjs");

test("live v14/v26 source archives have exact Git blob hashes and complete relative imports", async () => {
  assert.equal(manifest.project_id, "edqiwvccmboyayojvuea");
  assert.deepEqual(manifest.functions.map(fn => [fn.slug, fn.version]), [
    ["create-order", 14], ["create-whatsapp-order", 26],
  ]);
  assert.deepEqual(manifest.functions.map(fn => fn.files.length), [2, 5]);
  for (const fn of manifest.functions) {
    assert.equal(fn.verify_jwt, false);
    assert.match(fn.ezbr_sha256, /^[a-f0-9]{64}$/);
    for (const entry of fn.files) {
      assert.ok(entry.path.startsWith(fn.snapshot_root + "/"), "Path outside approved snapshot: " + entry.path);
      const buffer = await readFile(at(entry.path));
      const sha = createHash("sha1").update("blob " + buffer.length + "\0").update(buffer).digest("hex");
      assert.equal(sha, entry.git_blob_sha1, "Snapshot integrity mismatch: " + entry.path);
      const content = buffer.toString("utf8");
      assert.doesNotMatch(content, /\bBearer\s+eyJ|(?:sb_secret_|sk_live_|sk_test_)[A-Za-z0-9_-]{12,}/);
      for (const match of content.matchAll(/\bfrom\s*["'](\.{1,2}\/[^"']+)["']/g)) {
        const importPath = path.resolve(path.dirname(at(entry.path)), match[1]);
        assert.ok(importPath.startsWith(at(fn.snapshot_root) + path.sep), "Import escapes archive: " + entry.path);
        await access(importPath);
      }
    }
  }
});

test("all 21 original delivery tariff zones are preserved and only five approved special zones are added", () => {
  const siteIds = Object.keys(v14.DELIVERY_ZONES).sort();
  const waIds = Object.keys(v26.DELIVERY_ZONES).sort();
  assert.deepEqual(siteIds, waIds);
  assert.equal(waIds.length, 21);
  for (const id of waIds) {
    const original = v26.DELIVERY_ZONES[id];
    assert.deepEqual(v14.DELIVERY_ZONES[id], original, "Published channels differ in old tariff: " + id);
    assert.deepEqual(candidate.DELIVERY_ZONES[id], original, "Candidate changed old tariff: " + id);
    const address = { type: "delivery", zone_id: id,
      neighborhood: original.asksNeighborhood ? "Cidade Nova" : original.label,
      street: "Rua Teste", number: "12" };
    assert.equal(candidate.quoteFulfillment(address).delivery_fee_cents,
      v26.quoteFulfillment(address).delivery_fee_cents, "Legacy tab price drift: " + id);
  }
  const additions = Object.keys(candidate.DELIVERY_ZONES).filter(id => !waIds.includes(id)).sort();
  assert.deepEqual(additions, ["aragao", "juparana", "laercio-cabeline", "ouro-preto", "sidney-rosa"]);
  for (const id of additions) assert.equal(candidate.DELIVERY_ZONES[id].priceCents,
    id === "juparana" ? 800 : 1000,
    "Only Juparanã bairro was repriced by explicit owner correction; Empresa remains R$10");
  assert.equal(candidate.DELIVERY_ZONES["juparana-empresa"].priceCents, 1000);
  assert.equal(Object.keys(candidate.DELIVERY_ZONES).length, 26);
});

test("current WhatsApp catalogue quotes equal the deployed v26 source for 40 SKU combinations", () => {
  const fixedDate = Date.parse("2026-11-05T12:00:00-03:00");
  const items = [
    ...Object.keys(v26.SLICES).map(product_id =>
      ({ product_id, variant_id: "fatia", option_ids: [], quantity: 2 })),
    ...Object.entries(v26.CROCANTES).flatMap(([product_id, product]) =>
      Object.keys(product.sizes).map(variant_id =>
        ({ product_id, variant_id, option_ids: [], quantity: 2 }))),
    ...Object.keys(v26.POPCORN_SIZES).flatMap(variant_id =>
      Object.keys(v26.POPCORN_FLAVORS).map(flavor =>
        ({ product_id: "pipoca-gourmet", variant_id, option_ids: [flavor], quantity: 2 }))),
  ];
  assert.equal(items.length, 40, "Commercial SKU test matrix unexpectedly changed");
  for (const item of items) {
    assert.deepEqual(candidate.quoteCartItems([item], fixedDate),
      v26.quoteCartItems([item], fixedDate),
      "Price/availability drift for " + item.product_id + " " + item.variant_id + " " + item.option_ids.join(","));
  }
});

test("both Edge candidate entrypoints use validated shared fulfillment, without masking Mercado Pago drift", async () => {
  const site = await readFile(at("supabase/functions/create-order/index.ts"), "utf8");
  const whatsapp = await readFile(at("supabase/functions/create-whatsapp-order/index.ts"), "utf8");
  const oldSite = await readFile(at("docs/edge-release/rollback/20261105/create-order-v14/index.ts"), "utf8");
  const oldWa = await readFile(at("docs/edge-release/rollback/20261105/create-whatsapp-order-v26/functions/create-whatsapp-order/index.ts"), "utf8");
  // A única alteração autorizada no handler é a ponte estritamente limitada
  // à tarifa histórica de Juparanã; revertê-la deve reproduzir o handler original.
  const start = whatsapp.indexOf("    let cardQuote = receiptCardQuote(");
  const end = whatsapp.indexOf("    const totalCents = cardQuote.totalCents;", start);
  assert.ok(start > 0 && end > start, "Bloco de transição precisa ser rastreável");
  const oldPriceGate = [
    "    const cardQuote = receiptCardQuote(quote.subtotalCents + fulfillment.delivery_fee_cents, cardMode);",
    "    const expected = parseMoneyToCents(input.expected_total);",
    "    if (expected === null || expected !== cardQuote.totalCents) {",
    '      throw new HttpError(409, "price_changed", "O preço mudou. Atualize o cardápio e confira o total antes de continuar.");',
    "    }",
    "",
    "",
  ].join("\n");
  const restored = whatsapp.slice(0, start) + oldPriceGate + whatsapp.slice(end);
  assert.equal(restored, oldWa, "Nenhum trecho do handler pode mudar fora do gate Juparanã");
  assert.match(whatsapp, /delivery_zone_id === "juparana"/);
  assert.match(whatsapp, /fulfillment.delivery_fee_cents === 800/);
  assert.match(whatsapp, /historicalFeeCents = 1000/);
  assert.match(whatsapp, /expected === historicalQuote.totalCents/);
  for (const source of [site, whatsapp]) {
    assert.match(source, /\.\.\/_shared\/commerce-catalog\.mjs/);
    assert.match(source, /quoteFulfillment\(input\.fulfillment\)/);
    assert.match(source, /\.\.\.fulfillment/);
  }
  assert.match(oldSite, /\.\/commerce-catalog\.mjs/);
  assert.doesNotMatch(oldSite, /applyPopcornPromotionToQuote/);
  assert.match(site, /applyPopcornPromotionToQuote/);
  assert.doesNotMatch(oldSite, /locality_id/);
  assert.doesNotMatch(await readFile(at("docs/edge-release/rollback/20261105/create-whatsapp-order-v26/functions/_shared/commerce-catalog.mjs"), "utf8"), /locality_id/);
});


test("legacy Mercado Pago/site quote amounts and stock identities remain unchanged for 30 shared SKUs", async () => {
  // The v14 site catalogue does not contain all later products; compare only the
  // 6 older slices and 24 Gourmet size/flavour combinations. Never place an order.
  const now = Date.parse("2026-11-05T12:00:00-03:00");
  const cases = [
    ...Object.keys(v14.SLICES).map(product_id =>
      ({ product_id, variant_id: "fatia", option_ids: [], quantity: 2 })),
    ...Object.keys(v14.POPCORN_SIZES).flatMap(variant_id =>
      Object.keys(v14.POPCORN_FLAVORS).map(flavor =>
        ({ product_id: "pipoca-gourmet", variant_id, option_ids: [flavor], quantity: 2 }))),
  ];
  assert.equal(cases.length, 30);
  const { applyPopcornPromotionToQuote } = await import("../supabase/functions/_shared/popcorn-quote-campaign.mjs");
  const normalise = quote => ({
    subtotalCents: quote.subtotalCents,
    availabilityKeys: quote.availabilityKeys,
    items: quote.items.map(item => ({
      item_key: item.item_key, product_id: item.product_id, category_key: item.category_key,
      variant_id: item.variant_id, variant_item_key: item.variant_item_key,
      option_ids: item.option_ids, option_item_keys: item.option_item_keys,
      quantity: item.quantity, unit_price_cents: item.unit_price_cents,
      line_total_cents: item.line_total_cents,
    })),
  });
  for (const item of cases) {
    const oldQuote = v14.quoteCartItems([item]);
    const newQuote = candidate.quoteCartItems([item], now);
    const siteHandlerQuote = applyPopcornPromotionToQuote(newQuote, now);
    assert.deepEqual(normalise(siteHandlerQuote), normalise(oldQuote),
      "Shared site checkout price/stock identity changed: " + item.product_id
        + " " + item.variant_id + " " + item.option_ids.join(","));
  }
  assert.equal(Object.keys(v14.SLICES).length, 6);
  assert.equal(Object.keys(candidate.SLICES).length, 7,
    "One later slice is intentionally not available on the archived v14 site catalogue");
});
