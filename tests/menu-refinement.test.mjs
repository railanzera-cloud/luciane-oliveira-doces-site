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
const checkout = await vite.ssrLoadModule("/app/order-checkout.ts");
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
const itemUnitPrice = pageFunction("itemUnitPrice", { popcornPrice: catalog.popcornPrice });
const unavailableReason = pageFunction("unavailableReason", availability);
const cartAvailabilityIssues = pageFunction("cartAvailabilityIssues", {
  ...catalog, ...availability, isProductEnabled, productLabel, unavailableReason,
});
const sanitizeSavedCart = pageFunction("sanitizeSavedCart", {
  ...catalog, isProductEnabled, makeCartId: () => "generated-id",
});
const sliceItem = { id: "slice-1", productId: "fatia-prestigio", variantId: "fatia", optionIds: [], quantity: 2 };
const popcornItem = { id: "popcorn-1", productId: "pipoca-gourmet", variantId: "500ml", optionIds: ["kinder-bueno-crisp", "leitinho"], quantity: 1 };

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
  ["popcorn_size_500ml", "pipocas", "500 ml"],
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
  ["popcorn_size_500ml", "500 ml"], ["popcorn_flavor_kinder_bueno_crisp", "Crispy Bueno"],
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

function detailsFor(payment, fulfillment = "retirada") {
  return {
    items: cart.map((item) => {
      const product = catalog.PRODUCTS.find((product) => product.id === item.productId);
      const variant = product.variants.find((variant) => variant.id === item.variantId);
      return { product_id: product.id, variant_id: variant.id, option_ids: item.optionIds,
        name: productLabel(product), size: variant.whatsappLabel, kind: product.kind,
        options: item.optionIds.map((id) => product.options.find((option) => option.id === id).name),
        quantity: item.quantity, unit_price: itemUnitPrice(product, variant, item.optionIds) };
    }),
    subtotal: 73, delivery_fee: fulfillment === "entrega" ? 8 : 0, total: fulfillment === "entrega" ? 81 : 73,
    currency: "BRL", payment, fulfillment, neighborhood: "Bairro de teste", street: "Rua de teste",
    number: "1", complement: "Casa 2", reference: "Referência de teste", needs_change: true, cash_received_cents: 10000,
  };
}
const fixedOrderId = "LOD-0123-4567-89AB";
function messageFor(payment, fulfillment = "retirada") {
  return pageFunction("buildWhatsAppMessage", {
    buildOrderMessage: checkout.buildOrderMessage, checkoutDetails: detailsFor(payment, fulfillment),
    PIX_DETAILS: { holder: "Luciane Galvão de Oliveira", key: "03611974200", keyType: "CPF" },
  })(fixedOrderId);
}

for (const payment of ["pix", "dinheiro", "cartao"]) {
  for (const fulfillment of ["entrega", "retirada"]) {
    test(`WhatsApp ${fulfillment}/${payment}: complete order, correct totals, no obsolete slice options`, () => {
      const message = messageFor(payment, fulfillment);
      assert.match(message, /Prestígio — 2 fatias/);
      assert.match(message, /Pipoca Gourmet 500 ml — 1 un/);
      assert.match(message, /Sabores: Crispy Bueno \+ Leitinho/);
      assert.ok(message.includes(checkout.formatOrderMoney(fulfillment === "entrega" ? 81 : 73)));
      assert.doesNotMatch(message, /calda|sauce/i);
      if (payment === "pix") assert.match(message, /PRÓXIMO PASSO — PAGAMENTO PIX[\s\S]*03611974200/);
      else assert.doesNotMatch(message, /03611974200|Titular:/);
      if (payment === "dinheiro") assert.match(message, /Troco para: R\$ 100,00/);
      if (fulfillment === "entrega") assert.match(message, /Bairro de teste[\s\S]*Rua de teste[\s\S]*Número: 1[\s\S]*Referência de teste/);
      else assert.doesNotMatch(message, /Rua de teste/);
    });
  }
}

function checkoutHarness(latest, overrides = {}) {
  const actions = [], messages = [], writes = [], scheduled = [];
  const context = { order_id: fixedOrderId, created_at: "2026-09-10T15:00:00Z",
    attribution: checkout.captureOrderAttribution("https://example.test/?utm_source=instagram&fbclid=click&tintim_fbid=tt", "_fbp=browser; _fbc=click-cookie") };
  const lock = { current: false }, navigationPending = { current: false }, contextRef = { current: context };
  const fingerprint = JSON.stringify(detailsFor("pix"));
  const deps = {
    availability: snapshot(), cart, checkoutFormReady: true, finalizationLockRef: lock, navigationPendingRef: navigationPending,
    STORE_CONFIG: catalog.STORE_CONFIG, cartAvailabilityIssues,
    setIsFinalizing: () => {}, setOpeningWhatsApp: () => {}, setCheckoutAvailabilityMessage: (value) => messages.push(value),
    scrollToSection: () => {}, refreshAvailability: async () => latest,
    checkoutFingerprint: fingerprint, checkoutFingerprintRef: { current: fingerprint },
    orderContextRef: contextRef, attributionRef: { current: context.attribution },
    captureOrderAttribution: checkout.captureOrderAttribution, newOrderContext: checkout.newOrderContext,
    setOrderContext: () => {}, savedOrder: { version: 2, cart, order_details: detailsFor("pix") },
    ORDER_STORAGE_KEY: "luciane-order-session-v2", unlockTimerRef: {},
    checkoutStartedRef: { current: true }, paymentInfoTrackedRef: { current: true },
    buildWhatsAppMessage: () => messageFor("pix"),
    tintimWhatsAppUrl: pageFunction("tintimWhatsAppUrl", { TINTIM_SITE_LINK: "https://tintim.link/whatsapp/test" }),
    window: { location: { href: "https://example.test/?categoria=fatias", assign: (url) => actions.push(url) },
      sessionStorage: { setItem: (key, value) => writes.push({ key, value: JSON.parse(value) }) },
      setTimeout: (fn, ms) => { scheduled.push({ fn, ms }); return scheduled.length; } },
    document: { cookie: "_fbp=browser; _fbc=click-cookie", visibilityState: "visible" },
    ...overrides,
  };
  return { finish: pageFunction("finishOnWhatsApp", deps), deps, actions, messages, writes, scheduled, lock, contextRef };
}
async function attemptCheckout(latest) {
  const result = checkoutHarness(latest);
  await result.finish();
  return result;
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

test("Pix uses the exact total and selectable CPF after the structured order", () => {
  for (const fulfillment of ["entrega", "retirada"]) {
    const message = messageFor("pix", fulfillment);
    const total = fulfillment === "entrega" ? "R$ 81,00" : "R$ 73,00";
    assert.ok(message.startsWith("Olá! Finalizei meu pedido pelo cardápio da *Luciane Oliveira Doces*.\n\n*PEDIDO LOD-0123-4567-89AB*"));
    assert.ok(message.includes(`*Total: ${total}*`));
    assert.ok(message.includes(`Valor a pagar: *${total}*`));
    assert.ok(message.includes("*Chave Pix (CPF)*\n03611974200\n\nTitular: Luciane Galvão de Oliveira"));
    assert.ok(message.endsWith("Faça o pagamento e envie o comprovante nesta conversa."));
    assert.doesNotMatch(message, /aguard|confirmação|estimad|\p{Cf}|\u00a0|\u202f/iu);
    assert.equal(decodeURIComponent(encodeURIComponent(message)), message);
  }
});

test("card and cash distinguish receiving mode and never include Pix", () => {
  for (const method of ["cartao", "dinheiro"]) {
    for (const mode of ["retirada", "entrega"]) {
      const message = messageFor(method, mode);
      assert.doesNotMatch(message, /Pix|PIX|03611974200|Titular:/);
      assert.match(message, new RegExp(`no momento da ${mode}`));
      if (method === "cartao") {
        assert.match(message, new RegExp(`Cartão na ${mode}`));
        if (mode === "retirada") assert.match(message, /Aguarde a confirmação do pedido antes de se deslocar/);
        else assert.doesNotMatch(message, /retirada|deslocar/);
      }
    }
  }
});

test("cash parsing is strict and calculates change in cents", () => {
  for (const value of ["50", "50,00", "50.00", "R$ 50,00", "R$\u00a050,00"]) assert.equal(checkout.parseCashCents(value), 5000);
  assert.equal(checkout.parseCashCents("1.234,56"), 123456);
  for (const value of ["", "-50", "0", "1e3", "50 reais", "50,001", "50.00.00", "99999999999999999"]) assert.equal(checkout.parseCashCents(value), null);
  const order = { ...detailsFor("dinheiro"), items: [], subtotal: 20, total: 20, cash_received_cents: 5000 };
  const message = checkout.buildOrderMessage(order, fixedOrderId, {});
  assert.match(message, /Troco para: R\$ 50,00\nTroco necessário: R\$ 30,00/);
  for (const value of [null, 1000, 1999]) assert.throws(() => checkout.buildOrderMessage({ ...order, cash_received_cents: value }, fixedOrderId, {}), /Corrija o valor para troco/);
  assert.match(checkout.buildOrderMessage({ ...order, cash_received_cents: 2000 }, fixedOrderId, {}), /Troco necessário: R\$ 0,00/);
  assert.match(checkout.buildOrderMessage({ ...order, needs_change: false }, fixedOrderId, {}), /Não precisa de troco/);
});

test("optional address fields are omitted and invisible text is normalized", () => {
  const message = checkout.buildOrderMessage({ ...detailsFor("cartao", "entrega"),
    street: "Rua\u200b de\u00a0teste\u202e\n*RESUMO*", number: "12", complement: "", reference: "" }, fixedOrderId, {});
  assert.match(message, /Rua: Rua de teste RESUMO\nNúmero: 12/);
  assert.doesNotMatch(message, /Complemento:|Referência:|\p{Cf}|\u00a0|\u202f/u);
});

test("order IDs are readable, independent between orders, and stable when restored", () => {
  const attribution = checkout.captureOrderAttribution("https://example.test/", "");
  const first = checkout.newOrderContext(attribution), second = checkout.newOrderContext(attribution);
  assert.match(first.order_id, /^LOD-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  assert.notEqual(first.order_id, second.order_id);
  assert.equal(checkout.restoreOrderContext(JSON.parse(JSON.stringify(first)), attribution).order_id, first.order_id);
  assert.notEqual(checkout.restoreOrderContext({ order_id: "LOD-1" }, attribution).order_id, "LOD-1");
});

test("attribution survives new categories, return visits, cookie updates, and duplicate parameters", () => {
  const initial = "https://example.test/?utm_source=instagram&utm_medium=cpc&utm_campaign=a&utm_content=b&utm_term=c&fbclid=fb&tintim_fbid=tt&origem=bio&extra=1&extra=2#inicio";
  const first = checkout.captureOrderAttribution(initial, "_fbp=fbp-test; _fbc=fbc-test");
  const next = checkout.captureOrderAttribution("https://example.test/?categoria=fatias#resumo", "", JSON.parse(JSON.stringify(first)));
  for (const [key, value] of Object.entries({ utm_source: "instagram", utm_medium: "cpc", utm_campaign: "a", utm_content: "b", utm_term: "c", fbclid: "fb", tintim_fbid: "tt", origem: "bio", fbp: "fbp-test", fbc: "fbc-test" })) assert.equal(next[key], value);
  assert.deepEqual(next.parameters.extra, ["1", "2"]);
  assert.equal(next.landing_url, initial);
  assert.equal(next.last_url, "https://example.test/?categoria=fatias#resumo");
  assert.equal(new URL(initial).searchParams.get("fbclid"), "fb");
});

test("same-tick double click performs one revalidation and one redirect", async () => {
  let complete, reads = 0;
  const pending = new Promise((resolve) => { complete = resolve; });
  const h = checkoutHarness(null, { refreshAvailability: () => { reads++; return pending; } });
  const first = h.finish();
  await h.finish();
  assert.equal(reads, 1);
  assert.equal(h.lock.current, true);
  assert.equal(h.actions.length, 0);
  complete({ snapshot: snapshot(), usedFallback: false });
  await first;
  assert.equal(h.actions.length, 1);
  assert.equal(h.writes.length, 1);
  assert.equal(h.writes[0].value.order.order_id, fixedOrderId);
  assert.deepEqual(h.writes[0].value.cart, cart);
  assert.equal(h.writes[0].value.order_details.total, 73);
  assert.equal(h.writes[0].value.order.attribution.fbclid, "click");
  assert.equal(h.writes[0].value.initiateCheckoutTracked, true);
  assert.equal(h.writes[0].value.paymentInfoTracked, true);
});

test("failed remote lookup or redirect releases the gate and allows a retry", async () => {
  const h = checkoutHarness(null, { refreshAvailability: async () => { throw new Error("Network error"); } });
  await h.finish();
  assert.equal(h.lock.current, false);
  assert.equal(h.actions.length, 0);
  const failed = checkoutHarness({ snapshot: snapshot(), usedFallback: false });
  failed.deps.window.location.assign = () => { throw new Error("Navigation failed"); };
  await failed.finish();
  assert.equal(failed.lock.current, false);
  assert.equal(failed.deps.navigationPendingRef.current, false);
  failed.deps.window.location.assign = (url) => failed.actions.push(url);
  await failed.finish();
  assert.equal(failed.actions.length, 1);
  assert.equal(failed.contextRef.current.order_id, fixedOrderId);
});

test("edits during asynchronous revalidation cannot send stale order details", async () => {
  const h = checkoutHarness({ snapshot: snapshot(), usedFallback: false }, { checkoutFingerprintRef: { current: "changed-order" } });
  await h.finish();
  assert.equal(h.actions.length, 0);
  assert.equal(h.lock.current, false);
  assert.match(h.messages.at(-1), /alterado durante a conferência/);
});

function pageEffectContaining(fragment, dependencies) {
  let found;
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === "useEffect" && node.arguments[0]?.getText(ast).includes(fragment)) found = node.arguments[0];
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(found);
  const { outputText } = ts.transpileModule(`const effect = ${found.getText(ast)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } });
  return new Function(...Object.keys(dependencies), `${outputText}; return effect;`)(...Object.values(dependencies));
}

test("return from WhatsApp unlocks retry without clearing order or repeating its ID", async () => {
  const h = checkoutHarness({ snapshot: snapshot(), usedFallback: false });
  const events = {};
  h.deps.window.addEventListener = (name, callback) => { events[name] = callback; };
  h.deps.window.removeEventListener = () => {};
  h.deps.window.clearTimeout = () => {};
  h.deps.document.addEventListener = (name, callback) => { events[name] = callback; };
  h.deps.document.removeEventListener = () => {};
  const cleanup = pageEffectContaining('window.addEventListener("pagehide"', { ...h.deps, navigationByKeyboard: false })();
  await h.finish();
  const retained = JSON.stringify(h.writes.at(-1).value);
  events.pagehide();
  events.pageshow();
  assert.equal(h.lock.current, false);
  assert.equal(JSON.stringify(h.writes.at(-1).value), retained);
  await h.finish();
  assert.equal(h.writes.at(-1).value.order.order_id, fixedOrderId);
  assert.equal(h.actions.length, 2);
  cleanup();
});

test("focus return during revalidation cannot bypass the double-click gate", async () => {
  const h = checkoutHarness(null);
  const events = {};
  h.deps.window.addEventListener = (name, callback) => { events[name] = callback; };
  h.deps.document.addEventListener = (name, callback) => { events[name] = callback; };
  h.deps.window.clearTimeout = () => {};
  pageEffectContaining('window.addEventListener("pagehide"', { ...h.deps, navigationByKeyboard: false })();
  h.lock.current = true;
  events.blur(); events.focus();
  assert.equal(h.lock.current, true);
});

for (const mode of ["pointer", "keyboard"]) {
  test(`section navigation retains accessible focus and identifies ${mode} modality`, () => {
    for (const section of ["configurador", "quantidade-fatias", "sabores"]) {
      const attributes = {}, calls = [];
      let blur;
      const heading = { getAttribute: () => null, setAttribute: (key, value) => { attributes[key] = value; },
        removeAttribute: (key) => { delete attributes[key]; }, addEventListener: (_event, callback) => { blur = callback; },
        focus: (options) => calls.push(options) };
      const target = { querySelector: () => heading, scrollIntoView: (options) => calls.push(options) };
      pageFunction("scrollToSection", { navigationByKeyboard: mode === "keyboard",
        document: { getElementById: (id) => id === section ? target : null },
        window: { matchMedia: () => ({ matches: false }) } })(section);
      assert.equal(attributes.tabindex, "-1");
      assert.equal(attributes["data-navigation-focus"], mode);
      assert.deepEqual(calls, [{ preventScroll: true }, { behavior: "smooth", block: "start" }]);
      blur();
      assert.deepEqual(attributes, {});
    }
  });
}

test("touch focus override is scoped, keyboard rings and safe area remain", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\[data-navigation-focus="pointer"\]\[tabindex="-1"\]:focus\s*\{\s*outline: none/);
  assert.match(css, /\[data-navigation-focus="keyboard"\]\[tabindex="-1"\]:focus\s*\{\s*outline: 3px solid/);
  assert.match(css, /button:focus-visible,[\s\S]*a:focus-visible,[\s\S]*input:focus-visible/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
});

test("explicit new order clears the old draft and creates another code", () => {
  const contextRef = { current: { order_id: fixedOrderId } }, fields = {}, removed = [];
  const deps = { finalizationLockRef: { current: false }, orderContextRef: contextRef,
    checkoutStartedRef: { current: true }, paymentInfoTrackedRef: { current: true },
    ORDER_STORAGE_KEY: "luciane-order-session-v2", clearDraft: () => {},
    window: { sessionStorage: { removeItem: (key) => removed.push(key) } } };
  for (const setter of ["setOrderContext", "setAddressNumber", "setComplement", "setLegacyAddressNotice", "setCart", "setFulfillment", "setDeliveryZoneId", "setNeighborhood", "setAddress", "setReference", "setPayment", "setNeedsChange", "setChangeFor", "setDrinkMessage", "setRestoredOrderNotice", "setAddedNotice", "setCheckoutAvailabilityMessage", "setBuilderEngaged"]) deps[setter] = (value) => { fields[setter] = value; };
  pageFunction("clearOrder", deps)();
  assert.equal(contextRef.current, null);
  assert.deepEqual(fields.setCart, []);
  assert.equal(fields.setPayment, "");
  assert.deepEqual(removed, ["luciane-order-session-v2"]);
  pageEffectContaining("checkoutFingerprintRef.current = checkoutFingerprint", {
    checkoutFingerprintRef: {}, checkoutFingerprint: "new-cart", storageReady: true, cart: [sliceItem],
    orderContextRef: contextRef, attributionRef: {}, newOrderContext: checkout.newOrderContext,
    captureOrderAttribution: checkout.captureOrderAttribution, setOrderContext: () => {},
    setCheckoutAvailabilityMessage: () => {}, window: { location: { href: "https://example.test/" } }, document: { cookie: "" },
  })();
  assert.match(contextRef.current.order_id, /^LOD-/);
  assert.notEqual(contextRef.current.order_id, fixedOrderId);
});


test("retired 350 ml remains in saved carts and blocks finalization without a zero-price sale", async () => {
  const old = { ...popcornItem, variantId: "350ml", quantity: 2 };
  assert.deepEqual(sanitizeSavedCart([old, sliceItem]), [old, sliceItem]);
  const issues = cartAvailabilityIssues([old], snapshot({ popcorn_size_350ml: "available" }));
  assert.match(issues[0].reasons.join(" "), /350 ml saiu do cardápio/);
  const h = checkoutHarness({ snapshot: snapshot(), usedFallback: false }, { cart: [old] });
  await h.finish();
  assert.equal(h.actions.length, 0);
  assert.match(h.messages.at(-1), /350 ml/);
  const html = renderMenu(snapshot({ category_fatias: "hidden", popcorn_size_350ml: "available" }));
  assert.doesNotMatch(html, /size-350ml/);
  assert.deepEqual(availability.MENU_AVAILABILITY_ITEMS.filter((item) => item.itemType === "popcorn_size").map((item) => item.itemKey),
    ["popcorn_size_500ml", "popcorn_size_750ml", "popcorn_size_1l"]);
});

test("Choco Nute has its own remote control and fails closed while its record is missing", async () => {
  const item = { ...popcornItem, optionIds: ["choco-nute", "ovomaltine"] };
  assert.equal(availability.POPCORN_FLAVOR_ITEM_KEYS["choco-nute"], "popcorn_flavor_choco_nute");
  assert.deepEqual(sanitizeSavedCart([item]), [item]);
  const missing = availability.mergeRemoteAvailability([], true);
  assert.equal(availability.statusFor(missing, "popcorn_flavor_choco_nute"), "sold_out");
  const h = checkoutHarness({ snapshot: missing, usedFallback: false }, { cart: [item] });
  await h.finish();
  assert.equal(h.actions.length, 0);
  assert.match(h.messages.at(-1), /Choco Nute/);
  for (const status of ["available", "sold_out", "hidden"]) {
    const state = availability.mergeRemoteAvailability([{ item_key: "popcorn_flavor_choco_nute", status }], true);
    assert.equal(cartAvailabilityIssues([item], state).length, status === "available" ? 0 : 1);
  }
});

const pricingCases = [
  ["A", "500ml", ["leitinho", "ovomaltine"], 25],
  ["B", "500ml", ["leitinho", "kinder-bueno"], 30],
  ["C", "500ml", ["leitinho", "nutella"], 33],
  ["D", "750ml", ["choco-cookies-branco", "kinder-bueno-crisp"], 48],
  ["E", "1l", ["leitinho", "kinder-bueno", "nutella"], 58],
  ["F", "1l", ["choco-nute", "ovomaltine"], 49],
];
for (const [label, size, optionIds, expected] of pricingCases) {
  test(`official case ${label}: selection, saved cart, Meta values and WhatsApp share the same price`, () => {
    const variant = catalog.POPCORN.variants.find((item) => item.id === size);
    const unit = itemUnitPrice(catalog.POPCORN, variant, optionIds);
    assert.equal(unit, expected);
    const original = { id: "case-" + label, productId: catalog.POPCORN.id, variantId: size, optionIds, quantity: 2 };
    const [restored] = sanitizeSavedCart(JSON.parse(JSON.stringify([original])));
    assert.deepEqual(restored, original);
    const subtotal = itemUnitPrice(catalog.POPCORN, variant, restored.optionIds) * restored.quantity;
    assert.equal(subtotal, expected * 2);
    const payload = pageFunction("metaProductPayload", { productLabel, itemUnitPrice })(catalog.POPCORN, variant, 2, optionIds);
    assert.equal(payload.value, subtotal);
    assert.equal(payload.contents[0].item_price, expected);
    for (const fulfillment of ["retirada", "entrega"]) {
      const fee = fulfillment === "entrega" ? catalog.DELIVERY_ZONES.find((zone) => zone.id === "cidade").price : 0;
      const order = { ...detailsFor("pix", fulfillment), items: [{ product_id: catalog.POPCORN.id, variant_id: size, option_ids: optionIds,
        name: catalog.POPCORN.name, size: variant.whatsappLabel, kind: "popcorn", quantity: 2, unit_price: unit,
        options: optionIds.map((id) => catalog.POPCORN.options.find((option) => option.id === id).name) }],
        subtotal, delivery_fee: fee, total: subtotal + fee };
      const message = checkout.buildOrderMessage(order, fixedOrderId, { holder: "Luciane Galvão de Oliveira", key: "03611974200", keyType: "CPF" });
      const url = pageFunction("tintimWhatsAppUrl", { TINTIM_SITE_LINK: "https://tintim.link/whatsapp/test" })(message);
      assert.equal(new URL(url).searchParams.get("text"), message);
      assert.ok(message.includes(`*Total: ${checkout.formatOrderMoney(subtotal + fee)}*`));
      assert.ok(message.includes(`Valor a pagar: *${checkout.formatOrderMoney(subtotal + fee)}*`));
      assert.ok(message.includes(`Produtos: ${checkout.formatOrderMoney(subtotal)}`));
      assert.doesNotMatch(message, /acréscimo|adicional|Kinder Bueno Crisp/);
    }
  });
}

test("case G: real toggle handler recomputes from remaining flavors and enforces limits", () => {
  const variant = catalog.POPCORN.variants.find((item) => item.id === "1l");
  const deps = { categoryIsAvailable: () => true, popcornVariant: variant, popcornMaxOptions: 3,
    popcornOptionIds: [], popcornFlavorIsAvailable: () => true, setBuilderEngaged: () => {}, setSelectionMessage: () => {},
    scrollToSection: () => {}, window: { setTimeout: () => {} },
    setPopcornOptionIds: (update) => { deps.popcornOptionIds = update(deps.popcornOptionIds); } };
  const toggle = (id) => pageFunction("togglePopcornOption", deps)(catalog.POPCORN.options.find((item) => item.id === id));
  for (const [id, expected] of [["leitinho", 49], ["kinder-bueno", 55], ["nutella", 58], ["nutella", 55], ["kinder-bueno", 49]]) {
    toggle(id);
    assert.equal(itemUnitPrice(catalog.POPCORN, variant, deps.popcornOptionIds), expected);
  }
  toggle("kinder-bueno"); toggle("nutella"); toggle("ovomaltine");
  assert.deepEqual(deps.popcornOptionIds, ["leitinho", "kinder-bueno", "nutella"]);
});
