import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const read=p=>fs.readFileSync(new URL("../"+p,import.meta.url),"utf8");
const source=read("lib/crm-follow-up.ts");
const compiled=ts.transpileModule(source,{compilerOptions:{
 module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022
}}).outputText;
const exports={};
vm.runInNewContext(compiled,{exports});
const {crmAdSliceHint,crmSuggestedMessage,crmWhatsAppLink}=exports;
test("nomes univocos de anuncios permitem sugestoes sem afirmar interesse",()=>{
 const cases=[
 ["RMK | FATIAS DISPONÍVEIS | PGM | CHOCOLATUDO","Chocolatudo"],
 ["VENDAS | PRESTIGIO | VIDEO","Prestígio"],
 ["NOVO| MARACUJÁ | VENDAS | PGM","Chocolate com Maracujá"],
 ["Chocolate com morango VIDEO NOVO","Chocolate com Morango"],
 ["VENDAS | CHOCOLATE COM CENOURA","Chocolate com Cenoura"],
 ["VENDA DE NINHO COM MORANGO","Ninho com Morango"],
 ["FATIA COCO CREMOSO COM MORANGO","Coco Cremoso com Morango"]
 ];
 for(const [ad,expected] of cases){
   assert.equal(crmAdSliceHint(ad)?.name,expected);
   assert.equal(crmAdSliceHint(ad)?.basis,"ad_hint_only");
 }
});
test("morango isolado, varios produtos e pipocas nao viram interesse confirmado",()=>{
 const invalid=["VENDAS | MORANGO | VIDEO","RMK | FATIAS DISPONÍVEIS","VENDAS | PIPOCA GOURMET",
   "PRESTÍGIO + CHOCOLATUDO","PIPOCA | CHOCOLATUDO","TESTE"];
 for(const ad of invalid)assert.equal(crmAdSliceHint(ad),null,ad);
});
test("rascunho por anuncio nao diz que o cliente escolheu, comprou ou que ha estoque",()=>{
 const s=crmSuggestedMessage(null,"VENDAS | PRESTIGIO | VIDEO");
 assert.match(s,/anúncio da fatia Prestígio/);
 assert.match(s,/confirmar.*disponibilidade/);
 assert.doesNotMatch(s,/você queria|você escolheu|comprou|estoque garantido|última unidade/i);
});
test("preferencia confirmada prevalece sobre referencia do anuncio",()=>{
 const s=crmSuggestedMessage("Chocolate com Morango","VENDAS | PRESTIGIO | VIDEO");
 assert.match(s,/Chocolate com Morango/);
 assert.doesNotMatch(s,/anúncio da fatia Prestígio/);
});
test("anuncio ambiguo nao da rascunho equivocado e wa.me nao envia",()=>{
 const s=crmSuggestedMessage(null,"RMK | FATIAS DISPONÍVEIS | PGM | MORANGO");
 assert.match(s,/nossas delícias/);
 assert.doesNotMatch(s,/Chocolate com Morango/);
 const link=crmWhatsAppLink("5591999999999",null,"VENDAS | CHOCOLATUDO | VIDEO");
 const u=new URL(link);
 assert.equal(u.host,"wa.me");
 assert.match(u.searchParams.get("text"),/Chocolatudo/);
 assert.throws(()=>crmWhatsAppLink("091999999999",null,"VENDAS | CHOCOLATUDO | VIDEO"));
});
test("painel exibe origem hipotetica e prepara texto somente com autorizacao",()=>{
 const ui=read("components/admin-crm-panel.tsx");
 assert.match(ui,/Sabor sugerido pelo anúncio/);
 assert.match(ui,/não preferência confirmada nem permissão/);
 assert.match(ui,/crmSuggestedMessage\(draftInterest,signal\?\.ad_name(?:,mention\?\.product_id)?\)/);
 assert.match(ui,/crmWhatsAppLink\(item\.phone_e164,draftInterest,signal\?\.ad_name(?:,mention\?\.product_id)?\)/);
 assert.match(ui,/eligible && !possiblePurchase/);
 assert.doesNotMatch(ui,/https:\/\/graph\.facebook\.com|automatic_sends_enabled\s*=\s*true/);
});
