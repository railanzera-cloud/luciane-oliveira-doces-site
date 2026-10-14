import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { quoteCartItems, CROCANTES_OPEN_AT_MS } from "../supabase/functions/_shared/commerce-catalog.mjs";
const f=(n)=>readFileSync(new URL("../"+n,import.meta.url),"utf8");
const src=f("supabase/functions/create-whatsapp-order/index.ts"),page=f("app/page.tsx"),client=f("lib/site-order.ts");
test("publico permanece fechado antes de 15/10 meio dia",()=>{
  const item={product_id:"crocante-ninho",variant_id:"400ml",option_ids:[],quantity:2};
  assert.throws(()=>quoteCartItems([item],CROCANTES_OPEN_AT_MS-1),/15\/10/);
  assert.equal(quoteCartItems([item],CROCANTES_OPEN_AT_MS-1,true).subtotalCents,3180);
  assert.equal(quoteCartItems([item],CROCANTES_OPEN_AT_MS).subtotalCents,3180);
});
test("homologacao so com token e expiracao verificados no servidor",()=>{
  assert.ok(src.includes('async function verifyCrocantesPreviewToken'));
  assert.ok(src.includes('Date.now() >= CROCANTES_OPEN_AT_MS'));
  assert.ok(src.includes('await sha256(value)'));
  assert.ok(src.includes('crocantes_preview_access?select=token_hash'));
  assert.ok(src.includes('crocantes_preview_check === true'));
  assert.ok(src.includes('previewAuthorized = containsCup'));
  assert.ok(src.includes('quoteCartItems(input.items, Date.now(), previewAuthorized)'));
  assert.ok(src.includes('[TESTE INTERNO — NÃO PREPARAR OU COBRAR]'));
  assert.ok(!src.includes('2a0b57f676c4bf1c34f7ea35ff744e49d12b8179597878b65b25448f8742169e'));
});
test("nunca tornar o codigo parte da URL, carrega somente no fluxo Whatsapp",()=>{
  assert.ok(page.includes('teste_crocantes') && page.includes('type="password"'));
  assert.ok(page.includes('checkCrocantesPreviewCode'));
  assert.ok(page.includes('preview_token: cupTestCode'));
  assert.ok(page.includes('cartAvailabilityIssues(cart, latest.snapshot, cupTestActive)'));
  assert.ok(page.includes('TESTE DE HOMOLOGAÇÃO — NÃO PREPARAR / NÃO COBRAR'));
  assert.ok(client.includes('preview_token?: string'));
  assert.ok(client.includes('crocantes_preview_check: true'));
});
