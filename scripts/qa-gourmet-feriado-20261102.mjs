import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
const { chromium, webkit } = createRequire(process.env.QA_PACKAGE)("playwright");
const output = process.env.QA_OUTPUT;
await mkdir(output, { recursive: true });
const origin = "http://127.0.0.1:8181";
const flavors = {
  leitinho: "available", choco_nute: "hidden", ovomaltine: "sold_out",
  kinder_bueno: "available", choco_cookies_branco: "available",
  choco_cookies_leite: "hidden", kinder_bueno_crisp: "hidden", nutella: "available",
};
const menu = [
  { item_key: "category_pipocas", status: "available" },
  { item_key: "category_fatias", status: "available" },
  ...["500ml","750ml","1l"].map(size=>({item_key:"popcorn_size_"+size,status:"available"})),
  ...Object.entries(flavors).map(([name,status])=>({item_key:"popcorn_flavor_"+name,status})),
  { item_key: "slice_prestigio", status: "available" },
];
const metrics = [];
for (const [engineName, engine] of Object.entries({chromium,webkit})) {
  const browser = await engine.launch();
  try {
    for (const width of [320,390,1440]) {
      const context = await browser.newContext({
        viewport: { width,height: width===1440?900:844 },
        isMobile: width<700, hasTouch: width<700, reducedMotion:"reduce",
        serviceWorkers:"block",
      });
      await context.route("**/*", async route => {
        const url = new URL(route.request().url());
        if (url.hostname === "127.0.0.1") return route.continue();
        if (url.hostname !== "edqiwvccmboyayojvuea.supabase.co") return route.abort();
        const api = url.pathname.split("/").pop();
        const fixtures = {
          store_settings: [{key:"orders_open",value:true}],
          menu_availability: menu,
          public_crocante_inventory: [],
          public_slice_preorder: null,
        };
        if (!(api in fixtures)) return route.abort();
        return route.fulfill({json:fixtures[api]});
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      await page.clock.install({time:new Date("2026-11-02T17:00:00Z")});
      await page.goto(origin+"/?categoria=pipocas&utm_source=instagram");
      await page.locator("#tamanhos").waitFor();
      await page.locator(".gourmet-feriado-edition").waitFor();
      await page.waitForTimeout(150);
      assert.match(await page.locator(".gourmet-feriado-edition").innerText(),/R\$ 25,00/);
      assert.match(await page.locator(".gourmet-feriado-edition").innerText(),/R\$ 39,00/);
      assert.match(await page.locator(".gourmet-feriado-edition").innerText(),/R\$ 49,00/);
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth - innerWidth);
      assert.ok(overflow<=1,"Oferta transbordou a tela: "+width+", "+overflow);
      if(width===390||width===320) await page.locator(".gourmet-feriado-edition").screenshot({path:output+"/"+engineName+"-"+width+"-campanha.png"});
      await page.locator('label[for="size-500ml"]').click();
      await page.locator('label[for="flavor-nutella"]').click();
      await page.locator(".boutique-price-guide").waitFor();
      assert.match(await page.locator(".boutique-price-guide").innerText(),/R\$ 25,00/);
      assert.match(await page.locator('label[for="flavor-nutella"]').innerText(),/R\$ 33,00/);
      assert.equal(await page.locator('label[for="flavor-ovomaltine"] input').isDisabled(),true);
      if(width===390) await page.locator("#sabores").screenshot({path:output+"/"+engineName+"-390-sabores.png"});
      if(width===390) await page.screenshot({path:output+"/"+engineName+"-390-vitrine-completa.png",fullPage:true});
      // Reabrir a loja 1 minuto depois do encerramento. Nada deve sobreviver à meia-noite.
      await page.clock.setFixedTime(new Date("2026-11-03T03:01:00Z"));
      await page.reload();
      await page.locator("#tamanhos").waitFor();
      assert.equal(await page.locator(".gourmet-feriado-edition").count(),0);
      await page.locator('label[for="size-500ml"]').click();
      await page.locator('label[for="flavor-nutella"]').click();
      assert.match(await page.locator(".boutique-price-guide").innerText(),/R\$ 33,00/);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=1);
      metrics.push({engineName,width,promoPrice:"25",normalPrice:"33",overflow});
      await context.close();
      console.log("QA Gourmet 02/11",engineName,width,"PASS");
    }
  } finally { await browser.close(); }
}
await writeFile(output+"/medidas.json",JSON.stringify(metrics,null,2));
