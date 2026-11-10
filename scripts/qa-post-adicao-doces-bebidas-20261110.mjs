// QA WebKit isolado: ordem dos doces, bebidas compactas e viewport estável.
// Não faz pedidos, não grava estoque, não usa serviços comerciais produtivos.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

assert.ok(process.env.QA_PACKAGE && process.env.QA_OUTPUT, "Dependências QA não configuradas");
const { webkit } = createRequire(process.env.QA_PACKAGE)("playwright");
const origin = "http://127.0.0.1:8181";
const out = path.resolve(process.env.QA_OUTPUT);
await mkdir(out, { recursive: true });

const stockKeys = [
  "trufada_ninho_p", "trufada_ninho_m", "trufada_ninho_g",
  "trufada_pacoca_p", "trufada_pacoca_m", "trufada_pacoca_g",
  "trufada_coco_queimado_p", "trufada_coco_queimado_m", "trufada_coco_queimado_g",
];
const drinkKeys = [
  "drink_coca_cola_zero_220", "drink_fanta_laranja_220",
  "drink_guarana_antarctica_200", "drink_coca_cola_350",
];
const screens = [[320,568],[375,667],[390,844],[430,932],[1280,800]];
const browser = await webkit.launch();
let completed = 0;
try {
  for (const [width, height] of screens) {
    const mobile = width < 700;
    const context = await browser.newContext({
      viewport: { width, height }, isMobile: mobile, hasTouch: mobile,
      reducedMotion: "reduce", serviceWorkers: "block",
    });
    const fixtures = {
      store_settings: [{ key: "orders_open", value: true }],
      menu_availability: [
        { item_key: "category_pipocas", status: "available" },
        { item_key: "category_fatias", status: "available" },
        { item_key: "category_cones", status: "available" },
        { item_key: "cone_prestigio", status: "available" },
        { item_key: "popcorn_size_500ml", status: "available" },
        { item_key: "popcorn_flavor_leitinho", status: "available" },
        { item_key: "slice_chocolatudo", status: "available" },
        ...stockKeys.map(item_key => ({ item_key, status: "available" })),
        ...drinkKeys.map(item_key => ({ item_key, status: "available" })),
      ],
      public_crocante_inventory: stockKeys.map(item_key => ({ item_key, available: 4 })),
      public_slice_preorder: null,
    };
    await context.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.origin === origin) return route.continue();
      if (url.hostname !== "edqiwvccmboyayojvuea.supabase.co") return route.abort();
      const key = url.pathname.split("/").pop();
      return Object.hasOwn(fixtures, key)
        ? route.fulfill({ json: fixtures[key] })
        : route.abort();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    try {
      await page.goto(origin + "/?categoria=pipocas&utm_source=qa-post-add", { waitUntil: "domcontentloaded" });
      await page.locator('label[for="size-500ml"]').waitFor({ state: "visible" });
      await page.locator('label[for="size-500ml"]').click();
      await page.locator('label[for="flavor-leitinho"]').click();
      await page.locator("#quantidade-pipocas .add-button").click();
      const confirmation = page.locator("#recebimento .boutique-added-continuity");
      await confirmation.waitFor({ state: "visible" });
      const sweetChoices = confirmation.locator(".boutique-complement-choice");
      const offer = confirmation.locator(".refreshment-offer");
      await offer.waitFor({ state: "visible" });
      assert.equal(await sweetChoices.count(), 4, "Quatro categorias disponíveis precisam ter CTA próprio");
      assert.equal(await offer.locator(".refreshment-card").count(), 4, "Quatro bebidas reconhecíveis");
      const order = await confirmation.evaluate(el => {
        const sweets = el.querySelector(".boutique-added-other");
        const drinks = el.querySelector(".refreshment-offer");
        const receiving = document.querySelector("#recebimento .checkout-step-heading");
        return {
          sweetsBeforeDrinks: Boolean(sweets.compareDocumentPosition(drinks) & Node.DOCUMENT_POSITION_FOLLOWING),
          drinksBeforeReceiving: Boolean(drinks.compareDocumentPosition(receiving) & Node.DOCUMENT_POSITION_FOLLOWING),
          columns: getComputedStyle(sweets.querySelector(".boutique-complement-grid")).gridTemplateColumns.split(" ").length,
        };
      });
      assert.equal(order.sweetsBeforeDrinks, true, "Doces primeiro");
      assert.equal(order.drinksBeforeReceiving, true, "Recebimento depois das bebidas");
      assert.equal(order.columns, 2, "Atalhos em duas colunas");
      const offerHeight = await offer.evaluate(el => el.getBoundingClientRect().height);
      assert.ok(offerHeight < 370, "Bebidas devem ocupar menos de 370px, medidos: " + offerHeight);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, "Sem overflow horizontal");
      await confirmation.screenshot({
        path: path.join(out, "doces-bebidas-" + width + ".png"), animations: "disabled",
      });
      for (const [id, targetCount] of [
        ["coca-cola-zero-220", 1],
        ["fanta-laranja-220", 1],
        ["coca-cola-zero-220", 2],
      ]) {
        const card = offer.locator(`.refreshment-card[data-drink-id="${id}"]`);
        const add = card.locator(".refreshment-add");
        // Uma área fixa de finalização cobre o rodapé: centralizar o alvo ANTES
        // da medida para não confundir scroll automático do Playwright com salto
        // provocado pelo React quando o carrinho recebe uma nova linha.
        await add.evaluate(el => el.scrollIntoView({ block: "center", behavior: "instant" }));
        const before = await page.evaluate(productId => {
          const el = document.querySelector(`.refreshment-card[data-drink-id="${productId}"]`);
          return { top: el.getBoundingClientRect().top, scrollY: scrollY };
        }, id);
        mobile ? await add.tap() : await add.click();
        await card.locator(".refreshment-count").waitFor({ state: "visible" });
        assert.equal((await card.locator(".refreshment-count").innerText()).trim(), String(targetCount));
        const after = await page.evaluate(productId => {
          const el = document.querySelector(`.refreshment-card[data-drink-id="${productId}"]`);
          return { top: el.getBoundingClientRect().top, scrollY: scrollY };
        }, id);
        assert.ok(Math.abs(after.top - before.top) <= 5,
          `O cartão não pode saltar após adicionar bebida: ${id}, ${width}px, ${JSON.stringify({ before, after })}`);
      }
      assert.equal(await page.locator("#carrinho .cart-item").count(), 3, "Pote e duas bebidas mantidos no carrinho");
      assert.equal(await errors.length, 0, "Sem exceções JS: " + errors.join("; "));
      completed++;
    } catch (error) {
      await page.screenshot({
        path: path.join(out, "FALHA-post-add-" + width + ".png"), fullPage: true,
      }).catch(() => {});
      throw error;
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
assert.equal(completed, screens.length);
console.log("Checkout doce → bebida WebKit: " + completed + " larguras aprovadas, sem contato com produção.");
