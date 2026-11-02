// QA visual isolada em Chromium e WebKit. Todo tráfego externo interceptado.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { TRUFADAS_ACTIVE_ITEM_KEYS } from "../supabase/functions/_shared/trufadas-variants.mjs";
const { chromium, webkit }=createRequire(process.env.QA_PACKAGE)("playwright");
const output=process.env.QA_OUTPUT;
await mkdir(output,{recursive:true});
const measures=[];
for(const [engineName,engine] of Object.entries({chromium,webkit})){
  const browser=await engine.launch();
  try {
    for(const [width,height] of [[320,568],[375,667],[390,844],[430,932],[1440,900]]){
      const context=await browser.newContext({viewport:{width,height},isMobile:width<700,hasTouch:width<700,reducedMotion:"no-preference",serviceWorkers:"block"});
      let fixtureState="open";
      await context.route("**/*",async route=>{
        const url=new URL(route.request().url());
        if(url.hostname==="127.0.0.1") return route.continue();
        if(url.hostname!=="edqiwvccmboyayojvuea.supabase.co" || route.request().method()!=="GET")return route.abort();
        const fixtures={
          store_settings:[{key:"orders_open",value:fixtureState!=="closed"}],
          menu_availability:[...["category_pipocas","category_fatias"].map(item_key=>({item_key,status:"available"})),...TRUFADAS_ACTIVE_ITEM_KEYS.map(item_key=>({item_key,status:"available"}))],
          public_crocante_inventory:TRUFADAS_ACTIVE_ITEM_KEYS.map(item_key=>({item_key,available:fixtureState==="sold"?0:4})),
          public_slice_preorder:null,
        };
        const table=url.pathname.split("/").pop();
        if(!(table in fixtures))return route.abort();
        return route.fulfill({json:fixtures[table]});
      });
      const page=await context.newPage();
      page.setDefaultTimeout(15000);
      const url="http://127.0.0.1:8181/";
      await page.goto(url+"?utm_source=instagram&fbclid=qa_trufadas");
      await page.locator(".collection-choice").nth(2).waitFor();
      const initial=await page.evaluate(()=>scrollY);
      await page.getByRole("button",{name:/Pipocas Trufadas — (Ver sabores|Consultar sabores)/}).click();
      await page.getByRole("heading",{name:"Pipocas Trufadas",level:1}).waitFor();
      assert.equal(new URL(page.url()).searchParams.get("categoria"),"trufadas");
      assert.equal(new URL(page.url()).searchParams.get("fbclid"),"qa_trufadas");
      await page.locator(".limited-cup-selection-heading").waitFor();
      assert.equal(await page.locator(".limited-cup-flow-progress").count(),0);
      assert.equal(await page.locator("#crocantes-tamanhos").count(),0);
      assert.equal(await page.locator("#crocantes-quantidade").count(),0);
      await page.waitForTimeout(750);
      const entrance=await page.evaluate(()=>({
        scrollY, docTop:document.scrollingElement?.scrollTop,
        targetY:document.getElementById("edicao-crocante")?.getBoundingClientRect().top,
        maxScroll:document.documentElement.scrollHeight-innerHeight,
        documentWidth:document.documentElement.scrollWidth,innerWidth,
      }));
      console.log("Entrada Trufadas",engineName,width,JSON.stringify({initial,entrance}));
      assert.ok(Math.max(entrance.scrollY,entrance.docTop??0)>initial+5,
        "A categoria deve rolar suavemente ao configurador: "+JSON.stringify({initial,entrance}));
      assert.ok(entrance.documentWidth<=entrance.innerWidth+1);
      if(width===390||width===320)await page.screenshot({path:output+"/"+engineName+"-"+width+"-sabor.png"});

      assert.equal(await page.locator(".limited-cup-duo-item").count(),3);
      await page.locator(".limited-cup-duo-item").nth(0).click();
      await page.locator("#crocantes-tamanhos").waitFor();
      assert.equal(await page.locator("#crocantes-quantidade").count(),0);
      assert.equal(await page.locator(".limited-cup-size-option").count(),3);
      if(width===390||width===320) await page.locator("#crocantes-tamanhos").screenshot({path:output+"/"+engineName+"-"+width+"-tamanhos.png"});
      const heading=await page.locator("#crocantes-tamanhos").evaluate(el=>{
        const s=el.getBoundingClientRect(),h=el.querySelector("h2").getBoundingClientRect();
        return {leftPadding:h.x-s.x,sectionWidth:s.width};
      });
      assert.ok(heading.leftPadding>=11,"Título de tamanho encostado na lateral");
      await page.getByRole("button",{name:/Ninho, pacote M,.*18,90/}).click();
      await page.locator("#crocantes-quantidade").waitFor();
      await page.waitForTimeout(470);
      if(width===390||width===320) await page.locator("#crocantes-tamanhos").screenshot({path:output+"/"+engineName+"-"+width+"-selecionado.png"});
      assert.equal(await page.locator('.limited-cup-size-option[aria-pressed="true"]').count(),1);
      assert.match(await page.locator(".limited-cup-buy-estimate").innerText(),/18,90/);
      assert.match(await page.locator(".limited-cup-buy-cta").innerText(),/Adicionar 1 pacote ao pedido/);
      const chosen=await page.locator('.limited-cup-size-option[aria-pressed="true"]').evaluate(el=>{
        const style=getComputedStyle(el),check=getComputedStyle(el.querySelector(".limited-cup-size-check")),b=el.getBoundingClientRect();
        return {border:style.borderColor,background:style.backgroundImage,check:check.opacity,width:b.width,height:b.height};
      });
      assert.equal(chosen.check,"1");
      assert.ok(chosen.width>=70&&chosen.height>=100);
      await page.getByRole("button",{name:"Aumentar quantidade de pacotes"}).click();
      assert.match(await page.locator(".limited-cup-buy-estimate").innerText(),/37,80/);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      const photos=await page.locator(".limited-cup-duo-item img").evaluateAll(items=>items.map(img=>({name:new URL(img.currentSrc||img.src).pathname,loaded:img.complete&&img.naturalWidth>0})));
      assert.ok(photos.every(img=>img.loaded),"Fotos reais devem carregar");
      if(width===390||width===320||width===1440)await page.screenshot({path:output+"/"+engineName+"-"+width+"-pedido.png"});
      if(width===390)await page.screenshot({path:output+"/"+engineName+"-"+width+"-pagina-completa.png",fullPage:true});
      measures.push({engineName,width,height,entrance,heading,chosen,photos});
      await writeFile(output+"/medidas.json",JSON.stringify(measures,null,2));
      // Repetir entrada no WebKit: o problema anterior era intermitente.
      if(engineName==="webkit"&&width===320){
        for(let attempt=0;attempt<3;attempt++){
          await page.goto(url+"?utm_source=instagram&fbclid=qa_repeat");
          await page.locator(".collection-choice").nth(2).waitFor();
          await page.getByRole("button",{name:/Pipocas Trufadas — (Ver sabores|Consultar sabores)/}).click();
          await page.locator(".limited-cup-selection-heading").waitFor();
          await page.waitForTimeout(820);
          const actual=await page.evaluate(()=>({y:scrollY,top:document.getElementById("edicao-crocante")?.getBoundingClientRect().top}));
          assert.ok(actual.y>5,"WebKit ignorou navegação suave na repetição "+attempt+": "+JSON.stringify(actual));
        }
      }
      if(width===390){
        fixtureState="closed";
        await page.goto(url+"?categoria=trufadas");
        await page.locator(".store-status-banner").waitFor();
        await page.locator(".limited-cup-duo-item").first().click();
        await page.locator("#crocantes-tamanhos").waitFor();
        await page.getByRole("button",{name:/Ninho, pacote P,.*15,90/}).click();
        await page.locator("#crocantes-quantidade").waitFor();
        assert.match(await page.locator(".limited-cup-buy-cta").innerText(),/Pedidos pausados/);
        assert.equal(await page.locator(".limited-cup-buy-cta").isDisabled(),true);
        fixtureState="sold";
        await page.goto(url);
        await page.getByRole("button",{name:"Pipocas Trufadas — Esgotado"}).waitFor();
      }
      await context.close();
      console.log("Trufadas QA",engineName,width,height,"OK");
    }
  } finally {await browser.close();}
}
