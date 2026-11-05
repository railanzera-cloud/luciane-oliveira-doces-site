// QA real do seletor, WebKit automatizado, pacote estático local e sem credenciais.
// Todas as chamadas de rede externas são bloqueadas; NÃO É Safari físico.
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
const browser = await webkit.launch();
let completed = 0;
try {
  for (const [width, height] of screens) {
    const context = await browser.newContext({
      viewport: { width, height }, hasTouch: true, isMobile: true,
      reducedMotion: "reduce", serviceWorkers: "block",
    });
    const denied = [];
    await context.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.origin === origin) return route.continue();
      denied.push(url.origin);
      return route.abort();
    });
    await context.addInitScript(() => {
      sessionStorage.setItem("luciane-order-session-v2", JSON.stringify({
        version: 2,
        cart: [{ id: "qa-1", productId: "fatia-chocolatudo",
          variantId: "fatia", optionIds: [], quantity: 1 }],
        checkoutChannel: "whatsapp", payment: "manual_pix",
        fulfillment: "entrega", deliveryZoneId: "", deliveryLocalityId: "",
        neighborhood: "", address: "Rua QA", addressNumber: "12",
      }));
    });
    const page = await context.newPage();
    page.setDefaultTimeout(14000);
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    try {
      await page.goto(origin + "/?utm_source=qa-local&fbclid=nao-real",
        { waitUntil: "domcontentloaded" });
      const input = page.locator("#neighborhood");
      await input.waitFor({ state: "visible" });

      await input.fill("Promissão II");
      await page.locator('button[role="option"][id$="-promissao-ii"]').tap();
      assert.equal(await input.inputValue(), "Promissão II");
      await page.locator(".delivery-price-preview").waitFor();
      assert.match(await page.locator(".delivery-price-preview").innerText(), /8,00/);

      await input.fill("Ouro Preto");
      await page.locator(".delivery-price-preview").waitFor({ state: "hidden" });
      await page.getByRole("option", { name: /Ouro Preto/ }).tap();
      await page.locator(".delivery-price-preview").waitFor();
      assert.match(await page.locator(".delivery-price-preview").innerText(), /10,00/);

      await input.fill("Alto do Vale");
      await page.getByRole("option", { name: /Alto do Vale/ }).tap();
      await page.locator(".delivery-locality-warning").waitFor();
      await page.locator(".delivery-locality-contact a").waitFor();
      assert.equal(await page.locator(".delivery-price-preview").count(), 0);

      await input.fill("promisao 2");
      await page.locator(".delivery-locality-approximate").waitFor();
      assert.equal(await page.locator(".delivery-price-preview").count(), 0);
      await page.locator('button[role="option"][id$="-promissao-ii"]').tap();
      assert.equal(await input.inputValue(), "Promissão II");

      await input.fill("Promissão III");
      await page.getByRole("option", { name: /Promissão III/ }).waitFor();
      await input.press("Escape");
      assert.equal(await page.getByRole("listbox").count(), 0);
      await input.focus();
      await input.press("Enter");
      assert.equal(await input.inputValue(), "Promissão III");

      await input.fill("zzzzzzz");
      await page.locator(".delivery-locality-empty").waitFor();
      assert.equal(await page.locator(".delivery-price-preview").count(), 0);

      const geometry = await page.evaluate(() => {
        const field = document.querySelector("#neighborhood");
        return {
          width: document.documentElement.clientWidth,
          scroll: document.documentElement.scrollWidth,
          height: field.getBoundingClientRect().height,
          font: parseFloat(getComputedStyle(field).fontSize),
        };
      });
      assert.ok(geometry.scroll <= geometry.width + 1,
        "horizontal overflow: " + JSON.stringify(geometry));
      assert.ok(geometry.height >= 44 && geometry.font >= 16,
        "input too small for iOS touch / zoom prevention");
      assert.deepEqual(pageErrors, []);
      await input.fill("Promissão II");
      await page.locator(".delivery-locality-results").screenshot({
        path: path.join(output, "bairros-webkit-" + width + ".png"),
      });
      completed++;
      console.log("WEBKIT QA OK: " + width + "x" + height);
    } catch (error) {
      await page.screenshot({
        path: path.join(output, "erro-webkit-" + width + ".png"),
        fullPage: true,
      }).catch(() => {});
      console.error("WEBKIT QA FAILED", width, "errors:", pageErrors,
        "external requests blocked:", denied.length,
        "body:", (await page.locator("body").innerText().catch(() => "")).slice(-1800));
      throw error;
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
assert.equal(completed, screens.length);
console.log("Four WebKit mobile viewports passed; real Safari/Instagram homologation still required.");
