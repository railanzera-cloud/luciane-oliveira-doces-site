import type { SupabaseClient } from "@supabase/supabase-js";

import {
  claimPrintJob,
  completePrintJob,
  failPrintJob,
  type PrintClaim,
} from "@/lib/admin-orders-client";
import { getSupabasePublicConfiguration } from "@/lib/supabase-config";
import { installKitchenQzSecurity } from "@/lib/qz-security";

let selectedPrinter = "";
let currentAccessToken = "";
const workerId = `lod-kitchen-${crypto.randomUUID()}`;

export type KitchenPrinterConnectionStage = "loading" | "websocket" | "printers";
export type KitchenPrinterProgress = (stage: KitchenPrinterConnectionStage) => void;

/** A conexão local nunca deve prender o botão de operação por tempo indeterminado. */
export async function kitchenConnectionDeadline<T>(
  operation: Promise<T>, milliseconds: number, failure: string,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(failure)), milliseconds);
      }),
    ]);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

function edgeUrl() {
  const { url } = getSupabasePublicConfiguration();
  if (!url) throw new Error("Supabase não configurado.");
  return `${url}/functions/v1/qz-sign`;
}

async function signedRequest(accessToken: string, body: Record<string, unknown>) {
  const { publishableKey } = getSupabasePublicConfiguration();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  let response: Response;
  try {
    response = await fetch(edgeUrl(), {
    method: "POST",
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: controller.signal,
    });
  } catch (cause) {
    if (controller.signal.aborted) {
      throw new Error("O Supabase demorou a responder à assinatura QZ. Tente novamente.");
    }
    throw cause;
  } finally {
    clearTimeout(timeout);
  }
  const result = await kitchenConnectionDeadline(
    response.json().catch(() => null) as Promise<Record<string, unknown> | null>,
    8000,
    "Tempo esgotado ao ler a resposta de assinatura QZ.",
  );
  if (!response.ok || result?.ok !== true) {
    const error = result?.error && typeof result.error === "object" ? result.error as Record<string, unknown> : {};
    throw new Error(typeof error.message === "string" ? error.message : "Assinatura QZ indisponível.");
  }
  return result;
}

async function qzModule() {
  const imported = await import("qz-tray");
  return imported.default;
}

export async function connectKitchenPrinter(
  accessToken: string,
  onProgress?: KitchenPrinterProgress,
): Promise<string> {
  currentAccessToken = accessToken;
  onProgress?.("loading");
  const qz = await kitchenConnectionDeadline(
    qzModule(), 12000, "O módulo da impressora não carregou. Atualize o painel e tente novamente.",
  );
  // Obter o certificado antes do handshake QZ; nunca iniciar impressão anônima.
  const result = await signedRequest(currentAccessToken, { action: "certificate" });
  const certificate = result.certificate;
  if (typeof certificate !== "string") {
    throw new Error("Certificado QZ não retornado pelo Supabase.");
  }
  installKitchenQzSecurity(qz.security, certificate, async (request) => {
    const signed = await signedRequest(currentAccessToken, { action: "sign", request });
    if (typeof signed.signature !== "string") {
      throw new Error("Assinatura QZ não retornada pelo Supabase.");
    }
    return signed.signature;
  });
  onProgress?.("websocket");
  if (!qz.websocket.isActive()) {
    try {
      await kitchenConnectionDeadline(
        qz.websocket.connect({ retries: 1, delay: 1 }), 20000,
        "O QZ Tray não respondeu em 20 segundos. Verifique o ícone do QZ Tray junto ao relógio do Windows, reinicie o QZ Tray e tente novamente. Se persistir, confira se o Chrome permite conexões locais.",
      );
    } catch (cause) {
      // O QZ pode ter completado a conexão enquanto a tentativa anterior expirava.
      if (!qz.websocket.isActive()) throw cause;
    }
  }
  onProgress?.("printers");
  let saved = "";
  try { saved = window.localStorage.getItem("lod-qz-printer")?.trim() ?? ""; }
  catch { /* Preferência local opcional. */ }
  const found = await kitchenConnectionDeadline(
    saved ? qz.printers.find(saved) : qz.printers.getDefault(),
    15000,
    "QZ Tray abriu, mas não respondeu à consulta de impressoras em 15 segundos. Confira se há uma janela de autorização do QZ Tray atrás do Chrome.",
  );
  const printer = Array.isArray(found) ? found[0] : found;
  if (typeof printer !== "string" || !printer.trim()) {
    throw new Error("QZ Tray conectado, mas não encontrou uma impressora. Confira a impressora padrão no Windows.");
  }
  selectedPrinter = printer;
  try { window.localStorage.setItem("lod-qz-printer", printer); }
  catch { /* A sessão de impressão permanece válida. */ }
  return printer;
}

// Antes de tomar um trabalho da fila, restabelece a conexão QZ quando necessário.
export async function ensureKitchenPrinterConnected(accessToken: string): Promise<void> {
  const qz = await qzModule();
  if (!selectedPrinter) throw new Error("Conecte a impressora pelo botão da cozinha.");
  currentAccessToken = accessToken;
  if (!qz.websocket.isActive()) await connectKitchenPrinter(accessToken);
}

function plain(value: unknown): string {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ").replace(/\s+/g, " ").trim();
}

function wrap(value: string, width = 32): string[] {
  const words = plain(value).split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (!line) line = word.slice(0, width);
    else if (`${line} ${word}`.length <= width) line += ` ${word}`;
    else { lines.push(line); line = word.slice(0, width); }
  }
  if (line) lines.push(line);
  return lines;
}

function paymentLine(claim: PrintClaim): string {
  const { payment_method: method, payment_status: status, fulfillment_type: fulfillment } = claim.order;
  if (status === "paid") return method === "mercado_pago_pix" ? "PAGO - PIX" : method === "mercado_pago_card" ? "PAGO - CARTAO ONLINE" : "PAGAMENTO CONFIRMADO";
  if (method === "manual_pix") return "PIX PENDENTE - CONFERIR";
  if (method === "cash") return `DINHEIRO NA ${fulfillment === "pickup" ? "RETIRADA" : "ENTREGA"} - PENDENTE`;
  if (method === "card_on_delivery") return `CARTAO NA ${fulfillment === "pickup" ? "RETIRADA" : "ENTREGA"} - PENDENTE`;
  return "PAGAMENTO PENDENTE - CONFERIR";
}

function receipt(claim: PrintClaim): string {
  const lines = [
    "\x1B\x40",
    "\x1B\x61\x01",
    "LUCIANE OLIVEIRA DOCES",
    `PEDIDO #${claim.order.order_number}`,
    new Date(claim.order.created_at).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    paymentLine(claim),
    "\x1B\x61\x00",
    "--------------------------------",
  ];
  for (const item of claim.items) {
    lines.push(...wrap(`${item.quantity}x ${item.name}${item.size_label ? ` ${item.size_label}` : ""}`));
    for (const option of item.option_names ?? []) lines.push(...wrap(`  ${option}`));
    lines.push("");
  }
  lines.push("--------------------------------");
  lines.push(claim.order.fulfillment_type === "pickup" ? "RETIRADA" : "ENTREGA");
  lines.push(...wrap(`Nome: ${claim.order.customer_name}`));
  lines.push(...wrap(`Telefone: ${claim.order.customer_phone}`));
  if (claim.order.fulfillment_type === "delivery") {
    lines.push(...wrap(`${claim.order.street}, ${claim.order.street_number}`));
    if (claim.order.complement) lines.push(...wrap(claim.order.complement));
    if (claim.order.neighborhood) lines.push(...wrap(claim.order.neighborhood));
    if (claim.order.reference) lines.push(...wrap(`Ref: ${claim.order.reference}`));
  }
  lines.push("--------------------------------");
  lines.push(`TOTAL: R$ ${Number(claim.order.total).toFixed(2).replace(".", ",")}`);
  lines.push("", "", "\x1B\x64\x04");
  return lines.join("\n");
}

async function printClaim(claim: PrintClaim): Promise<void> {
  const qz = await qzModule();
  if (!selectedPrinter) throw new Error("Impressora QZ não selecionada.");
  const config = qz.configs.create(selectedPrinter, {
    encoding: "UTF-8",
    copies: 1,
    jobName: `Luciane Pedido ${claim.order.order_number}`,
  });
  await qz.print(config, [{ type: "raw", format: "plain", data: receipt(claim) }]);
}

export async function drainPrintQueue(client: SupabaseClient, maxJobs = 10): Promise<number> {
  let printed = 0;
  for (let index = 0; index < maxJobs; index += 1) {
    const claim = await claimPrintJob(client, workerId);
    if (!claim) break;
    try {
      await printClaim(claim);
      await completePrintJob(client, claim);
      printed += 1;
    } catch (error) {
      const failure = error instanceof Error ? error.message : "Falha de impressão.";
      await failPrintJob(client, claim, failure);
      throw error;
    }
  }
  return printed;
}
