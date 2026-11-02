import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
const {chromium,webkit}=createRequire(process.env.QA_PACKAGE)("playwright");
const out=process.env.QA_OUTPUT;
await mkdir(out,{recursive:true});
const site="http://127.0.0.1:8181";
const flavors={leitinho:"available",choco_nute:"hidden",ovomaltine:"sold_out",
  kinder_bueno:"available",choco_cookies_branco:"available",choco_cookies_leite:"hidden",
  kinder_bueno_crisp:"hidden",nutella:"available"};
const menu=[
  {item_key:"category_pipocas",status:"available"},
  {item_key:"category_fatias",status:"available"},
  ...["500ml","750ml","1l"].map(size=>({item_key:"popcorn_size_"+size,status:"available"})),
  ...Object.entries(flavors).map(([id,status])=>({item_key:"popcorn_flavor_"+id,status})),
  {item_key:"slice_prestigio",status:"available"},
];
const status=[];
for(const [engineName,engine] of Object.entries({chromium,webkit})){
  const browser=await engine.launch();
  try{
    for(const width of [320,390,1440]){
      const mobile=width<700, h=mobile?844:900;
      const context=await browser.newContext({viewport:{width,height:h},
        isMobile:mobile,hasTouch:mobile,reducedMotion:"reduce",serviceWorkers:"block"});
      await context.route("**/*",async route=>{
        const url=new URL(route.request().url());
        if(url.hostname==="127.0.0.1")return route.continue();
        if(url.hostname!=="edqiwvccmboyayojvuea.supabase.co")return route.abort();
        const key=url.pathname.split("/").pop();
        const fixtures={store_settings:[{key:"orders_open",value:true}],
          menu_availability:menu,public_crocante_inventory:[],public_slice_preorder:null};
        if(!(key in fixtures))return route.abort();
        return route.fulfill({json:fixtures[key]});
      });
      const page=await context.newPage();
      page.setDefaultTimeout(15000);
      const runtimeErrors=[];
      page.on("pageerror",err=>runtimeErrors.push(err.message));
      await page.clock.install({time:new Date("2026-11-02T17:00:00Z")});
      await page.goto(site+"/?categoria=pipocas&utm_source=instagram");
      await page.locator(".gourmet-feriado-edition").waitFor();
      const promo=page.locator(".gourmet-feriado-edition");
      assert.match(await promo.innerText(),/qualquer recheio pelo preço do pote/i);
      assert.match(await promo.innerText(),/23h59/);
      assert.equal(await promo.locator("button, input, [role='button'], [role='radio']").count(),0,
        "Aviso editorial não pode parecer seletor duplicado");
      assert.equal(await page.locator(".gourmet-feriado-price-list").count(),0);
      const cards=page.locator("#tamanhos .size-card");
      assert.equal(await cards.count(),3,"apenas tamanhos reais clicáveis");
      const geometry=await cards.evaluateAll(els=>els.map(el=>({top:el.getBoundingClientRect().top,
        width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height})));
      assert.ok(Math.max(...geometry.map(x=>x.top))-Math.min(...geometry.map(x=>x.top))<3,
        "500, 750 e 1 litro precisam estar na mesma linha");
      assert.ok(Math.max(...geometry.map(x=>x.height))-Math.min(...geometry.map(x=>x.height))<4,
        "cartões de tamanhos com altura equivalente");
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,"overflow horizontal");
      if(mobile)await promo.screenshot({path:out+"/"+engineName+"-"+width+"-compacto.png"});
      if(mobile){
        const sticky=page.locator(".mobile-sticky-bar button");
        await sticky.waitFor({state:"visible"});
        assert.match(await sticky.innerText(),/Escolher tamanho/i);
        await sticky.click();
        await page.waitForTimeout(80);
        const first=await cards.first().boundingBox();
        assert.ok(first && first.y >= 20 && first.y < h/2,
          "CTA tamanho levou ao controle, e não ao banner: "+JSON.stringify(first));
      }
      await page.locator('label[for="size-500ml"]').click();
      await page.waitForTimeout(100);
      if(mobile){
        const flavorFirst=await page.locator('label[for="flavor-leitinho"]').boundingBox();
        assert.ok(flavorFirst && flavorFirst.y>=20 && flavorFirst.y<h/2,
          "seleção tamanho levou à primeira opção de sabor, não à foto: "+JSON.stringify(flavorFirst));
        const sticky=page.locator(".mobile-sticky-bar button");
        assert.match(await sticky.innerText(),/Ir aos sabores/i);
        await sticky.click();
        await page.waitForTimeout(80);
        const after=await page.locator('label[for="flavor-leitinho"]').boundingBox();
        assert.ok(after && after.y>=20 && after.y<h/2,
          "CTA sabores não colocou a opção clicável em vista: "+JSON.stringify(after));
      }
      assert.equal(await page.locator('label[for="flavor-leitinho"] .gourmet-feriado-saving').count(),0,
        "Leitinho tem preço base e não pode mostrar falso desconto");
      assert.equal(await page.locator('label[for="flavor-leitinho"] .boutique-flavor-impact').count(),0,
        "não duplicar selo sem adicional");
      assert.match(await page.locator('label[for="flavor-nutella"]').innerText(),/Economize/);
      assert.match(await page.locator('label[for="flavor-nutella"]').innerText(),/R\$\s*33,00/);
      assert.match(await page.locator('label[for="flavor-nutella"]').innerText(),/R\$\s*25,00/);
      assert.equal(await page.locator('label[for="flavor-ovomaltine"] [role="checkbox"]').isDisabled(),true);
      if(width===390)await page.locator("#sabores").screenshot({path:out+"/"+engineName+"-390-recheios.png"});
      await page.locator('label[for="flavor-nutella"]').click();
      await page.locator('label[for="flavor-leitinho"]').click();
      await page.waitForTimeout(100);
      const qty=await page.locator("#quantidade-pipocas .quantity-row").boundingBox();
      assert.ok(qty && qty.y<h/2 && qty.y>=10,
        "segunda escolha levou à quantidade, sem esconder a ação: "+JSON.stringify(qty));
      assert.match(await page.locator(".draft-total").innerText(),/R\$\s*25,00/);
      if(width===390)await page.screenshot({path:out+"/"+engineName+"-390-combinacao.png",fullPage:true});
      // Teste de estado pós-campanha sem gravar pedido nem produzir print_jobs.
      await page.clock.setFixedTime(new Date("2026-11-03T03:01:00Z"));
      await page.reload();
      await page.locator("#tamanhos").waitFor();
      assert.equal(await page.locator(".gourmet-feriado-edition").count(),0);
      await page.locator('label[for="size-500ml"]').click();
      await page.locator('label[for="flavor-nutella"]').click();
      assert.match(await page.locator(".boutique-price-guide").innerText(),/R\$\s*33,00/);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      assert.deepEqual(runtimeErrors,[],"runtime errors in browser");
      status.push({engineName,width,promotion:"25",normal:"33",rowAligned:true,cta:"real control"});
      await context.close();
      console.log("QA Gourmet refinamento",engineName,width,"PASS");
    }
  }finally{await browser.close();}
}
await writeFile(out+"/medidas.json",JSON.stringify(status,null,2));
