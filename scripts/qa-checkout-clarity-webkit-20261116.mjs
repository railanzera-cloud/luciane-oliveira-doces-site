// Browser regression with synthetic availability and all external traffic intercepted.
// Automated WebKit is not a physical iPhone, WhatsApp delivery, payment or printing test.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'vite';

const {webkit}=createRequire(process.env.QA_PACKAGE || import.meta.url)('playwright');
const origin=process.env.QA_ORIGIN || 'http://127.0.0.1:8181';
const output=process.env.QA_OUTPUT || 'outputs/qa-checkout-clarity';
const root=process.cwd();
const vite=await createServer({root,configFile:false,appType:'custom',resolve:{alias:{'@':root}},server:{middlewareMode:true}});
const catalog=await vite.ssrLoadModule('/app/catalog.ts');
const availability=await vite.ssrLoadModule('/app/menu-availability.ts');
await vite.close();
const fixtures={
 store_settings:[{key:'orders_open',value:true}],
 menu_availability:availability.MENU_AVAILABILITY_ITEMS.map(item=>({item_key:item.itemKey,status:item.isDraft?'hidden':'available'})),
 public_crocante_inventory:availability.TRUFADA_STOCK_ITEM_KEYS.map(item_key=>({item_key,available:30})),
 public_slice_preorder:null,
};
const products=['chocotone-ninho-nutella','cone-trufado-prestigio','pipoca-gourmet','fatia-bombom-uva','crocante-ninho'].map(id=>catalog.PRODUCTS.find(p=>p.id===id));
assert.ok(products.every(Boolean));
const cart=products.map((p,i)=>({id:`qa-item-${i}`,productId:p.id,variantId:p.variants.find(v=>v.id==='500ml'||v.id==='m')?.id || p.variants.find(v=>!v.retired).id,optionIds:p.options.slice(0,1).map(o=>o.id),quantity:1}));
await mkdir(output,{recursive:true});
const browser=await webkit.launch();
const evidence=[];
try {
 for(const width of [320,375,390,430,1280]) {
  let registrations=0;
  const context=await browser.newContext({viewport:{width,height:width===320?650:844},isMobile:width<700,hasTouch:width<700,reducedMotion:'reduce',serviceWorkers:'block'});
  await context.addInitScript(seed=>{
   window.__lucianeMetaPixelInitialized=true;window.fbq=()=>{};
   if(!sessionStorage.getItem('luciane-order-session-v2')) sessionStorage.setItem('luciane-order-session-v2',JSON.stringify({version:2,cart:seed,fulfillment:'retirada',payment:'pix',customerName:'Cliente de teste',needsChange:false,changeFor:''}));
  },cart);
  await context.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.origin===origin)return route.continue();
   if(url.hostname!=='edqiwvccmboyayojvuea.supabase.co')return route.abort();
   const key=url.pathname.split('/').pop();
   if(key==='create-whatsapp-order') {registrations++;return route.fulfill({status:503,json:{error:'temporary_failure'}});}
   return Object.hasOwn(fixtures,key)?route.fulfill({json:fixtures[key]}):route.abort();
  });
  const page=await context.newPage();page.setDefaultTimeout(12000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.locator('.cart-item').nth(4).waitFor();
  if(width<700){
   await page.locator('.mobile-sticky-bar button').filter({hasText:'Ver pedido'}).click();
   await page.waitForFunction(()=>document.querySelector('.mobile-sticky-bar button')?.textContent.includes('Abrir WhatsApp'));
  } else await page.getByRole('button',{name:'Ver pedido',exact:true}).click();
  assert.equal(registrations,0,'Revisar o pedido nunca registra uma compra');
  const total=page.locator('.summary-total strong');
  const beforeTotal=await total.innerText();
  assert.equal(await total.evaluate(el=>getComputedStyle(el).color),'rgb(255, 221, 170)');
  const first=page.locator('.cart-item').first();
  const heights=await page.locator('.cart-item').evaluateAll(els=>els.map(el=>Math.round(el.getBoundingClientRect().height)));
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(overflow<=1,`Sem rolagem horizontal em ${width}px`);
  const controls=await page.locator('.cart-item-actions button').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().height));
  assert.ok(controls.every(height=>height>=44),'Alvos de toque de pelo menos 44px de altura');
  await first.getByRole('button',{name:'Aumentar quantidade deste item',exact:true}).click();
  assert.notEqual(await total.innerText(),beforeTotal,'Quantidade atualiza o total');
  await first.getByRole('button',{name:'Diminuir quantidade deste item',exact:true}).click();
  assert.equal(await total.innerText(),beforeTotal,'Reverter quantidade restaura o total');
  await page.locator('.cart-item').nth(1).getByRole('button',{name:'Editar',exact:true}).click();
  await page.locator('#cones-quantidade .add-button').click();
  assert.equal(await total.innerText(),beforeTotal,'Edição preserva os demais itens');
  await page.goto(origin+'/?categoria=cones',{waitUntil:'domcontentloaded'});
  await page.locator('label[for="cone-cone-trufado-prestigio"]').click();
  await page.locator('#cones-quantidade .add-button').click();
  const suggestions=page.locator('.boutique-complement-choice');
  await suggestions.nth(4).waitFor();
  assert.equal(await suggestions.count(),5,'Todas as sugestões elegíveis continuam disponíveis');
  const suggestionHeights=await suggestions.evaluateAll(els=>els.map(el=>Math.round(el.getBoundingClientRect().height)));
  assert.ok(suggestionHeights.every(h=>h>=44),'Sugestões compactas continuam tocáveis');
  const drinks=page.locator('#acompanhamentos');
  assert.equal(await drinks.getAttribute('open'),null,'Bebidas começam recolhidas');
  await drinks.locator('summary').click();
  await drinks.getByRole('button',{name:/Adicionar/}).first().click();
  assert.ok((await page.locator('.cart-item').count())>5,'Bebida entra no carrinho');
  await page.getByRole('button',{name:'Voltar às categorias',exact:true}).click();
  if(width<700)await page.locator('.mobile-sticky-bar button').filter({hasText:'Ver pedido'}).waitFor();
  assert.equal(registrations,0,'Nenhum registro durante seleção, edição, bebida ou navegação');
  const footer=page.locator('.storefront-legal-footer');
  const withBar=await footer.evaluate(el=>parseFloat(getComputedStyle(el).paddingBottom));
  assert.ok(width<700?withBar>=112:withBar<60,'Reserva inferior acompanha a barra móvel');
  await page.getByRole('button',{name:'Limpar',exact:true}).click();
  assert.equal(await page.locator('.mobile-sticky-bar').count(),0);
  assert.ok(await footer.evaluate(el=>parseFloat(getComputedStyle(el).paddingBottom))<60,'Sem barra, o rodapé tem encerramento compacto');
  assert.deepEqual(errors,[]);
  evidence.push({width,cartHeights:heights,suggestionHeights,total:beforeTotal,registrations});
  await page.screenshot({path:path.join(output,`vitrine-${width}.png`)});
  await context.close();
 }
} finally {await browser.close();}
await writeFile(path.join(output,'results.json'),JSON.stringify(evidence,null,2));
console.log('Checkout clarity: five viewports passed; zero real requests or messages.');
