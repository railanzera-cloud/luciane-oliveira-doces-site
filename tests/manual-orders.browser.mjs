// Browser smoke tests against a local commercial build; all external requests are mocked/blocked.
// PLAYWRIGHT_MODULE=/.../playwright/index.mjs CHROMIUM_MODULE=/.../@sparticuz/chromium/build/index.js node tests/manual-orders.browser.mjs
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import ts from 'typescript';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
const { default: portable } = await import(process.env.CHROMIUM_MODULE);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || await portable.executablePath(), args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--no-zygote", "--single-process"], headless:true });
const origin=process.env.TEST_ORIGIN || 'http://127.0.0.1:4173';
const out=new URL('../outputs/validation/',import.meta.url);await mkdir(out,{recursive:true});
const catalogSource=await readFile(new URL('../app/catalog.ts',import.meta.url),'utf8');
const catalog=await import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(catalogSource,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText).toString('base64')}`);
const keys=['category_pipocas','category_fatias','popcorn_size_500ml','popcorn_size_750ml','popcorn_size_1l',...catalog.POPCORN.options.map(o=>`popcorn_flavor_${o.id.replaceAll('-','_')}`),...catalog.SLICES.map(s=>`slice_${s.id.replace('fatia-','').replaceAll('-','_')}`)];
const cart=[{id:'fixture',productId:'pipoca-gourmet',variantId:'500ml',optionIds:['leitinho'],quantity:1}];
const token='a'.repeat(48);
const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
let scenarios=0;
try {
for(const [payment,fulfillment] of [['pix','retirada'],['cartao','entrega'],['dinheiro','retirada']]) {
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let count=0,payload,publicStatus='new',handoffs=0;
 const total=fulfillment==='entrega'?33:25;
 const result={ok:true,order:{id:'uuid',order_id:'LOD-TEST-0000-0001',order_number:1047,tracking_token:token,total,currency:'BRL',payment_status:'pending',order_status:'new'},payment:{method:payment==='pix'?'manual_pix':payment==='cartao'?'card_on_delivery':'cash',status:'pending'}};
 await context.route('**/*',async route=>{
   const url=route.request().url();
   if(route.request().method() === "OPTIONS") return route.fulfill({status:204,headers:cors});
   if(url.includes('/rest/v1/store_settings'))return route.fulfill({headers:cors,json:[{key:'orders_open',value:true}]});
   if(url.includes('/rest/v1/menu_availability'))return route.fulfill({headers:cors,json:keys.map(item_key=>({item_key,status:'available'}))});
   if(url.includes('/functions/v1/create-whatsapp-order')){count++;payload=route.request().postDataJSON();await new Promise(r=>setTimeout(r,100));return route.fulfill({headers:cors,json:result});}
   if(url.includes('/functions/v1/public-order-status'))return route.fulfill({headers:cors,json:{ok:true,order:{...result.order,order_status:publicStatus,sales_channel:'whatsapp',payment_method:result.payment.method,fulfillment_type:fulfillment==='entrega'?'delivery':'pickup',created_at:'2026-09-28T21:00:00Z',updated_at:'2026-09-28T21:05:00Z',items:[{name:'Pipoca Gourmet',size_label:'500 ml',option_names:['Leitinho'],quantity:1,line_total:25}]}}});
   if(url.startsWith('https://tintim.link/')){handoffs++;return route.abort();}
   if(!url.startsWith(origin))return route.abort();
   return route.continue();
 });
 await page.addInitScript(({cart,payment,fulfillment})=>{
   if(!sessionStorage.getItem('test-seeded')){
    sessionStorage.setItem('luciane-order-session-v2',JSON.stringify({version:2,cart,payment,fulfillment,checkoutChannel:'whatsapp',deliveryZoneId:'cidade',neighborhood:'Centro',address:'Rua A',addressNumber:'12',reference:'',customerName:'',needsChange:payment==='dinheiro',changeFor:'50,00'}));
    sessionStorage.setItem('test-seeded','1');
   }
 },{cart,payment,fulfillment});
 await page.goto(origin+'/?categoria=pipocas&utm_source=instagram&fbclid=fixture&tintim_fbid=fixture&extra=1&extra=2');
 await page.locator('#customer-name').waitFor();
 await page.locator('.checkout-primary-button').click();assert.equal(count,0);
 await page.locator('#customer-name').fill('   ');await page.locator('.checkout-primary-button').click();assert.equal(count,0);
 await page.locator('#customer-name').fill('Maria Oliveira');await page.locator('#order-notes').fill('Entregar na portaria.');
 await page.locator('#carrinho').screenshot({path:new URL(`checkout-${payment}.png`,out).pathname});
 await page.locator('.checkout-primary-button').evaluate(el=>{el.click();el.click();});
 await page.getByRole('heading',{name:'Olá, Maria! ❤️'}).waitFor().catch(async e=>{console.log('DIAGNOSTIC',count,payload,errors,await page.locator('body').innerText());throw e;});assert.equal(count,1);assert.equal(payload.customer.name,'Maria Oliveira');assert.equal(payload.notes,'Entregar na portaria.');assert.deepEqual(payload.attribution.parameters.extra,['1','2']);
 assert.equal(payload.expected_total,total.toFixed(2));if(payment==='dinheiro')assert.equal(payload.payment.change_for,'50.00');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'No horizontal mobile overflow');
 const link=page.getByRole('link',{name:'Enviar pedido pelo WhatsApp'});const href=await link.getAttribute('href');const text=new URL(href).searchParams.get('text');
 assert.ok(text.startsWith('Olá! Finalizei meu pedido pelo site da Luciane Oliveira Doces.\n\n*PEDIDO #1047*\n\nCliente: Maria Oliveira'));assert.match(text,/1x Pipoca Gourmet 500 ml/);assert.ok(text.includes('token='+token));
 if(payment==='pix')assert.match(text,/CPF: 03611974200/);else assert.doesNotMatch(text,/03611974200/);
 await page.screenshot({path:new URL(`resultado-${payment}.png`,out).pathname,fullPage:true});
 // Simulated blocked WhatsApp navigation: recover the same result on reload, with no second API call.
 await link.click();await page.waitForTimeout(150);
 await page.goto(origin+'/?categoria=pipocas');await page.getByRole('heading',{name:'Olá, Maria! ❤️'}).waitFor();assert.equal(count,1);
 assert.equal(await page.getByRole('link',{name:'Enviar pedido pelo WhatsApp'}).getAttribute('href'),href);
 await page.getByRole('link',{name:'Acompanhar meu pedido →',exact:true}).click();await page.getByRole('heading',{name:'Pedido #1047'}).waitFor();
 await page.getByText('Aguardando confirmação',{exact:true}).waitFor();publicStatus='preparing';await page.getByRole('button',{name:'Atualizar',exact:true}).click();await page.getByText('Em preparo',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
 await page.screenshot({path:new URL(`acompanhamento-${payment}.png`,out).pathname,fullPage:true});
 const fresh=await context.newPage();await fresh.goto(origin+'/');await fresh.getByRole('link',{name:'Acompanhar meu último pedido'}).waitFor();assert.ok((await fresh.getByRole('link',{name:'Acompanhar meu último pedido'}).getAttribute('href')).includes(token));
 assert.deepEqual(errors,[]);assert.equal(handoffs,1);scenarios++;console.log(`PASS mobile ${payment}/${fulfillment}: mandatory name, duplicate click, message, blocked WhatsApp recovery, tracking/status, last-order recovery, viewport`);
 await context.close();
}
console.log(`PASS ${scenarios} mobile flows (Chromium, iPhone-sized viewport). External services blocked; no live orders or messages.`);
} finally {await browser.close();}
