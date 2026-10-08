// Internal, test-only reconciliation. Never callable using the public publishable key.
// A verification of payment truth, not a replacement for signed webhooks.
const MP_URL = "https://api.mercadopago.com/v1/orders";
const ORDER_PATTERN = /^LOD-(?:[0-9A-HJKMNP-TV-Z]{4}-){2}[0-9A-HJKMNP-TV-Z]{4}$/;
const MP_ORDER_PATTERN = /^ORDTST[A-Z0-9]{10,90}$/;
const encoder = new TextEncoder();
type Obj = Record<string, unknown>;
class Err extends Error {
  constructor(public status: number, public code: string, public failedChecks: string[] = [], public upstreamStatus: number | null = null) { super(code); }
}
const response = (status: number, body: Obj) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
});
const field = (o: Obj, k: string) => typeof o[k] === "string" ? o[k] as string : "";
const obj = (v: unknown): Obj => v && typeof v === "object" && !Array.isArray(v) ? v as Obj : {};
const cents = (v: unknown): number | null => {
  if ((typeof v !== "number" || !Number.isFinite(v)) && (typeof v !== "string" || !/^\d+(?:\.\d{1,2})?$/.test(v))) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 && Math.round(n * 100) / 100 === n ? Math.round(n * 100) : null;
};
function secret(): string {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    try {
      const keys = JSON.parse(raw) as Record<string, string>;
      const key = keys.default || Object.values(keys).find(Boolean);
      if (key) return key;
    } catch { /* legacy transition */ }
  }
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!legacy) throw new Err(503, "backend_unconfigured");
  return legacy;
}
function supabase(): string {
  const url = Deno.env.get("SUPABASE_URL");
  if (!url) throw new Err(503, "backend_unconfigured");
  return url.replace(/\/$/, "");
}
async function call(url: string, init: RequestInit, ms = 10000): Promise<Response> {
  const c = new AbortController();
  const timeout = setTimeout(() => c.abort(), ms);
  try { return await fetch(url, { ...init, signal: c.signal }); }
  catch { throw new Err(502, "upstream_unavailable"); }
  finally { clearTimeout(timeout); }
}
async function db(path: string, init: RequestInit = {}): Promise<unknown> {
  const key = secret();
  const res = await call(`${supabase()}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (!res.ok) throw new Err(502, "database_error");
  return await res.json();
}
async function hash(value: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
  return [...bytes].map(x => x.toString(16).padStart(2, "0")).join("");
}
function authorize(req: Request): void {
  if (Deno.env.get("PAYMENTS_ENVIRONMENT") !== "test") throw new Err(503, "test_only");
  if (req.headers.get("x-lod-test") !== "1" || req.headers.get("apikey") !== secret()) {
    throw new Err(401, "unauthorized");
  }
}
async function effects(): Promise<void> {
  const key = secret();
  const promise = call(`${supabase()}/functions/v1/process-order-effects`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: "{}",
  }).then(res => { if (!res.ok) console.error("reconcile_effects_http", res.status); })
    .catch(() => console.error("reconcile_effects_unavailable"));
  const runtime = (globalThis as unknown as { EdgeRuntime?: { waitUntil: (p: Promise<unknown>) => void } }).EdgeRuntime;
  if (runtime?.waitUntil) runtime.waitUntil(promise);
  else await promise;
}
Deno.serve(async req => {
  try {
    if (req.method !== "POST") throw new Err(405, "method_not_allowed");
    authorize(req);
    if (Number(req.headers.get("content-length") || 0) > 2048) throw new Err(413, "body_too_large");
    const raw = await req.text();
    if (encoder.encode(raw).length > 2048) throw new Err(413, "body_too_large");
    const input = obj(JSON.parse(raw));
    const orderId = field(input, "order_id");
    if (!ORDER_PATTERN.test(orderId)) throw new Err(400, "invalid_order_id");
    const apply = input.apply === true;
    if (apply && Deno.env.get("LOD_RECONCILIATION_APPLY_ENABLED") !== "true") {
      throw new Err(403, "apply_disabled");
    }
    if (apply && req.headers.get("x-lod-apply-order") !== orderId) throw new Err(403, "apply_order_confirmation_missing");
    const orders = await db(`orders?select=id,order_id,total,currency,sales_channel,payment_method,payment_status,gateway_environment&order_id=eq.${encodeURIComponent(orderId)}&limit=1`) as Obj[];
    if (orders.length !== 1) throw new Err(404, "order_not_found");
    const order = orders[0];
    if (order.sales_channel !== "site" || !["mercado_pago_pix", "mercado_pago_card"].includes(field(order, "payment_method")) ||
      order.gateway_environment !== "test" || field(order, "currency") !== "BRL") throw new Err(422, "order_scope_mismatch");
    const attempts = await db(`payment_attempts?select=id,attempt_number,method,mercado_pago_order_id,status&order_uuid=eq.${encodeURIComponent(field(order, "id"))}&order=attempt_number.desc&limit=1`) as Obj[];
    if (attempts.length !== 1 || !MP_ORDER_PATTERN.test(field(attempts[0], "mercado_pago_order_id"))) {
      throw new Err(422, "attempt_missing");
    }
    if (attempts[0].method !== order.payment_method) throw new Err(422, "attempt_method_mismatch");
    const mpId = field(attempts[0], "mercado_pago_order_id");
    const accessToken = Deno.env.get("MP_ACCESS_TOKEN_TEST");
    if (!accessToken) throw new Err(503, "gateway_unconfigured");
    const provider = await call(`${MP_URL}/${encodeURIComponent(mpId)}`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    });
    // Report only the HTTP status, never the provider error body, tokens or headers.
    if (!provider.ok) throw new Err(502, "gateway_lookup_failed", [], provider.status);
    const remote = obj(await provider.json());
    const country = field(remote, "country_code");
    const currency = (field(remote, "currency_id") || field(remote, "currency") || (country === "BRA" ? "BRL" : "")).toUpperCase();
    const status = field(remote, "status");
    const detail = field(remote, "status_detail");
    const amount = cents(remote.total_amount);
    // Report only the names of failed checks, never provider values or credentials.
    // Preserve all existing fail-closed validations in both dry-run and apply.
    const failedChecks = [
      field(remote, "id") !== mpId ? "order_id" : null,
      field(remote, "external_reference") !== orderId ? "external_reference" : null,
      // GET /v1/orders can omit live_mode. An explicit true or nonboolean value is still rejected.
      remote.live_mode !== false && remote.live_mode !== undefined ? "live_mode" : null,
      currency !== "BRL" ? "currency" : null,
      amount === null || amount !== cents(order.total) ? "amount" : null,
      !status ? "status" : null,
      !detail ? "status_detail" : null,
    ].filter((name): name is string => name !== null);
    if (failedChecks.length) throw new Err(422, "gateway_order_mismatch", failedChecks);
    if (apply && !["processed", "action_required", "pending", "processing", "canceled", "cancelled", "expired", "failed", "refused", "refunded", "charged_back", "chargeback"].includes(status.toLowerCase())) {
      throw new Err(422, "unsupported_gateway_status");
    }
    const payments = obj(remote.transactions).payments;
    const payment = Array.isArray(payments) ? obj(payments[0]) : {};
    const payId = field(payment, "id") || null;
    const version = typeof remote.version === "number" ? remote.version : null;
    const normalized = {
      id: mpId, external_reference: orderId, status, status_detail: detail,
      total_amount: (amount / 100).toFixed(2), currency_id: currency,
      live_mode: remote.live_mode === false ? false : null, version,
      payment: { id: payId, status: field(payment, "status") || null, status_detail: field(payment, "status_detail") || null },
    };
    if (!apply) return response(200, {
      ok: true, dry_run: true, order_id: orderId, attempt_number: attempts[0].attempt_number,
      local_payment_status: order.payment_status, gateway_status: status, gateway_status_detail: detail,
      changes_applied: false,
    });
    const eventKey = await hash(["mercado_pago_reconcile", mpId, version ?? "", status, detail, payId ?? ""].join(":"));
    const payload = {
      p_provider_event_key: eventKey, p_request_id: `reconcile:${eventKey.slice(0, 48)}`,
      p_event_type: "order", p_action: "order.reconciled", p_mp_order_id: mpId,
      p_mp_payment_id: payId, p_external_reference: orderId, p_gateway_status: status,
      p_gateway_status_detail: detail, p_total: normalized.total_amount, p_currency: currency,
      p_environment: "test", p_body_hash: await hash(JSON.stringify(normalized)),
      p_sanitized_payload: normalized,
    };
    const applied = obj(await db("rpc/apply_mercadopago_order_event", { method: "POST", body: JSON.stringify(payload) }));
    if (applied.changed_to_paid === true) await effects();
    return response(200, {
      ok: true, dry_run: false, order_id: orderId, duplicate: applied.duplicate === true,
      changed_to_paid: applied.changed_to_paid === true,
      payment_status: applied.payment_status ?? null, order_status: applied.order_status ?? null,
    });
  } catch (e) {
    const err = e instanceof Err ? e : new Err(400, "invalid_request");
    return response(err.status, { ok: false, error: {
      code: err.code,
      ...(err.code === "gateway_order_mismatch" ? { failed_checks: err.failedChecks } : {}),
      ...(err.code === "gateway_lookup_failed" && err.upstreamStatus !== null ? { upstream_status: err.upstreamStatus } : {}),
    } });
  }
});
