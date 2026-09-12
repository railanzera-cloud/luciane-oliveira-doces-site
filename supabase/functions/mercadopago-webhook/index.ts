// Supabase Edge Function: recebe somente webhooks assinados de Orders do Mercado Pago.
// O body recebido nunca é usado como fonte financeira; a Order é consultada novamente na API.
import {
  InvalidWebhookSignatureError,
  WebhookSignatureValidator,
} from "npm:mercadopago@3.6.1";

const MP_ORDERS_URL = "https://api.mercadopago.com/v1/orders";
const ORDER_ID_PATTERN = /^LOD-(?:[0-9A-HJKMNP-TV-Z]{4}-){2}[0-9A-HJKMNP-TV-Z]{4}$/;
const MAX_BODY_BYTES = 65536;

class HttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function json(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function optionalString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.normalize("NFC")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

function parseMoney(value: unknown): string | null {
  const candidate = typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(2)
    : typeof value === "string" && /^\d+(?:\.\d{1,2})?$/.test(value)
      ? Number(value).toFixed(2)
      : null;
  return candidate && Number(candidate) > 0 ? candidate : null;
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
      // The legacy secret below remains supported during the key transition.
    }
  }
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!legacy) throw new HttpError(503, "backend_not_configured", "Backend ainda não configurado.");
  return legacy;
}

function getSupabaseUrl(): string {
  const value = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
  if (!value) throw new HttpError(503, "backend_not_configured", "Backend ainda não configurado.");
  return value;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function readBody(request: Request): Promise<{ raw: string; parsed: Record<string, unknown> }> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) throw new HttpError(413, "payload_too_large", "Notificação muito grande.");
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    throw new HttpError(413, "payload_too_large", "Notificação muito grande.");
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid body");
    return { raw, parsed: parsed as Record<string, unknown> };
  } catch {
    throw new HttpError(400, "invalid_json", "Notificação inválida.");
  }
}

async function fetchAuthoritativeOrder(orderId: string, accessToken: string): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const result = await fetch(`${MP_ORDERS_URL}/${encodeURIComponent(orderId)}`, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!result.ok) throw new HttpError(502, "gateway_lookup_failed", "Não foi possível consultar a Order.");
    const body = await result.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new HttpError(502, "gateway_invalid_response", "Resposta inválida da Order.");
    }
    return body as Record<string, unknown>;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new HttpError(504, "gateway_timeout", "A consulta da Order excedeu o tempo esperado.");
    }
    throw new HttpError(502, "gateway_lookup_failed", "Não foi possível consultar a Order.");
  } finally {
    clearTimeout(timer);
  }
}

function safeOrderSnapshot(order: Record<string, unknown>): {
  payload: Record<string, unknown>;
  externalReference: string;
  gatewayStatus: string;
  gatewayStatusDetail: string;
  total: string;
  currency: string;
  paymentId: string | null;
} {
  const orderId = optionalString(order.id, 120);
  const externalReference = optionalString(order.external_reference, 80);
  const gatewayStatus = optionalString(order.status, 80);
  const gatewayStatusDetail = optionalString(order.status_detail, 120);
  const total = parseMoney(order.total_amount);
  const currency = optionalString(order.currency_id ?? order.currency, 3)?.toUpperCase() ?? null;
  const transactions = order.transactions && typeof order.transactions === "object"
    ? order.transactions as Record<string, unknown>
    : {};
  const payments = Array.isArray(transactions.payments) ? transactions.payments : [];
  const payment = payments[0] && typeof payments[0] === "object"
    ? payments[0] as Record<string, unknown>
    : {};
  const paymentId = optionalString(payment.id, 120);
  const liveMode = typeof order.live_mode === "boolean" ? order.live_mode : null;

  if (!orderId || !externalReference || !ORDER_ID_PATTERN.test(externalReference)
    || !gatewayStatus || !gatewayStatusDetail || !total || currency !== "BRL" || liveMode === true) {
    throw new HttpError(422, "gateway_order_mismatch", "A Order não corresponde a um pedido válido da loja.");
  }

  return {
    externalReference,
    gatewayStatus,
    gatewayStatusDetail,
    total,
    currency,
    paymentId,
    payload: {
      id: orderId,
      external_reference: externalReference,
      status: gatewayStatus,
      status_detail: gatewayStatusDetail,
      total_amount: total,
      currency_id: currency,
      live_mode: liveMode,
      version: typeof order.version === "number" ? order.version : null,
      payment: {
        id: paymentId,
        status: optionalString(payment.status, 80),
        status_detail: optionalString(payment.status_detail, 120),
      },
    },
  };
}

async function applyEvent(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const key = getSupabaseSecretKey();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const result = await fetch(`${getSupabaseUrl()}/rest/v1/rpc/apply_mercadopago_order_event`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!result.ok) throw new HttpError(502, "database_error", "Não foi possível registrar a notificação.");
    const body = await result.json();
    return body && typeof body === "object" && !Array.isArray(body)
      ? body as Record<string, unknown>
      : {};
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new HttpError(504, "database_timeout", "O registro da notificação excedeu o tempo esperado.");
    }
    throw new HttpError(502, "database_error", "Não foi possível registrar a notificação.");
  } finally {
    clearTimeout(timer);
  }
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

Deno.serve(async (request: Request) => {
  try {
    const environment = Deno.env.get("PAYMENTS_ENVIRONMENT") ?? "test";
    const secretConfigured = Boolean(Deno.env.get("MP_WEBHOOK_SECRET_TEST"));
    const tokenConfigured = Boolean(Deno.env.get("MP_ACCESS_TOKEN_TEST"));

    if (request.method === "GET") {
      return json(200, {
        ok: true,
        service: "mercadopago-webhook",
        environment,
        ready: environment === "test" && secretConfigured && tokenConfigured,
        signature_secret_configured: secretConfigured,
        access_token_configured: tokenConfigured,
      });
    }
    if (request.method !== "POST") throw new HttpError(405, "method_not_allowed", "Método não permitido.");
    if (environment !== "test") throw new HttpError(503, "production_not_enabled", "Webhook disponível somente em teste nesta fase.");

    const signature = request.headers.get("x-signature");
    const requestId = request.headers.get("x-request-id");
    const url = new URL(request.url);
    const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("data_id");
    const secret = Deno.env.get("MP_WEBHOOK_SECRET_TEST");
    const accessToken = Deno.env.get("MP_ACCESS_TOKEN_TEST");
    if (!secret || !accessToken) throw new HttpError(503, "mercado_pago_not_configured", "Webhook de teste ainda não configurado.");
    if (!signature || !requestId || !dataId) throw new HttpError(401, "invalid_signature", "Assinatura ausente.");

    try {
      WebhookSignatureValidator.validate({
        xSignature: signature,
        xRequestId: requestId,
        dataId,
        secret,
      });
    } catch (error) {
      if (error instanceof InvalidWebhookSignatureError) {
        throw new HttpError(401, "invalid_signature", "Assinatura inválida.");
      }
      throw error;
    }

    const { raw, parsed } = await readBody(request);
    const eventType = optionalString(parsed.type, 80) ?? url.searchParams.get("type") ?? "order";
    if (eventType !== "order") throw new HttpError(422, "unsupported_event", "Somente eventos de Order são aceitos.");
    const action = optionalString(parsed.action, 120) ?? "order.updated";
    const order = await fetchAuthoritativeOrder(dataId, accessToken);
    if (optionalString(order.id, 120) !== dataId) {
      throw new HttpError(422, "gateway_order_mismatch", "A Order consultada não corresponde à notificação.");
    }
    const safe = safeOrderSnapshot(order);
    const bodyHash = await sha256(raw);
    const providerEventKey = await sha256([
      "mercado_pago",
      dataId,
      action,
      optionalString(order.version, 40) ?? "",
      safe.gatewayStatus,
      safe.gatewayStatusDetail,
      safe.paymentId ?? "",
    ].join(":"));
    const applied = await applyEvent({
      p_provider_event_key: providerEventKey,
      p_request_id: requestId.slice(0, 200),
      p_event_type: eventType,
      p_action: action,
      p_mp_order_id: dataId,
      p_mp_payment_id: safe.paymentId,
      p_external_reference: safe.externalReference,
      p_gateway_status: safe.gatewayStatus,
      p_gateway_status_detail: safe.gatewayStatusDetail,
      p_total: safe.total,
      p_currency: safe.currency,
      p_environment: environment,
      p_body_hash: bodyHash,
      p_sanitized_payload: safe.payload,
    });
    if (applied.changed_to_paid === true) triggerOrderEffects();

    return json(200, { ok: true, received: true, duplicate: applied.duplicate === true });
  } catch (error) {
    if (error instanceof HttpError) return json(error.status, { ok: false, error: { code: error.code, message: error.message } });
    console.error("mercadopago-webhook unexpected failure", error instanceof Error ? error.name : "unknown");
    return json(500, { ok: false, error: { code: "internal_error", message: "Não foi possível processar a notificação." } });
  }
});
