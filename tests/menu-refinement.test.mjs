import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
// Remote states are fixtures: these tests never change production availability.
const vite = await createServer({
  root, configFile: false, appType: "custom",
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true },
  plugins: [{
    name: "menu-availability-fixture",
    enforce: "pre",
    load(id) {
      if (!id.endsWith("/hooks/use-menu-availability.ts")) return;
      return `let snapshot; let ready = true;
        export function setFixture(value, resolved = true) { snapshot = value; ready = resolved; }
        export function useMenuAvailability() {
          return { availability: snapshot, hasResolvedAvailability: ready, refreshAvailability: async () => ({snapshot, usedFallback: false}) };
        }`;
    },
  }],
});
after(() => vite.close());

const catalog = await vite.ssrLoadModule("/app/catalog.ts");
const availability = await vite.ssrLoadModule("/app/menu-availability.ts");
const navigation = await vite.ssrLoadModule("/app/menu-navigation.ts");
const fixture = await vite.ssrLoadModule("/hooks/use-menu-availability.ts");
const { default: Home } = await vite.ssrLoadModule("/app/page.tsx");
const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("page.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

// Exercise the real functions without refactoring checkout or exporting test-only APIs.
function pageFunction(name, dependencies = {}) {
  let declaration;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) declaration = node;
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(declaration, `${name} must exist in the application`);
  const { outputText } = ts.transpileModule(declaration.getText(ast), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  });
  return new Function(...Object.keys(dependencies), `${outputText}; return ${name};`)(...Object.values(dependencies));
}

function snapshot(overrides = {}, ordersOpen = true) {
  return { ...availability.createFallbackAvailability(), source: "supabase", ordersOpen,
    statuses: { ...availability.createFallbackAvailability().statuses, ...overrides } };
}
function renderMenu(state, ready = true) {
  fixture.setFixture(state, ready);
  return renderToStaticMarkup(React.createElement(Home));
}

const productLabel = pageFunction("productLabel");
const isCategoryEnabled = pageFunction("isCategoryEnabled", catalog);
const isProductEnabled = pageFunction("isProductEnabled", { ...catalog, isCategoryEnabled });
const optionPriceAdjustment = pageFunction("optionPriceAdjustment");
const itemUnitPrice = pageFunction("itemUnitPrice", { optionPriceAdjustment });
const unavailableReason = pageFunction("unavailableReason", availability);
const cartAvailabilityIssues = pageFunction("cartAvailabilityIssues", {
  ...catalog, ...availability, isProductEnabled, productLabel, unavailableReason,
});
const sanitizeSavedCart = pageFunction("sanitizeSavedCart", {
  ...catalog, isProductEnabled, makeCartId: () => "generated-id",
});
const sliceItem = { id: "slice-1", productId: "fatia-prestigio", variantId: "fatia", optionIds: [], quantity: 2 };
const popcornItem = { id: "popcorn-1", productId: "pipoca-gourmet", variantId: "350ml", optionIds: ["kinder-bueno-crisp", "leitinho"], quantity: 1 };

test("both available: neutral entry, balanced choices, no default builder or empty checkout", () => {
  assert.equal(navigation.resolveMenuCategory(snapshot(), null), null);
  const html = renderMenu(snapshot());
  assert.match(html, /Escolha o que deseja pedir/);
  for (const name of ["Pipocas Gourmet", "Fatias Artesanais"]) assert.match(html, new RegExp(`aria-label="${name}"`));
  assert.doesNotMatch(html, /id="configurador"|id="carrinho"|mobile-sticky-bar/);
});

test("the initial lookup does not flash a possibly hidden category", () => {
  const html = renderMenu(snapshot(), false);
  assert.match(html, /Carregando cardápio/);
  assert.doesNotMatch(html, /class="category-option"|id="configurador"/);
});

for (const [hidden, remaining] of [["pipocas", "fatias"], ["fatias", "pipocas"]]) {
  test(`hidden ${hidden}: only ${remaining} opens without an extra click`, () => {
    const state = snapshot({ [availability.CATEGORY_ITEM_KEYS[hidden]]: "hidden" });
    assert.equal(navigation.resolveMenuCategory(state, null), remaining);
    assert.equal(navigation.resolveMenuCategory(state, hidden), remaining);
    const html = renderMenu(state);
    assert.match(html, /id="configurador"/);
    assert.doesNotMatch(html, /Trocar categoria|class="category-option"/);
    assert.doesNotMatch(html, new RegExp(hidden === "pipocas" ? "Pipocas Gourmet|Tamanho da Pipoca" : "Fatias Artesanais|Sabor da fatia"));
  });
}

test("sold-out category is visible, disabled, and cannot be opened by a direct link", () => {
  const state = snapshot({ category_pipocas: "sold_out" });
  assert.equal(navigation.resolveMenuCategory(state, "pipocas"), null);
  const html = renderMenu(state);
  assert.match(html, /<button[^>]*disabled=""[^>]*aria-label="Pipocas Gourmet — Esgotado"/);
  assert.doesNotMatch(html, /id="tamanhos"/);
});

test("both hidden: helpful empty state with existing support, no builder", () => {
  const html = renderMenu(snapshot({ category_pipocas: "hidden", category_fatias: "hidden" }));
  assert.match(html, /Cardápio temporariamente sem produtos disponíveis/);
  assert.match(html, /Falar com a Luciane/);
  assert.doesNotMatch(html, /class="category-option"|id="configurador"|id="carrinho"/);
});

test("category links and returning to neutral preserve every campaign parameter and hash", () => {
  const original = "https://lucianeoliveiradoces.pages.dev/?utm_source=instagram&utm_medium=paid&utm_campaign=fatia+morango&fbclid=teste&tintim_fbid=fb-teste&origem=bio&extra=1&extra=2#inicio";
  for (const category of ["pipocas", "fatias", null]) {
    const result = new URL(navigation.categoryUrl(original, category), original);
    const base = new URL(original);
    if (category) base.searchParams.set("categoria", category);
    assert.equal(result.href, base.href);
    assert.equal(navigation.categoryFromUrl(result.href), category);
    assert.equal(navigation.resolveMenuCategory(snapshot(), category), category);
  }
  const reset = new URL(navigation.categoryUrl(original + "", "fatias"), original);
  assert.equal(new URL(navigation.categoryUrl(reset.href, null), original).href, original);
  assert.equal(navigation.categoryFromUrl("https://example.test/?categoria=invalida"), null);
});

test("remote category changes and reopening take effect without catalog changes", () => {
  const closed = snapshot({ category_pipocas: "hidden" });
  assert.equal(navigation.resolveMenuCategory(closed, null), "fatias");
  const open = snapshot();
  assert.equal(navigation.resolveMenuCategory(open, null), null);
  assert.equal(navigation.resolveMenuCategory(open, "pipocas"), "pipocas");
});

for (const [key, category, label] of [
  ["popcorn_flavor_leitinho", "pipocas", "Leitinho"],
  ["popcorn_size_350ml", "pipocas", "350 ml"],
  ["slice_prestigio", "fatias", "Prestígio"],
]) {
  test(`${key}: sold_out blocks selection, hidden removes it, available restores it`, () => {
    const other = category === "pipocas" ? "category_fatias" : "category_pipocas";
    const soldOut = renderMenu(snapshot({ [other]: "hidden", [key]: "sold_out" }));
    assert.match(soldOut, new RegExp(label));
    assert.match(soldOut, /Esgotado hoje/);
    const hidden = renderMenu(snapshot({ [other]: "hidden", [key]: "hidden" }));
    assert.doesNotMatch(hidden, new RegExp(label));
    const available = renderMenu(snapshot({ [other]: "hidden", [key]: "available" }));
    assert.match(available, new RegExp(label));
    assert.doesNotMatch(available, /Esgotado hoje/);
  });
}

test("old slice choices are stripped while item IDs, quantities, and popcorn combinations survive", () => {
  const old = [{ ...sliceItem, optionIds: ["calda-ninho"] }, popcornItem];
  const saved = JSON.stringify(old);
  assert.deepEqual(sanitizeSavedCart(old), [sliceItem, popcornItem]);
  assert.equal(JSON.stringify(old), saved, "migration must not mutate its input");
  assert.deepEqual(sanitizeSavedCart(sanitizeSavedCart(old)), [sliceItem, popcornItem]);
  assert.deepEqual(sanitizeSavedCart([sliceItem, { ...popcornItem, optionIds: ["unknown"] }]), [sliceItem]);
});

test("slices have no options and the shipped app contains no obsolete step, copy, or styles", async () => {
  for (const slice of catalog.SLICES) {
    assert.deepEqual(slice.options, []);
    assert.equal(slice.optionLabel, undefined);
  }
  for (const file of ["app/page.tsx", "app/catalog.ts", "app/layout.tsx", "app/globals.css"]) {
    assert.doesNotMatch(await readFile(new URL(`../${file}`, import.meta.url), "utf8"), /calda|sauce/i);
  }
  const html = renderMenu(snapshot({ category_pipocas: "hidden" }));
  assert.match(html, /id="quantidade-fatias"/);
  assert.doesNotMatch(html, /calda|sauce/i);
});

const cart = [sliceItem, popcornItem];
for (const [key, name] of [
  ["category_pipocas", "Pipocas Gourmet"], ["category_fatias", "Fatias Artesanais"],
  ["popcorn_size_350ml", "350 ml"], ["popcorn_flavor_kinder_bueno_crisp", "Kinder Bueno Crisp"],
  ["slice_prestigio", "Prestígio"],
]) {
  test(`an existing cart retains and identifies ${key} when unavailable`, () => {
    const before = JSON.stringify(cart);
    for (const status of ["sold_out", "hidden"]) {
      const issues = cartAvailabilityIssues(cart, snapshot({ [key]: status }));
      assert.equal(issues.length, 1);
      assert.match(issues[0].reasons.join(" "), new RegExp(name));
    }
    assert.deepEqual(cartAvailabilityIssues(cart, snapshot()), []);
    assert.equal(JSON.stringify(cart), before);
  });
}

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
function messageFor(payment, fulfillment = "retirada") {
  const subtotal = 65; // 2 x R$20 slice + R$20 pot + R$5 premium flavor.
  return pageFunction("buildWhatsAppMessage", {
    ...catalog, cart, currency, productLabel, itemUnitPrice, payment, fulfillment,
    cartSubtotal: subtotal, deliveryFee: fulfillment === "entrega" ? 8 : 0,
    orderTotal: subtotal + (fulfillment === "entrega" ? 8 : 0),
    selectedDeliveryZone: { label: "Cidade", asksNeighborhood: true },
    deliveryNeighborhood: "Bairro de teste", address: "Rua de teste, 1", reference: "Referência de teste",
    needsChange: true, changeFor: "R$ 100",
    cleanWhatsAppField: pageFunction("cleanWhatsAppField"),
    PIX_DETAILS: { holder: "Titular de teste", key: "chave-teste", keyType: "Teste" },
  })();
}

for (const payment of ["pix", "dinheiro", "cartao"]) {
  for (const fulfillment of ["entrega", "retirada"]) {
    test(`WhatsApp ${fulfillment}/${payment}: complete order, correct totals, no obsolete slice options`, () => {
      const message = messageFor(payment, fulfillment);
      assert.match(message, /Prestígio — 2 fatias/);
      assert.match(message, /Pipoca Gourmet 350 ml — 1 un/);
      assert.match(message, /Sabores: Kinder Bueno Crisp \+ Leitinho/);
      assert.ok(message.includes(currency.format(fulfillment === "entrega" ? 73 : 65)));
      assert.doesNotMatch(message, /calda|sauce/i);
      if (payment === "pix") assert.match(message, /PIX — USE APÓS A CONFIRMAÇÃO[\s\S]*chave-teste/);
      else assert.doesNotMatch(message, /chave-teste|Titular:/);
      if (payment === "dinheiro") assert.match(message, /Troco: para R\$ 100/);
      if (fulfillment === "entrega") assert.match(message, /Bairro de teste[\s\S]*Rua de teste, 1[\s\S]*Referência de teste/);
      else assert.doesNotMatch(message, /Rua de teste/);
    });
  }
}

async function attemptCheckout(latest) {
  const actions = [];
  const messages = [];
  let checked = false;
  await pageFunction("finishOnWhatsApp", {
    availability: snapshot(), cart, checkoutFormReady: true, isFinalizing: false,
    STORE_CONFIG: catalog.STORE_CONFIG, cartAvailabilityIssues,
    setIsFinalizing: () => {}, setCheckoutAvailabilityMessage: (value) => messages.push(value),
    scrollToSection: () => {},
    refreshAvailability: async () => { checked = true; return latest; },
    buildWhatsAppMessage: () => messageFor("pix"),
    tintimWhatsAppUrl: pageFunction("tintimWhatsAppUrl", { TINTIM_SITE_LINK: "https://tintim.link/whatsapp/test" }),
    window: { location: { assign: (url) => { assert.equal(checked, true); actions.push(url); } } },
  })();
  return { actions, messages };
}

test("final revalidation blocks a newly sold-out item, a hidden category, closed orders, or failed lookup", async () => {
  for (const latest of [
    { snapshot: snapshot({ popcorn_flavor_kinder_bueno_crisp: "sold_out" }), usedFallback: false },
    { snapshot: snapshot({ category_fatias: "hidden" }), usedFallback: false },
    { snapshot: snapshot({}, false), usedFallback: false },
    { snapshot: snapshot(), usedFallback: true },
  ]) {
    const result = await attemptCheckout(latest);
    assert.deepEqual(result.actions, []);
    assert.match(result.messages.at(-1), /indisponível|encerrados|Não foi possível confirmar/);
    assert.deepEqual(cart, [sliceItem, popcornItem]);
  }
});

test("valid finalization uses exactly one encoded Tintim navigation after refreshing", async () => {
  const result = await attemptCheckout({ snapshot: snapshot(), usedFallback: false });
  assert.equal(result.actions.length, 1);
  assert.equal(new URL(result.actions[0]).searchParams.get("text"), messageFor("pix"));
});

test("orders closed still permits browsing but disables finalization", () => {
  const html = renderMenu(snapshot({ category_pipocas: "hidden" }, false));
  assert.match(html, /Pedidos encerrados por hoje/);
  assert.match(html, /Sabor da fatia artesanal/);
  assert.match(html, /class="[^"]*whatsapp-button[^"]*"[^>]*disabled=""/);
});

test("an unresponsive availability endpoint is aborted so the existing fallback can take over", async () => {
  const remoteSource = await readFile(new URL("../lib/public-menu-availability.ts", import.meta.url), "utf8");
  const remoteAst = ts.createSourceFile("remote.ts", remoteSource, ts.ScriptTarget.Latest, true);
  const declaration = remoteAst.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "fetchSupabaseRows");
  const { outputText } = ts.transpileModule(declaration.getText(remoteAst), { compilerOptions: { target: ts.ScriptTarget.ES2022 } });
  let cleared = false;
  const fetchRows = new Function("getSupabasePublicConfiguration", "fetch", "setTimeout", "clearTimeout", `${outputText}; return fetchSupabaseRows;`)(
    () => ({ url: "https://example.test", publishableKey: "public-test-value" }),
    (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new Error("aborted")))),
    (callback, delay) => { assert.ok(delay <= 6_000); queueMicrotask(callback); return 1; },
    () => { cleared = true; },
  );
  await assert.rejects(fetchRows("/rest/v1/menu_availability"), /aborted/);
  assert.equal(cleared, true);
});
