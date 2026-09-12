import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const operations = await read("../supabase/migrations/20260912154500_phase2_operations.sql");
const createOrder = await read("../supabase/functions/create-order/index.ts");
const webhook = await read("../supabase/functions/mercadopago-webhook/index.ts");
const publicStatus = await read("../supabase/functions/public-order-status/index.ts");
const effects = await read("../supabase/functions/process-order-effects/index.ts");
const qzSign = await read("../supabase/functions/qz-sign/index.ts");
const home = await read("../app/page.tsx");
const cardBrick = await read("../components/mercado-pago-card-form.tsx");
const admin = await read("../components/admin-orders-panel.tsx");
const qzClient = await read("../lib/qz-print-client.ts");
const packageScript = await read("../scripts/package-cloudflare.mjs");

test("all new TypeScript and TSX sources are syntactically valid", () => {
  for (const [name, source, jsx] of [
    ["create-order", createOrder, false],
    ["webhook", webhook, false],
    ["public-order-status", publicStatus, false],
    ["process-order-effects", effects, false],
    ["qz-sign", qzSign, false],
    ["home", home, true],
    ["card-brick", cardBrick, true],
    ["admin-orders", admin, true],
  ]) {
    const result = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        ...(jsx ? { jsx: ts.JsxEmit.ReactJSX } : {}),
      },
      reportDiagnostics: true,
      fileName: `${name}.${jsx ? "tsx" : "ts"}`,
    });
    assert.deepEqual(result.diagnostics?.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error) ?? [], [], name);
  }
});

test("authenticated admin transitions keep payment and operation separate", () => {
  assert.match(operations, /create or replace function public\.admin_transition_order/);
  assert.match(operations, /lod_require_authenticated_staff\(\)/);
  assert.match(operations, /online_payment_not_paid/);
  assert.match(operations, /payment_status = 'paid'/);
  assert.match(operations, /order_status = p_new_status/);
  assert.match(operations, /grant execute on function public\.admin_transition_order[\s\S]*to authenticated/);
  assert.doesNotMatch(operations, /grant execute on function public\.admin_transition_order[^;]*to anon/);
});

test("Mercado Pago maps authoritative terminal states without regressing paid orders", () => {
  assert.match(operations, /'processed'[\s\S]*'accredited'[\s\S]*'paid'/);
  assert.match(operations, /'refunded', 'charged_back', 'chargeback'[\s\S]*'refunded'/);
  assert.match(operations, /'cancelled', 'canceled', 'expired'[\s\S]*'cancelled'/);
  assert.match(operations, /v_previous_payment = 'paid'[\s\S]*not in \('paid', 'refunded'\)/);
  assert.match(operations, /v_changed_to_paid[\s\S]*meta_purchase:/);
  assert.match(createOrder, /transaction_security:[\s\S]*validation: "on_fraud_risk"[\s\S]*liability_shift: "required"/);
  assert.match(createOrder, /challenge_url/);
});

test("public tracking requires a 192-bit token and returns a PII-free snapshot", () => {
  const publicFunction = operations.match(/create or replace function public\.get_public_order_status[\s\S]*?end;\n\$\$;/)?.[0] ?? "";
  assert.match(publicFunction, /\^\[0-9a-f\]\{48\}\$/);
  assert.match(publicFunction, /order_number/);
  assert.match(publicFunction, /payment_status/);
  assert.doesNotMatch(publicFunction, /customer_(?:name|phone|email)|street_number|fbclid|utm_/);
  assert.match(operations, /grant execute on function public\.get_public_order_status\(text\) to service_role/);
  assert.doesNotMatch(operations, /grant execute on function public\.get_public_order_status\(text\) to anon/);
  assert.match(publicStatus, /validatePublishableKey/);
  assert.match(publicStatus, /\^\[0-9a-f\]\{48\}\$/);
});

test("outbox and print workers use atomic claims and stable deduplication", () => {
  assert.match(operations, /claim_event_outbox[\s\S]*for update skip locked/);
  assert.match(operations, /attempts < 10/);
  assert.match(operations, /claim_print_job[\s\S]*for update skip locked/);
  assert.match(operations, /status = 'pending'[\s\S]*status = 'printing'/);
  assert.match(operations, /stale_print_claim/);
  assert.match(operations, /reprint:[\s\S]*gen_random_uuid/);
  assert.match(qzClient, /claimPrintJob[\s\S]*completePrintJob/);
  assert.match(qzClient, /failPrintJob/);
  assert.doesNotMatch(qzClient, /window\.print\(/);
});

test("Meta Purchase is server-only, paid-only and retryable", () => {
  assert.match(effects, /order\.sales_channel !== "site" \|\| order\.payment_status !== "paid"/);
  assert.match(effects, /event_name: "Purchase"/);
  assert.match(effects, /event_id: eventId/);
  assert.match(effects, /action_source: "website"/);
  assert.match(effects, /complete_event_outbox/);
  assert.match(effects, /fail_event_outbox/);
  assert.match(effects, /META_CAPI_ACCESS_TOKEN/);
  assert.doesNotMatch(home, /fbq\([^\n]*Purchase|trackMetaEvent\("Purchase"/);
  assert.doesNotMatch(webhook, /graph\.facebook\.com/);
});

test("QZ private key stays server-side and the browser uses authenticated signing", () => {
  assert.match(qzSign, /QZ_PRIVATE_KEY_PEM/);
  assert.match(qzSign, /createSign\("RSA-SHA512"\)/);
  assert.match(qzSign, /auth\/v1\/user/);
  assert.match(qzClient, /setCertificatePromise/);
  assert.match(qzClient, /setSignaturePromise/);
  assert.doesNotMatch(qzClient, /PRIVATE KEY|QZ_PRIVATE_KEY_PEM/);
  assert.doesNotMatch(home, /QZ_PRIVATE_KEY|META_CAPI_ACCESS_TOKEN|MP_ACCESS_TOKEN_TEST/);
});

test("checkout keeps WhatsApp while adding site payments and the official Card Brick", () => {
  for (const method of ["mercado_pago_pix", "mercado_pago_card", "card_on_delivery", "cash"]) {
    assert.match(home, new RegExp(method));
  }
  assert.match(home, /Finalizar no WhatsApp/);
  assert.match(home, /finishOnWhatsApp/);
  assert.match(home, /finishOnSite/);
  assert.match(home, /finalizationLockRef/);
  assert.match(cardBrick, /https:\/\/sdk\.mercadopago\.com\/js\/v2/);
  assert.match(cardBrick, /bricks\(\)\.create\("cardPayment"/);
  assert.doesNotMatch(cardBrick, /cardNumber|securityCode|cvv/i);
});

test("admin reloads on Realtime, focus and supports explicit alert/payment/reprint actions", () => {
  assert.match(admin, /postgres_changes[\s\S]*table: "orders"/);
  assert.match(admin, /table: "print_jobs"/);
  assert.match(admin, /visibilitychange/);
  assert.match(admin, /Ativar alertas da cozinha/);
  assert.match(admin, /Confirmar pagamento/);
  assert.match(admin, /Reimprimir/);
  assert.match(packageScript, /renderRoute\("\/pedido", "pedido\/index\.html"\)/);
});

test("no secret-shaped credential was committed in Phase 2 operation sources", () => {
  const combined = [operations, createOrder, webhook, publicStatus, effects, qzSign, home, cardBrick, admin, qzClient].join("\n");
  assert.doesNotMatch(combined, /APP_USR-[A-Za-z0-9_-]{20,}|sb_secret_[A-Za-z0-9_-]{12,}/);
  assert.doesNotMatch(combined, /-----BEGIN (?:RSA )?PRIVATE KEY-----/);
});
