// Supabase Edge Function: cria pedido e, quando aplicável, uma Order do Mercado Pago.
// Nunca confia em preços/taxas recebidos do navegador e nunca persiste dados de cartão.
import {
  quoteCartItems,
  quoteFulfillment,
} from "../_shared/commerce-catalog.mjs";

const MP_ORDERS_URL = "https://api.mercadopago.com/v1/orders";
const ORDER_ID_PATTERN = /^LOD-(?:[0-9A-HJKMNP-TV-Z]{4}-){2}[0-9A-HJKMNP-TV-Z]{4}$/;
const ONLINE_METHODS = new Set(["mercado_pago_pix", "mercado_pago_card"]);
const PAYMENT_METHODS = new Set([...ONLINE_METHODS, "card_on_delivery", "cash"]);
const DEFAULT_ALLOWED_ORIGINS = [
  "https://lucianeoliveiradoces.pages.dev",
  "https://luciane-oliveira-doces.railanzera.chatgpt.site",
];

class HttpError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function allowedOrigins(): Set<string> {
  const configured = Deno.env.get("CHECKOUT_ALLOWED_ORIGINS")
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return new Set(configured?.length ? configured : DEFAULT_ALLOWED_ORIGINS);
}

function corsHeaders(origin: string | null): HeadersInit {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    Vary: "Origin",
  };
  if (origin && allowedOrigins().has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function response(origin: string | null, status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), { status, headers: corsHeaders(origin) });
}

function cleanString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string") throw new HttpError(400, "invalid_input", `Preencha ${field}.`);
  const cleaned = value.normalize("NFC").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned || cleaned.length > maxLength) throw new HttpError(400, "invalid_input", `Preencha ${field} corretamente.`);
  return cleaned;
}

function optionalString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.normalize("NFC").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

function normalizeEmail(value: unknown, required: boolean): string | null {
  if (value === undefined || value === null || value === "") {
    if (required) throw new HttpError(400, "email_required", "Informe o e-mail necessário para processar o pagamento.");
    return null;
  }
  const email = cleanString(value, "o e-mail", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "invalid_email", "Informe um e-mail válido.");
  return email;
}

function normalizePhone(value: unknown): string {
  const phone = cleanString(value, "o celular", 30).replace(/\D/g, "");
  if (!/^\d{10,15}$/.test(phone)) throw new HttpError(400, "invalid_phone", "Informe um celular válido com DDD.");
  return phone;
}

function money(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) throw new HttpError(500, "invalid_quote", "Não foi possível calcular o pedido.");
  return (cents / 100).toFixed(2);
}

function parseMoneyToCents(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value * 100);
  if (typeof value !== "string" || !/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const cents = Math.round(Number(value) * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, canonicalize(child)]));
  }
  return value;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getSupabaseSecretKey(): string {
  const current = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (current) {
    try {
      const keys = JSON.parse(current) as Record<string, string>;
      if (keys.default) return keys.default;
      const first = Object.values(keys).find(Boolean);
      if (first) return first;
    } catch {
      // Legacy secret below remains supported during the project transition.
    }
  }
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!legacy) throw new HttpError(503, "backend_not_configured", "O checkout online ainda não foi habilitado.");
  return legacy;
}

function getSupabaseUrl(): string {
  const value = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
  if (!value) throw new HttpError(503, "backend_not_configured", "O checkout online ainda não foi habilitado.");
  return value;
}

async function rest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const key = getSupabaseSecretKey();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const result = await fetch(`${getSupabaseUrl()}/rest/v1/${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });
    const text = await result.text();
    const body = text ? JSON.parse(text) : null;
    if (!result.ok) throw new HttpError(502, "database_error", "Não foi possível registrar o pedido.", { databaseCode: body?.code });
    return body as T;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new HttpError(504, "database_timeout", "A confirmação demorou mais que o esperado. Tente novamente.");
    }
    throw new HttpError(502, "database_error", "Não foi possível registrar o pedido.");
  } finally {
    clearTimeout(timer);
  }
}

async function validatePublishableKey(request: Request): Promise<void> {
  const supplied = request.headers.get("apikey");
  const configured = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (!supplied || !configured) throw new HttpError(401, "invalid_client", "Cliente não autorizado.");
  try {
    const keys = Object.values(JSON.parse(configured) as Record<string, string>);
    if (!keys.includes(supplied)) throw new HttpError(401, "invalid_client", "Cliente não autorizado.");
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(503, "backend_not_configured", "O checkout online ainda não foi habilitado.");
  }
}

async function revalidateAvailability(itemKeys: string[]): Promise<void> {
  const encodedKeys = itemKeys.map((key) => encodeURIComponent(key)).join(",");
  const [settings, rows] = await Promise.all([
    rest<Array<{ value: boolean }>>("store_settings?select=value&key=eq.orders_open"),
    rest<Array<{ item_key: string; status: string }>>(`menu_availability?select=item_key,status&item_key=in.(${encodedKeys})`),
  ]);
  if (settings.length !== 1 || settings[0].value !== true) {
    throw new HttpError(409, "orders_closed", "Os pedidos foram encerrados por enquanto.");
  }
  const statuses = new Map(rows.map((row) => [row.item_key, row.status]));
  const unavailable = itemKeys.filter((key) => statuses.get(key) !== "available");
  if (unavailable.length) {
    throw new HttpError(409, "menu_changed", "Um item ficou indisponível. Revise o carrinho antes de continuar.", { itemKeys: unavailable });
  }
}

function sanitizeParameters(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const entries: Array<[string, string[]]> = [];
  for (const [rawKey, rawValues] of Object.entries(value as Record<string, unknown>).slice(0, 50)) {
    const key = rawKey.replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 80);
    if (!key || !Array.isArray(rawValues)) continue;
    const values = rawValues.filter((item): item is string => typeof item === "string").slice(0, 10).map((item) => item.slice(0, 500));
    if (values.length) entries.push([key, values]);
  }
  return Object.fromEntries(entries);
}

function safeGatewayResponse(order: Record<string, unknown>): Record<string, unknown> {
  const transactions = order.transactions && typeof order.transactions === "object"
    ? order.transactions as Record<string, unknown>
    : {};
  const payments = Array.isArray(transactions.payments) ? transactions.payments : [];
  const payment = payments[0] && typeof payments[0] === "object" ? payments[0] as Record<string, unknown> : {};
  const method = payment.payment_method && typeof payment.payment_method === "object"
    ? payment.payment_method as Record<string, unknown>
    : {};
  const transactionSecurity = method.transaction_security && typeof method.transaction_security === "object"
    ? method.transaction_security as Record<string, unknown>
    : {};
  return {
    id: optionalString(order.id, 120),
    status: optionalString(order.status, 80),
    status_detail: optionalString(order.status_detail, 120),
    total_amount: optionalString(order.total_amount, 40),
    payment: {
      id: optionalString(payment.id, 120),
      status: optionalString(payment.status, 80),
      status_detail: optionalString(payment.status_detail, 120),
      ticket_url: optionalString(method.ticket_url, 2048),
      qr_code: optionalString(method.qr_code, 4096),
      qr_code_base64: optionalString(method.qr_code_base64, 250000),
      expires_at: optionalString(
        payment.expiration_time ?? method.expiration_time ?? order.expiration_time ?? order.expiration_date,
        120,
      ),
      challenge_url: optionalString(transactionSecurity.url, 2048),
    },
  };
}

function triggerOrderEffects(): void {
  let key: string;
  try { key = getSupabaseSecretKey(); } catch { return; }
  const task = fetch(`${getSupabaseUrl()}/functions/v1/process-order-effects`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: "{}",
  }).then((result) => {
    if (!result.ok && result.status !== 503) console.error("process-order-effects returned", result.status);
  }).catch((error) => console.error("process-order-effects request failed", error instanceof Error ? error.name : "unknown"));
  const runtime = (globalThis as unknown as { EdgeRuntime?: { waitUntil: (promise: Promise<unknown>) => void } }).EdgeRuntime;
  if (runtime?.waitUntil) runtime.waitUntil(task);
}

async function patchAttempt(id: string, changes: Record<string, unknown>): Promise<void> {
  await rest(`payment_attempts?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(changes),
  });
}

function gatewayErrorMessage(body: unknown): string {
  if (!body || typeof body !== "object") return "Mercado Pago não processou a solicitação.";
  const candidate = (body as Record<string, unknown>).message ?? (body as Record<string, unknown>).error;
  return typeof candidate === "string" ? candidate.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, 300) : "Mercado Pago não processou a solicitação.";
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin");
  try {
    if (origin && !allowedOrigins().has(origin)) throw new HttpError(403, "origin_not_allowed", "Origem não autorizada.");
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
    if (request.method !== "POST") throw new HttpError(405, "method_not_allowed", "Método não permitido.");
    if (Deno.env.get("SITE_ORDERING_ENABLED") !== "true") {
      throw new HttpError(503, "checkout_disabled", "A finalização completa pelo site ainda está em preparação.");
    }
    await validatePublishableKey(request);
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 65536) throw new HttpError(413, "payload_too_large", "Pedido muito grande.");

    let input: Record<string, unknown>;
    try {
      input = await request.json();
    } catch {
      throw new HttpError(400, "invalid_json", "Não foi possível ler o pedido.");
    }
    const orderId = cleanString(input.client_order_id, "o código do pedido", 80);
    if (!ORDER_ID_PATTERN.test(orderId)) throw new HttpError(400, "invalid_order_id", "Código do pedido inválido.");
    const customer = input.customer && typeof input.customer === "object" ? input.customer as Record<string, unknown> : {};
    const payment = input.payment && typeof input.payment === "object" ? input.payment as Record<string, unknown> : {};
    const method = cleanString(payment.method, "a forma de pagamento", 40);
    if (!PAYMENT_METHODS.has(method)) throw new HttpError(400, "invalid_payment_method", "Escolha uma forma de pagamento válida.");
    const online = ONLINE_METHODS.has(method);
    const customerName = cleanString(customer.name, "o nome", 100);
    const customerPhone = normalizePhone(customer.phone);
    const customerEmail = normalizeEmail(customer.email, online);
    let quote: ReturnType<typeof quoteCartItems>;
    let fulfillment: ReturnType<typeof quoteFulfillment>;
    try {
      quote = quoteCartItems(input.items);
      fulfillment = quoteFulfillment(input.fulfillment);
    } catch (quoteError) {
      throw new HttpError(400, "invalid_order", quoteError instanceof Error ? quoteError.message : "Pedido inválido.");
    }
    await revalidateAvailability(quote.availabilityKeys);

    const totalCents = quote.subtotalCents + fulfillment.delivery_fee_cents;
    let cashChangeFor: string | null = null;
    if (method === "cash" && payment.change_for !== undefined && payment.change_for !== null && payment.change_for !== "") {
      const cents = parseMoneyToCents(payment.change_for);
      if (cents === null || cents < totalCents) throw new HttpError(400, "invalid_change", "O valor para troco precisa ser igual ou maior que o total.");
      cashChangeFor = money(cents);
    }

    const attribution = input.attribution && typeof input.attribution === "object"
      ? input.attribution as Record<string, unknown>
      : {};
    const sourceParameters = sanitizeParameters(attribution.parameters);
    const orderPayload = {
      order_id: orderId,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      sales_channel: "site",
      checkout_channel: "site",
      ...fulfillment,
      subtotal: money(quote.subtotalCents),
      delivery_fee: money(fulfillment.delivery_fee_cents),
      discount: "0.00",
      total: money(totalCents),
      currency: "BRL",
      payment_method: method,
      cash_change_for: cashChangeFor,
      gateway_environment: Deno.env.get("PAYMENTS_ENVIRONMENT") ?? "test",
      source: optionalString(attribution.utm_source ?? attribution.origem, 160),
      origem: optionalString(attribution.origem, 160),
      utm_source: optionalString(attribution.utm_source, 500),
      utm_medium: optionalString(attribution.utm_medium, 500),
      utm_campaign: optionalString(attribution.utm_campaign, 500),
      utm_content: optionalString(attribution.utm_content, 500),
      utm_term: optionalString(attribution.utm_term, 500),
      fbclid: optionalString(attribution.fbclid, 1000),
      fbp: optionalString(attribution.fbp, 500),
      fbc: optionalString(attribution.fbc, 500),
      tintim_fbid: optionalString(attribution.tintim_fbid, 1000),
      landing_url: optionalString(attribution.landing_url, 2048),
      event_source_url: optionalString(attribution.last_url, 2048),
      source_parameters: sourceParameters,
    };
    const databaseItems = quote.items.map((item) => ({
      ...item,
      unit_price: money(item.unit_price_cents),
      line_total: money(item.line_total_cents),
      item_snapshot: item,
    }));
    const requestHash = await sha256(JSON.stringify(canonicalize({ order: orderPayload, items: databaseItems.map(({ item_snapshot: _snapshot, ...item }) => item) })));
    const storedOrder = await rest<Record<string, unknown>>("rpc/create_store_order", {
      method: "POST",
      body: JSON.stringify({ p_order: { ...orderPayload, request_hash: requestHash }, p_items: databaseItems }),
    });

    if (!online) {
      return response(origin, 201, { ok: true, order: storedOrder, payment: { method, status: "pending", payable_on_receipt: true } });
    }
    const environment = Deno.env.get("PAYMENTS_ENVIRONMENT") ?? "test";
    if (environment !== "test") throw new HttpError(503, "production_not_enabled", "O pagamento online está disponível somente no ambiente de testes.");
    const accessToken = Deno.env.get("MP_ACCESS_TOKEN_TEST");
    if (!accessToken) throw new HttpError(503, "mercado_pago_not_configured", "O Mercado Pago de teste ainda não foi configurado.");

    const attempt = await rest<Record<string, unknown>>("rpc/get_or_create_payment_attempt", {
      method: "POST",
      body: JSON.stringify({ p_order_uuid: storedOrder.id, p_method: method, p_new_attempt: input.new_payment_attempt === true }),
    });
    const previousSafe = attempt.safe_response && typeof attempt.safe_response === "object"
      ? attempt.safe_response as Record<string, unknown>
      : {};
    if (attempt.mercado_pago_order_id && Object.keys(previousSafe).length) {
      return response(origin, 200, { ok: true, order: storedOrder, payment: previousSafe, idempotent: true });
    }
    if (attempt.status === "retry_wait" && typeof attempt.retry_after === "string" && Date.parse(attempt.retry_after) > Date.now()) {
      throw new HttpError(429, "retry_later", "Aguarde alguns instantes antes de tentar novamente.", { retryAt: attempt.retry_after });
    }

    const card = payment.card && typeof payment.card === "object" ? payment.card as Record<string, unknown> : {};
    let paymentMethod: Record<string, unknown>;
    let payer: Record<string, unknown> = { email: customerEmail, first_name: customerName.split(/\s+/)[0] };
    if (method === "mercado_pago_pix") {
      paymentMethod = { id: "pix", type: "bank_transfer" };
    } else {
      const token = cleanString(card.token, "os dados seguros do cartão", 2048);
      const paymentMethodId = cleanString(card.payment_method_id, "a bandeira do cartão", 80);
      const paymentTypeId = cleanString(card.payment_type_id, "o tipo do cartão", 40);
      const installments = card.installments;
      if (!Number.isInteger(installments) || Number(installments) < 1 || Number(installments) > 24) {
        throw new HttpError(400, "invalid_installments", "Escolha uma quantidade válida de parcelas.");
      }
      if (!new Set(["credit_card", "debit_card"]).has(paymentTypeId)) {
        throw new HttpError(400, "invalid_card_type", "Tipo de cartão inválido.");
      }
      paymentMethod = { id: paymentMethodId, type: paymentTypeId, token, installments };
      const identification = card.identification && typeof card.identification === "object"
        ? card.identification as Record<string, unknown>
        : null;
      if (identification) {
        const documentNumber = cleanString(identification.number, "o documento", 30).replace(/\D/g, "");
        if (documentNumber.length < 5 || documentNumber.length > 20) {
          throw new HttpError(400, "invalid_document", "Confira o documento informado no pagamento seguro.");
        }
        payer = {
          ...payer,
          identification: {
            type: cleanString(identification.type, "o tipo de documento", 20),
            number: documentNumber,
          },
        };
      }
    }

    const mpRequest = {
      type: "online",
      total_amount: money(totalCents),
      external_reference: orderId,
      processing_mode: "automatic",
      ...(method === "mercado_pago_card" ? {
        config: {
          online: {
            transaction_security: {
              validation: "on_fraud_risk",
              liability_shift: "required",
            },
          },
        },
      } : {}),
      transactions: { payments: [{ amount: money(totalCents), payment_method: paymentMethod }] },
      payer,
    };
    await patchAttempt(String(attempt.id), { status: "requesting", last_error_code: null, last_error_message: null, retry_after: null });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    let gatewayResult: Response;
    try {
      gatewayResult = await fetch(MP_ORDERS_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": String(attempt.idempotency_key),
        },
        body: JSON.stringify(mpRequest),
      });
    } catch (error) {
      await patchAttempt(String(attempt.id), { status: "unknown", last_error_code: "gateway_timeout", last_error_message: "Resposta do gateway não confirmada." });
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new HttpError(504, "gateway_timeout", "O Mercado Pago demorou para responder. A mesma tentativa poderá ser consultada novamente.");
      }
      throw new HttpError(502, "gateway_unavailable", "O Mercado Pago está temporariamente indisponível.");
    } finally {
      clearTimeout(timer);
    }
    const gatewayText = await gatewayResult.text();
    let gatewayBody: Record<string, unknown> = {};
    try { gatewayBody = gatewayText ? JSON.parse(gatewayText) : {}; } catch { gatewayBody = {}; }

    if (gatewayResult.status === 429) {
      const retrySeconds = Math.max(1, Math.min(300, Number(gatewayResult.headers.get("retry-after") ?? 30) || 30));
      const retryAt = new Date(Date.now() + retrySeconds * 1000).toISOString();
      await patchAttempt(String(attempt.id), { status: "retry_wait", retry_after: retryAt, last_error_code: "rate_limited", last_error_message: "Mercado Pago solicitou espera antes do retry." });
      throw new HttpError(429, "gateway_rate_limited", "Aguarde alguns instantes antes de tentar novamente.", { retryAt });
    }
    if (!gatewayResult.ok) {
      const unknown = gatewayResult.status >= 500 || gatewayResult.status === 408;
      await patchAttempt(String(attempt.id), {
        status: unknown ? "unknown" : "failed",
        last_error_code: `mp_http_${gatewayResult.status}`,
        last_error_message: gatewayErrorMessage(gatewayBody),
        completed_at: unknown ? null : new Date().toISOString(),
      });
      throw new HttpError(unknown ? 502 : 422, "payment_not_created", unknown
        ? "O Mercado Pago está temporariamente indisponível."
        : "O pagamento não foi aceito. Revise os dados e tente novamente.");
    }

    const safe = { ...safeGatewayResponse(gatewayBody), method };
    const mpOrderId = optionalString(gatewayBody.id, 120);
    const mpExternalReference = optionalString(gatewayBody.external_reference, 120);
    const mpTotalCents = parseMoneyToCents(gatewayBody.total_amount);
    if (!mpOrderId || mpExternalReference !== orderId || mpTotalCents !== totalCents || gatewayBody.live_mode === true) {
      await patchAttempt(String(attempt.id), { status: "unknown", last_error_code: "gateway_response_mismatch", last_error_message: "Resposta do gateway não corresponde ao pedido." });
      throw new HttpError(502, "gateway_response_mismatch", "Não foi possível confirmar os dados retornados pelo pagamento.");
    }
    const safePayment = safe.payment && typeof safe.payment === "object" ? safe.payment as Record<string, unknown> : {};
    const gatewayStatus = optionalString(gatewayBody.status, 80) ?? "unknown";
    const gatewayStatusDetail = optionalString(gatewayBody.status_detail, 120) ?? "unknown";
    const mpPaymentId = optionalString(safePayment.id, 120);
    await patchAttempt(String(attempt.id), {
      status: gatewayStatus === "processed" && gatewayStatusDetail === "accredited" ? "processed" : "pending",
      mercado_pago_order_id: mpOrderId,
      mercado_pago_payment_id: mpPaymentId,
      gateway_status: gatewayStatus,
      gateway_status_detail: gatewayStatusDetail,
      safe_response: safe,
      completed_at: gatewayStatus === "processed" && gatewayStatusDetail === "accredited" ? new Date().toISOString() : null,
    });
    const syntheticKey = await sha256(`create-order:${mpOrderId}:${mpPaymentId ?? ""}:${gatewayStatus}:${gatewayStatusDetail}`);
    const safeHash = await sha256(JSON.stringify(safe));
    const applied = await rest<Record<string, unknown>>("rpc/apply_mercadopago_order_event", {
      method: "POST",
      body: JSON.stringify({
        p_provider_event_key: syntheticKey,
        p_request_id: "create-order",
        p_event_type: "order",
        p_action: "order.created",
        p_mp_order_id: mpOrderId,
        p_mp_payment_id: mpPaymentId,
        p_external_reference: orderId,
        p_gateway_status: gatewayStatus,
        p_gateway_status_detail: gatewayStatusDetail,
        p_total: money(totalCents),
        p_currency: "BRL",
        p_environment: environment,
        p_body_hash: safeHash,
        p_sanitized_payload: safe,
      }),
    });
    if (applied.changed_to_paid === true) triggerOrderEffects();
    return response(origin, 201, {
      ok: true,
      order: {
        ...storedOrder,
        payment_status: applied.payment_status ?? storedOrder.payment_status,
        order_status: applied.order_status ?? storedOrder.order_status,
      },
      payment: safe,
      idempotent: false,
    });
  } catch (error) {
    if (error instanceof HttpError) return response(origin, error.status, { ok: false, error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) } });
    console.error("create-order unexpected failure", error instanceof Error ? error.name : "unknown");
    return response(origin, 500, { ok: false, error: { code: "internal_error", message: "Não foi possível concluir o pedido agora." } });
  }
});
