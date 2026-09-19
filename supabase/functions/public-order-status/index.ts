// Public, PII-free order tracking. The database remains private; only a
// high-entropy tracking token can retrieve this deliberately small snapshot.
const DEFAULT_ALLOWED_ORIGINS = [
  "https://lucianeoliveiradoces.pages.dev",
  "https://luciane-oliveira-doces.railanzera.chatgpt.site",
];

class HttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function allowedOrigins(): Set<string> {
  const configured = Deno.env.get("CHECKOUT_ALLOWED_ORIGINS")
    ?.split(",").map((value) => value.trim()).filter(Boolean);
  const origins = new Set(configured?.length ? configured : DEFAULT_ALLOWED_ORIGINS);
  // Exact supervised preview only, while payments remain in test and the
  // public checkout is closed. This grants no access without a tracking token.
  if (Deno.env.get("PAYMENTS_ENVIRONMENT") === "test"
    && Deno.env.get("SITE_ORDERING_ENABLED") !== "true") {
    origins.add("http://terminal.local:4173");
  }
  return origins;
}

function headers(origin: string | null): HeadersInit {
  const result: Record<string, string> = {
    "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    Vary: "Origin",
  };
  if (origin && allowedOrigins().has(origin)) result["Access-Control-Allow-Origin"] = origin;
  return result;
}

function json(origin: string | null, status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: headers(origin) });
}

function publicSnapshot(order: Record<string, unknown>): Record<string, unknown> {
  // Explicit projection at the HTTP boundary as well as in SQL. Future RPC
  // columns must not accidentally expose customer data or campaign identifiers.
  const fields = ["order_number", "payment_method", "payment_status", "order_status",
    "fulfillment_type", "total", "currency", "created_at", "updated_at", "paid_at"];
  const result = Object.fromEntries(fields.filter((key) => key in order).map((key) => [key, order[key]]));
  if (order.payment_method === "mercado_pago_pix" && order.payment_status === "pending") {
    const source = order.payment && typeof order.payment === "object" ? order.payment as Record<string, unknown> : {};
    const payment = source.payment && typeof source.payment === "object" ? source.payment as Record<string, unknown> : {};
    result.payment = { payment: Object.fromEntries(["qr_code", "qr_code_base64", "expires_at", "ticket_url"]
      .filter((key) => typeof payment[key] === "string").map((key) => [key, payment[key]])) };
  }
  return result;
}

function getSupabaseSecretKey(): string {
  const current = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (current) {
    try {
      const keys = Object.values(JSON.parse(current) as Record<string, string>);
      const key = keys.find(Boolean);
      if (key) return key;
    } catch {
      // Legacy secret fallback below.
    }
  }
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!legacy) throw new HttpError(503, "backend_not_configured", "Acompanhamento temporariamente indisponível.");
  return legacy;
}

function getSupabaseUrl(): string {
  const value = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
  if (!value) throw new HttpError(503, "backend_not_configured", "Acompanhamento temporariamente indisponível.");
  return value;
}

async function validatePublishableKey(request: Request): Promise<void> {
  const supplied = request.headers.get("apikey");
  const configured = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (!supplied || !configured) throw new HttpError(401, "invalid_client", "Cliente não autorizado.");
  try {
    if (!Object.values(JSON.parse(configured) as Record<string, string>).includes(supplied)) {
      throw new HttpError(401, "invalid_client", "Cliente não autorizado.");
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(503, "backend_not_configured", "Acompanhamento temporariamente indisponível.");
  }
}

async function lookup(token: string): Promise<Record<string, unknown> | null> {
  const key = getSupabaseSecretKey();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(`${getSupabaseUrl()}/rest/v1/rpc/get_public_order_status`, {
      method: "POST",
      signal: controller.signal,
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_tracking_token: token }),
    });
    if (!response.ok) throw new HttpError(502, "database_error", "Não foi possível consultar o pedido.");
    const body = await response.json();
    return body && typeof body === "object" && !Array.isArray(body)
      ? body as Record<string, unknown>
      : null;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new HttpError(504, "database_timeout", "A consulta demorou mais que o esperado.");
    }
    throw new HttpError(502, "database_error", "Não foi possível consultar o pedido.");
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin");
  try {
    if (origin && !allowedOrigins().has(origin)) throw new HttpError(403, "origin_not_allowed", "Origem não autorizada.");
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(origin) });
    if (request.method !== "POST") throw new HttpError(405, "method_not_allowed", "Método não permitido.");
    await validatePublishableKey(request);
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const token = typeof body?.tracking_token === "string" ? body.tracking_token.trim().toLowerCase() : "";
    if (!/^[0-9a-f]{48}$/.test(token)) throw new HttpError(404, "order_not_found", "Pedido não encontrado.");
    const order = await lookup(token);
    if (!order) throw new HttpError(404, "order_not_found", "Pedido não encontrado.");
    return json(origin, 200, { ok: true, order: publicSnapshot(order) });
  } catch (error) {
    if (error instanceof HttpError) return json(origin, error.status, { ok: false, error: { code: error.code, message: error.message } });
    console.error("public-order-status unexpected failure", error instanceof Error ? error.name : "unknown");
    return json(origin, 500, { ok: false, error: { code: "internal_error", message: "Não foi possível consultar o pedido." } });
  }
});
