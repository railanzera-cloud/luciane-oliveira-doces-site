import assert from "node:assert/strict";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";

const { webkit } = createRequire(process.env.QA_PACKAGE)("playwright");
const origin = "http://127.0.0.1:8181";
const out = path.resolve(process.env.QA_OUTPUT ?? "/tmp/drinks-motion-qa");
await mkdir(out, { recursive: true });

const statuses = [
  { item_key: "category_pipocas", status: "available" },
  { item_key: "category_fatias", status: "available" },
  { item_key: "category_cones", status: "available" },
  { item_key: "category_natal", status: "available" },
  { item_key: "cone_prestigio", status: "available" },
  { item_key: "cone_dois_amores", status: "available" },
  { item_key: "cone_ferrero_rocher", status: "available" },
  { item_key: "cascao_kinder_bueno", status: "available" },
  { item_key: "cascao_ninho_morango", status: "available" },
  { item_key: "cascao_ninho_nutella_chocotone", status: "available" },
  { item_key: "drink_coca_cola_zero_220", status: "available" },
  { item_key: "drink_fanta_laranja_220", status: "available" },
  { item_key: "drink_guarana_antarctica_200", status: "hidden" },
  { item_key: "drink_coca_cola_350", status: "sold_out" },
];
const fixture = {
  store_settings: [{ key: "orders_open", value: true }],
  menu_availability: statuses,
  public_crocante_inventory: [],
  public_slice_preorder: null,
};
function attachFixtures(context) {
  return context.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.origin === origin) return route.continue();
    if (url.hostname !== "edqiwvccmboyayojvuea.supabase.co") return route.abort();
    const key = url.pathname.split("/").at(-1);
    return Object.hasOwn(fixture, key)
      ? route.fulfill({ json: fixture[key] })
      : route.abort();
  });
}

const browser = await webkit.launch();
try {
  for (const [width, height] of [[320,568], [375,667], [390,844], [430,932], [1280,800]]) {
    const context = await browser.newContext({
      viewport: { width, height },
      isMobile: width < 700,
      hasTouch: width < 700,
      reducedMotion: "no-preference",
      serviceWorkers: "block",
    });
    await attachFixtures(context);
    const page = await context.newPage();
    page.setDefaultTimeout(14000);
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    try {
      await page.goto(origin + "/?categoria=cones", { waitUntil: "domcontentloaded" });
      await page.locator('label[for="cone-cascao-trufado-ninho-morango"]').waitFor({ state: "visible" });
      await page.locator('label[for="cone-cascao-trufado-ninho-morango"]').click();
      await page.locator("#cones-quantidade .add-button").click();

      const drink = page.locator("#acompanhamentos");
      const summary = drink.locator("summary");
      await summary.waitFor({ state: "visible" });
      assert.equal(await drink.getAttribute("open"), null, "Painel recolhido por padrão");
      const closedHeight = await drink.evaluate(el => el.getBoundingClientRect().height);
      assert.ok(closedHeight < 135, "Oferta recolhida deve continuar compacta: " + closedHeight);
      assert.equal(await drink.locator(".refreshment-card").count(), 3, "Mostrar duas bebidas disponíveis e uma esgotada");
      assert.equal(await drink.locator('[data-drink-id="guarana-antarctica-200"]').count(), 0);
      assert.equal(await drink.locator('[data-drink-id="coca-cola-350"] button:enabled').count(), 0);

      await summary.click();
      await page.waitForTimeout(60);
      const duringOpen = await drink.evaluate(el => {
        const reveal = el.querySelector(".refreshment-reveal");
        const body = el.querySelector(".refreshment-body");
        return { open: el.open, height: reveal.getBoundingClientRect().height, full: body.scrollHeight,
          running: reveal.getAnimations().some(a => a.playState === "running"),
          collapsing: el.dataset.collapsing, rows: getComputedStyle(reveal).gridTemplateRows,
          transition: getComputedStyle(reveal).transitionProperty };
      });
      console.log("MOTION OPEN",width,JSON.stringify(duringOpen));
      assert.ok(duringOpen.open, "Abertura deve deixar details aberto durante animação");
      assert.ok(duringOpen.running, "WebKit deve executar a microanimação (não saltar diretamente)");
      assert.ok(duringOpen.height > 0 && duringOpen.height < duringOpen.full + 2,
        "Altura intermediária real do painel durante abertura: " + JSON.stringify(duringOpen));
      await page.waitForTimeout(275);
      assert.equal(await drink.getAttribute("open"), "", "Abertura completa");
      await drink.screenshot({ path: path.join(out, "refrigerantes-aberto-" + width + ".png"), animations: "disabled" });

      // Reversão antes do fim do fechamento: precisa recuperar estado e altura, sem clique perdido.
      await summary.click();
      await page.waitForTimeout(40);
      await summary.click();
      await page.waitForTimeout(295);
      assert.equal(await drink.getAttribute("open"), "", "Inversão do fechamento mantém aberto");
      const expandedHeight = await drink.evaluate(el => el.querySelector(".refreshment-reveal").getBoundingClientRect().height);
      assert.ok(expandedHeight > 200, "Conteúdo inteiro deve reaparecer sem corte: " + expandedHeight);

      // Testar interação comercial: quantidades, subtotal e posição na tela.
      const zero = drink.locator('[data-drink-id="coca-cola-zero-220"]');
      await zero.locator(".refreshment-add").scrollIntoViewIfNeeded();
      const beforeTop = await summary.evaluate(el => el.getBoundingClientRect().top);
      await zero.locator(".refreshment-add").click();
      assert.equal((await zero.locator(".refreshment-count").innerText()).trim(), "1");
      await zero.locator(".refreshment-quantity button:last-child").click();
      assert.equal((await zero.locator(".refreshment-count").innerText()).trim(), "2");
      await zero.locator(".refreshment-quantity button:first-child").click();
      assert.equal((await zero.locator(".refreshment-count").innerText()).trim(), "1");
      const afterTop = await summary.evaluate(el => el.getBoundingClientRect().top);
      assert.ok(Math.abs(afterTop - beforeTop) < 14,
        "Adicionar e remover bebida não deve navegar/rolar para outra seção: " + (afterTop - beforeTop));
      assert.match((await page.locator("#carrinho .cart-subtotal strong").innerText()).replace(/\s+/g," "), /24,00/,
        "Subtotal de Cascão R$20 + Coca Zero R$4");
      await drink.screenshot({ path: path.join(out, "refrigerantes-com-quantidade-" + width + ".png"), animations: "disabled" });

      await summary.click();
      await page.waitForTimeout(300);
      assert.equal(await drink.getAttribute("open"), null, "Fechamento completo sem conteúdo preso");
      assert.ok((await drink.evaluate(el => el.getBoundingClientRect().height)) < 135, "Retorna à altura compacta");

      // Teclado: <summary> mantém Enter e Espaço, sem criar botão aninhado.
      if (width === 390) {
        await summary.focus();
        await page.keyboard.press("Enter");
        await page.waitForTimeout(280);
        assert.equal(await drink.getAttribute("open"), "", "Enter abre");
        await page.keyboard.press("Space");
        await page.waitForTimeout(240);
        assert.equal(await drink.getAttribute("open"), null, "Espaço fecha");
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false,
        "Sem overflow horizontal");
      assert.equal(errors.length, 0, "Sem exceções JS: " + errors.join(" / "));
      console.log("WEBKIT V4.7.2 OK", width, "abertura, reversão, quantidade, subtotal, fechamento");
    } finally {
      await context.close();
    }
  }

  // Motion reduzido: não deve animar ou retardar a interação.
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    reducedMotion: "reduce", serviceWorkers: "block",
  });
  await attachFixtures(context);
  try {
    const page = await context.newPage();
    await page.goto(origin + "/?categoria=cones", { waitUntil: "domcontentloaded" });
    await page.locator('label[for="cone-cascao-trufado-ninho-morango"]').click();
    await page.locator("#cones-quantidade .add-button").click();
    const drink = page.locator("#acompanhamentos");
    const summary = drink.locator("summary");
    await summary.click();
    assert.equal(await drink.getAttribute("open"), "", "Motion reduce abre imediatamente");
    const active = await drink.evaluate(el => el.querySelector(".refreshment-reveal").getAnimations().length);
    assert.equal(active, 0, "Motion reduce não executa animação");
    await summary.click();
    assert.equal(await drink.getAttribute("open"), null, "Motion reduce fecha imediatamente");
    console.log("WEBKIT V4.7.2 OK prefers-reduced-motion");
  } finally { await context.close(); }
} finally { await browser.close(); }
