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
const tintim = await vite.ssrLoadModule("/lib/tintim.ts");
const { SiteOrderError } = await vite.ssrLoadModule("/lib/site-order.ts");
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
const sliceItem = { id: "slice-1", productId: "fatia-prestigio", variantId: "fatia", optionIds: ["sem-calda"], quantity: 2 };
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
  const migrated = [{ ...sliceItem, optionIds: [] }, popcornItem];
  const saved = JSON.stringify(old);
  assert.deepEqual(sanitizeSavedCart(old), migrated);
  assert.equal(JSON.stringify(old), saved, "migration must not mutate its input");
  assert.deepEqual(sanitizeSavedCart(sanitizeSavedCart(old)), migrated);
  assert.deepEqual(sanitizeSavedCart([sliceItem, { ...popcornItem, optionIds: ["unknown"] }]), [sliceItem]);
});

test("slices expose only chocolate and explicit no-sauce choices", () => {
 for (const slice of catalog.SLICES) assert.deepEqual(slice.options.map(o => o.id), ['calda-chocolate', 'sem-calda']);
 assert.match(source, /Como prefere sua fatia/);
 assert.match(source, /useState\(""\)/);
 assert.equal(cartAvailabilityIssues([{...sliceItem, optionIds:[]}], snapshot()).length, 1);
 assert.equal(cartAvailabilityIssues([sliceItem], snapshot()).length, 0);
 for (const id of ['sem-calda','calda-chocolate']) assert.deepEqual(sanitizeSavedCart([{...sliceItem,optionIds:[id]}])[0].optionIds,[id]);
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
  return checkout.buildRegisteredOrderMessage({...detailsFor(payment, fulfillment), customer_name: "Maria Oliveira"}, 1047,
    "https://example.test/pedido?token=" + "a".repeat(48),
    { holder: "Luciane Galvão de Oliveira", key: "03611974200", keyType: "CPF" });
}

for (const payment of ["pix", "dinheiro", "cartao"]) {
  for (const fulfillment of ["entrega", "retirada"]) {
    test(`WhatsApp ${fulfillment}/${payment}: complete order, correct totals, no obsolete slice options`, () => {
      const message = messageFor(payment, fulfillment);
      const openUrl = new URL(tintim.tintimWhatsAppUrl(message));
      assert.equal(openUrl.searchParams.get("text"),message);
      assert.doesNotMatch(message,/Acompanhar pedido|https?:\/\/|\/pedido\?token=/);
      assert.match(message, /2x Prestígio/);
      assert.match(message, /1x Pipoca Gourmet 500 ml/);
      assert.match(message, /Crispy Bueno \+ Leitinho/);
      assert.ok(message.includes(checkout.formatOrderMoney(fulfillment === "entrega" ? 81 : 73)));
      assert.match(message, /Sem calda, por favor/);
      assert.doesNotMatch(message, /calda-ninho/);
      if (payment === "pix") assert.match(message, /PRÓXIMO PASSO — PAGAMENTO VIA PIX[\s\S]*03611974200/);
      else assert.doesNotMatch(message, /03611974200|Titular:/);
      if (payment === "dinheiro") assert.match(message, /Troco para: R\$ 100,00/);
      if (fulfillment === "entrega") assert.match(message, /Rua de teste, 1 — Bairro de teste[\s\S]*Referência de teste/);
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
    SiteOrderError, cardMode: null, customerNameReady: true, customerName: "Maria Oliveira", notes: "", fulfillment: "retirada", deliveryZoneId: "", deliveryNeighborhood: "", address: "", addressNumber: "", complement: "", reference: "", payment: "pix", needsChange: false, cashReceivedCents: null, orderTotal: 73, checkoutDetails: {...detailsFor("pix"), customer_name:"Maria Oliveira"},
    PIX_DETAILS: {holder:"Luciane Galvão de Oliveira",key:"03611974200",keyType:"CPF"},
    buildRegisteredOrderMessage: checkout.buildRegisteredOrderMessage, rememberOrder: () => {}, setLastToken: () => {},
    createWhatsAppOrder: async () => ({order:{order_number:1047,tracking_token:"a".repeat(48),total:73},payment:{method:"manual_pix"}}),
    setWhatsAppResult: value => actions.push(value.whatsappUrl),
    availability: snapshot(), cart, checkoutFormReady: true, finalizationLockRef: lock, navigationPendingRef: navigationPending,
    STORE_CONFIG: catalog.STORE_CONFIG, cartAvailabilityIssues,
    setWhatsAppRetryAvailable: () => {}, setIsFinalizing: () => {}, setOpeningWhatsApp: () => {}, setCheckoutAvailabilityMessage: (value) => messages.push(value),
    scrollToSection: () => {}, refreshAvailability: async () => latest,
    checkoutFingerprint: fingerprint, checkoutFingerprintRef: { current: fingerprint },
    orderContextRef: contextRef, attributionRef: { current: context.attribution },
    captureOrderAttribution: checkout.captureOrderAttribution, newOrderContext: checkout.newOrderContext,
    setOrderContext: () => {}, savedOrder: { version: 2, cart, order_details: detailsFor("pix") },
    ORDER_STORAGE_KEY: "luciane-order-session-v2", unlockTimerRef: {},
    checkoutStartedRef: { current: true }, paymentInfoTrackedRef: { current: true },
    buildWhatsAppMessage: () => messageFor("pix"),
    tintimWhatsAppUrl: tintim.tintimWhatsAppUrl,
    window: { scrollTo: () => {}, location: { origin:"https://example.test", href: "https://example.test/?categoria=fatias", assign: (url) => actions.push(url) },
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
    assert.match(result.messages.at(-1), /indisponível|encerrados|Não conseguimos concluir/);
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

test("approved message uses the registered number, customer and dynamic payment without a public URL", () => {
  for (const fulfillment of ["entrega", "retirada"]) {
    for (const payment of ["pix", "cartao", "dinheiro"]) {
      const message=messageFor(payment,fulfillment);
      assert.ok(message.startsWith("Olá! Finalizei meu pedido pelo site da Luciane Oliveira Doces.\n\n*PEDIDO #1047*\n\nCliente: Maria Oliveira"));
      assert.ok(message.includes(`Total: R$ ${fulfillment === "entrega" ? "81" : "73"},00`));
      assert.doesNotMatch(message,/Acompanhar pedido|\/pedido\?token=|https?:\/\//);
      assert.doesNotMatch(message,/\p{Cf}|\u00a0|\u202f/u);
      if(payment === "pix") assert.match(message,/\*Chave Pix \(CPF\):\* 03611974200\nTitular: Luciane Galvão de Oliveira/);
      else assert.doesNotMatch(message,/03611974200|Pagamento via Pix/);
      if(payment === "cartao") assert.doesNotMatch(message,/acréscimo.*antes da confirmação/);
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
  assert.equal(h.writes.length, 2);
  assert.equal(h.writes[0].value.order.order_id, fixedOrderId);
  assert.deepEqual(h.writes[0].value.cart, cart);
  assert.equal(h.writes[0].value.order_details.total, 73);
  assert.equal(h.writes[0].value.order.attribution.fbclid, "click");
  assert.equal(h.writes[1].value.whatsappResult.result.order.order_number, 1047);
});

test("failed registration releases the lock, retains identity, and retries without automatic navigation", async () => {
  const h=checkoutHarness({snapshot:snapshot(),usedFallback:false},{ createWhatsAppOrder:async()=>{throw new Error("Network error");} });
  await h.finish(); assert.equal(h.lock.current,false); assert.equal(h.actions.length,0);
  assert.equal(h.writes[0].value.order.order_id,fixedOrderId);
  const recovered=checkoutHarness({snapshot:snapshot(),usedFallback:false});
  recovered.deps.window.location.assign=()=>{throw new Error("Must not navigate before explicit customer action");};
  await recovered.finish();assert.equal(recovered.actions.length,1);assert.equal(recovered.writes.at(-1).value.whatsappResult.result.order.order_number,1047);
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
      const target = { matches: () => false, querySelector: () => heading, scrollIntoView: (options) => calls.push(options) };
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
    COMMERCE_CONFIG: { siteOrderingEnabled: false },
    window: { sessionStorage: { removeItem: (key) => removed.push(key) } } };
  for (const setter of ["setOrderContext", "setAddressNumber", "setComplement", "setLegacyAddressNotice", "setCart", "setFulfillment", "setDeliveryZoneId", "setNeighborhood", "setAddress", "setReference", "setPayment", "setCheckoutChannel", "setNotes", "setWhatsAppResult", "setCustomerName", "setCustomerPhone", "setCustomerEmail", "setSiteResult", "setNewPaymentAttempt", "setNeedsChange", "setChangeFor", "setDrinkMessage", "setRestoredOrderNotice", "setAddedNotice", "setCheckoutAvailabilityMessage", "setBuilderEngaged"]) deps[setter] = (value) => { fields[setter] = value; };
  pageFunction("clearOrder", deps)();
  assert.equal(contextRef.current, null);
  assert.deepEqual(fields.setCart, []);
  assert.equal(fields.setPayment, "");
  assert.deepEqual(removed, ["luciane-order-session-v2"]);
  pageEffectContaining("checkoutFingerprintRef.current = checkoutFingerprint", {
    setWhatsAppRetryAvailable: value => { fields.retry = value; },
    checkoutFingerprintRef: {}, checkoutFingerprint: "new-cart", storageReady: true, cart: [sliceItem],
    orderContextRef: contextRef, attributionRef: {}, newOrderContext: checkout.newOrderContext,
    captureOrderAttribution: checkout.captureOrderAttribution, setOrderContext: () => {},
    setCheckoutAvailabilityMessage: () => {}, window: { location: { href: "https://example.test/" } }, document: { cookie: "" },
  })();
  assert.match(contextRef.current.order_id, /^LOD-/);
  assert.notEqual(contextRef.current.order_id, fixedOrderId);
  assert.equal(fields.retry, false);
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
      const url = tintim.tintimWhatsAppUrl(message);
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

test('dynamic Tintim link preserves repeated parameters and tracker cookies', () => {
  const build = tintim.tintimWhatsAppUrl;
  const url = new URL(build('📦 PEDIDO #1047', { parameters: { extra: ['1', '2'], utm_source: ['instagram'], text: ['untrusted'] } }, 'tt_fbclid=click%201; tt_utm_source=old; tt_campaignid=42'));
  assert.equal(url.searchParams.get('text'), '📦 PEDIDO #1047');
  assert.deepEqual(url.searchParams.getAll('extra'), ['1', '2']);
  assert.equal(url.searchParams.get('utm_source'), 'instagram');
  assert.equal(url.searchParams.get('fbclid'), 'click 1');
  assert.equal(url.searchParams.get('campaignid'), '42');
});

test('slice choices reach the authoritative quote without fees and reject retired or conflicting options', async () => {
 const {quoteCartItems}=await import('../supabase/functions/_shared/commerce-catalog.mjs');
 const items=['calda-chocolate','sem-calda'].map(id=>({product_id:sliceItem.productId,variant_id:'fatia',quantity:1,option_ids:[id]}));
 const quote=quoteCartItems(items);
 assert.deepEqual(quote.items.map(i=>i.option_names),[['Com calda de chocolate'],['Sem calda, por favor']]);
 assert.equal(quote.items[0].unit_price_cents,quote.items[1].unit_price_cents);
 assert.deepEqual(quote.items.map(i=>i.option_ids),items.map(i=>i.option_ids));
 for(const option_ids of [['calda-ninho'],['calda-chocolate','sem-calda'],['unknown']]) assert.throws(()=>quoteCartItems([{...items[0],option_ids}]));
});

test('final screen keeps WhatsApp predominant and tracking secondary for each manual payment', async()=>{
 const {WhatsAppOrderResultView}=await vite.ssrLoadModule('/components/whatsapp-order-result.tsx');
 for(const [method,label] of [['manual_pix','Pix manual'],['cash','Dinheiro no recebimento'],['card_on_delivery','Cartão no recebimento']]) {
  const html=renderToStaticMarkup(React.createElement(WhatsAppOrderResultView,{order:{customerName:'Maria Oliveira',result:{order:{order_number:1004,total:48},payment:{method}},trackingUrl:'/pedido?token=abc',whatsappUrl:'https://tintim.link/fixture'}}));
  assert.match(html,/Olá, Maria/);assert.match(html,/1004/);assert.ok(html.includes(label));
  assert.match(html,/whatsapp-final-primary/);assert.match(html,/Ao abrir o WhatsApp, toque em enviar/);
  assert.match(html,/Ver pedido/);assert.equal((html.match(/<a /g)||[]).length,2);
  assert.doesNotMatch(html,/Copiar chave|Fazer novo pedido|03611974200/);
 }
});

test('checkout navigation follows receiving, delivery fields, identification and payment without skipping', () => {
 const state={deliveryZoneError:'',fulfillment:'',selectedDeliveryZone:null,deliveryNeighborhood:'',address:'',addressNumber:'',customerNameReady:false,checkoutChannel:'whatsapp',customerPhoneReady:false,cleanWhatsAppField:checkout.cleanWhatsAppField};
 const next=(overrides={})=>pageFunction('nextCheckoutSection',{...state,...overrides})();
 assert.equal(next(),'recebimento');
 assert.equal(next({fulfillment:'entrega'}),'delivery-fields');
 assert.equal(next({fulfillment:'entrega',selectedDeliveryZone:{}}),'neighborhood');
 assert.equal(next({fulfillment:'entrega',selectedDeliveryZone:{},deliveryNeighborhood:'Centro'}),'address');
 assert.equal(next({fulfillment:'entrega',selectedDeliveryZone:{},deliveryNeighborhood:'Centro',address:'Rua A'}),'address-number');
 assert.equal(next({fulfillment:'entrega',selectedDeliveryZone:{},deliveryNeighborhood:'Centro',address:'Rua A',addressNumber:'12'}),'identificacao');
 assert.equal(next({fulfillment:'retirada'}),'identificacao');
 assert.equal(next({fulfillment:'retirada',customerNameReady:true}),'pagamento');
});

test('slice add without sauce guides the choice and never mutates cart',()=>{
 let target;let mutated=false;
 const add=pageFunction('addOrUpdateSlice',{categoryIsVisible:()=>true,availability:{ordersOpen:true},categoryIsAvailable:()=>true,selectedSlice:catalog.SLICES[0],selectedSliceVariant:catalog.SLICES[0].variants[0],sliceReady:false,setSelectionMessage:()=>{},requestScroll:id=>target=id,setCart:()=>mutated=true});
 add();assert.equal(target,'calda-fatias');assert.equal(mutated,false);
});

test('slice add preserves customization, goes to receiving and edit returns to cart',()=>{
 for(const editingId of [null,'existing']) {
  let items=editingId?[{id:editingId,optionIds:['sem-calda']}]:[];let target;
  const add=pageFunction('addOrUpdateSlice',{categoryIsVisible:()=>true,availability:{ordersOpen:true},categoryIsAvailable:()=>true,selectedSlice:catalog.SLICES[0],selectedSliceVariant:catalog.SLICES[0].variants[0],sliceReady:true,sliceOptionId:'calda-chocolate',sliceQuantity:1,editingId,setCheckoutAvailabilityMessage:()=>{},setCart:fn=>items=fn(items),makeCartId:()=> 'new',trackMetaEvent:()=>{},metaProductPayload:()=>({}),setAddedNotice:()=>{},productLabel:()=> 'Fatia',nextCheckoutSection:()=> 'recebimento',clearDraft:()=>{},setBuilderEngaged:()=>{},requestScroll:id=>target=id});
  add();assert.deepEqual(items[0].optionIds,['calda-chocolate']);assert.equal(target,editingId?'carrinho':'recebimento');
 }
});

test('sauce sequence uses post-render scrolling and preserves reduced motion',()=>{
 assert.match(source,/setSliceProductId\(value\);[\s\S]*?requestScroll\("calda-fatias"\)/);
 assert.match(source,/setSliceOptionId\(value\); setSelectionMessage\(""\); requestScroll\("quantidade-fatias"\)/);
 assert.match(source,/requestAnimationFrame/);assert.match(source,/cancelAnimationFrame/);
 assert.match(source,/prefers-reduced-motion: reduce/);
 assert.match(source,/Escolher calda ou sem calda/);
});

test('definitive WhatsApp composition uses the shared quote for delivery and pickup', async()=>{
 const {receiptCardQuote}=await import('../supabase/functions/_shared/receipt-card.mjs');
 for(const fulfillment of ['entrega','retirada']) for(const payment of ['pix','dinheiro','credito','debito']) {
  const delivery=fulfillment==='entrega'?800:0;
  const q=receiptCardQuote(2500+delivery,payment==='credito'?'credit_single':payment==='debito'?'debit':null);
  const details={...detailsFor('pix',fulfillment),payment,subtotal:25,delivery_fee:delivery/100,total:q.totalCents/100,card_fee:q.feeCents/100,card_basis_points:q.basisPoints,needs_change:false};
  const message=checkout.buildRegisteredOrderMessage(details,1008,'https://example.test/pedido?token='+ 'a'.repeat(48),{key:'03611974200',keyType:'CPF',holder:'Luciane Galvão de Oliveira'});
  assert.ok(message.startsWith('Olá! Finalizei meu pedido pelo site da Luciane Oliveira Doces.\n\n*PEDIDO #1008*\n'));
  assert.doesNotMatch(message,/📦|PEDIDO CONFIRMADO|eventual acréscimo/i);
  assert.doesNotMatch(message,/Acompanhar pedido|\/pedido|https?:\/\//);
  assert.ok(message.includes('Total: '+checkout.formatOrderMoney(q.totalCents/100)));
  if(delivery)assert.ok(message.includes('Produtos: R$ 25,00\nEntrega: R$ 8,00'));
  else assert.doesNotMatch(message,/Entrega: R\$/);
  if(q.feeCents)assert.ok(message.includes(`Acréscimo (${payment==='credito'?'3,05':'0,57'}%): ${checkout.formatOrderMoney(q.feeCents/100)}`));
  else assert.doesNotMatch(message,/Acréscimo/);
  if(q.feeCents) {
   const label=payment==='credito'?'Crédito à vista':'Débito';
   assert.ok(message.includes(`${fulfillment==='entrega'?'Entrega':'Retirada'} • ${label}\n`));
   assert.equal(message.split(label).length-1,1);
   assert.doesNotMatch(message,/Pagamento:|, na entrega|, na retirada|O acréscimo/);
   assert.ok(message.includes('\n\nProdutos:'));
   assert.ok(message.endsWith('\n\nAcréscimo já incluído no total.'));
  }
  if(payment==='pix') {
   assert.ok(message.includes(`*Valor a pagar:* ${checkout.formatOrderMoney(q.totalCents/100)}`));
   assert.match(message,/\*Chave Pix \(CPF\):\* 03611974200\nTitular: Luciane Galvão de Oliveira/);
   assert.ok(message.endsWith('*Vou fazer o Pix e enviar o comprovante por aqui.*'));
   assert.doesNotMatch(message,/Faça o pagamento/);
  }
 }
});

// Cash is unchanged byte-for-byte apart from the explicitly removed final link.
test('cash structure remains identical to the previous snapshot apart from the link', async () => {
 const {createHash}=await import('node:crypto');
 const hashes=['099410080966894914c082242a883f9fb8c00db311047213b79e090aba4ac0a3','5a029e3bebdfa4c93b1c7ec1a7f67ecadc3d7b28c7e4805b5e5e1c1303ca52c6'];
 let index=0;
 for(const fulfillment of ['retirada','entrega']) {
  const details={customer_name:'Maria',items:[{name:'Fatia',kind:'slice',quantity:1,options:['Sem calda, por favor'],unit_price:22}],subtotal:22,delivery_fee:fulfillment==='entrega'?8:0,total:fulfillment==='entrega'?30:22,payment:'dinheiro',fulfillment,street:'Rua A',number:'10',neighborhood:'Centro',complement:'',reference:'',needs_change:true,cash_received_cents:5000};
  const tracking='https://example.test/pedido?token='+'a'.repeat(48);
  const message=checkout.buildRegisteredOrderMessage(details,1021,tracking,{key:'chave-existente',keyType:'CPF',holder:'Titular existente'});
  const previous=message+'\n\n🔗 Acompanhar pedido:\n'+tracking;
  assert.equal(createHash('sha256').update(previous).digest('hex'),hashes[index++]);
 }
});

test('checkout copy hides technical identity and shortens credit without changing other labels', () => {
 let labelExpression, options;
 function visit(node) {
  if(ts.isVariableDeclaration(node) && node.name.getText(ast)==='paymentLabel') labelExpression=node.initializer.getText(ast);
  if(ts.isArrayLiteralExpression(node) && node.elements.some(element=>ts.isArrayLiteralExpression(element) && element.elements[0]?.getText(ast)==='"credito"')) options=node.getText(ast);
  ts.forEachChild(node,visit);
 }
 visit(ast);
 assert.deepEqual(new Function(`return ${options}`)(), [['pix','Pix'],['dinheiro','Dinheiro'],['credito','Cartão de crédito à vista'],['debito','Cartão de débito']]);
 const label=new Function('checkoutChannel','isSitePayment','sitePaymentLabel','isWhatsAppPayment','paymentDescription','payment','fulfillment',`return ${labelExpression}`);
 for(const fulfillment of ['entrega','retirada']) for(const payment of ['credito','debito','pix','dinheiro']) {
  const actual=label('whatsapp',()=>false,()=>'',()=>true,checkout.paymentDescription,payment,fulfillment);
  const expected=payment==='credito'?`Crédito à vista, na ${fulfillment}`:checkout.paymentDescription(payment,fulfillment);
  assert.equal(actual,expected); assert.doesNotMatch(actual,/\(1x\)/);
 }
 const summary=source.slice(source.indexOf('<aside className="summary-card"'),source.indexOf('</aside>'));
 assert.match(summary,/Resumo do pedido/); assert.doesNotMatch(summary,/Código do pedido|Gerando código|orderContext\?\.order_id/);
});

test('registered checkout screen keeps real order number and simplified credit label', async () => {
 const {WhatsAppOrderResultView}=await vite.ssrLoadModule('/components/whatsapp-order-result.tsx');
 for(const [card_mode,label] of [['credit_single','Crédito à vista, no recebimento'],['debit','Débito no recebimento']]) {
  const html=renderToStaticMarkup(React.createElement(WhatsAppOrderResultView,{order:{customerName:'Maria',result:{order:{order_number:1047,total:34.04,card_mode},payment:{method:'card_on_delivery'}},trackingUrl:'/pedido?token=abc',whatsappUrl:'https://tintim.link/fixture'}}));
  assert.ok(html.includes(label)); assert.match(html,/#1047/); assert.match(html,/34,04/); assert.doesNotMatch(html,/\(1x\)/);
 }
});

test('hidden technical identity and request key are reused when retrying registration', async () => {
 const payloads=[];
 const context=checkout.newOrderContext(checkout.captureOrderAttribution('https://example.test/',''));
 const h=checkoutHarness({snapshot:snapshot(),usedFallback:false},{
  orderContextRef:{current:context},
  createWhatsAppOrder:async payload=>{
   payloads.push(payload);
   if(payloads.length===1)throw new Error('temporary failure');
   return {order:{order_number:1047,tracking_token:'a'.repeat(48),total:73},payment:{method:'manual_pix'}};
  },
 });
 await h.finish(); await h.finish();
 assert.equal(payloads.length,2);
 for(const payload of payloads) {
  assert.equal(payload.client_order_id,context.order_id);
  assert.equal(payload.request_key,context.request_key);
 }
 assert.match(context.order_id,/^LOD-/); assert.match(context.request_key,/^[0-9a-f]{64}$/);
 assert.equal(h.writes.at(-1).value.whatsappResult.result.order.order_number,1047);
});

function checkoutCopy(name, values) {
 let expression;
 function visit(node) {
  if(ts.isVariableDeclaration(node) && node.name.getText(ast)===name) expression=node.initializer.getText(ast);
  ts.forEachChild(node,visit);
 }
 visit(ast);
 assert.ok(expression);
 return new Function(...Object.keys(values),`return ${expression}`)(...Object.values(values));
}

for(const payment of ['pix','dinheiro','credito','debito']) test(`final CTA and temporary failure recovery — ${payment}`, async () => {
 let retry=false, reads=0, registrations=0, resume;
 const pending=new Promise(resolve=>{resume=resolve;});
 const label=(busy=false)=>checkoutCopy('finalButtonLabel',{isFinalizing:busy,openingWhatsApp:false,checkoutChannel:'whatsapp',payment,whatsAppRetryAvailable:retry});
 const sticky=()=>checkoutCopy('stickyButtonLabel',{isFinalizing:false,finalButtonLabel:label(),availability:{ordersOpen:true},categoryIsAvailable:()=>true,activeCategory:null,builderFlowActive:false,editingId:null,draftReady:false,checkoutReady:true});
 const h=checkoutHarness(null,{
  payment,cardMode:payment==='credito'?'credit_single':payment==='debito'?'debit':null,
  setWhatsAppRetryAvailable:value=>{retry=value;},
  refreshAvailability:async()=>++reads===1?{snapshot:snapshot(),usedFallback:true}:pending,
  createWhatsAppOrder:async()=>{
   registrations++;
   return {order:{order_number:1047,tracking_token:'a'.repeat(48),total:73},payment:{method:payment==='pix'?'manual_pix':payment==='dinheiro'?'cash':'card_on_delivery'}};
  },
 });
 assert.equal(label(),'Finalizar pedido no WhatsApp'); assert.equal(sticky(),label());
 await h.finish();
 assert.equal(registrations,0); assert.equal(h.actions.length,0);
 assert.equal(h.messages.at(-1),'Não conseguimos concluir seu pedido agora. Tente novamente.');
 assert.equal(label(),'Tentar novamente'); assert.equal(sticky(),label());
 const next=h.finish(); await h.finish();
 assert.equal(reads,2); assert.equal(label(true),'Conferindo pedido…');
 resume({snapshot:snapshot(),usedFallback:false}); await next;
 assert.equal(registrations,1); assert.equal(h.actions.length,1);
 assert.equal(h.messages.at(-1),''); assert.equal(retry,false);
 assert.equal(label(),'Finalizar pedido no WhatsApp');
 assert.equal(h.writes.at(-1).value.whatsappResult.result.order.order_number,1047);
});

function checkoutFeedback(overrides = {}) {
 const state={checkoutChannel:'whatsapp',checkoutFormReady:true,checkoutReady:true,isFinalizing:false,
  whatsAppRetryAvailable:false,deliveryZoneError:'',checkoutAvailabilityMessage:'',availability:{ordersOpen:true},cartIssues:[],cart,
  fulfillment:'retirada',selectedDeliveryZone:null,neighborhood:'',addressReady:true,customerNameReady:true,
  customerPhoneReady:true,payment:'pix',paymentReady:true,changeError:'',address:'Rua A',cleanWhatsAppField:checkout.cleanWhatsAppField,STORE_CONFIG:catalog.STORE_CONFIG,...overrides};
 state.checkoutFeedbackMessage=checkoutCopy('checkoutFeedbackMessage',state);
 state.checkoutShowsReady=checkoutCopy('checkoutShowsReady',state);
 state.checkoutHint=checkoutCopy('checkoutHint',state);
 return state;
}
function renderCheckoutFeedback(state) {
 let node;
 function visit(candidate) {
  if(ts.isJsxElement(candidate) && candidate.openingElement.attributes.properties.some(prop=>ts.isJsxAttribute(prop) && prop.name.text==='id' && prop.initializer?.text==='checkout-status')) node=candidate;
  ts.forEachChild(candidate,visit);
 }
 visit(ast); assert.ok(node);
 const {outputText}=ts.transpileModule(`const renderStatus=()=>(${node.getText(ast)});`,{compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022}});
 const element=new Function('React','Check',...Object.keys(state),`${outputText}; return renderStatus();`)(React,()=>React.createElement('svg',{'data-ready-check':true}),...Object.values(state));
 return renderToStaticMarkup(element);
}
for(const payment of ['pix','dinheiro','credito','debito']) test(`checkout feedback follows incomplete, ready, processing and failed states — ${payment}`, () => {
 const warning='Complete as informações acima para continuar.';
 const ready='Tudo certo! Seu pedido está pronto para ser enviado.';
 const failure='Não conseguimos concluir seu pedido agora. Tente novamente.';
 for(const [missing,hint] of [
  [{fulfillment:''},'Escolha entrega ou retirada para continuar.'],
  [{addressReady:false,address:''},'Informe a rua da entrega.'],
  [{addressReady:false},'Informe o número da entrega (ou s/n).'],
  [{customerNameReady:false},'Informe seu nome para continuar.'],
  [{payment:''},'Escolha a forma de pagamento.'],
  [{paymentReady:false},'Confira a forma de pagamento.'],
 ]) {
  const state=checkoutFeedback({payment,...missing,checkoutFormReady:false,checkoutReady:false,checkoutAvailabilityMessage:warning});
  assert.equal(state.checkoutHint,hint); assert.equal(state.checkoutShowsReady,false);
  const html=renderCheckoutFeedback(state); assert.ok(html.includes(hint)); assert.doesNotMatch(html,/data-ready-check|class="ready-status"/);
 }
 // A warning from a previous click disappears as soon as the form is valid.
 const complete=checkoutFeedback({payment,checkoutAvailabilityMessage:warning});
 assert.equal(complete.checkoutFeedbackMessage,''); assert.equal(complete.checkoutHint,ready);
 assert.equal(complete.checkoutShowsReady,true); assert.match(renderCheckoutFeedback(complete),/class="ready-status".*data-ready-check/);
 const busy=checkoutFeedback({payment,isFinalizing:true,checkoutAvailabilityMessage:'Registrando sua solicitação…'});
 assert.equal(busy.checkoutHint,'Registrando sua solicitação…'); assert.doesNotMatch(renderCheckoutFeedback(busy),/data-ready-check|class="ready-status"/);
 const failed=checkoutFeedback({payment,whatsAppRetryAvailable:true,checkoutAvailabilityMessage:failure});
 assert.equal(failed.checkoutHint,failure); assert.doesNotMatch(renderCheckoutFeedback(failed),/data-ready-check|class="ready-status"/);
 assert.equal(checkoutCopy('finalButtonLabel',{...failed,openingWhatsApp:false}),'Tentar novamente');
});
test('operational restrictions keep their guidance instead of a ready or form warning', () => {
 const closed=checkoutFeedback({availability:{ordersOpen:false},checkoutReady:false});
 assert.equal(closed.checkoutHint,catalog.STORE_CONFIG.closedMessage); assert.equal(closed.checkoutShowsReady,false);
 const unavailable=checkoutFeedback({cartIssues:[{}],checkoutReady:false});
 assert.match(unavailable.checkoutHint,/indisponíveis/); assert.equal(unavailable.checkoutShowsReady,false);
});


test('temporary registration errors use approved copy while business errors keep actionable details', async () => {
 for(const error of [new TypeError('Failed to fetch'),Object.assign(new Error('timeout'),{name:'AbortError'}),new SiteOrderError(503,'unavailable','Internal error'),new SiteOrderError(429,'rate_limit','Too many requests')]) {
  const h=checkoutHarness({snapshot:snapshot(),usedFallback:false},{createWhatsAppOrder:async()=>{throw error;}});
  await h.finish();
  assert.equal(h.messages.at(-1),'Não conseguimos concluir seu pedido agora. Tente novamente.');
  assert.equal(h.lock.current,false); assert.equal(h.actions.length,0);
 }
 const h=checkoutHarness({snapshot:snapshot(),usedFallback:false},{createWhatsAppOrder:async()=>{throw new SiteOrderError(409,'unavailable_item','Item indisponível: revise o carrinho.');}});
 await h.finish(); assert.equal(h.messages.at(-1),'Item indisponível: revise o carrinho.');
});

test('approved Pix guidance is rendered next to final CTA only while manual Pix is selected', () => {
 let guidance;
 function visit(node) {
  if(ts.isJsxExpression(node) && node.getText(ast).includes('Depois de finalizar no WhatsApp')) guidance=node.expression;
  ts.forEachChild(node,visit);
 }
 visit(ast); assert.ok(guidance);
 const {outputText}=ts.transpileModule(`const renderGuidance=()=>(${guidance.getText(ast)});`,{compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022}});
 const render=new Function('React','payment',`${outputText}; return renderGuidance();`);
 const approved='Depois de finalizar no WhatsApp, faça o Pix com a chave informada na mensagem e envie o comprovante na conversa.';
 assert.ok(renderToStaticMarkup(render(React,'pix')).includes(approved));
 for(const payment of ['dinheiro','credito','debito','mercado_pago_pix','']) assert.equal(renderToStaticMarkup(render(React,payment)),'');
 assert.equal(source.split(approved).length-1,1);
 assert.ok(source.indexOf(approved)>source.indexOf('className="whatsapp-button checkout-primary-button"'));
});


test('delivery Pix matches approved compact message and ends with the consumer next action', () => {
 const details={...detailsFor('pix','entrega'),customer_name:'Fabiola Sousa',items:[{kind:'slice',name:'Chocolate com Morango',quantity:1,size:'Fatia',options:['Com calda de chocolate'],unit_price:22}],street:'Travessa Lauro Martins',number:'39',neighborhood:'Laércio Cabeline',complement:'',reference:'',subtotal:22,delivery_fee:8,total:30};
 const message=checkout.buildRegisteredOrderMessage(details,1025,'https://example.test/pedido?token='+'a'.repeat(48),{key:'03611974200',keyType:'CPF',holder:'Luciane Galvão de Oliveira'});
 assert.equal(message,`Olá! Finalizei meu pedido pelo site da Luciane Oliveira Doces.

*PEDIDO #1025*

Cliente: Fabiola Sousa

1x Chocolate com Morango
Com calda de chocolate

Entrega • Pix
Travessa Lauro Martins, 39 — Laércio Cabeline

Produtos: R$ 22,00
Entrega: R$ 8,00
Total: R$ 30,00

*PRÓXIMO PASSO — PAGAMENTO VIA PIX*

*Valor a pagar:* R$ 30,00
*Chave Pix (CPF):* 03611974200
Titular: Luciane Galvão de Oliveira

*Vou fazer o Pix e enviar o comprovante por aqui.*`);
});

const deliveryPolicy = await import('../supabase/functions/_shared/commerce-catalog.mjs');
const deliveryAddress = {type:'delivery', zone_id:'cidade', neighborhood:'Centro', street:'Rua X', number:'12', complement:'Casa 2', reference:'Portaria'};
function deliveryState(zoneId, neighborhood, fulfillment='entrega') {
 const values={fulfillment,deliveryZoneId:zoneId,neighborhood,address:'Rua X',addressNumber:'12',DELIVERY_ZONES:catalog.DELIVERY_ZONES,
  cleanWhatsAppField:checkout.cleanWhatsAppField,deliveryZoneMismatchMessage:deliveryPolicy.deliveryZoneMismatchMessage};
 values.selectedDeliveryZone=checkoutCopy('selectedDeliveryZone',values);
 values.deliveryNeighborhood=checkoutCopy('deliveryNeighborhood',values);
 values.deliveryZoneError=checkoutCopy('deliveryZoneError',values);
 values.addressReady=checkoutCopy('addressReady',values);
 return values;
}

test('all existing delivery prices, order and specific locality names remain unchanged', () => {
 assert.deepEqual(catalog.DELIVERY_ZONES.map(z=>z.id),Object.keys(deliveryPolicy.DELIVERY_ZONES));
 for(const zone of catalog.DELIVERY_ZONES) {
  const state=deliveryState(zone.id,'Centro');
  const recorded=deliveryPolicy.quoteFulfillment({...deliveryAddress,zone_id:zone.id,neighborhood:state.deliveryNeighborhood,delivery_fee:0});
  assert.equal(recorded.delivery_fee_cents,zone.price*100);
  assert.equal(recorded.neighborhood,zone.asksNeighborhood?'Centro':zone.label);
  assert.equal(state.deliveryNeighborhood,recorded.neighborhood);
  assert.equal(state.addressReady,true); assert.equal(state.deliveryZoneError,'');
 }
});

test('city delivery blocks exact specific names including accents, case and spaces in browser and server', () => {
 for(const zone of Object.values(deliveryPolicy.DELIVERY_ZONES).filter(z=>!z.asksNeighborhood)) {
  for(const typed of [zone.label,zone.label.toUpperCase(),`  ${zone.label.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase()}  `]) {
   const state=deliveryState('cidade',typed);
   assert.equal(state.addressReady,false);
   assert.ok(state.deliveryZoneError.includes(`${zone.label} — ${checkout.formatOrderMoney(zone.priceCents/100)}`));
   assert.ok(state.deliveryZoneError.includes('Selecione seu bairro ou local de entrega'));
   assert.throws(()=>deliveryPolicy.quoteFulfillment({...deliveryAddress,neighborhood:typed}),{message:deliveryPolicy.deliveryZoneMismatchMessage('cidade',typed)});
   assert.equal(state.deliveryZoneId,'cidade','no silent tariff switch');
  }
 }
 for(const typed of ['Centro','Promissão I','Laércio Cabeline','Acaizal próximo à praça','Acaizais']) {
  assert.equal(deliveryState('cidade',typed).addressReady,true);
  assert.equal(deliveryPolicy.quoteFulfillment({...deliveryAddress,neighborhood:typed}).delivery_fee_cents,800);
 }
 assert.throws(()=>deliveryPolicy.quoteFulfillment({...deliveryAddress,neighborhood:'   '}),/bairro/);
});

test('fixing a delivery mismatch or changing to pickup clears only validation, preserving typed fields', () => {
 const invalid=deliveryState('cidade','Acaizal'); assert.equal(invalid.addressReady,false);
 for(const state of [deliveryState('acaizal','Acaizal'),deliveryState('cidade','Centro'),deliveryState('cidade','Acaizal','retirada')]) {
  assert.equal(state.addressReady,true);if(state.fulfillment==='entrega')assert.equal(state.deliveryZoneError,'');
  assert.equal(state.address,'Rua X');assert.equal(state.addressNumber,'12');
 }
 assert.equal(deliveryPolicy.quoteFulfillment({...deliveryAddress,type:'pickup',neighborhood:'Acaizal'}).delivery_fee_cents,0);
 const pickup=deliveryState('cidade','Acaizal','retirada');
 assert.equal(checkoutFeedback(pickup).checkoutHint,'Tudo certo! Seu pedido está pronto para ser enviado.');
 // Selecting delivery from pickup must not skip a stored locality conflict before React renders again.
 const next=pageFunction('nextCheckoutSection',{...pickup,customerNameReady:true,checkoutChannel:'whatsapp'});
 assert.equal(next('entrega'),'delivery-fields');
});

function renderDeliveryFields(state) {
 let node;
 function visit(candidate) {
  if(ts.isJsxElement(candidate) && candidate.openingElement.attributes.properties.some(prop=>ts.isJsxAttribute(prop) && prop.name.text==='id' && prop.initializer?.text==='delivery-fields')) node=candidate;
  ts.forEachChild(candidate,visit);
 }
 visit(ast);assert.ok(node);
 const container=({children})=>React.createElement('div',null,children);
 const values={React,...state,currency:new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}),legacyAddressNotice:false,
  setDeliveryZoneId:()=>{},setNeighborhood:()=>{},setAddress:()=>{},setAddressNumber:()=>{},setLegacyAddressNotice:()=>{},
  setComplement:()=>{},setReference:()=>{},complement:'',reference:'',DELIVERY_TIME_ESTIMATE:catalog.DELIVERY_TIME_ESTIMATE,
  Select:container,SelectTrigger:container,SelectValue:()=>null,SelectContent:container,SelectGroup:container,SelectLabel:container,SelectItem:container,
  Input:props=>React.createElement('input',props),...state};
 const {outputText}=ts.transpileModule(`const render=()=>(${node.getText(ast)});`,{compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022}});
 return renderToStaticMarkup(new Function(...Object.keys(values),`${outputText};return render();`)(...Object.values(values)));
}

test('optional complement and reference stay visible and preserve saved values', () => {
 const blank=renderDeliveryFields(deliveryState('cidade','Promissão I'));
 assert.match(blank,/<div class="delivery-extras">/);
 assert.doesNotMatch(blank,/<details\b/);
 assert.ok(blank.indexOf('id="address-number"') < blank.indexOf('id="complement"'));
 assert.match(blank,/id="complement"/);
 assert.match(blank,/id="reference"/);
 for(const saved of [{complement:'Casa 2'},{reference:'Portaria'}]) {
  const html=renderDeliveryFields({...deliveryState('cidade','Promissão I'),...saved});
  assert.match(html,/<div class="delivery-extras">/);
  assert.ok(html.includes(Object.values(saved)[0]));
 }
});

function storefrontControl(marker, values) {
 let found;
 function visit(node) {
  if(ts.isJsxElement(node) && node.openingElement.tagName.getText(ast)==='Button' && node.getText(ast).includes(marker)) found=node;
  ts.forEachChild(node,visit);
 }
 visit(ast);assert.ok(found);
 let expression=found;
 if(marker==='flavor-continue') {
  while(!ts.isJsxExpression(expression.parent)) expression=expression.parent;
 }
 const jsx=expression.getText(ast);
 const js=ts.transpileModule(`const render=()=>(${jsx});`,{compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022}}).outputText;
 const dependencies={React,Button:'button',ChevronRight:()=>null,...values};
 return new Function(...Object.keys(dependencies),`${js};return render();`)(...Object.values(dependencies));
}

test('valid fewer-flavor selections can continue; empty, full and unavailable selections cannot', () => {
 for(const [ids,ready,visible] of [[[],false,false],[['a'],true,true],[['a','b'],true,true],[['a','b','c'],true,false],[['a'],false,false]]) {
  let destination;
  const control=storefrontControl('flavor-continue',{popcornReady:ready,popcornOptionIds:ids,popcornMaxOptions:3,requestScroll:id=>destination=id});
  assert.equal(Boolean(control),visible);
  if(visible) { control.props.onClick();assert.equal(destination,'quantidade-pipocas');assert.match(renderToStaticMarkup(control),new RegExp(`Continuar com ${ids.length}`)); }
 }
});

test('continue after adding follows the next pending section without finalizing or clearing the cart', () => {
 for(const target of ['recebimento','delivery-fields','identificacao','pagamento']) {
  let destination,engaged=true;
  const control=storefrontControl('Continuar pedido <ChevronRight',{
   setBuilderEngaged:value=>engaged=value,requestScroll:id=>destination=id,nextCheckoutSection:()=>target,
  });
  control.props.onClick();assert.equal(destination,target);assert.equal(engaged,false);
 }
});

test('direct category navigation rejects unavailable categories and preserves saved items', () => {
 let selected='pipocas';let scheduled=0;
 for(const allowed of [false,true]) {
  const select=pageFunction('selectCategory',{
   categoryIsAvailable:()=>allowed,setRequestedCategory:value=>selected=value,setEditingId:()=>{},setSelectionMessage:()=>{},setAddedNotice:()=>{},setBuilderEngaged:()=>{},
   setCart:()=>assert.fail('Category navigation must not change saved cart items'),
   window:{history:{state:null,replaceState(){}},location:{href:'https://example.test/?utm_source=instagram'},setTimeout:fn=>{scheduled++;fn();}},
   categoryUrl:navigation.categoryUrl,scrollToSection:()=>{},
  });
  select('fatias');assert.equal(selected,allowed?'fatias':'pipocas');assert.equal(scheduled,allowed?1:0);
 }
 assert.match(source,/visibleCategories\.filter\(\(category\) => category.id !== activeCategory\)/);
 assert.match(source,/disabled=\{!categoryIsAvailable\(category.id\)\} onClick=\{\(\) => selectCategory\(category.id\)\}/);
});

test('real delivery JSX keeps required city neighborhood, hides it for specific places and shows accessible conflict guidance', () => {
 const city=renderDeliveryFields(deliveryState('cidade','Centro'));
 assert.match(city,/Selecione seu bairro ou local de entrega/);assert.match(city,/id="neighborhood"/);assert.doesNotMatch(city,/id="delivery-zone-error"/);
 assert.match(city,/Taxa de entrega:[\s\S]*8,00/);
 for(const id of ['acaizal','aeroporto','km-12','colonia-uraim']) {
  const html=renderDeliveryFields(deliveryState(id,'Centro'));
  assert.doesNotMatch(html,/id="neighborhood"|Qual é o seu bairro\?|Digite seu bairro/);
  assert.match(html,/id="address"/);assert.match(html,/id="address-number"/);
  assert.match(html,/id="complement"/);assert.match(html,/id="reference"/);
 }
 const html=renderDeliveryFields(deliveryState('cidade','  AÇAIZAL '));
 assert.match(html,/aria-invalid="true" aria-describedby="delivery-zone-error"/);
 assert.match(html,/id="delivery-zone-error" class="field-error" role="status"/);
 assert.match(html,/Açaizal — R\$ 10,00/);
});

test('a mismatched locality blocks registration and guides both checkout and sticky action back to delivery', async () => {
 const state=deliveryState('cidade','acaizal');
 const next=pageFunction('nextCheckoutSection',{...state,customerNameReady:true,checkoutChannel:'whatsapp'});
 assert.equal(next(),'delivery-fields');
 let destination;let calls=0;
 const h=checkoutHarness({snapshot:snapshot(),usedFallback:false},{...state,checkoutFormReady:false,
  setBuilderEngaged:()=>{},requestScroll:id=>destination=id,nextCheckoutSection:next,createWhatsAppOrder:async()=>{calls++;}});
 await h.finish();assert.equal(calls,0);assert.equal(destination,'delivery-fields');assert.equal(h.lock.current,false);
 const feedback=checkoutFeedback({...state,checkoutFormReady:false,checkoutReady:false,checkoutAvailabilityMessage:'Complete as informações acima para continuar.'});
 assert.equal(feedback.checkoutHint,state.deliveryZoneError);assert.equal(feedback.checkoutShowsReady,false);
 // Both existing checkout actions continue to use the same pending-section function.
 const finalAction=pageFunction('handleFinalAction',{checkoutFormReady:false,cart,nextCheckoutSection:next,
  setBuilderEngaged:()=>{},setCheckoutAvailabilityMessage:()=>{},requestScroll:id=>destination=id});
 const sticky=pageFunction('handleStickyAction',{stickyUsesCheckoutAction:true,handleFinalAction:finalAction});
 destination=null;sticky();assert.equal(destination,'delivery-fields');
});

test('specific delivery fee and financial total agree from actual request payload through server quote and WhatsApp', async () => {
 for(const zoneId of ['cidade','acaizal','aeroporto','condominio-rural','colonia-uraim']) for(const payment of ['pix','dinheiro','credito','debito']) {
  const state=deliveryState(zoneId,'Centro');
  const mode=payment==='credito'?'credit_single':payment==='debito'?'debit':null;
  const {receiptCardQuote}=await import('../supabase/functions/_shared/receipt-card.mjs');
  const items=[{product_id:'pipoca-gourmet',variant_id:'500ml',option_ids:['leitinho'],quantity:1}];
  const products=deliveryPolicy.quoteCartItems(items);
  const preview=receiptCardQuote(products.subtotalCents+state.selectedDeliveryZone.price*100,mode);
  const details={...detailsFor(payment,'entrega'),customer_name:'Maria Oliveira',items:[{...items[0],kind:'popcorn',name:'Pipoca Gourmet',size:'500 ml',options:['Leitinho'],unit_price:25}],
   neighborhood:state.deliveryNeighborhood,street:state.address,number:state.addressNumber,complement:'Casa 2',reference:'Portaria',
   subtotal:25,delivery_fee:state.selectedDeliveryZone.price,total:preview.totalCents/100,card_fee:preview.feeCents/100,card_basis_points:preview.basisPoints,needs_change:false};
  let recorded,message;
  const h=checkoutHarness({snapshot:snapshot(),usedFallback:false},{...state,payment,cardMode:mode,orderTotal:details.total,checkoutDetails:details,
   createWhatsAppOrder:async payload=>{
    recorded=deliveryPolicy.quoteFulfillment(payload.fulfillment);
    const q=receiptCardQuote(deliveryPolicy.quoteCartItems(payload.items).subtotalCents+recorded.delivery_fee_cents,payload.payment.card_mode??null);
    assert.equal(Number(payload.expected_total)*100,q.totalCents);
    return {order:{order_number:1047,tracking_token:'a'.repeat(48),subtotal:25,delivery_fee:recorded.delivery_fee_cents/100,total:q.totalCents/100,card_fee:q.feeCents/100,card_basis_points:q.basisPoints},payment:{method:payload.payment.method}};
   },buildRegisteredOrderMessage:(...args)=>{message=checkout.buildRegisteredOrderMessage(...args);return message;}});
  await h.finish();assert.ok(recorded);assert.ok(message);assert.equal(h.messages.at(-1),'');
  assert.equal(recorded.neighborhood,state.deliveryNeighborhood);
  assert.equal(recorded.delivery_fee_cents,details.delivery_fee*100);
  assert.ok(message.includes(`Entrega: ${checkout.formatOrderMoney(details.delivery_fee)}`));
  assert.ok(message.includes(`Total: ${checkout.formatOrderMoney(details.total)}`));
  assert.equal(message.split(` — ${state.deliveryNeighborhood}`).length-1,1);
  assert.doesNotMatch(message,/Bairro:|\/pedido\?token=|Acompanhar pedido|\(1x\)/);
  if(payment==='credito'||payment==='debito')assert.match(message,/Acréscimo já incluído no total\./);
 }
});

test('checkout recalculates existing totals immediately after place, receiving, cart and payment changes', async () => {
 const {receiptCardQuote}=await import('../supabase/functions/_shared/receipt-card.mjs');
 for(const [zoneId,fulfillment,payment,subtotal] of [
  ['cidade','entrega','pix',25],['acaizal','entrega','pix',25],['acaizal','entrega','credito',25],
  ['aeroporto','entrega','credito',47],['aeroporto','entrega','debito',47],['cidade','retirada','debito',47],
  ['cidade','retirada','dinheiro',47],['cidade','entrega','pix',22],
 ]) {
  const values={...deliveryState(zoneId,'Centro',fulfillment),payment,cartSubtotal:subtotal,checkoutChannel:'whatsapp',receiptCardQuote};
  for(const name of ['deliveryFee','cardMode','cardQuote','orderTotal'])values[name]=checkoutCopy(name,values);
  const expected=receiptCardQuote(Math.round(subtotal*100)+Math.round(values.deliveryFee*100),values.cardMode);
  assert.equal(values.orderTotal,expected.totalCents/100);
  assert.equal(values.deliveryFee,fulfillment==='retirada'?0:catalog.DELIVERY_ZONES.find(z=>z.id===zoneId).price);
  assert.equal(values.cardMode,payment==='credito'?'credit_single':payment==='debito'?'debit':null);
  if(payment==='pix'||payment==='dinheiro')assert.equal(values.orderTotal,subtotal+values.deliveryFee);
 }
});

test('delivery copy guides city choice without changing IDs, prices, order or specific labels', () => {
 const initial=renderDeliveryFields(deliveryState('',''));
 assert.match(initial,/id="delivery-zone-label">Selecione seu bairro ou local de entrega/);
 assert.match(initial,/id="delivery-zone-hint" class="delivery-selection-help">Selecione seu local para calcular a taxa de entrega\./);
 assert.doesNotMatch(initial,/id="neighborhood"/);
 const city=renderDeliveryFields(deliveryState('cidade','Promissão I')).replace(/\u00a0/g,' ');
 assert.ok(city.includes('Outro bairro dentro da cidade — R$ 8,00'));
 assert.match(city,/<label for="neighborhood">Qual é o seu bairro\?<\/label>/);
 assert.match(city,/<input(?=[^>]*id="neighborhood")(?=[^>]*value="Promissão I")(?=[^>]*placeholder="Digite seu bairro")[^>]*>/);
 const state=deliveryState('cidade','Promissão I');assert.equal(state.addressReady,true);
 assert.equal(deliveryPolicy.quoteFulfillment({...deliveryAddress,neighborhood:state.deliveryNeighborhood}).delivery_fee_cents,800);
 let previous=-1;
 for(const zone of catalog.DELIVERY_ZONES) {
  const label=zone.id==='cidade'?'Outro bairro dentro da cidade':zone.label;
  const index=city.indexOf(`${label} — ${checkout.formatOrderMoney(zone.price)}`);
  assert.ok(index>previous,`option ${zone.id} keeps its order and tariff`);previous=index;
 }
 assert.equal(catalog.DELIVERY_ZONES.find(z=>z.id==='cidade').label,'Dentro da cidade','internal catalog preserved');
 assert.match(source,/aria-describedby="delivery-zone-hint"/);
});

test('delivery copy refinement retains mobile trigger, scrollable dropdown and shared checkout CTA', async () => {
 const css=await readFile(new URL('../app/globals.css',import.meta.url),'utf8');
 assert.match(css,/\.delivery-select-trigger \{[^}]*height: 48px !important;/);
 assert.match(css,/\.delivery-select-trigger \[data-slot="select-value"\] \{[^}]*white-space: normal;[^}]*min-width: 0;/);
 assert.match(css,/\.delivery-select-content \{[^}]*max-height: min\(420px, 70vh\)/);
 assert.match(css,/-webkit-line-clamp: 2;/);
 assert.match(source,/onValueChange=\{setDeliveryZoneId\}/);
 assert.match(source,/onClick=\{handleStickyAction\}/);
 assert.match(source,/onClick=\{handleFinalAction\}/);
 assert.match(source,/zone\.id === "cidade" \? "Outro bairro dentro da cidade" : zone\.label/);
});

function withTintimBrowser({href='https://fixture.invalid/', cookies='', session=null, local=null, blocked=false}, run) {
 const oldWindow=globalThis.window,oldDocument=globalThis.document;
 const writes=[];
 const storage=value=>({getItem:()=>{if(blocked)throw new Error('storage blocked');return value===null?null:JSON.stringify(value);},setItem:()=>writes.push('write')});
 globalThis.window={location:{href},sessionStorage:storage(session),localStorage:storage(local)};
 globalThis.document={cookie:cookies};
 try {return run(writes);} finally {
  if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;
  if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;
 }
}

test('secondary Tintim URLs reuse checkout attribution with repeated params and fresh cookies, without storage writes', () => {
 const previous=checkout.captureOrderAttribution('https://fixture.invalid/?utm_source=instagram&utm_campaign=bolo&extra=old','');
 const message='Olá! Já fiz o pedido #1025 pelo site e preciso de ajuda.';
 withTintimBrowser({href:'https://fixture.invalid/pedido?token=private-token&utm_medium=bio&extra=1&extra=2&fbclid=current&text=untrusted',
  cookies:'tt_fbclid=old; tt_campaignid=42; tt_tintim_fbid=click%201; tt_text=bad; tt_bad=%ZZ; unrelated=secret',
  session:{version:2,order:{attribution:previous}}},writes=>{
  const url=new URL(tintim.tintimContactUrl(message));
  const expected=new URL(tintim.tintimWhatsAppUrl(message,checkout.captureOrderAttribution(window.location.href,document.cookie,previous),document.cookie));
  expected.searchParams.delete('token');assert.equal(url.href,expected.href);
  assert.equal(url.searchParams.get('text'),message);assert.equal(url.searchParams.getAll('text').length,1);
  assert.equal(url.searchParams.get('utm_source'),'instagram');assert.equal(url.searchParams.get('utm_campaign'),'bolo');
  assert.equal(url.searchParams.get('utm_medium'),'bio');assert.deepEqual(url.searchParams.getAll('extra'),['1','2']);
  assert.equal(url.searchParams.get('fbclid'),'current');assert.equal(url.searchParams.get('campaignid'),'42');
  assert.equal(url.searchParams.get('tintim_fbid'),'click 1');assert.equal(url.searchParams.has('bad'),false);
  assert.equal(url.searchParams.has('token'),false);assert.equal(url.searchParams.has('unrelated'),false);
  assert.deepEqual(writes,[]);
 });
});

test('generic contact keeps no message, session attribution wins and first-known fallback survives navigation',()=>{
 const first=checkout.captureOrderAttribution('https://fixture.invalid/?utm_source=instagram&origem=bio','');
 for(const session of [null,{version:2,order:{attribution:first}}]) withTintimBrowser({local:first,session,cookies:'tt_campaignid=7; tt_text=not-a-message'},()=>{
  const url=new URL(tintim.tintimContactUrl());
  assert.equal(url.searchParams.has('text'),false);assert.equal(url.searchParams.get('origem'),'bio');
  assert.equal(url.searchParams.get('campaignid'),'7');assert.equal(url.searchParams.get('utm_source'),'instagram');
 });
 withTintimBrowser({local:first,session:{version:2,order:{attribution:checkout.captureOrderAttribution('https://fixture.invalid/?utm_source=facebook','')}}},()=>{
  assert.equal(new URL(tintim.tintimContactUrl()).searchParams.get('utm_source'),'facebook');
 });
});

test('secondary contacts handle SSR, blocked storage and no attribution without inventing origin',()=>{
 const base=new URL(tintim.tintimWhatsAppUrl(''));base.searchParams.delete('text');
 assert.equal(tintim.tintimContactUrl(),base.href);
 withTintimBrowser({blocked:true,href:'https://fixture.invalid/?utm_source=instagram&extra=1&extra=2',cookies:'tt_campaignid=9'},()=>{
  const url=new URL(tintim.tintimContactUrl());assert.equal(url.searchParams.get('utm_source'),'instagram');
  assert.deepEqual(url.searchParams.getAll('extra'),['1','2']);assert.equal(url.searchParams.get('campaignid'),'9');
 });
 withTintimBrowser({},()=>assert.equal(tintim.tintimContactUrl(),base.href));
});

test('contact anchor preserves native navigation and message while refreshing cookies at activation', async()=>{
 const componentSource=await readFile(new URL('../components/tintim-contact-link.tsx',import.meta.url),'utf8');
 const {outputText}=ts.transpileModule(componentSource,{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
 let state,effect;const exports={};
 const mockedReact={useState:init=>[state??init,value=>state=value],useEffect:fn=>effect=fn};
 new Function('require','exports','React',outputText)(name=>name==='react'?mockedReact:tintim,exports,React);
 const Component=exports.TintimContactLink;
 withTintimBrowser({href:'https://fixture.invalid/?utm_source=instagram'},()=>{
  const props={message:'Olá! Já fiz o pedido #1025 pelo site e preciso de ajuda.',className:'original',children:'Falar com a loja'};
  let element=Component(props);
  assert.equal(new URL(element.props.href).searchParams.has('utm_source'),false,'stable initial hydration');
  effect();element=Component(props);assert.equal(new URL(element.props.href).searchParams.get('utm_source'),'instagram');
  document.cookie='tt_tintim_fbid=late-cookie';
  const event={currentTarget:{href:element.props.href},defaultPrevented:false};
  element.props.onClick(event);
  assert.equal(new URL(event.currentTarget.href).searchParams.get('tintim_fbid'),'late-cookie');
  assert.equal(new URL(event.currentTarget.href).searchParams.get('text'),props.message);
  assert.equal(element.props.className,'original');assert.equal(element.props.children,props.children);
  assert.equal(event.defaultPrevented,false,'native anchor navigation remains unchanged');
  const cancelled=Component({...props,onClick:e=>e.defaultPrevented=true});
  const prevented={currentTarget:{href:'unchanged'},defaultPrevented:false};cancelled.props.onClick(prevented);
  assert.equal(prevented.currentTarget.href,'unchanged');
 });
});

test('all three secondary contact paths keep their original messages using the shared anchor',async()=>{
 const contact=await vite.ssrLoadModule('/components/tintim-contact-link.tsx');
 const received=[];
 const mock=props=>{received.push(props);return React.createElement(contact.TintimContactLink,props);};
 const nodes=[];
 function visit(node){if(ts.isJsxElement(node)&&node.openingElement.tagName.getText(ast)==='TintimContactLink')nodes.push(node);ts.forEachChild(node,visit);}
 visit(ast);assert.equal(nodes.length,1);
 const {outputText}=ts.transpileModule(`const render=()=>(${nodes[0].getText(ast)});`,{compilerOptions:{jsx:ts.JsxEmit.React}});
 renderToStaticMarkup(new Function('React','TintimContactLink','MessageCircle',`${outputText};return render();`)(React,mock,()=>null));
 assert.equal(received[0].message,undefined);assert.equal(received[0].className,'category-text-link');
 for(const file of ['../app/pedido/page.tsx','../components/site-order-result.tsx']) {
  const text=await readFile(new URL(file,import.meta.url),'utf8');
  assert.match(text,/TintimContactLink/);assert.doesNotMatch(text,/tintim\.link|wa\.me|api\.whatsapp\.com/);
  const tree=ts.createSourceFile('component.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let messageExpression;
  function find(node){
   if(ts.isVariableDeclaration(node)&&node.name.getText(tree)==='supportMessage')messageExpression=node.initializer;
   if(ts.isJsxAttribute(node)&&node.name.text==='message'&&ts.isJsxExpression(node.initializer)&&ts.isTemplateExpression(node.initializer.expression))messageExpression=node.initializer.expression;
   ts.forEachChild(node,find);
  }
  find(tree);assert.ok(messageExpression);
  const expression=messageExpression.getText(tree);
  const message=new Function('order','status',`return (${expression})`)({order_number:1025},{order_number:1025});
  const html=renderToStaticMarkup(React.createElement(contact.TintimContactLink,{message},'Falar com a loja'));
  const url=new URL(html.match(/href="([^"]+)"/)[1].replaceAll('&amp;','&'));
  assert.equal(url.searchParams.get('text'),'Olá! Já fiz o pedido #1025 pelo site e preciso de ajuda.');
  assert.equal(url.origin,'https://tintim.link');
 }
});
