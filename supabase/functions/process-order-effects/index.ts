// Drains one Meta Purchase outbox event. Payment/order persistence never waits
// for this secondary effect; retries reuse a stable event_id for deduplication.
const DEFAULT_PIXEL_ID = "1491655855979140";
const DEFAULT_ALLOWED_ORIGINS = [
  "https://lucianeoliveiradoces.pages.dev",
  "https://luciane-oliveira-doces.railanzera.chatgpt.site",
];

function allowedOrigins(): Set<string> {
  const configured = Deno.env.get("CHECKOUT_ALLOWED_ORIGINS")
    ?.split(",").map((value) => value.trim()).filter(Boolean);
  return new Set(configured?.length ? configured : DEFAULT_ALLOWED_ORIGINS);
}

function cors(origin: string | null): HeadersInit {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
  if (origin && allowedOrigins().has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

class HttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
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
  if (!legacy) throw new HttpError(503, "backend_not_configured", "Backend não configurado.");
  return legacy;
}

function getSupabaseUrl(): string {
  const value = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
  if (!value) throw new HttpError(503, "backend_not_configured", "Backend não configurado.");
  return value;
}

async function rpc<T>(name: string, payload: Record<string, unknown>): Promise<T> {
  const key = getSupabaseSecretKey();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(`${getSupabaseUrl()}/rest/v1/rpc/${name}`, {
      method: "POST",
      signal: controller.signal,
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    if (!response.ok) throw new HttpError(502, "database_error", `RPC ${name} falhou.`);
    return (text ? JSON.parse(text) : null) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function clean(value: unknown, max = 500): string | null {
  if (typeof value !== "string") return null;
  const result = value.normalize("NFC").replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return result ? result.slice(0, max) : null;
}

function money(value: unknown): number {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || amount <= 0) throw new HttpError(422, "invalid_outbox_order", "Valor inválido no pedido.");
  return Math.round(amount * 100) / 100;
}

async function buildUserData(order: Record<string, unknown>): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {};
  const email = clean(order.customer_email, 254)?.toLowerCase();
  let phone = clean(order.customer_phone, 30)?.replace(/\D/g, "") ?? null;
  if (phone && /^\d{10,11}$/.test(phone)) phone = `55${phone}`;
  if (email) result.em = [await sha256(email)];
  if (phone) {
    result.ph = [await sha256(phone)];
    result.external_id = [await sha256(`lod:${phone}`)];
  }
  const fbp = clean(order.fbp);
  const fbc = clean(order.fbc);
  if (fbp && /^fb\.\d+\./.test(fbp)) result.fbp = fbp;
  if (fbc && /^fb\.\d+\./.test(fbc)) result.fbc = fbc;
  return result;
}

function getPublishableKey(): string | null {
  const configured = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (!configured) return null;
  try { return Object.values(JSON.parse(configured) as Record<string, string>).find(Boolean) ?? null; }
  catch { return null; }
}

async function authorize(request: Request): Promise<void> {
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const expected = getSupabaseSecretKey();
  if (supplied && supplied === expected) return;
  const publishableKey = getPublishableKey();
  if (!supplied || !publishableKey) throw new HttpError(401, "invalid_internal_token", "Não autorizado.");
  const response = await fetch(`${getSupabaseUrl()}/auth/v1/user`, {
    headers: { apikey: publishableKey, Authorization: `Bearer ${supplied}` },
    signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) throw new HttpError(401, "invalid_internal_token", "Não autorizado.");
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin");
  const json = (body: Record<string, unknown>, status = 200) =>
    Response.json(body, { status, headers: cors(origin) });
  let claimedId: string | null = null;
  const workerId = `effects-${crypto.randomUUID()}`;
  try {
    if (origin && !allowedOrigins().has(origin)) throw new HttpError(403, "origin_not_allowed", "Origem não autorizada.");
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
    if (request.method === "GET") {
      return json({ ok: true, service: "process-order-effects", configured: Boolean(
        Deno.env.get("META_CAPI_ACCESS_TOKEN") && Deno.env.get("META_GRAPH_API_VERSION"),
      ), test_events_configured: Boolean(Deno.env.get("META_CAPI_TEST_EVENT_CODE")) });
    }
    if (request.method !== "POST") throw new HttpError(405, "method_not_allowed", "Método não permitido.");
    await authorize(request);

    const accessToken = Deno.env.get("META_CAPI_ACCESS_TOKEN");
    const graphVersion = Deno.env.get("META_GRAPH_API_VERSION");
    const pixelId = Deno.env.get("META_CAPI_PIXEL_ID") ?? DEFAULT_PIXEL_ID;
    if (!accessToken || !graphVersion || !/^v\d+\.\d+$/.test(graphVersion) || !/^\d{5,30}$/.test(pixelId)) {
      throw new HttpError(503, "meta_not_configured", "Meta CAPI ainda não configurada.");
    }

    const testCode = clean(Deno.env.get("META_CAPI_TEST_EVENT_CODE"), 120);
    if ((Deno.env.get("PAYMENTS_ENVIRONMENT") ?? "test") !== "production" && !testCode) {
      throw new HttpError(503, "meta_test_code_required", "Configure o código de eventos de teste da Meta antes da homologação.");
    }
    const claimed = await rpc<Record<string, unknown> | null>("claim_event_outbox", {
      p_worker_id: workerId,
      p_event_type: "meta_purchase",
    });
    if (!claimed) return json({ ok: true, processed: false, empty: true });
    const job = claimed.job && typeof claimed.job === "object" ? claimed.job as Record<string, unknown> : {};
    const order = claimed.order && typeof claimed.order === "object" ? claimed.order as Record<string, unknown> : {};
    const items = Array.isArray(claimed.items) ? claimed.items as Array<Record<string, unknown>> : [];
    claimedId = clean(job.id, 80);
    if (!claimedId || order.sales_channel !== "site" || order.payment_status !== "paid") {
      throw new HttpError(422, "invalid_outbox_order", "Evento não corresponde a uma venda paga pelo site.");
    }
    // Older offline test orders have no gateway_environment. Fail closed: they
    // remain test orders even if production is enabled in a later deployment.
    const environment = order.gateway_environment ?? "test";
    if (environment !== "test" && environment !== "production") {
      throw new HttpError(422, "invalid_order_environment", "Ambiente do pedido inválido.");
    }
    if (environment === "test" && !testCode) {
      throw new HttpError(503, "meta_test_code_required", "Uma venda de teste não pode ser enviada à Meta como venda real.");
    }

    const eventId = clean(order.meta_purchase_event_id, 120)
      ?? clean((job.payload as Record<string, unknown> | undefined)?.event_id, 120);
    if (!eventId) throw new HttpError(422, "missing_event_id", "Evento sem identificador estável.");
    const paidAt = clean(order.paid_at, 80);
    const eventTime = paidAt ? Math.floor(Date.parse(paidAt) / 1000) : Math.floor(Date.now() / 1000);
    const sourceUrl = clean(order.event_source_url, 2048) ?? clean(order.landing_url, 2048) ?? "https://lucianeoliveiradoces.pages.dev/";
    const userData = await buildUserData(order);
    const contents = items.map((item) => ({
      id: clean(item.product_id, 120) ?? clean(item.item_key, 120) ?? "produto",
      quantity: Number(item.quantity) || 1,
      item_price: money(item.unit_price),
    }));
    const event = {
      event_name: "Purchase",
      event_time: eventTime,
      event_id: eventId,
      action_source: "website",
      event_source_url: sourceUrl,
      user_data: userData,
      custom_data: {
        currency: "BRL",
        value: money(order.total),
        order_id: clean(order.order_id, 80),
        content_type: "product",
        num_items: contents.reduce((sum, item) => sum + item.quantity, 0),
        contents,
      },
    };
    const graphBody: Record<string, unknown> = { data: [event], access_token: accessToken };
    if (environment === "test") graphBody.test_event_code = testCode;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    let graphResponse: Response;
    try {
      graphResponse = await fetch(`https://graph.facebook.com/${graphVersion}/${pixelId}/events`, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(graphBody),
      });
    } finally {
      clearTimeout(timer);
    }
    const graphText = await graphResponse.text();
    let graphResult: Record<string, unknown> = {};
    try { graphResult = graphText ? JSON.parse(graphText) : {}; } catch { graphResult = {}; }
    if (!graphResponse.ok || graphResult.events_received !== 1) {
      const safeCode = typeof (graphResult.error as Record<string, unknown> | undefined)?.code === "number"
        ? `meta_${(graphResult.error as Record<string, unknown>).code}` : `meta_http_${graphResponse.status}`;
      throw new HttpError(502, safeCode, "Meta não confirmou o recebimento do evento.");
    }

    await rpc("complete_event_outbox", { p_job_id: claimedId, p_worker_id: workerId });
    return json({ ok: true, processed: true, event_id: eventId,
      trace_id: clean(graphResult.fbtrace_id, 120) });
  } catch (error) {
    if (claimedId) {
      const safeMessage = error instanceof HttpError ? `${error.code}: ${error.message}` : "meta_request_failed";
      try { await rpc("fail_event_outbox", { p_job_id: claimedId, p_error: safeMessage, p_worker_id: workerId }); } catch { /* original failure wins */ }
    }
    if (error instanceof HttpError) {
      return json({ ok: false, error: { code: error.code, message: error.message } }, error.status);
    }
    console.error("process-order-effects unexpected failure", error instanceof Error ? error.name : "unknown");
    return json({ ok: false, error: { code: "internal_error", message: "Efeito não processado; uma nova tentativa poderá ser feita." } }, 500);
  }
});
