// QA de navegação contextual Gourmet; WebKit isolado, sem pedidos, rede ou pagamentos reais.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

assert.ok(process.env.QA_PACKAGE && process.env.QA_OUTPUT, "QA_PACKAGE e QA_OUTPUT obrigatórios");
const { webkit } = createRequire(process.env.QA_PACKAGE)("playwright");
const output = path.resolve(process.env.QA_OUTPUT);
await mkdir(output,{recursive:true});
const origin="http://127.0.0.1:8181";
const flavors=["leitinho","ovomaltine","kinder-bueno","choco-cookies-branco",
  "choco-cookies-leite","kinder-bueno-crisp","nutella"];
const fixtures={
  store_settings:[{key:"orders_open",value:true}],
  menu_availability:[
    {item_key:"category_pipocas",status:"available"},
    {item_key:"category_fatias",status:"sold_out"},
    ...["500ml","750ml","1l"].map(id=>({item_key:"popcorn_size_"+id,status:"available"})),
    ...flavors.map(id=>({item_key:"popcorn_flavor_"+id,status:"available"})),
  ],
  public_crocante_inventory:[],
  public_slice_preorder:null,
};
const browser=await webkit.launch();
let passed=0;
try {
  for(const [width,height] of [[320,568],[375,667],[390,844],[430,932]]) {
    const context=await browser.newContext({
      viewport:{width,height}, isMobile:true, hasTouch:true,
      reducedMotion:"reduce", serviceWorkers:"block",
    });
    await context.route("**/*", route=>{
      const url=new URL(route.request().url());
      if(url.origin===origin)return route.continue();
      if(url.hostname!=="edqiwvccmboyayojvuea.supabase.co")return route.abort();
      const key=url.pathname.split("/").pop();
      return Object.hasOwn(fixtures,key)?route.fulfill({json:fixtures[key]}):route.abort();
    });
    const page=await context.newPage();
    page.setDefaultTimeout(17000);
    const errors=[];
    page.on("pageerror",err=>errors.push(err.message));
    const dock=page.locator(".mobile-sticky-bar.is-gourmet-flavor-continue");
    try {
      await page.clock.install({time:new Date("2026-11-06T20:00:00Z")});
      await page.goto(origin+"/?categoria=pipocas&utm_source=qa-continue-one",{waitUntil:"domcontentloaded"});
      await page.locator('label[for="size-500ml"]').tap();
      assert.match(await page.locator("#step-flavors + p").textContent().catch(()=>page.locator("#sabores .step-heading p").textContent()),/Escolha de 1 até 2 sabores\. Você decide quantos combinar\./);
      assert.equal(await dock.count(),0,"Nenhum atalho quando não há sabor escolhido");
      await page.locator('label[for="flavor-leitinho"]').tap();
      await dock.waitFor({state:"visible"});
      assert.match(await dock.innerText(),/1 de 2/);
      assert.match(await dock.innerText(),/Continuar com 1 sabor/);
      const tags=page.locator("#sabores .gourmet-removable-tag");
      assert.equal(await tags.count(),1);
      assert.equal(await page.locator("#sabores .gourmet-combination-hint").count(),0);
      // Barra compacta não deve estourar viewport nem bloquear a última opção:
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1),false);
      const rect=await dock.boundingBox();assert.ok(rect&&rect.height<=65,"bar baixa, sem segundo painel");
      await dock.screenshot({path:path.join(output,`gourmet-continue-500ml-${width}.png`),animations:"disabled"});
      await dock.locator("button").tap();
      await page.waitForFunction(()=>{
        const node=document.querySelector("#quantidade-pipocas .quantity-row");
        if(!node)return false;
        const r=node.getBoundingClientRect();
        return r.top>=0&&r.top<window.innerHeight*.86;
      });
      assert.equal(await dock.count(),0,"Ao alcançar quantidade a ação especial desaparece");
      assert.equal(await page.locator("#quantidade-pipocas .quantity-control strong").innerText(),"1");

      // Uma escolha de dois sabores num pote que permite até três: pode seguir
      // a qualquer momento, mas a pessoa ainda consegue selecionar o terceiro.
      await page.goto(origin+"/?categoria=pipocas&utm_source=qa-continue-two",{waitUntil:"domcontentloaded"});
      await page.locator('label[for="size-1l"]').tap();
      assert.match(await page.locator("#sabores .step-heading p").innerText(),/Escolha de 1 até 3 sabores\. Você decide quantos combinar\./);
      await page.locator('label[for="flavor-leitinho"]').tap();
      await dock.waitFor({state:"visible"});
      await page.locator('label[for="flavor-ovomaltine"]').tap();
      await dock.waitFor({state:"visible"});
      assert.match(await dock.innerText(),/Continuar com 2 sabores/);
      assert.match(await page.locator("#sabores .boutique-price-guide").innerText(),/R\$\s*49,00/);
      // Quando o botão inline fica visível, nenhum CTA duplicado deve existir.
      await page.locator("#sabores .flavor-continue").evaluate(el=>{
        const desired=window.scrollY+el.getBoundingClientRect().top-window.innerHeight*.31;
        window.scrollTo({top:desired,behavior:"instant"});
      });
      await page.waitForFunction(()=>!document.querySelector(".mobile-sticky-bar.is-gourmet-flavor-continue"));
      assert.equal(await page.locator("#sabores .flavor-continue").isVisible(),true);
      // Voltar a explorar não deve exigir tocar em continuar nem perder sabores.
      await page.locator('label[for="flavor-nutella"]').tap();
      assert.match(await page.locator("#sabores .boutique-price-guide").innerText(),/R\$\s*58,00/);
      assert.equal(await page.locator("#sabores .gourmet-removable-tag").count(),3);
      assert.equal(await dock.count(),0,"Limite preenchido usa a progressão original");
      assert.equal(errors.length,0,"Erros de runtime: "+errors.join("; "));
      passed++;
      console.log("Gourmet continuar 1 ou 2 sabores WebKit "+width+"x"+height+" OK");
    } catch(err){
      await page.screenshot({path:path.join(output,`gourmet-continue-failure-${width}.png`),fullPage:true}).catch(()=>{});
      throw err;
    } finally {await context.close();}
  }
} finally {await browser.close();}
assert.equal(passed,4);
console.log("Gourmet continuidade flexível: 4 viewports aprovados, zero pedidos.");
