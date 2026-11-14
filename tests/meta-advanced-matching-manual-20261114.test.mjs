import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {META_PIXEL_ID,buildManualMetaCustomerData,createManualMetaMatchingUpdater} from "../lib/meta-advanced-matching.ts";
const source=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("identificadores normalizados do checkout: apenas dados válidos e realmente informados",()=>{
  assert.equal(META_PIXEL_ID,"1491655855979140");
  assert.deepEqual(buildManualMetaCustomerData({name:"  João   da Silva ", email:" CLIENTE@EXEMPLO.COM ",phone:"(91) 99999-1234"}),
    {fn:"joao",ln:"silva",em:"cliente@exemplo.com",ph:"5591999991234"});
  assert.deepEqual(buildManualMetaCustomerData({name:"Maria"}),{fn:"maria"});
  assert.deepEqual(buildManualMetaCustomerData({name:"Cliente 123",email:"invalido",phone:"1234"}),{});
  assert.deepEqual(buildManualMetaCustomerData({}),{});
});
test("Meta init tardio enriquece um único Pixel, não gera novos eventos nem repete o mesmo perfil",()=>{
  const calls=[];
  const updater=createManualMetaMatchingUpdater();
  const fbq=(...args)=>calls.push(args);
  assert.equal(updater(fbq,{name:"Ana Maria"}),true);
  assert.equal(updater(fbq,{name:"Ana   Maria"}),false);
  assert.equal(updater(fbq,{name:"Ana Maria",email:"ana@exemplo.com"}),true);
  assert.equal(updater(fbq,{name:"Ana Maria",email:"ana@exemplo.com"}),false);
  assert.deepEqual(calls,[
    ["init",META_PIXEL_ID,{fn:"ana",ln:"maria"}],
    ["init",META_PIXEL_ID,{fn:"ana",ln:"maria",em:"ana@exemplo.com"}],
  ]);
  assert.equal(updater(undefined,{name:"Nome Sobrenome"}),false);
});
test("falha de Pixel não bloqueia checkout, nenhuma identidade fictícia dispara rastreio",()=>{
  const updater=createManualMetaMatchingUpdater();
  assert.equal(updater(()=>{throw new Error("blocked")},{name:"Ana Maria"}),false);
  const calls=[];
  assert.equal(updater((...args)=>calls.push(args),{name:"Ana Maria"}),true);
  assert.equal(updater((...args)=>calls.push(args),{}),false);
  assert.equal(calls.length,1);
});
test("integração mantém aviso literal, Pixel base, CAPI/Tintim e sem novos eventos Purchase",()=>{
  const page=source("app/page.tsx"),layout=source("app/layout.tsx");
  assert.match(page,/Usaremos seus dados somente para processar e acompanhar este pedido\./);
  assert.match(page,/createManualMetaMatchingUpdater/);
  assert.match(page,/syncManualMetaMatching\(\)/);
  assert.match(page,/onBlur=\{\(\) => syncManualMetaMatching\(\)\}/);
  assert.match(layout,/window\.fbq\('init', '1491655855979140'\)/);
  assert.equal((layout.match(/window\.fbq\('track', 'PageView'\)/g)||[]).length,1);
  assert.match(layout,/https:\/\/s\.tintim\.app\/static\/core\/tintim-1\.0\.js/);
  assert.doesNotMatch(page,/trackMetaEvent\("(?:Purchase|Contact|Lead)"/);
  assert.doesNotMatch(source("lib/meta-advanced-matching.ts"),/sessionStorage|localStorage|console\.log|fbq\("track"|fbq\("trackCustom"/);
});
