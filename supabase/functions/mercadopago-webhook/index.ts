// Supabase Edge Function: recebe somente webhooks assinados de Orders do Mercado Pago.
// O body recebido nunca é usado como fonte financeira; a Order é consultada novamente na API.
import {
  InvalidWebhookSignatureError,
  WebhookSignatureValidator,
} from "npm:mercadopago@3.6.1";

const MP_ORDERS_URL = "https://api.mercadopago.com/v1/orders";
const ORDER_ID_PATTERN = /^LOD-(?:[0-9A-HJKMNP-TV-Z]{4}-){2}[0-9A-HJKMNP-TV-Z]{4}$/;
const MAX_BODY_BYTES = 65536;

// Temporary, observational only. Absolute window: never renewed by a cold start.
const SIGNATURE_DIAGNOSTIC_START = Date.parse("2026-10-07T19:52:00Z");
const SIGNATURE_DIAGNOSTIC_END = Date.parse("2026-10-08T19:52:00Z");
// Resource metadata is untrusted. Only provider-shaped IDs may enter logs.
const DIAGNOSTIC_RESOURCE_ID = /^ORD[A-Z0-9]{8,100}$/i;

async function observeTestSignature(
  request: Request, url: URL, dataId: string | null,
  signature: string | null, requestId: string | null, secret: string, environment: string,
): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let stopped = false;
  const emit = (report: Record<string, unknown>) => {
    try { console.warn("lod_mp_signature_test_v1", JSON.stringify(report)); } catch { /* logging is optional */ }
  };
  try {
    const now = Date.now();
    if (environment !== "test" || Deno.env.get("PAYMENTS_ENVIRONMENT") !== "test" || request.method !== "POST" ||
        now < SIGNATURE_DIAGNOSTIC_START || now >= SIGNATURE_DIAGNOSTIC_END) return;
    const report: Record<string, unknown> = {
      diagnostic: "lod_mp_signature_test_v1", sdk: "mercadopago@3.6.1",
      observed_at: new Date(now).toISOString(), environment: "test", metadata_authenticated: false, diagnostic_failed: false,
    };
    // Only validated platform metadata, never request-supplied identifiers.
    const execution = Deno.env.get("SB_EXECUTION_ID");
    if (execution && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(execution)) report.execution_id = execution;
    const collect = async () => {
      if (url.search.length > 4096 || (signature?.length ?? 0) > 2048 ||
          (requestId?.length ?? 0) > 200) { report.input_limit = true; return; }
      const ids = url.searchParams.getAll("data.id");
      const aliases = url.searchParams.getAll("data_id");
      report.query_id_count = ids.length;
      report.alias_id_count = aliases.length;
      report.query_ids_conflict = [...ids, ...aliases].some((id) => id !== dataId);
      report.signature_present = signature !== null;
      report.request_id_present = requestId !== null;
      report.signature_length = signature?.length ?? 0;
      report.request_id_length = requestId?.length ?? 0;
      report.request_id_trim_changes = requestId !== null && requestId !== requestId.trim();
      report.signature_sha256 = signature === null ? null : await sha256(signature);
      report.request_id_sha256 = requestId === null ? null : await sha256(requestId);
      report.query_id_source = url.searchParams.has("data.id") ? "data.id"
        : url.searchParams.has("data_id") ? "data_id" : "absent";
      report.data_id = dataId && DIAGNOSTIC_RESOURCE_ID.test(dataId.trim()) ? dataId.trim() : null;
      report.data_id_length = dataId?.length ?? 0;
      report.data_id_trim_changes = dataId !== null && dataId !== dataId.trim();
      report.signature_trim_changes = signature !== null && signature !== signature.trim();
      // A fingerprint identifies the loaded secret, but cannot prove its application.
      report.secret_sha256 = await sha256(secret);
      try {
        WebhookSignatureValidator.validate({ xSignature: signature, xRequestId: requestId, dataId, secret });
        report.sdk_valid = true;
        report.sdk_reason = "valid";
      } catch (error) {
        report.sdk_valid = false;
        const reasons = ["MissingSignatureHeader", "MalformedSignatureHeader", "MissingTimestamp",
          "MissingHash", "SignatureMismatch", "TimestampOutOfTolerance"];
        report.sdk_reason = error instanceof InvalidWebhookSignatureError && reasons.includes(error.reason)
          ? error.reason : "UnexpectedValidatorError";
      }
      // SDK 3.6.1 parsing: last nonempty ts/v1 wins, key names case-insensitive.
      const parts = (signature ?? "").trim().split(",").map((part) => {
        const eq = part.indexOf("=");
        return eq < 0 ? ["", ""] : [part.slice(0, eq).trim().toLowerCase(), part.slice(eq + 1).trim()];
      });
      const populated = parts.filter(([key, value]) => key && value);
      const ts = populated.filter(([key]) => key === "ts").at(-1)?.[1] ?? "";
      const v1 = populated.filter(([key]) => key === "v1").at(-1)?.[1] ?? "";
      report.ts_count = parts.filter(([key]) => key === "ts").length;
      report.v1_count = parts.filter(([key]) => key === "v1").length;
      report.ts_numeric = /^\d+$/.test(ts);
      report.v1_hex64 = /^[0-9a-f]{64}$/i.test(v1);
      report.v1_uppercase = v1 !== v1.toLowerCase();
      report.ts = /^\d{1,16}$/.test(ts) ? ts : null;
      report.v1_length = v1.length;
      report.v1_sha256 = v1 ? await sha256(v1) : null;
      const comparable = Boolean(report.ts_numeric && report.v1_hex64);
      const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const compare = async (id: string, rid: string, official = false): Promise<boolean | null> => {
        if (!comparable || stopped) return null;
        const manifest = `${id ? `id:${id};` : ""}${rid ? `request-id:${rid};` : ""}ts:${ts};`;
        const hash = [...new Uint8Array(await crypto.subtle.sign("HMAC", key,
          new TextEncoder().encode(manifest)))].map((byte) => byte.toString(16).padStart(2, "0")).join("");
        if (official) {
          // Never log v1, a raw HMAC or the full request-id/manifest: combined
          // with ts they would recreate authentication material.
          report.manifest_sha256 = await sha256(manifest);
          report.hmac_sha256 = await sha256(hash);
          report.matches_casefolded_hash = hash === v1.toLowerCase();
        }
        return hash === v1;
      };
      const rid = requestId ?? "";
      report.matches_sdk_manifest = await compare((dataId ?? "").trim(), rid.trim(), true);
      report.matches_lowercase_id = await compare((dataId ?? "").trim().toLowerCase(), rid.trim());
      report.matches_raw_request_id = await compare((dataId ?? "").trim(), rid);
      report.matches_lowercase_raw_request_id = await compare((dataId ?? "").trim().toLowerCase(), rid);
      report.matches_raw_id = await compare(dataId ?? "", rid.trim());
      report.matches_raw_id_and_request_id = await compare(dataId ?? "", rid);
      // Include every conflicting query ID; log only whether any alternative matched.
      report.alternative_query_id_checked = false;
      report.matches_alternative_query_id = false;
      for (const id of new Set([...ids, ...aliases])) {
        if (stopped) return;
        if (id === dataId) continue;
        report.alternative_query_id_checked = true;
        if (await compare(id.trim(), rid.trim())) report.matches_alternative_query_id = true;
      }
      if (stopped) return;
      // Read only a clone. The original request remains available to the normal handler.
      reader = request.clone().body?.getReader();
      report.body_state = "absent";
      if (!reader) return;
      const chunks: Uint8Array[] = [];
      let total = 0;
      while (!stopped) {
        const part = await reader.read();
        if (stopped) return;
        if (part.done) break;
        total += part.value.byteLength;
        if (total > MAX_BODY_BYTES) { report.body_state = "too_large"; return; }
        chunks.push(part.value);
      }
      const bytes = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      let body;
      try { body = JSON.parse(new TextDecoder().decode(bytes)); }
      catch { report.body_state = "unreadable"; return; }
      report.body_state = "parsed";
      const bodyId = body?.data?.id;
      report.body_id_present = typeof bodyId === "string";
      report.body_id_matches_query = typeof bodyId === "string" && bodyId === dataId;
      report.body_test_mode = body?.live_mode === false;
      const application = body?.application_id;
      report.application_id = typeof application === "string" && /^\d{1,20}$/.test(application)
        ? application : typeof application === "number" && Number.isSafeInteger(application) && application > 0
          ? String(application) : null;
      report.live_mode = typeof body?.live_mode === "boolean" ? body.live_mode : null;
      report.action = typeof body?.action === "string" && /^order\.[a-z_]{1,60}$/.test(body.action) ? body.action : null;
      report.resource_id = typeof bodyId === "string" && DIAGNOSTIC_RESOURCE_ID.test(bodyId) ? bodyId : null;
      // Even when SDK passes, body/application metadata is not bound by its HMAC.
      if (typeof bodyId === "string" && bodyId.length <= 200 && bodyId !== dataId) {
        report.matches_body_id = await compare(bodyId.trim(), rid.trim());
        report.matches_body_lowercase_id = await compare(bodyId.trim().toLowerCase(), rid.trim());
        report.matches_body_raw_request_id = await compare(bodyId.trim(), rid);
      }
    };
    const outcome = await Promise.race([
      collect().then(() => "complete", () => "failed"),
      new Promise<string>((resolve) => { timer = setTimeout(() => resolve("timeout"), 250); }),
    ]);
    stopped = true;
    report.diagnostic_failed = outcome === "failed";
    report.timed_out = outcome === "timeout";
    // Partial results are explicit; absence of a comparison never means false.
    emit(report);
  } catch {
    // No exception details: they may contain request data or cryptographic inputs.
    emit({ diagnostic: "lod_mp_signature_test_v1", diagnostic_failed: true });
  } finally {
    stopped = true;
    clearTimeout(timer);
    // Never await cancellation of a tee branch: that may wait for the original body.
    try { void reader?.cancel().catch(() => {}); } catch { /* observational only */ }
  }
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
  if (typeof value !== "string") return null
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
  // Orders API may return country_code instead of a currency field (including
  // the official Brazilian Pix sandbox response). Never override an explicit
  // foreign currency or infer BRL for another country.
  const explicitCurrency = optionalString(order.currency_id ?? order.currency, 3)?.toUpperCase();
  const currency = explicitCurrency ?? (order.country_code === "BRA" ? "BRL" : null);
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
    // Observer returns no authorization result. Original validation below is unchanged.
    await observeTestSignature(request, url, dataId, signature, requestId, secret, environment);
    if (!signature || !requestId || !dataId) {
      console.warn("mercadopago-webhook signature rejected", "MissingSignatureInputs");
      throw new HttpError(401, "invalid_signature", "Assinatura ausente.");
    }

    try {
      WebhookSignatureValidator.validate({
        xSignature: signature,
        xRequestId: requestId,
        // Orders API: pass the original query ID to the official SDK.
        // Changing its case changes the signed HMAC manifest.
        dataId,
        secret,
      });
    } catch (error) {
      if (error instanceof InvalidWebhookSignatureError) {
        console.warn("mercadopago-webhook signature rejected", error.reason);
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
