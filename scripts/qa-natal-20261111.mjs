import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const { webkit } = createRequire(process.env.QA_PACKAGE)("playwright");
const origin = "http://127.0.0.1:8181";
const out = path.resolve(process.env.QA_OUTPUT ?? "/tmp/natal-qa");
await mkdir(out, {recursive:true});
const keys=[
  "chocotone_ninho_nutella", "chocotone_ferrero_rocher",
  "chocotone_casadinho", "chocotone_morango_brigadeiro_branco_chocolate",
];
const baseStatuses=[
  {item_key:"category_pipocas",status:"available"},
  {item_key:"category_fatias",status:"available"},
  {item_key:"category_cones",status:"available"},
  {item_key:"category_natal",status:"available"},
  ...keys.map(item_key=>({item_key,status:"available"})),
  {item_key:"cone_prestigio",status:"available"},
  {item_key:"slice_chocolatudo",status:"available"},
  {item_key:"popcorn_size_500ml",status:"available"},
  {item_key:"popcorn_flavor_leitinho",status:"available"},
];
const browser = await webkit.launch();
try {
  for(const [width,height] of [[320,568],[375,667],[390,844],[430,932],[1280,800]]) {
    const context=await browser.newContext({
      viewport:{width,height},isMobile:width<700,hasTouch:width<700,
      reducedMotion:"reduce",serviceWorkers:"block",
    });
    const page=await context.newPage();
    page.setDefaultTimeout(13000);
    const errors=[];
    page.on("pageerror",e=>errors.push(e.message));
    const mock={
      store_settings:[{key:"orders_open",value:true}],
      menu_availability:baseStatuses,
      public_crocante_inventory:[],
      public_slice_preorder:null,
    };
    await context.route("**/*",route=>{
      const url=new URL(route.request().url());
      if(url.origin===origin)return route.continue();
      if(url.hostname!=="edqiwvccmboyayojvuea.supabase.co")return route.abort();
      const key=url.pathname.split("/").at(-1);
      return Object.hasOwn(mock,key)?route.fulfill({json:mock[key]}):route.abort();
    });
    try {
      await page.goto(origin+"/?utm_source=qa-natal",{waitUntil:"domcontentloaded"});
      const banner=page.locator(".natal-home-ribbon");
      await banner.waitFor({state:"visible"});
      assert.equal(await page.locator(".collection-choice").count(),4,"As quatro categorias permanentes devem continuar na home");
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,"Sem overflow horizontal");
      const dimensions=await banner.evaluate(el=>({height:el.getBoundingClientRect().height,width:el.getBoundingClientRect().width}));
      assert.ok(dimensions.height<128,"A faixa natalina não pode virar hero gigante: "+JSON.stringify(dimensions));
      await page.screenshot({path:path.join(out,"home-natal-"+width+".png"),animations:"disabled"});
      await banner.click();
      await page.locator(".natal-product-card").first().waitFor({state:"visible"});
      assert.equal(await page.locator(".natal-product-card").count(),4,"Vitrine própria com quatro sabores");
      await page.waitForFunction(() => {
        const target = document.getElementById("natal-sabores");
        const y = target?.getBoundingClientRect().top ?? -1;
        return y >= 45 && y <= 235;
      });
      const entranceTop = await page.locator("#natal-sabores").evaluate(el => Math.round(el.getBoundingClientRect().top));
      assert.ok(entranceTop >= 45 && entranceTop <= 235,"Entrada Natal tem de enquadrar os produtos: "+entranceTop);
      if(width<700) {
        const sticky=page.locator(".mobile-sticky-bar button");
        await sticky.waitFor({state:"visible"});
        assert.match(await sticky.innerText(),/Escolher chocotones/);
      }
      await page.locator(".natal-collection").screenshot({path:path.join(out,"colecao-natal-"+width+".png"),animations:"disabled"});
      const add=page.locator(".natal-product-card").first().locator(".natal-product-add");
      const first=page.locator(".natal-product-card").first();
      await add.scrollIntoViewIfNeeded();
      const top0=await first.evaluate(el=>el.getBoundingClientRect().top);
      await add.click();
      if(width<700) assert.match(await page.locator(".mobile-sticky-bar button").innerText(),/Continuar pedido/);
      const topAfterAdd=await first.evaluate(el=>el.getBoundingClientRect().top);
      assert.ok(Math.abs(topAfterAdd-top0)<12,"Adicionar chocotone não pode provocar rolagem: "+(topAfterAdd-top0));
      const q=first.locator(".natal-quantity-control");
      await q.waitFor({state:"visible"});
      assert.equal((await q.locator("span").innerText()).trim(),"1");
      await q.getByRole("button",{name:/Adicionar mais um/}).click();
      assert.equal((await q.locator("span").innerText()).trim(),"2");
      await q.getByRole("button",{name:/Diminuir ou remover/}).click();
      assert.equal((await q.locator("span").innerText()).trim(),"1");
      await q.getByRole("button",{name:/Diminuir ou remover/}).click();
      await add.waitFor({state:"visible"});
      await add.click();
      await page.locator(".natal-product-card").nth(1).locator(".natal-product-add").click();
      const inline=page.locator(".natal-continue");
      if(width<700) {
        // O botão inline assume a continuação quando está legível acima da barra do navegador.
        await page.evaluate(() => {
          const el=document.querySelector(".natal-continue");
          if (!el) throw new Error("Ação inline de Natal ausente");
          window.scrollTo(0, window.scrollY+el.getBoundingClientRect().top-145);
        });
        await page.waitForFunction(() => {
          const el=document.querySelector(".natal-continue");
          return !!el && el.getBoundingClientRect().top >= 40
            && el.getBoundingClientRect().bottom < innerHeight-90
            && !document.querySelector(".mobile-sticky-bar");
        });
        await page.evaluate(() => {
          const el=document.getElementById("natal-sabores");
          if(el) window.scrollTo(0,window.scrollY+el.getBoundingClientRect().top-140);
        });
        await page.waitForFunction(() => !!document.querySelector(".mobile-sticky-bar"));
      }
      await inline.click();
      assert.equal(await page.locator("#carrinho .cart-item").count(),2,"Pedido misto de dois chocotones");
      await page.waitForFunction(() => {
        const rect = document.getElementById("recebimento")?.getBoundingClientRect();
        return rect && rect.top < 235 && rect.bottom > 240;
      });
      assert.equal(await page.locator(".boutique-added-continuity .boutique-added-other").count(),1,
        "Continuar deve apresentar sugestões de outros doces antes de entrega/retirada");
      if(width<700) {
        const sticky=page.locator(".mobile-sticky-bar button");
        await sticky.waitFor({state:"visible"});
        assert.match(await sticky.innerText(),/Entrega ou retirada/);
        await sticky.click();
        await page.waitForFunction(() => {
          const rect = document.getElementById("recebimento-opcoes")?.getBoundingClientRect();
          return rect && rect.top >= 20 && rect.top <= 220;
        });
        assert.equal(await page.locator('#recebimento .choice-card').count(),2);
      }
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      assert.equal(errors.length,0,errors.join(" / "));
      console.log("Natal QA",width,"ok",JSON.stringify(dimensions));
    } finally {
      await context.close();
    }
  }
} finally {await browser.close();}
console.log("Coleção de Natal WebKit: 5 larguras, quatro categorias preservadas, carrinho e quantidades testados.");
