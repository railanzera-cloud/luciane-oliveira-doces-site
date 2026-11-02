// QA do painel em pacote Cloudflare isolado: não autentica nem altera produção.
// Supabase Auth, disponibilidade e RPCs são simulados em memória pelo Playwright.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { TRUFADAS_ACTIVE_ITEM_KEYS } from "../supabase/functions/_shared/trufadas-variants.mjs";

const {chromium,webkit}=createRequire(process.env.QA_PACKAGE)("playwright");
const output=process.env.QA_OUTPUT;
await mkdir(output,{recursive:true});
const origin="http://127.0.0.1:8181";
const host="edqiwvccmboyayojvuea.supabase.co";
const user={id:"00000000-0000-4000-8000-000000000001",aud:"authenticated",role:"authenticated",
  email:"qa@example.invalid",created_at:"2026-01-01T00:00:00Z",
  app_metadata:{provider:"email",providers:["email"]},user_metadata:{}};
const now=Math.floor(Date.now()/1000);
const encode=x=>Buffer.from(JSON.stringify(x)).toString("base64url");
const token=[encode({alg:"HS256",typ:"JWT"}),encode({aud:"authenticated",role:"authenticated",
  sub:user.id,exp:now+3600*24,iat:now,email:user.email}),"signature"].join(".");
const session={access_token:token,refresh_token:"mock-refresh-token",token_type:"bearer",
  expires_in:86400,expires_at:now+86400,user};

for(const [engineName,engine] of Object.entries({chromium,webkit})){
  const browser=await engine.launch();
  try{
    for(const [width,height] of [[390,844],[1440,900]]){
      const context=await browser.newContext({viewport:{width,height},isMobile:width<700,hasTouch:width<700,
        reducedMotion:"reduce",serviceWorkers:"block"});
      await context.addInitScript(({key,session})=>{
        window.localStorage.setItem(key,JSON.stringify(session));
      },{key:"sb-edqiwvccmboyayojvuea-auth-token",session});
      const rows=TRUFADAS_ACTIVE_ITEM_KEYS.map((item_key,index)=>({
        item_key,total:index===0?2:4,enabled:true,version:1,reserved:index===0?1:0,
        available:index===0?1:4,shortages:0,
      }));
      const menu=[
        {item_key:"category_pipocas",item_type:"category",status:"available"},
        {item_key:"category_fatias",item_type:"category",status:"available"},
        ...["popcorn_size_350ml","popcorn_size_500ml","popcorn_size_750ml","popcorn_size_1l",
        "popcorn_flavor_leitinho","popcorn_flavor_nutella","popcorn_flavor_kinder_bueno",
        "popcorn_flavor_kinder_bueno_crisp","popcorn_flavor_choco_cookies_branco",
        "popcorn_flavor_choco_cookies_leite","popcorn_flavor_ovomaltine",
        "slice_chocolate_morango","slice_ninho_morango","slice_prestigio",
        "slice_chocolate_maracuja","slice_chocolatudo","slice_chocolate_cenoura"].map(item_key=>({
          item_key,item_type:item_key.startsWith("slice")?"slice":item_key.startsWith("popcorn_size")?"popcorn_size":"popcorn_flavor",
          status:"available",
        })),
        ...TRUFADAS_ACTIVE_ITEM_KEYS.map(item_key=>({item_key,item_type:"product",status:"available"})),
      ];
      const writes=[];
      await context.route("**/*",async route=>{
        const url=new URL(route.request().url());
        if(url.hostname==="127.0.0.1")return route.continue();
        if(url.hostname!==host)return route.abort();
        const path=url.pathname;
        const method=route.request().method();
        const fulfill=data=>route.fulfill({status:200,contentType:"application/json; charset=utf-8",body:JSON.stringify(data)});
        if(path==="/auth/v1/user")return fulfill(user);
        if(path==="/rest/v1/store_settings"&&method==="GET")return fulfill([{key:"orders_open",value:true}]);
        if(path==="/rest/v1/menu_availability"&&method==="GET")return fulfill(menu);
        if(path==="/rest/v1/rpc/public_crocante_inventory"&&method==="GET")return fulfill(rows.map(r=>({item_key:r.item_key,available:r.enabled?r.available:0})));
        if(path==="/rest/v1/rpc/public_slice_preorder"&&method==="GET")return fulfill(null);
        if(path==="/rest/v1/rpc/admin_get_trufadas_pmg_inventory"&&method==="POST")return fulfill(rows);
        if(path==="/rest/v1/rpc/admin_set_trufadas_pmg_inventory"&&method==="POST"){
          const body=route.request().postDataJSON();
          const row=rows.find(r=>r.item_key===body.p_item_key);
          assert.ok(row,"Somente os 9 SKUs conhecidos podem ser editados");
          assert.equal(body.p_version,row.version);
          assert.ok(body.p_total>=row.reserved);
          row.total=body.p_total;row.version++;row.enabled=body.p_enabled;
          row.available=row.enabled?row.total-row.reserved:0;
          writes.push({...body});
          return fulfill(rows);
        }
        if(path==="/rest/v1/menu_availability"&&method==="PATCH"){
          const body=route.request().postDataJSON();
          const item_key=url.searchParams.get("item_key")?.replace("eq.","");
          const target=menu.find(row=>row.item_key===item_key);
          if(target){target.status=body.status;return fulfill({item_key});}
          return fulfill(null);
        }
        if(path==="/rest/v1/store_settings"&&method==="PATCH")return fulfill({key:"orders_open"});
        // Outros serviços de CRM e pedidos não fazem parte desta QA.
        return route.abort();
      });
      const page=await context.newPage();
      page.setDefaultTimeout(15000);
      await page.goto(origin+"/admin");
      await page.waitForTimeout(900);
      if(await page.getByRole("heading",{name:"Luciane Oliveira Doces",level:1}).count()){
        throw new Error("Sessão simulada não reconhecida; QA não deve usar credenciais reais");
      }
      await page.getByRole("tab",{name:/Disponibilidade/}).click();
      await page.locator(".admin-trufadas-studio").waitFor();
      assert.equal(await page.locator(".admin-availability-nav > button").count(),3);
      assert.equal(await page.locator(".admin-stock-flavors > button").count(),3);
      assert.equal(await page.locator(".admin-stock-variants > button").count(),3);
      assert.equal(await page.locator(".admin-stock-free-input").inputValue(),"1");
      assert.match(await page.locator(".admin-stock-math").innerText(),/Em pedidos/);
      assert.match(await page.locator(".admin-stock-math").innerText(),/Total registrado/);
      assert.equal(await page.locator(".admin-stock-variants > button").first().getAttribute("aria-pressed"),"true");
      if(width===390){
        await page.locator(".admin-stock-editor").scrollIntoViewIfNeeded();
        await page.screenshot({path:output+"/"+engineName+"-trufadas-390.png"});
        await page.screenshot({path:output+"/"+engineName+"-trufadas-full-390.png",fullPage:true});
      }
      const field=page.locator(".admin-stock-free-input");
      await field.fill("2");
      assert.match(await page.locator(".admin-stock-free-input-row").innerText(),/2 livres \+ 1 em pedidos = 3 no estoque/);
      await page.getByRole("button",{name:"Salvar alteração"}).click();
      await page.getByText(/Pacote P atualizado/).waitFor();
      assert.equal(writes.length,1);
      assert.equal(writes[0].p_total,3,"A UI soma reserva automaticamente ao total para o RPC");
      assert.equal(writes[0].p_item_key,TRUFADAS_ACTIVE_ITEM_KEYS[0]);
      assert.equal(await page.locator(".admin-stock-free-input").inputValue(),"2");
      await page.locator(".admin-stock-flavors > button").nth(1).click();
      await page.locator(".admin-stock-variants > button").nth(1).click();
      assert.match(await page.locator(".admin-stock-editor-heading").innerText(),/Paçoca.*M/s);
      // Um pedido pode entrar sem mudar a versão do estoque; editor deve detectar a reserva nova.
      const paçocaM = rows.find(row => row.item_key === TRUFADAS_ACTIVE_ITEM_KEYS[4]);
      assert.ok(paçocaM);
      paçocaM.reserved = 1;
      paçocaM.available = 3;
      await page.getByRole("button",{name:"Pausar",exact:true}).click();
      await page.getByRole("button",{name:"Salvar alteração"}).click();
      await page.getByText(/Entrou ou mudou um pedido/).waitFor();
      assert.equal(writes.length,1,"Conferência de reservas impede gravação baseada em saldo velho");
      await page.getByRole("button",{name:"Pausar",exact:true}).click();
      await page.getByRole("button",{name:"Salvar alteração"}).click();
      await page.getByText(/Pacote M atualizado/).waitFor();
      assert.equal(writes.length,2);
      assert.equal(writes[1].p_enabled,false);
      if(width===390)await page.screenshot({path:output+"/"+engineName+"-trufadas-editado-390.png"});

      await page.locator("#admin-availability-tab-gourmet").click();
      await page.getByRole("heading",{name:"Pipocas Gourmet"}).waitFor();
      const flavorCards = await page.locator("#admin-availability-panel-gourmet .admin-compact-item").count();
      assert.ok(flavorCards >= 7,"Todos os sabores atuais devem estar no painel");
      await page.getByRole("button",{name:/Tamanhos/}).last().click();
      const sizeCards = await page.locator("#admin-availability-panel-gourmet .admin-compact-item").count();
      assert.ok(sizeCards >= 3 && sizeCards < flavorCards, "Alternar para tamanhos mostra só os tamanhos atuais");
      if(width===390){
        await page.locator("#admin-availability-panel-gourmet").scrollIntoViewIfNeeded();
        await page.screenshot({path:output+"/"+engineName+"-gourmet-390.png"});
      }

      await page.locator("#admin-availability-tab-fatias").click();
      await page.getByRole("heading",{name:"Fatias Artesanais"}).waitFor();
      const search=page.getByRole("searchbox",{name:"Buscar sabor"});
      await search.fill("prestigio");
      assert.equal(await page.locator("#admin-availability-panel-fatias .admin-compact-item").count(),1);
      assert.equal(await page.locator(".admin-availability-nav").count(),1);
      if(width===390)await page.screenshot({path:output+"/"+engineName+"-fatias-390.png"});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,
        "Painel não deve transbordar horizontalmente");
      await context.close();
      console.log("QA admin",engineName,width,height,"OK");
    }
  } finally {await browser.close();}
}
