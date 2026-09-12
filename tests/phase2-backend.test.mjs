import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import {
  CATEGORY_ITEM_KEYS,
  DELIVERY_ZONES,
  POPCORN_FLAVORS,
  POPCORN_PRICES_CENTS,
  POPCORN_SIZES,
  SLICES,
  quoteCartItems,
  quoteFulfillment,
} from "../supabase/functions/_shared/commerce-catalog.mjs";

const migration = await readFile(new URL("../supabase/migrations/20260912123000_phase2_orders.sql", import.meta.url), "utf8");
const rollback = await readFile(new URL("../supabase/rollback/20260912123000_phase2_orders.rollback.sql", import.meta.url), "utf8");
const createOrder = await readFile(new URL("../supabase/functions/create-order/index.ts", import.meta.url), "utf8");
const webhook = await readFile(new URL("../supabase/functions/mercadopago-webhook/index.ts", import.meta.url), "utf8");
const frontendSource = await readFile(new URL("../app/catalog.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(frontendSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
});
const frontend = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

function popcorn(size, flavors, quantity = 1) {
  return { product_id: "pipoca-gourmet", variant_id: size, option_ids: flavors, quantity };
}

test("backend catalog remains in exact commercial parity with the current frontend", () => {
  const frontendSizes = Object.fromEntries(frontend.POPCORN.variants
    .filter((variant) => !variant.retired)
    .map((variant) => [variant.id, { label: variant.label, maxOptions: variant.maxOptions }]));
  assert.deepEqual(
    Object.fromEntries(Object.entries(POPCORN_SIZES).map(([id, value]) => [id, { label: value.label, maxOptions: value.maxOptions }])),
    frontendSizes,
  );
  assert.deepEqual(
    Object.fromEntries(Object.entries(POPCORN_PRICES_CENTS).map(([group, prices]) => [group,
      Object.fromEntries(Object.entries(prices).map(([size, cents]) => [size, cents / 100]))])),
    frontend.POPCORN_PRICING_GROUPS,
  );
  assert.deepEqual(
    Object.values(POPCORN_FLAVORS).map(({ id, name, pricingGroup }) => ({ id, name, pricingGroup })),
    frontend.POPCORN.options.map(({ id, name, pricingGroup }) => ({ id, name, pricingGroup })),
  );
  assert.equal(Object.keys(POPCORN_FLAVORS).length, 8);
  assert.equal(Object.keys(SLICES).length, 6);
  assert.equal(Object.keys(DELIVERY_ZONES).length, frontend.DELIVERY_ZONES.length);
  for (const zone of frontend.DELIVERY_ZONES) {
    assert.equal(DELIVERY_ZONES[zone.id].priceCents, zone.price * 100);
  }
});

test("server-side quote covers the official popcorn price matrix and reversible group rule", () => {
  const cases = [
    ["500ml", ["leitinho", "ovomaltine"], 2500],
    ["500ml", ["leitinho", "kinder-bueno"], 3000],
    ["500ml", ["leitinho", "nutella"], 3300],
    ["750ml", ["choco-cookies-branco", "kinder-bueno-crisp"], 4800],
    ["1l", ["leitinho", "kinder-bueno", "nutella"], 5800],
    ["1l", ["choco-nute", "ovomaltine"], 4900],
    ["1l", ["leitinho", "kinder-bueno"], 5500],
    ["1l", ["leitinho"], 4900],
  ];
  for (const [size, flavors, expected] of cases) {
    const quote = quoteCartItems([popcorn(size, flavors)]);
    assert.equal(quote.subtotalCents, expected, `${size}: ${flavors.join(", ")}`);
    assert.equal(quote.items[0].unit_price_cents, expected);
  }
});

test("server ignores client price fields and derives cart, availability and snapshots itself", () => {
  const input = {
    ...popcorn("500ml", ["leitinho", "nutella"], 2),
    unit_price: 0.01,
    line_total: 0.02,
    name: "Preço adulterado",
  };
  const quote = quoteCartItems([input]);
  assert.equal(quote.subtotalCents, 6600);
  assert.equal(quote.items[0].name, "Pipoca Gourmet");
  assert.equal(quote.items[0].line_total_cents, 6600);
  assert.deepEqual(quote.availabilityKeys, [
    CATEGORY_ITEM_KEYS.pipocas,
    "popcorn_flavor_leitinho",
    "popcorn_flavor_nutella",
    "popcorn_size_500ml",
  ]);
});

test("server validates current size/flavor limits, duplicates and retired combinations", () => {
  assert.throws(() => quoteCartItems([popcorn("500ml", [])]), /1 até 2/);
  assert.throws(() => quoteCartItems([popcorn("500ml", ["leitinho", "nutella", "ovomaltine"])]), /1 até 2/);
  assert.throws(() => quoteCartItems([popcorn("1l", ["leitinho", "leitinho"])]), /repita/);
  assert.throws(() => quoteCartItems([popcorn("350ml", ["leitinho"])]), /tamanho atual/);
  assert.throws(() => quoteCartItems([popcorn("500ml", ["desconhecido"])]), /sabor válido/);
});

test("server calculates pickup and all delivery fees without accepting a client total", () => {
  assert.deepEqual(quoteFulfillment({ type: "pickup", delivery_fee: 999 }), {
    fulfillment_type: "pickup",
    delivery_zone_id: null,
    neighborhood: null,
    street: null,
    street_number: null,
    complement: null,
    reference: null,
    delivery_fee_cents: 0,
  });
  for (const zone of Object.values(DELIVERY_ZONES)) {
    const result = quoteFulfillment({
      type: "delivery",
      zone_id: zone.id,
      neighborhood: zone.asksNeighborhood ? "Centro" : "Valor adulterado",
      street: "Rua Teste",
      number: "10",
      delivery_fee: 0,
    });
    assert.equal(result.delivery_fee_cents, zone.priceCents);
    assert.equal(result.neighborhood, zone.asksNeighborhood ? "Centro" : zone.label);
  }
});

test("migration is additive, reproducible, protected by RLS and has an explicit rollback", () => {
  for (const table of ["orders", "order_items", "payment_attempts", "payment_events", "order_status_history", "event_outbox", "print_jobs"]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}\\b`));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(rollback, new RegExp(`drop table if exists public\\.${table}`));
  }
  assert.match(migration, /create sequence if not exists public\.lod_order_number_seq[\s\S]*start with 1001/);
  assert.match(migration, /order_id text not null unique/);
  assert.match(migration, /tracking_token text not null unique/);
  assert.match(migration, /provider_event_key text not null unique/);
  assert.match(migration, /dedupe_key text not null unique/);
  assert.match(migration, /payment_attempts_one_open_per_order/);
  assert.match(migration, /revoke all on public\.orders[\s\S]*from anon, authenticated/);
  assert.match(migration, /grant select on public\.orders[\s\S]*to authenticated/);
  assert.match(migration, /grant execute on function public\.create_store_order\(jsonb, jsonb\) to service_role/);
  assert.doesNotMatch(migration, /insert into public\.(menu_availability|store_settings)|update public\.(menu_availability|store_settings)|delete from public\.(menu_availability|store_settings)/i);
});

test("create-order performs authoritative pricing, availability checks and idempotent Orders API calls", () => {
  assert.match(createOrder, /quoteCartItems\(input\.items\)/);
  assert.match(createOrder, /quoteFulfillment\(input\.fulfillment\)/);
  assert.match(createOrder, /store_settings\?select=value&key=eq\.orders_open/);
  assert.match(createOrder, /menu_availability\?select=item_key,status/);
  assert.match(createOrder, /rpc\/create_store_order/);
  assert.match(createOrder, /rpc\/get_or_create_payment_attempt/);
  assert.match(createOrder, /https:\/\/api\.mercadopago\.com\/v1\/orders/);
  assert.match(createOrder, /"X-Idempotency-Key": String\(attempt\.idempotency_key\)/);
  assert.match(createOrder, /external_reference: orderId/);
  assert.match(createOrder, /PAYMENTS_ENVIRONMENT[\s\S]*!== "test"/);
  assert.doesNotMatch(createOrder, /console\.(?:log|error)\([^\n]*(?:accessToken|card\.token|SUPABASE_SECRET)/);
});

test("webhook validates the official signature, fetches the authoritative Order and deduplicates effects", () => {
  assert.match(webhook, /WebhookSignatureValidator\.validate\(\{/);
  assert.match(webhook, /InvalidWebhookSignatureError/);
  assert.match(webhook, /x-signature/);
  assert.match(webhook, /x-request-id/);
  assert.match(webhook, /searchParams\.get\("data\.id"\)/);
  assert.match(webhook, /fetch\(`\$\{MP_ORDERS_URL\}\/\$\{encodeURIComponent\(orderId\)\}`/);
  assert.match(webhook, /rpc\/apply_mercadopago_order_event/);
  assert.match(webhook, /currency !== "BRL"/);
  assert.match(webhook, /liveMode === true/);
  assert.doesNotMatch(webhook, /graph\.facebook|Purchase|CAPI|print\(/i);
  assert.doesNotMatch(webhook, /console\.(?:log|error)\([^\n]*(?:secret|accessToken|raw|parsed)/);
});

test("backend sources contain no embedded secret credential", () => {
  const all = `${createOrder}\n${webhook}\n${migration}`;
  assert.doesNotMatch(all, /(?:APP_USR|TEST)-\d{6,}-[A-Za-z0-9_-]{20,}/);
  assert.doesNotMatch(all, /sb_secret_[A-Za-z0-9_-]+|service_role\s*[:=]\s*["']/i);
  assert.match(all, /MP_ACCESS_TOKEN_TEST/);
  assert.match(all, /MP_WEBHOOK_SECRET_TEST/);
});
