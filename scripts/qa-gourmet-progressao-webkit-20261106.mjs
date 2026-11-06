// Fluxo Gourmet em WebKit isolado: não conecta pagamentos, estoque ou pedidos reais.
import assert from "node:assert/strict";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";

assert.ok(process.env.QA_PACKAGE && process.env.QA_OUTPUT, "QA requer paths explícitos");
const { webkit } = createRequire(process.env.QA_PACKAGE)("playwright");
const output = path.resolve(process.env.QA_OUTPUT);
await mkdir(output, { recursive: true });
const site = "http://127.0.0.1:8181";
const flavors = ["leitinho","ovomaltine","kinder-bueno","choco-cookies-branco",
  "choco-cookies-leite","kinder-bueno-crisp","nutella"];
const menu = [
  { item_key: "category_pipocas", status: "available" },
  { item_key: "category_fatias", status: "sold_out" },
  ...["500ml","750ml","1l"].map(id => ({item_key: "popcorn_size_"+id, status: "available"})),
  ...flavors.map(id=>({item_key:"popcorn_flavor_"+id,status:"available"})),
];
const fixtures = {
  store_settings:[{ key: "orders_open", value: true }],
  menu_availability:menu,
  public_crocante_inventory:[],
  public_slice_preorder:null,
};
const browser = await webkit.launch();
let passed = 0;
try {
  for (const [width,height] of [[320,568],[375,667],[390,844],[430,932]]) {
    const context = await browser.newContext({
      viewport:{width,height}, isMobile:true, hasTouch:true,
      reducedMotion:"reduce",serviceWorkers:"block",
    });
    await context.route("**/*",route=>{
      const url = new URL(route.request().url());
      if(url.origin===site) return route.continue();
      if(url.hostname!=="edqiwvccmboyayojvuea.supabase.co") return route.abort();
      const key=url.pathname.split("/").pop();
      return Object.hasOwn(fixtures,key) ? route.fulfill({json:fixtures[key]}) : route.abort();
    });
    const page=await context.newPage();
    page.setDefaultTimeout(16000);
    const errors=[];
    page.on("pageerror",e=>errors.push(e.message));
    try {
      await page.clock.install({time:new Date("2026-11-06T20:00:00Z")});
      await page.goto(site+"/?categoria=pipocas&utm_source=qa-gourmet", {waitUntil:"domcontentloaded"});
      await page.locator('label[for="size-500ml"]').waitFor({state:"visible"});
      const progress=page.locator("#sabores .gourmet-flavor-progress");
      assert.equal(await progress.locator(".gourmet-flavor-progress-track > span").count(),0);
      await page.locator('label[for="size-500ml"]').tap();
      assert.equal(await progress.locator(".gourmet-flavor-progress-track > span").count(),2);
      assert.match(await progress.getAttribute("aria-label"),/0 de 2 sabores escolhidos/);
      await page.locator('label[for="flavor-leitinho"]').tap();
      assert.match(await progress.getAttribute("aria-label"),/1 de 2 sabores escolhidos/);
      assert.match(await page.locator("#sabores .boutique-price-guide").innerText(),/R\$\s*25,00/);
      const firstTag=page.locator('#sabores .gourmet-removable-tag');
      assert.equal(await firstTag.count(),1);
      assert.equal(await firstTag.getAttribute("aria-label"),"Remover Leitinho da combinação");
      await page.locator('label[for="flavor-kinder-bueno"]').tap();
      assert.match(await progress.getAttribute("aria-label"),/2 de 2 sabores escolhidos/);
      assert.equal(await progress.locator(".is-filled").count(),2);
      assert.equal(await page.locator('#sabores .gourmet-removable-tag').count(),2);
      assert.match(await page.locator("#sabores .boutique-price-guide").innerText(),/R\$\s*30,00/);
      assert.equal(await page.locator('label[for="flavor-nutella"] [role="checkbox"]').isDisabled(),true);
      // Revisão sem percorrer novamente a longa grade.
      await page.getByRole("button",{name:"Remover Kinder Bueno da combinação"}).tap();
      assert.match(await progress.getAttribute("aria-label"),/1 de 2 sabores escolhidos/);
      assert.equal(await page.locator('label[for="flavor-nutella"] [role="checkbox"]').isDisabled(),false);
      assert.match(await page.locator("#sabores .boutique-price-guide").innerText(),/R\$\s*25,00/);
      await page.locator('label[for="flavor-nutella"]').tap();
      assert.match(await page.locator("#sabores .boutique-price-guide").innerText(),/R\$\s*33,00/);
      assert.equal(await page.locator('#sabores .gourmet-removable-tag').count(),2);
      const review=page.locator("#sabores .gourmet-combination-review");
      await review.scrollIntoViewIfNeeded();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,"sem overflow horizontal");
      await review.screenshot({path:path.join(output,`gourmet-revisao-${width}.png`),animations:"disabled"});
      const quantity=page.locator("#quantidade-pipocas .quantity-control");
      await quantity.scrollIntoViewIfNeeded();
      await quantity.getByRole("button",{name:"Aumentar quantidade"}).tap();
      assert.match(await page.locator("#quantidade-pipocas .draft-total").innerText(),/R\$\s*66,00/);
      // Ao adicionar ao carrinho, não efetuar nenhum pedido real.
      await page.locator("#quantidade-pipocas .add-button").tap();
      await page.locator("#recebimento .boutique-added-continuity").waitFor({state:"visible"});
      assert.equal(await page.locator("#carrinho .cart-item").count(),1);
      assert.equal(errors.length,0,"runtime errors: "+errors.join("; "));
      passed++;
      console.log("Gourmet WebKit revisável "+width+"x"+height+" OK");
    } catch (error) {
      await page.screenshot({path:path.join(output,`gourmet-falha-${width}.png`),fullPage:true}).catch(()=>{});
      throw error;
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
assert.equal(passed,4);
console.log("Gourmet progressão/revisão WebKit: quatro viewports aprovados sem pedidos.");
