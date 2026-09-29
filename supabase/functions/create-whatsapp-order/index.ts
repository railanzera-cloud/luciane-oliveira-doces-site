// Manual WhatsApp requests only. No gateway calls, Purchase or print effects.
import { quoteCartItems, quoteFulfillment } from "../_shared/commerce-catalog.mjs";
const ORDER_ID_PATTERN = /^LOD-(?:[0-9A-HJKMNP-TV-Z]{4}-){2}[0-9A-HJKMNP-TV-Z]{4}$/;
const PAYMENT_METHODS = new Set(["manual_pix", "card_on_delivery", "cash"]);
const DEFAULT_ALLOWED_ORIGINS = ["https://lucianeoliveiradoces.pages.dev", "https://luciane-oliveira-doces.railanzera.chatgpt.site"];
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
  if (!legacy) throw new HttpError(503, "backend_not_configured", "Registro de pedidos temporariamente indisponível.");
  return legacy;
}

function getSupabaseUrl(): string {
  const value = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
  if (!value) throw new HttpError(503, "backend_not_configured", "Registro de pedidos temporariamente indisponível.");
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
    if (!result.ok) {
      if (body?.message === "orders_closed") throw new HttpError(409, "orders_closed", "Os pedidos foram encerrados por enquanto.");
      if (body?.message === "menu_changed") throw new HttpError(409, "menu_changed", "Um item ficou indisponível. Revise o carrinho.");
      if (body?.message === "order_id_payload_conflict") throw new HttpError(409, "order_conflict", "Esta solicitação já foi registrada com outros dados. Acompanhe o pedido salvo ou inicie um novo pedido.");
      throw new HttpError(502, "database_error", "Não foi possível registrar o pedido.", { databaseCode: body?.code });
    }
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
    throw new HttpError(503, "backend_not_configured", "Registro de pedidos temporariamente indisponível.");
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


Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin");
  try {
    if (origin && !allowedOrigins().has(origin)) throw new HttpError(403, "origin_not_allowed", "Origem não autorizada.");
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
    if (request.method !== "POST") throw new HttpError(405, "method_not_allowed", "Método não permitido.");
    await validatePublishableKey(request);
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 65536) throw new HttpError(413, "payload_too_large", "Pedido muito grande.");
    let input: Record<string, unknown>;
    try { input = JSON.parse(raw); } catch { throw new HttpError(400, "invalid_json", "Pedido inválido."); }
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new HttpError(400, "invalid_input", "Pedido inválido.");
    const orderId = cleanString(input.client_order_id, "o código do pedido", 80);
    if (!ORDER_ID_PATTERN.test(orderId)) throw new HttpError(400, "invalid_order_id", "Código do pedido inválido.");
    const customer = input.customer && typeof input.customer === "object" ? input.customer as Record<string, unknown> : {};
    const payment = input.payment && typeof input.payment === "object" ? input.payment as Record<string, unknown> : {};
    const method = cleanString(payment.method, "a forma de pagamento", 40);
    if (!PAYMENT_METHODS.has(method)) throw new HttpError(400, "invalid_payment_method", "Escolha uma forma de pagamento válida.");
    const customerName = cleanString(customer.name, "o nome", 100);
    const customerPhone = customer.phone ? normalizePhone(customer.phone) : null;
    const customerEmail = normalizeEmail(customer.email, false);
    if (customerName.length < 2) throw new HttpError(400, "invalid_name", "Informe seu nome (mínimo 2 caracteres).");
    const notes = optionalString(input.notes, 500);
    if (typeof input.notes === "string" && input.notes.length > 500) throw new HttpError(400, "invalid_notes", "Use até 500 caracteres nas observações.");
    const requestKey = typeof input.request_key === "string" ? input.request_key : "";
    if (!/^[0-9a-f]{64}$/.test(requestKey)) throw new HttpError(400, "invalid_request_key", "Reabra o pedido e tente novamente.");
    const { attribution: _attribution, ...identity } = input;
    const requestHash = await sha256(JSON.stringify(canonicalize(identity)));
    const recovered = await rest<Record<string, unknown> | null>("rpc/recover_whatsapp_order", {
      method: "POST", body: JSON.stringify({ p_order_id: orderId, p_request_hash: requestHash }),
    });
    if (recovered) return response(origin, 200, { ok: true, order: recovered, payment: { method, status: "pending" } });
    let quote: ReturnType<typeof quoteCartItems>;
    let fulfillment: ReturnType<typeof quoteFulfillment>;
    try {
      quote = quoteCartItems(input.items);
      fulfillment = quoteFulfillment(input.fulfillment);
    } catch (quoteError) {
      throw new HttpError(400, "invalid_order", quoteError instanceof Error ? quoteError.message : "Pedido inválido.");
    }
    await revalidateAvailability(quote.availabilityKeys);
    const expected = parseMoneyToCents(input.expected_total);
    if (expected === null || expected !== quote.subtotalCents + fulfillment.delivery_fee_cents) {
      throw new HttpError(409, "price_changed", "O preço mudou. Atualize o cardápio e confira o total antes de continuar.");
    }

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
      sales_channel: "whatsapp",
      checkout_channel: "whatsapp",
      notes,
      attribution_snapshot: attribution,
      ...fulfillment,
      subtotal: money(quote.subtotalCents),
      delivery_fee: money(fulfillment.delivery_fee_cents),
      discount: "0.00",
      total: money(totalCents),
      currency: "BRL",
      payment_method: method,
      cash_change_for: cashChangeFor,
      gateway_environment: null,
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
    const storedOrder = await rest<Record<string, unknown>>("rpc/create_whatsapp_store_order", {
      method: "POST",
      body: JSON.stringify({ p_order: { ...orderPayload, request_hash: requestHash }, p_items: databaseItems, p_availability_keys: quote.availabilityKeys }),
    });


    return response(origin, 201, { ok: true, order: storedOrder, payment: { method, status: "pending" } });
  } catch (error) {
    if (error instanceof HttpError) return response(origin, error.status, { ok: false, error: { code: error.code, message: error.message, details: error.details } });
    console.error("create-whatsapp-order failed", error instanceof Error ? error.name : "unknown");
    return response(origin, 500, { ok: false, error: { code: "internal_error", message: "Não foi possível registrar. Tente novamente sem alterar o pedido." } });
  }
});
