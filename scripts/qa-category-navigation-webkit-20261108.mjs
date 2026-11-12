// QA de navegação e primeira dobra em WebKit isolado. Nenhum pedido ou acesso produtivo.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

assert.ok(process.env.QA_PACKAGE && process.env.QA_OUTPUT);
const { webkit } = createRequire(process.env.QA_PACKAGE)("playwright");
const origin = "http://127.0.0.1:8181";
const output = path.resolve(process.env.QA_OUTPUT);
await mkdir(output, { recursive: true });
const screens = [[320, 568], [375, 667], [390, 844], [430, 932]];
const stockKeys = [
  "trufada_ninho_p","trufada_ninho_m","trufada_ninho_g",
  "trufada_pacoca_p","trufada_pacoca_m","trufada_pacoca_g",
  "trufada_coco_queimado_p","trufada_coco_queimado_m","trufada_coco_queimado_g",
];
const menuKeys = [
  "category_pipocas","category_fatias","category_cones",
  "cone_prestigio","cone_dois_amores","cone_ferrero_rocher",
  "slice_chocolatudo","slice_chocolate_morango","slice_ninho_morango",
  "slice_coco_cremoso_morango",
  "popcorn_size_500ml","popcorn_size_750ml","popcorn_size_1l",
  "popcorn_flavor_leitinho","popcorn_flavor_kinder_bueno","popcorn_flavor_choco_cookies_branco",
  ...stockKeys,
];
const fixtures = {
  store_settings: [{ key: "orders_open", value: true }],
  menu_availability: menuKeys.map(item_key => ({ item_key, status: "available" })),
  public_crocante_inventory: stockKeys.map(item_key => ({ item_key, available: 4 })),
  public_slice_preorder: null,
};
const browser = await webkit.launch();
let completed = 0;
try {
  for (const [width, height] of screens) {
    const context = await browser.newContext({
      viewport: { width, height }, isMobile: true, hasTouch: true,
      reducedMotion: "reduce", serviceWorkers: "block",
    });
    await context.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.origin === origin) return route.continue();
      if (url.hostname !== "edqiwvccmboyayojvuea.supabase.co") return route.abort();
      const key = url.pathname.split("/").pop();
      return Object.hasOwn(fixtures, key) ? route.fulfill({ json: fixtures[key] }) : route.abort();
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.setDefaultTimeout(12000);
    const assertEntry = async (id, label) => {
      await page.locator("#" + id).waitFor({ state: "visible" });
      await page.waitForTimeout(180); // permite requestAnimationFrame do scroll pós-render
      const geometry = await page.evaluate(targetId => {
        const element = document.getElementById(targetId);
        return {
          top: element.getBoundingClientRect().top,
          scrollWidth: document.documentElement.scrollWidth,
          viewport: window.innerWidth,
        };
      }, id);
      assert.ok(geometry.top >= -4 && geometry.top <= Math.min(260, height * .5),
        label + " deve mostrar primeira escolha: " + JSON.stringify(geometry));
      assert.ok(geometry.scrollWidth <= geometry.viewport + 1,
        label + " overflow horizontal: " + JSON.stringify(geometry));
    };
    try {
      await page.goto(origin + "/?utm_source=qa-navegacao", { waitUntil: "domcontentloaded" });
      const gourmetCard = page.locator(".collection-choice").filter({ hasText: "Pipocas Gourmet" }).first();
      await gourmetCard.waitFor({ state: "visible" });
      await gourmetCard.tap();
      await assertEntry("tamanhos", "Gourmet");
      const toggle = page.locator(".builder-more-toggle");
      assert.equal(await toggle.getAttribute("aria-expanded"), "false");
      assert.equal(await page.locator(".category-shortcuts").count(), 0);
      assert.equal(await page.locator(".v7-navigation-pipocas").count(), 0);
      await page.screenshot({ path: path.join(output, "navegacao-gourmet-" + width + ".png") });

      await toggle.tap();
      assert.equal(await toggle.getAttribute("aria-expanded"), "true");
      const options = page.locator(".builder-more-options");
      await options.waitFor({ state: "visible" });
      assert.equal(await options.getByRole("button", { name: "Pipocas Trufadas" }).count(), 1);
      await options.getByRole("button", { name: "Fatias Artesanais" }).tap();
      await assertEntry("fatias", "Fatias");
      assert.equal(await toggle.getAttribute("aria-expanded"), "false");
      await page.screenshot({ path: path.join(output, "navegacao-fatias-" + width + ".png") });

      await toggle.tap();
      await page.keyboard.press("Escape");
      assert.equal(await toggle.getAttribute("aria-expanded"), "false");
      await page.locator(".builder-nav-back").tap();
      const coneCard = page.locator(".collection-choice").filter({ hasText: "Cascão Trufado" }).first();
      await coneCard.waitFor({ state: "visible" });
      await coneCard.tap();
      await assertEntry("cones-sabores", "Cones");
      await page.screenshot({ path: path.join(output, "navegacao-cones-" + width + ".png") });
      assert.deepEqual(errors, []);
      completed++;
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
assert.equal(completed, screens.length);
console.log("Navegação contextual WebKit: " + completed + " tamanhos mobile aprovados (não Safari físico).");
