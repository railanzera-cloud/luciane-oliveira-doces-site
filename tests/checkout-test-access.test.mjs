import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { webcrypto } from "node:crypto";
import { quoteCartItems, quoteFulfillment } from "../supabase/functions/_shared/commerce-catalog.mjs";

const source = await readFile(new URL("../supabase/functions/create-order/index.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source.replace(/import\s*\{[\s\S]*?\}\s*from\s*"\.\.\/_shared\/commerce-catalog\.mjs";/, ""), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;

function fixture(environment = "test", liveMode = false) {
  const calls = [];
  let handler;
  const env = { SUPABASE_URL: "https://fixture.invalid", SUPABASE_SECRET_KEYS: '{"default":"fixture-secret"}',
    SUPABASE_PUBLISHABLE_KEYS: '{"default":"fixture-public"}', SITE_ORDERING_ENABLED: "false",
    PAYMENTS_ENVIRONMENT: environment, MP_ACCESS_TOKEN_TEST: "fixture-mp-token" };
  vm.runInNewContext(code, { quoteCartItems, quoteFulfillment, crypto: webcrypto,
    Request, Response, Headers, AbortController, AbortSignal, DOMException, TextEncoder,
    setTimeout, clearTimeout, console: { error() {} },
    Deno: { env: { get: (key) => env[key] }, serve: (fn) => { handler = fn; } },
    fetch: async (url, options = {}) => {
      const body = options.body ? JSON.parse(options.body) : null;
      calls.push({ url, body });
      if (url.includes("store_settings?")) return Response.json([{ value: true }]);
      if (url.includes("menu_availability?")) return Response.json(["category_pipocas","popcorn_size_500ml","popcorn_flavor_leitinho"].map(item_key => ({ item_key, status:"available" })));
      if (url.endsWith("/create_store_order")) return Response.json({ id:"fixture-order", order_id:body.p_order.order_id, total:"50.00", payment_status:"pending", order_status:"payment_pending" });
      if (url.endsWith("/get_or_create_payment_attempt")) return Response.json({ id:"fixture-attempt", status:"created", idempotency_key:"fixture-key", safe_response:{} });
      if (url.includes("payment_attempts?")) return new Response(null,{status:204});
      if (url === "https://api.mercadopago.com/v1/orders") return Response.json({ id:"ORD-FIXTURE", external_reference:body.external_reference,
        total_amount:"50.00", country_code:"BRA", live_mode:liveMode, status:"action_required", status_detail:"waiting_transfer",
        transactions:{payments:[{id:"PAY-FIXTURE",payment_method:{id:"pix",type:"bank_transfer",qr_code:"fixture-qr"}}]} });
      if (url.endsWith("/apply_mercadopago_order_event")) return Response.json({ changed_to_paid:false, payment_status:"pending",order_status:"payment_pending" });
      throw new Error("Unexpected fixture call");
    },
  });
  const body = { client_order_id:"LOD-TEST-0000-0001", customer:{name:"APRO",phone:"91999999999",email:"test_user_br@testuser.com"},
    items:[{product_id:"pipoca-gourmet",variant_id:"500ml",option_ids:["leitinho"],quantity:2}],
    fulfillment:{type:"pickup"},payment:{method:"mercado_pago_pix"} };
  return { calls, invoke: (headers) => handler(new Request("https://fixture.invalid/functions/v1/create-order",{
    method:"POST",headers:{"content-type":"application/json",...headers},body:JSON.stringify(body),
  })) };
}

test("test marker and public key cannot enable the disabled checkout",async()=>{
  for(const headers of [{},{apikey:"fixture-public","x-lod-test":"1"},{authorization:"Bearer forged","x-lod-test":"1"},{apikey:"fixture-secret"}]){
    const f=fixture(); assert.equal((await f.invoke(headers)).status,503); assert.equal(f.calls.length,0);
  }
});
test("internal test access cannot activate a production environment",async()=>{
  const f=fixture("production"); assert.equal((await f.invoke({apikey:"fixture-secret","x-lod-test":"1"})).status,503);
  assert.equal(f.calls.length,0);
});
test("authenticated sandbox invocation recalculates the official Pix test total and sends APRO",async()=>{
  const f=fixture(); const response=await f.invoke({apikey:"fixture-secret","x-lod-test":"1"});
  assert.equal(response.status,201);
  const sent=f.calls.find(c=>c.url==="https://api.mercadopago.com/v1/orders").body;
  assert.equal(sent.total_amount,"50.00"); assert.equal(sent.payer.first_name,"APRO");
  assert.equal(sent.payer.email,"test_user_br@testuser.com");
  const result=await response.json(); assert.equal(result.order.payment_status,"pending");
  assert.equal(result.payment.payment.qr_code,"fixture-qr");
});
test("sandbox creation never accepts a live payment response as confirmed",async()=>{
  const f=fixture("test",true); const response=await f.invoke({apikey:"fixture-secret","x-lod-test":"1"});
  assert.equal(response.status,502);
  assert.equal(f.calls.some(c=>c.url.endsWith("/apply_mercadopago_order_event")),false);
});
