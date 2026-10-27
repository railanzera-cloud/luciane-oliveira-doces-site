import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import {extractTintimProductMention} from "../supabase/functions/tintim-webhook/product-hint.mjs";
const read=p=>fs.readFileSync(new URL("../"+p,import.meta.url),"utf8");
const exports={};
vm.runInNewContext(ts.transpileModule(read("lib/crm-follow-up.ts"),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText,{exports});
const {crmSuggestedMessage,crmWhatsAppLink,crmMentionedProductName}=exports;
const inbound=(message)=>({event_type:"message_create",from_me:false,lead:{phone:"5591999999999"},message});
test("mensagens reais com sabor inequívoco geram ID canônico sem texto",()=>{
 for(const [text,expected] of [
  ["Queria uma fatia de Chocolatudo","fatia-chocolatudo"],
  ["Tem uma fatia de Prestígio?","fatia-prestigio"],
  ["Qual o preço do chocolate com maracujá?","fatia-chocolate-maracuja"],
  ["Quero duas fatias de chocolate com morango","fatia-chocolate-morango"],
  ["Tem a fatia de Ninho com morango?","fatia-ninho-morango"],
  ["Posso pegar uma fatia de Coco Cremoso com Morango?","fatia-coco-cremoso-morango"],
  ["Quanto custa a fatia de chocolate com cenoura?","fatia-chocolate-cenoura"],
 ]){
  const m=extractTintimProductMention(inbound(text));
  assert.equal(m.ignored,false,text);
  assert.equal(m.action,"set");
  assert.equal(m.product_id,expected);
  assert.doesNotMatch(JSON.stringify(m),/queria|fatia de|pegar|preço do/i);
 }
});
test("mensagens de empresa, anexos, multiplos sabores e morango genérico nunca personalizam",()=>{
 for(const payload of [
 {...inbound("Quero Chocolatudo"),from_me:true},
 {...inbound("Uma fatia de Prestígio"),message:{text:"Uma fatia de Prestígio"}},
 inbound("Quero uma de morango"),
 inbound("Quero uma fatia de Prestígio e outra Chocolatudo"),
 inbound("A fatia Chocolatudo é ótima"),
 inbound("https://exemplo.com/chocolatudo quero"),
 inbound("Não quero Prestígio, mas quero Chocolatudo"),
 ]){
   assert.equal(extractTintimProductMention(payload).ignored,true);
 }
});
test("recusa explícita do sabor remove dica anterior sem interpretar como compra",()=>{
 const m=extractTintimProductMention(inbound("Não quero a fatia de Prestígio"));
 assert.equal(m.action,"clear");
 assert.equal(m.product_id,"fatia-prestigio");
 assert.equal(m.ignored,false);
});
test("menção do cliente supera anúncio; preferência confirmada supera menção",()=>{
 const s=crmSuggestedMessage(null,"VENDAS | PRESTIGIO | VIDEO","fatia-chocolatudo");
 assert.match(s,/fatia Chocolatudo/);
 assert.match(s,/que você mencionou/);
 assert.doesNotMatch(s,/Prestígio|comprou|garantimos|últimas unidades/);
 const c=crmSuggestedMessage("Chocolate com Morango","VENDAS | PRESTIGIO","fatia-chocolatudo");
 assert.match(c,/Chocolate com Morango/);
 assert.doesNotMatch(c,/Chocolatudo/);
 assert.equal(crmMentionedProductName("fatia-prestigio"),"Prestígio");
 const link=new URL(crmWhatsAppLink("5591999999999",null,"VENDAS | PRESTIGIO","fatia-chocolatudo"));
 assert.equal(link.host,"wa.me");
 assert.match(link.searchParams.get("text"),/Chocolatudo/);
});
test("só ID/direção/fingerprint vão ao banco; pedidos preservados",()=>{
 const edge=read("supabase/functions/tintim-webhook/index.ts");
 assert.match(edge,/extractTintimProductMention\(payload\)/);
 assert.match(edge,/p_fingerprint:fingerprint,p_product_id:mention.product_id/);
 assert.match(edge,/signal\?\.direction==="inbound"/);
 assert.match(edge,/data\.ignored && observation\?\.accepted===true/);
 assert.match(edge,/record_tintim_order_reference/);
 assert.doesNotMatch(edge,/p_message_text|p_message_body|p_raw_text/);
 const sql=read("supabase/migrations/20261027005000_crm_tintim_product_hints.sql");
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/crm_provider_only/);
 assert.match(sql,/PERFORM public\.crm_require_staff\(\)/);
 assert.match(sql,/e\.direction='inbound'/);
 assert.doesNotMatch(sql,/\bUPDATE public\.orders\b|\bINSERT INTO public\.orders\b|automatic_sends_enabled\s*=\s*true|message_body/i);
});
test("painel exibe informação de origem e respeita bloqueio",()=>{
 const ui=read("components/admin-crm-panel.tsx");
 assert.match(ui,/crm_list_tintim_product_hints/);
 assert.match(ui,/Fatia mencionada pelo cliente/);
 assert.match(ui,/crmSuggestedMessage\(draftInterest,signal\?\.ad_name,mention\?\.product_id\)/);
 assert.match(ui,/eligible && !possiblePurchase/);
 assert.doesNotMatch(ui,/https:\/\/graph\.facebook\.com/);
});
