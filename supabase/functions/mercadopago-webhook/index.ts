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

// Candidato INATIVO. Inserido pelo preparador; não importar no checkout.
// Tempos absolutos preenchidos somente para uma janela explicitamente autorizada.
const SIGNATURE_1002_START = "2026-09-26T18:10:00Z";
const SIGNATURE_1002_END = "2026-09-26T19:10:00Z";
const SIGNATURE_1002_ID = "ORDTST01M2ZHGZHNSJEQ8D9Z5EF6YKDT";
const SIGNATURE_1002_APPLICATION = "7382535553656845";

async function observeSignature1002(request: Request, url: URL, dataId: string,
  signature: string | null, requestId: string | null, secret: string,
): Promise<Response> {
  const report: Record<string, unknown> = {
    diagnostic: "lod_mp_signature_1002_v2", stage: "before_financial_lookup",
    environment: "test", sdk: "mercadopago@3.6.1", effects_blocked: true,
  };
  try {
    const queryIds = url.searchParams.getAll("data.id");
    const aliasIds = url.searchParams.getAll("data_id");
    report.query_data_id_count = queryIds.length;
    report.query_data_id_alias_count = aliasIds.length;
    report.query_ambiguous = queryIds.length > 1 || aliasIds.length > 1 ||
      (queryIds.length > 0 && aliasIds.length > 0);
    report.query_values_conflict = [...queryIds, ...aliasIds].some((id) => id !== dataId);
    report.selected_id_matches = dataId === SIGNATURE_1002_ID;
    report.signature_present = signature !== null;
    report.request_id_present = requestId !== null;
    report.signature_length = signature?.length ?? 0;
    report.request_id_length = requestId?.length ?? 0;
    const withinLimits = (signature?.length ?? 0) <= 2048 && (requestId?.length ?? 0) <= 200;
    report.headers_within_limits = withinLimits;
    report.sdk_valid = null;
    report.sdk_reason = withinLimits ? "not_run" : "DiagnosticHeaderLimit";
    report.runtime_secret_matches_compared_digest = (await sha256(secret)) ===
      "e922f1fee5c9017f750266955ee129be10b171a5cfb9dcaded6e6efc7ffc15a2";
    if (withinLimits) {
      report.signature_sha256 = signature === null ? null : await sha256(signature);
      report.request_id_sha256 = requestId === null ? null : await sha256(requestId);
      report.signature_trimmed = signature !== null && signature !== signature.trim();
      report.request_id_trimmed = requestId !== null && requestId !== requestId.trim();
      report.request_id_is_uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(requestId?.trim() ?? "");
      report.normal_flow_missing_inputs = !signature || !requestId || !dataId;
      try {
        WebhookSignatureValidator.validate({ xSignature: signature, xRequestId: requestId, dataId, secret });
        report.sdk_valid = true;
        report.sdk_reason = "valid";
      } catch (error) {
        const reasons = ["MissingSignatureHeader", "MalformedSignatureHeader", "MissingTimestamp",
          "MissingHash", "SignatureMismatch", "TimestampOutOfTolerance"];
        report.sdk_valid = false;
        report.sdk_reason = error instanceof InvalidWebhookSignatureError && reasons.includes(error.reason)
          ? error.reason : "UnexpectedValidatorError";
      }
      // Mesmo parsing do SDK 3.6.1; variantes abaixo são observações, nunca autorização.
      const parts = (signature ?? "").trim().split(",").map((part) => {
        const eq = part.indexOf("=");
        return eq < 0 ? ["", ""] : [part.slice(0, eq).trim().toLowerCase(), part.slice(eq + 1).trim()];
      });
      const populated = parts.filter(([name, value]) => name && value);
      const ts = populated.filter(([name]) => name === "ts").at(-1)?.[1] ?? "";
      const v1 = populated.filter(([name]) => name === "v1").at(-1)?.[1] ?? "";
      report.ts_count = parts.filter(([name]) => name === "ts").length;
      report.v1_count = parts.filter(([name]) => name === "v1").length;
      report.ts_numeric = /^\d+$/.test(ts);
      report.ts_length = ts.length;
      report.v1_length = v1.length;
      report.v1_is_hex64 = /^[0-9a-f]{64}$/i.test(v1);
      report.v1_has_uppercase = report.v1_is_hex64 === true && v1 !== v1.toLowerCase();
      const manifest = (id: string) => `id:${id.trim()};${requestId?.trim() ? `request-id:${requestId.trim()};` : ""}ts:${ts};`;
      report.manifest_sha256 = await sha256(manifest(dataId));
      const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const hmac = async (text: string) => [...new Uint8Array(
        await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text)),
      )].map((byte) => byte.toString(16).padStart(2, "0")).join("");
      const exact = await hmac(manifest(dataId));
      const lower = await hmac(manifest(dataId.toLowerCase()));
      report.matches_exact_manifest = exact === v1;
      report.matches_lowercase_id = lower === v1;
      report.matches_casefolded_hash = report.v1_is_hex64 === true && exact === v1.toLowerCase();
      report.matches_lowercase_id_casefolded_hash = report.v1_is_hex64 === true && lower === v1.toLowerCase();
    }
    // Body não autenticado: só comparações, nunca fonte financeira ou autorização.
    report.body_state = "absent";
    report.application_id_present = null;
    report.application_id_valid_structure = null;
    report.application_matches = null;
    report.body_id_matches = null;
    report.live_mode = null;
    const reader = request.body?.getReader();
    if (reader) {
      let total = 0;
      let timedOut = false;
      const timer = setTimeout(() => { timedOut = true; void reader.cancel().catch(() => {}); }, 2000);
      try {
        const chunks: Uint8Array[] = [];
        while (true) {
          const part = await reader.read();
          if (timedOut) { report.body_state = "timeout"; break; }
          if (part.done) break;
          total += part.value.byteLength;
          if (total > MAX_BODY_BYTES) {
            report.body_state = "too_large";
            void reader.cancel().catch(() => {});
            break;
          }
          chunks.push(part.value);
        }
        if (report.body_state === "absent") {
          const bytes = new Uint8Array(total);
          let offset = 0;
          for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
          const body = JSON.parse(new TextDecoder().decode(bytes));
          if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid");
          report.body_state = "parsed";
          const app = body.application_id;
          const appValid = (typeof app === "string" && /^\d{1,20}$/.test(app)) ||
            (typeof app === "number" && Number.isSafeInteger(app) && app > 0);
          report.application_id_present = Object.prototype.hasOwnProperty.call(body, "application_id");
          report.application_id_valid_structure = appValid;
          report.application_matches = appValid ? String(app) === SIGNATURE_1002_APPLICATION : null;
          report.body_id_matches = typeof body.data?.id === "string" ? body.data.id === dataId : null;
          report.live_mode = typeof body.live_mode === "boolean" ? body.live_mode : null;
        }
      } catch {
        report.body_state = timedOut ? "timeout" : "unreadable";
      } finally { clearTimeout(timer); reader.releaseLock(); }
    }
  } catch {
    report.diagnostic_failed = true;
  }
  console.warn("lod_mp_signature_1002_v2", JSON.stringify(report));
  // 409 proposital, mesmo com assinatura válida: NÃO equivale a rejeição HMAC.
  return json(409, { ok: false, diagnostic: "lod_mp_signature_1002_v2",
    stage: "before_financial_lookup", effects_blocked: true });
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
    // Observação restrita, sem qualquer efeito financeiro, inclusive se SDK válido.
    if (dataId === SIGNATURE_1002_ID && Date.now() >= Date.parse(SIGNATURE_1002_START) &&
        Date.now() < Date.parse(SIGNATURE_1002_END)) {
      return await observeSignature1002(request, url, dataId, signature, requestId, secret);
    }
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
        // DIAGNOSTICO TEMPORARIO: somente observa; nunca autoriza a notificacao.
        if (error.reason === "SignatureMismatch" && environment === "test" &&
            dataId === "ORDTST01M2ZHGZHNSJEQ8D9Z5EF6YKDT" &&
            Date.now() < Date.parse("2026-09-23T07:49:00Z")) {
          try {
            if (signature.length <= 2048 && requestId.length <= 200) {
              // Mesmo parsing do SDK 3.6.1: ultimo ts/v1 nao vazio prevalece.
              const parts = signature.trim().split(",").map((part) => {
                const eq = part.indexOf("=");
                return eq < 0 ? ["", ""] : [
                  part.slice(0, eq).trim().toLowerCase(), part.slice(eq + 1).trim(),
                ];
              }).filter(([key, value]) => key && value);
              const ts = parts.filter(([key]) => key === "ts").at(-1)?.[1] ?? "";
              const v1 = parts.filter(([key]) => key === "v1").at(-1)?.[1] ?? "";
              const normalizedRequestId = requestId.trim();
              const requestIdIsUuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(normalizedRequestId);
              const safeTimestamp = /^\d{1,16}$/.test(ts);
              const v1IsHex = /^[0-9a-f]{64}$/i.test(v1);
              const buildManifest = (id: string) => `id:${id.trim()};${normalizedRequestId ? `request-id:${normalizedRequestId};` : ""}ts:${ts};`;
              const manifest = buildManifest(dataId);
              const key = await crypto.subtle.importKey(
                "raw", new TextEncoder().encode(secret),
                { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
              );
              const hmac = async (value: string) => [...new Uint8Array(
                await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)),
              )].map((byte) => byte.toString(16).padStart(2, "0")).join("");
              const computed = await hmac(manifest);
              const computedLowerId = await hmac(buildManifest(dataId.toLowerCase()));
              console.warn("lod_mp_signature_1002_v1", JSON.stringify({
                order_id: dataId,
                environment,
                sdk: "mercadopago@3.6.1",
                runtime_secret_matches_compared_digest: (await sha256(secret)) ===
                  "e922f1fee5c9017f750266955ee129be10b171a5cfb9dcaded6e6efc7ffc15a2",
                x_request_id: requestIdIsUuid ? normalizedRequestId : null,
                x_request_id_sha256: await sha256(requestId),
                x_request_id_length: requestId.length,
                x_request_id_trimmed: requestId !== normalizedRequestId,
                x_signature_sha256: await sha256(signature),
                x_signature_length: signature.length,
                x_signature_trimmed: signature !== signature.trim(),
                ts: safeTimestamp ? ts : null,
                ts_count: parts.filter(([name]) => name === "ts").length,
                v1_count: parts.filter(([name]) => name === "v1").length,
                v1_length: v1.length,
                v1_is_hex64: v1IsHex,
                v1_has_uppercase: v1IsHex && v1 !== v1.toLowerCase(),
                // Manifesto completo e HMAC ficam somente em memoria.
                manifest_sha256: await sha256(manifest),
                matches_exact_manifest: computed === v1,
                matches_lowercase_id: computedLowerId === v1,
                matches_exact_manifest_casefolded_hash: v1IsHex && computed === v1.toLowerCase(),
              }));
            }
          } catch {
            // Falha no diagnostico nao altera a resposta nem libera processamento.
            console.warn("lod_mp_signature_1002_v1", "diagnostic_failed");
          }
        }
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
