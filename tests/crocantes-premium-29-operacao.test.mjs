import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { readFileSync } from "node:fs";
import { quoteCartItems } from "../supabase/functions/_shared/commerce-catalog.mjs";

const load=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const release=load("app/limited-cup-release.ts");
const page=load("app/page.tsx");
const edge=load("supabase/functions/create-whatsapp-order/index.ts");
const compiled=ts.transpileModule(release,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const exports={};
vm.runInNewContext(compiled,{exports});

test("loja fechada é prioritária mesmo com copos em estoque",()=>{
  assert.equal(exports.getLimitedCupPhase(false,true,false),"closed");
  assert.equal(exports.getLimitedCupPhase(false,false,true),"closed");
  assert.equal(exports.getLimitedCupPhase(true,true,false),"available");
  assert.equal(exports.getLimitedCupPhase(true,false,true),"sold-out");
  assert.equal(exports.getLimitedCupPhase(true,false,false),"unavailable");
  assert.doesNotMatch(release,/launchDayStart|Date\.parse|15\/10/);
});

test("copos têm cotação idêntica antes e depois da data antiga",()=>{
  const items=[{product_id:"crocante-ninho",variant_id:"400ml",option_ids:[],quantity:2},
  {product_id:"crocante-chocolate",variant_id:"400ml",option_ids:[],quantity:1}];
  for(const now of [Date.parse("2026-10-14T10:00:00-03:00"), Date.parse("2026-10-15T12:01:00-03:00")]){
    const q=quoteCartItems(items,now);
    assert.equal(q.subtotalCents,4770);
    assert.deepEqual(q.availabilityKeys,["category_pipocas","crocante_copo_chocolate","crocante_copo_ninho"]);
  }
});

test("cliente nunca ignora loja fechada, categoria e estoque remoto",()=>{
  assert.ok(page.includes('const cupSalesEnabled = true'));
  assert.ok(page.includes('const cupCanOrder = cupSalesEnabled && pipocasAvailable && availability.ordersOpen && availability.source === "supabase"'));
  assert.ok(page.includes('latest.usedFallback || !latest.snapshot.ordersOpen'));
  assert.ok(page.includes('!isItemAvailable(latest.snapshot, CATEGORY_ITEM_KEYS.pipocas)'));
  assert.ok(page.includes('!isItemAvailable(latest.snapshot, CROCANTES_ITEM_KEYS[product.id])'));
  assert.ok(edge.includes('settings[0].value !== true'));
  assert.ok(edge.includes('statuses.get(key) !== "available"'));
  assert.ok(edge.includes('rpc/create_whatsapp_store_order'));
});

test("acesso temporário não registra pedido e checkout normal é preservado",()=>{
  assert.ok(edge.includes('origin === "https://56.lucianeoliveiradoces.pages.dev"'));
  assert.ok(edge.includes('"preview_token" in input || "crocantes_preview_check" in input'));
  assert.ok(edge.includes('preview_disabled'));
  assert.ok(page.includes('tintimWhatsAppUrl(buildRegisteredOrderMessage'));
  assert.ok(page.includes('Depois de finalizar no WhatsApp, faça o Pix'));
  assert.ok(page.includes('className="limited-cup-sale-compact"'));
  assert.ok(page.includes('className="limited-cup-buy-cta"'));
  assert.ok(page.includes('crocantes-cross-sell'));
  assert.doesNotMatch(page,/2026-10-15T12:00:00|teste_crocantes/);
});
