// QA visual do pós-adição. WebKit automatizado em pacote local, sem contatos nem pedidos reais.
// Simula disponibilidade pública, não usa dados de estoque produtivo nem Safari físico.
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
const screens = [[320,568],[375,667],[390,844],[430,932]];
const browser = await webkit.launch();
let completed = 0;
try {
  for (const [width, height] of screens) {
    for (const slicesAvailable of [true, false]) {
      const context = await browser.newContext({
        viewport: { width, height }, isMobile: true, hasTouch: true,
        reducedMotion: "reduce", serviceWorkers: "block",
      });
      const menu = [
        { item_key: "category_pipocas", status: "available" },
        { item_key: "category_fatias", status: slicesAvailable ? "available" : "sold_out" },
        { item_key: "popcorn_size_500ml", status: "available" },
        { item_key: "popcorn_flavor_leitinho", status: "available" },
        { item_key: "popcorn_flavor_kinder_bueno", status: "available" },
        { item_key: "popcorn_flavor_nutella", status: "available" },
        { item_key: "slice_chocolatudo", status: slicesAvailable ? "available" : "sold_out" },
        ...stockKeys.map(item_key => ({ item_key, status: "available" })),
      ];
      const fixtures = {
        store_settings: [{ key: "orders_open", value: true }],
        menu_availability: menu,
        public_crocante_inventory: stockKeys.map(item_key => ({ item_key, available: 3 })),
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
        // Janela absoluta: fixtures não dependem do dia em que a CI for executada.
        await page.clock.install({ time: new Date("2026-11-07T15:00:00Z") });
        if (width === 390 && slicesAvailable) {
          await page.goto(origin + "/?categoria=pipocas&utm_source=qa-promo-sabado", { waitUntil: "domcontentloaded" });
          const banner = page.locator(".gourmet-feriado-edition");
          await banner.waitFor({ state: "visible" });
          assert.match(await banner.innerText(), /07\/11/);
          assert.match(await banner.innerText(), /Nutella é a única exceção/);
          await banner.screenshot({ path: path.join(out, "promocao-gourmet-0711-editorial-390.png"), animations: "disabled" });
          await page.locator('label[for="size-500ml"]').tap();
          await page.locator('label[for="flavor-kinder-bueno"]').tap();
          assert.match(await page.locator(".boutique-price-guide-copy strong").innerText(), /25,00/,
            "Kinder Bueno deve ter preço-base na promoção");
          await page.locator('label[for="flavor-nutella"]').tap();
          assert.match(await page.locator(".boutique-price-guide-copy strong").innerText(), /33,00/,
            "Nutella em qualquer combinação deve retornar ao preço normal");
          assert.match(await page.locator(".boutique-price-guide p").innerText(), /Nutella/);
          assert.equal(await page.locator('label[for="flavor-nutella"] .gourmet-feriado-regular-price').count(), 0,
            "Nutella não pode ter preço riscado");
          await page.locator("#sabores .boutique-flavor-stage").screenshot({
            path: path.join(out, "promocao-gourmet-0711-excecao-nutella-390.png"), animations: "disabled",
          });
          await page.clock.setFixedTime(new Date("2026-11-08T03:00:00Z"));
          await page.reload({ waitUntil: "domcontentloaded" });
          await page.locator('label[for="size-500ml"]').waitFor({ state: "visible" });
          await banner.waitFor({ state: "hidden" });
          await page.clock.setFixedTime(new Date("2026-11-07T15:00:00Z"));
        }
        // A home continua navegável mesmo com imagens sem callout/arraste no Safari.
        if (slicesAvailable) {
          await page.goto(origin + "/?utm_source=qa-fotos-home", { waitUntil: "domcontentloaded" });
          const category = page.locator(".menu-entry.is-neutral .collection-choice").first();
          await category.waitFor({ state: "visible" });
          const categoryPhoto = category.locator(".collection-photo img").first();
          assert.equal(await categoryPhoto.getAttribute("draggable"), "false");
          assert.equal(await categoryPhoto.evaluate(img => getComputedStyle(img).pointerEvents), "none");
          await category.tap();
          assert.equal(await page.locator(".storefront").count(), 1, "Navegação continua funcional");
        }
        await page.goto(origin + "/?categoria=pipocas&utm_source=qa-contextual", { waitUntil: "domcontentloaded" });
        await page.locator('label[for="size-500ml"]').waitFor({state:"visible"});
        await page.locator('label[for="size-500ml"]').tap();
        await page.locator('label[for="flavor-leitinho"]').tap();
        const add = page.locator("#quantidade-pipocas .add-button");
        await add.waitFor({state:"visible"});
        await add.tap();
        const confirmation = page.locator("#recebimento .boutique-added-continuity");
        await confirmation.waitFor({state:"visible"});
        const cartPhoto = page.locator('#carrinho .boutique-cart-image[data-gourmet="true"] svg.gourmet-checkout-crop').first();
        const addedPhoto = confirmation.locator('.boutique-added-photo[data-gourmet="true"] svg.gourmet-checkout-crop');
        for (const [svg, viewBox] of [[cartPhoto, "70 360 760 860"], [addedPhoto, "130 430 640 720"]]) {
          const presentation = await svg.evaluate(async el => {
            const css = getComputedStyle(el);
            const resource = el.querySelector("image")?.getAttribute("href");
            const source = new Image();
            source.src = resource;
            await source.decode();
            return {
              width: source.naturalWidth, height: source.naturalHeight,
              viewBox: el.getAttribute("viewBox"), pointer: css.pointerEvents, resource,
            };
          });
          assert.equal(presentation.resource, "/pipoca-gourmet.jpeg", "Mesma fotografia original");
          assert.equal(presentation.width, 900, "A fotografia verdadeira deve carregar");
          assert.equal(presentation.height, 1600, "A proporção de origem foi preservada");
          assert.equal(presentation.pointer, "none", "Miniatura não intercepta toque");
          assert.equal(presentation.viewBox, viewBox, "Cada contexto tem seu recorte independente");
        }
        await page.locator("#carrinho .cart-item").first().screenshot({
          path: path.join(out, "miniatura-pedido-" + width + "-" + (slicesAvailable ? "com-fatias" : "fatias-esgotadas") + ".png"),
          animations: "disabled",
        });
        await confirmation.locator(".boutique-added-confirmation").screenshot({
          path: path.join(out, "miniatura-adicionada-" + width + "-" + (slicesAvailable ? "com-fatias" : "fatias-esgotadas") + ".png"),
          animations: "disabled",
        });
        const choices = confirmation.locator(".boutique-complement-choice");
        assert.equal(await choices.count(), slicesAvailable ? 3 : 2, "Quantidade de categorias sugeridas deve refletir disponibilidade");
        assert.equal(await page.locator("#carrinho .cart-add-more").count(), 0,
          "Não exibir dois conjuntos de sugestões durante a confirmação temporária");
        assert.match(await confirmation.innerText(), /Quer completar seu pedido/i);
        assert.equal(await confirmation.getByText("Pipocas Trufadas").count(), 1);
        assert.equal(await confirmation.getByText("Outro pote recheado").count(), 1);
        assert.equal(await confirmation.getByText("Adicionar fatia").count(), slicesAvailable ? 1 : 0);
        await confirmation.scrollIntoViewIfNeeded();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false,
          "Complementos não podem causar overflow horizontal");
        const imgs = confirmation.locator(".boutique-complement-media img");
        assert.equal(await imgs.count(), slicesAvailable ? 3 : 2);
        for (let i=0;i<await imgs.count();i++) {
          await imgs.nth(i).scrollIntoViewIfNeeded();
          await imgs.nth(i).evaluate(img => img.decode());
          assert.ok(await imgs.nth(i).evaluate(img => img.naturalWidth > 0), "Foto precisa carregar");
        }
        await confirmation.screenshot({
          path: path.join(out, "complementos-" + width + "-" + (slicesAvailable ? "com-fatias" : "fatias-esgotadas") + ".png"),
          animations: "disabled",
        });
        await page.locator('label[for="receive-pickup"]').tap();
        await confirmation.waitFor({state:"detached"});
        await page.locator("#carrinho .cart-add-more").waitFor({state:"visible"});
        assert.equal(await page.locator("#carrinho .cart-item").count(), 1,
          "Escolha da retirada não pode limpar o item");
        assert.equal(errors.length, 0, "Erro de runtime: "+errors.join("; "));
        completed++;
      } catch (error) {
        await page.screenshot({
          path: path.join(out, "falha-complementos-" + width + "-" + (slicesAvailable ? "fatias" : "esgotadas") + ".png"),
          fullPage: true,
        }).catch(()=>{});
        throw error;
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}
assert.equal(completed, screens.length * 2);
console.log("Complementos WebKit isolados: " + completed + " cenários aprovados; nenhuma venda/pagamento executado.");
