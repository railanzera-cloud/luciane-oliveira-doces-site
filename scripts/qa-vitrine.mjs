// Executar contra dois pacotes estáticos isolados. Todo tráfego externo é interceptado.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { TRUFADAS_ACTIVE_ITEM_KEYS } from "../supabase/functions/_shared/trufadas-variants.mjs";

const { chromium, webkit } = createRequire(process.env.QA_PACKAGE)('playwright');
const output = process.env.QA_OUTPUT;
await mkdir(output, { recursive: true });
const results = [];
const shots = [[320,568], [375,667], [390,844], [430,932], [1440,900]];
const names = ['Pipocas Trufadas','Pipocas Gourmet','Fatias Artesanais'];
const routes = ['trufadas','pipocas','fatias'];

for (const [engineName, engine] of Object.entries({ chromium, webkit })) {
  const browser = await engine.launch();
  try {
    for (const [width,height] of shots) {
      const context = await browser.newContext({ viewport: { width,height }, hasTouch: width < 700,
        isMobile: width < 700, reducedMotion: 'reduce', serviceWorkers: 'block' });
      let state = 'open';
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.hostname === '127.0.0.1') return route.continue();
        if (url.hostname !== 'edqiwvccmboyayojvuea.supabase.co' || route.request().method() !== 'GET') return route.abort();
        const status = state === 'empty' ? 'hidden' : 'available';
        const fixtures = {
          store_settings: [{key:'orders_open',value:state !== 'closed'}],
          menu_availability: [
            ...['category_pipocas','category_fatias'].map(item_key => ({item_key,status})),
            ...TRUFADAS_ACTIVE_ITEM_KEYS.map(item_key => ({item_key,status:'available'})),
          ],
          public_crocante_inventory: TRUFADAS_ACTIVE_ITEM_KEYS.map(item_key => ({item_key,available:state === 'sold' ? 0 : 4})),
          public_slice_preorder: null,
        };
        const key = url.pathname.split('/').pop();
        if (!(key in fixtures)) return route.abort();
        return route.fulfill({json:fixtures[key]});
      });
      const page = await context.newPage();
      page.setDefaultTimeout(10000);
      const campaign = '?utm_source=instagram&fbclid=teste';
      for (const [version,port] of [['antes',8180],['depois',8181]]) {
        await page.goto('http://127.0.0.1:'+port+'/'+campaign);
        const choices = page.locator('.collection-choice');
        await choices.nth(2).waitFor();
        assert.equal(await choices.count(),3);
        await page.evaluate(async () => { await document.fonts.ready; await Promise.all(Array.from(document.querySelectorAll('button img'),img=>img.decode())); });
        const rects = await choices.evaluateAll(nodes => nodes.map(el => {
          const {x,y,width,height,bottom} = el.getBoundingClientRect(); return {x,y,width,height,bottom};
        }));
        assert.ok(rects.every(r=>r.height >= 44 && r.width >= 44));
        const overflows = await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth);
        if (version === 'depois') {
          assert.equal(overflows,false);
          const colors = await page.locator('.collection-copy strong').evaluateAll(titles =>
            titles.map(title => getComputedStyle(title).color));
          assert.deepEqual(colors,['rgb(255, 236, 211)','rgb(255, 240, 221)','rgb(255, 240, 221)']);
          assert.ok(rects[0].y < 250);
          if (width >= 375) {
            // Nova proposta prioriza a foto: a segunda linha deve começar na
            // primeira dobra, mas não deve ser artificialmente comprimida.
            assert.ok(rects[2].y < height);
            assert.ok(rects[0].height > rects[1].height * .7);
          }
        }
        const photos = await choices.evaluateAll(nodes => nodes.flatMap(node =>
          Array.from(node.querySelectorAll('img'),img => new URL(img.currentSrc).pathname)));
        results.push({engineName,width,height,version,rects,overflows,photos});
        await writeFile(output+'/medidas.json',JSON.stringify(results,null,2));
        if ((width === 375 || width === 1440) && engineName === 'chromium') {
          await page.screenshot({path:output+'/'+version+'-'+width+'.png'});
        }
      }
      for (const [i,name] of names.entries()) {
        const choice = page.getByRole('button',{name:new RegExp('^'+name+' —')});
        await choice.click();
        await page.getByRole('heading',{name,exact:true,level:1}).waitFor();
        assert.equal(new URL(page.url()).searchParams.get('categoria'),routes[i]);
        assert.equal(new URL(page.url()).searchParams.get('fbclid'),'teste');
        await page.goBack();
        await choice.waitFor();
        assert.equal(new URL(page.url()).searchParams.get('utm_source'),'instagram');
        // Um acesso por anúncio começa em uma aba nova, sem navegação anterior em voo.
        const arrival = await context.newPage();
        const direct = new URL(campaign,'http://127.0.0.1:8181/');
        direct.searchParams.set('categoria',routes[i]);
        direct.hash = 'inicio';
        await arrival.goto(direct.href,{waitUntil:'domcontentloaded'});
        await arrival.getByRole('heading',{name,exact:true,level:1}).waitFor();
        if (i === 0) {
          await arrival.locator('.limited-cup-duo-item').first().click();
          await arrival.getByRole('button',{name:/Ninho, pacote P,.*15,90/}).waitFor();
        }
        assert.equal(new URL(arrival.url()).searchParams.get('fbclid'),'teste');
        await arrival.getByRole('link',{name:'Voltar às categorias'}).click();
        await arrival.locator('.collection-choice').nth(2).waitFor();
        assert.equal(new URL(arrival.url()).hash,'#inicio');
        await arrival.close();
      }
      if (width === 375) {
        for (state of ['closed','sold','empty']) {
          await page.reload();
          if (state === 'empty') await page.getByText('Cardápio temporariamente sem produtos disponíveis.').waitFor();
          if (state === 'closed') await page.locator('.store-status-banner').waitFor();
          if (state === 'sold') {
            const pack = page.getByRole('button',{name:/^Pipocas Trufadas — .* — Esgotado$/});
            await pack.waitFor(); assert.equal(await pack.isDisabled(),true);
          }
        }
      }
      await context.close();
      console.log('Aprovado',engineName,width,height);
    }
  } finally { await browser.close(); }
}
