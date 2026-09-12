// Authenticated signing bridge for QZ Tray. The private key never reaches the
// browser; without the optional QZ secrets the rest of the order system works.
import { createPrivateKey, createSign } from "node:crypto";

const DEFAULT_ALLOWED_ORIGINS = [
  "https://lucianeoliveiradoces.pages.dev",
  "https://luciane-oliveira-doces.railanzera.chatgpt.site",
];

class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message); this.status = status; this.code = code;
  }
}

function allowedOrigins(): Set<string> {
  const configured = Deno.env.get("CHECKOUT_ALLOWED_ORIGINS")
    ?.split(",").map((value) => value.trim()).filter(Boolean);
  return new Set(configured?.length ? configured : DEFAULT_ALLOWED_ORIGINS);
}

function cors(origin: string | null): HeadersInit {
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

function publishableKey(): string {
  const configured = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (!configured) throw new HttpError(503, "backend_not_configured", "Assinatura QZ não configurada.");
  try {
    const key = Object.values(JSON.parse(configured) as Record<string, string>).find(Boolean);
    if (key) return key;
  } catch { /* handled below */ }
  throw new HttpError(503, "backend_not_configured", "Assinatura QZ não configurada.");
}

async function requireUser(request: Request): Promise<void> {
  const authorization = request.headers.get("authorization");
  const url = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
  if (!authorization?.startsWith("Bearer ") || !url) throw new HttpError(401, "authentication_required", "Entre no painel novamente.");
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: publishableKey(), Authorization: authorization },
  });
  if (!response.ok) throw new HttpError(401, "authentication_required", "Entre no painel novamente.");
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin");
  try {
    if (origin && !allowedOrigins().has(origin)) throw new HttpError(403, "origin_not_allowed", "Origem não autorizada.");
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
    if (request.method !== "POST") throw new HttpError(405, "method_not_allowed", "Método não permitido.");
    await requireUser(request);
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const action = body?.action;
    if (action === "certificate") {
      const certificate = Deno.env.get("QZ_CERTIFICATE");
      if (!certificate) throw new HttpError(503, "qz_not_configured", "Certificado QZ ainda não configurado.");
      return new Response(JSON.stringify({ ok: true, certificate }), { status: 200, headers: cors(origin) });
    }
    if (action !== "sign" || typeof body?.request !== "string" || body.request.length > 100000) {
      throw new HttpError(400, "invalid_sign_request", "Solicitação de assinatura inválida.");
    }
    const privateKeyPem = Deno.env.get("QZ_PRIVATE_KEY_PEM");
    if (!privateKeyPem) throw new HttpError(503, "qz_not_configured", "Chave de assinatura QZ ainda não configurada.");
    const signer = createSign("RSA-SHA512");
    signer.update(body.request, "utf8");
    signer.end();
    const signature = signer.sign(createPrivateKey(privateKeyPem), "base64");
    return new Response(JSON.stringify({ ok: true, signature }), { status: 200, headers: cors(origin) });
  } catch (error) {
    if (error instanceof HttpError) return new Response(JSON.stringify({ ok: false, error: { code: error.code, message: error.message } }), { status: error.status, headers: cors(origin) });
    console.error("qz-sign unexpected failure", error instanceof Error ? error.name : "unknown");
    return new Response(JSON.stringify({ ok: false, error: { code: "signing_failed", message: "Não foi possível assinar a impressão." } }), { status: 500, headers: cors(origin) });
  }
});
