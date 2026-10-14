import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
const src=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const edge=src("supabase/functions/create-whatsapp-order/index.ts");
const page=src("app/page.tsx");
const client=src("lib/site-order.ts");
const availability=src("app/menu-availability.ts");

test("a loja fechada e o estoque ainda bloqueiam pedidos no servidor",()=>{
  assert.ok(edge.includes('store_settings?select=value&key=eq.orders_open'));
  assert.ok(edge.includes('settings[0].value !== true'));
  assert.ok(edge.includes('statuses.get(key) !== "available"'));
  assert.ok(edge.includes('quoteCartItems(input.items, Date.now())'));
  assert.ok(edge.includes('rpc/create_whatsapp_store_order'));
  assert.ok(availability.includes('statuses[key] = "sold_out"'));
});
test("o modo de homologação temporária não pode gerar pedidos",()=>{
  assert.ok(edge.includes('"preview_token" in input || "crocantes_preview_check" in input'));
  assert.ok(edge.includes('preview_disabled'));
  assert.doesNotMatch(edge,/CROCANTES_TEST_PREVIEW_ORIGIN|verifyCrocantesPreviewToken|CROCANTES_OPEN_AT_MS|crocantes_preview_access/);
  assert.doesNotMatch(page,/teste_crocantes|cupTestActive|preview_token: cupTestCode|checkCrocantesPreviewCode/);
  assert.doesNotMatch(client,/checkCrocantesPreviewCode|preview_token\?:/);
});
test("CORS permanece restrito e preserva o domínio comercial",()=>{
  assert.ok(edge.includes('https://lucianeoliveiradoces.pages.dev'));
  assert.ok(edge.includes('allowedOrigins().has(origin)'));
  assert.ok(edge.includes('Access-Control-Allow-Origin'));
  assert.doesNotMatch(edge,/\*\.pages\.dev|Access-Control-Allow-Origin"\] = "\*"/);
});
