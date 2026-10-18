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
let connectionInProgress: Promise<string> | null = null;
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
  // QZ suporta apenas uma sessão WebSocket. Evita tentativas concorrentes entre
  // clique manual, retorno de suspensão e consultas periódicas.
  if (connectionInProgress) return connectionInProgress;
  const attempt = connectKitchenPrinterOnce(accessToken, onProgress);
  connectionInProgress = attempt;
  try { return await attempt; }
  finally { if (connectionInProgress === attempt) connectionInProgress = null; }
}

async function connectKitchenPrinterOnce(
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

// Read-only: detectar queda sem criar impressão, cobrar token ou assinar pedidos.
export async function isKitchenPrinterOnline(): Promise<boolean> {
  if (!selectedPrinter) return false;
  try {
    const qz = await kitchenConnectionDeadline(qzModule(), 12000, "QZ indisponível.");
    return qz.websocket.isActive();
  } catch { return false; }
}

// Antes de tomar um trabalho da fila, restabelece a conexão QZ quando necessário.
export async function ensureKitchenPrinterConnected(accessToken: string): Promise<void> {
  const qz = await kitchenConnectionDeadline(qzModule(), 12000, "O QZ Tray não carregou.");
  if (!selectedPrinter) throw new Error("Conecte a impressora pelo botão da cozinha.");
  currentAccessToken = accessToken;
  if (!qz.websocket.isActive()) await connectKitchenPrinter(accessToken);
}

function plain(value: unknown): string {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ").replace(/\s+/g, " ").trim();
}

/** Nao perder palavras compridas em enderecos, complementos ou observacoes. */
function wrap(value: unknown, width = 32): string[] {
  const words = plain(value).split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const rawWord of words) {
    let word = rawWord;
    while (word.length > width) {
      if (line) { lines.push(line); line = ""; }
      lines.push(word.slice(0, width));
      word = word.slice(width);
    }
    if (!word) continue;
    if (!line) line = word;
    else if (line.length + 1 + word.length <= width) line += " " + word;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

function money(value: number | string): string {
  return Number(value).toFixed(2).replace(".", ",");
}

function paymentLine(claim: PrintClaim): string {
  const { payment_method: method, payment_status: status } = claim.order;
  if (status === "paid") {
    if (method === "mercado_pago_pix" || method === "manual_pix") return "PIX CONFIRMADO";
    if (method === "mercado_pago_card") return "CARTAO ONLINE CONFIRMADO";
    return "PAGAMENTO CONFIRMADO";
  }
  // Comanda de cozinha: pedido aceito não significa pagamento recebido.
  // Não exigir conferência financeira para imprimir nem indicar Pix pago sem confirmação.
  return "PEDIDO CONFIRMADO";
}

function receipt(claim: PrintClaim): string {
  const esc = "\x1B";
  const normal = esc + "E\x00";
  const bold = esc + "E\x01";
  const center = esc + "a\x01";
  const left = esc + "a\x00";
  const enlarged = "\x1D\x21\x11"; // 2x altura/largura; usado apenas no numero curto
  const regular = "\x1D\x21\x00";
  const divider = "--------------------------------";
  const createdAt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Belem", day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(claim.order.created_at)).replace(",", "");
  const fulfillment = claim.order.fulfillment_type === "pickup" ? "RETIRADA" : "ENTREGA";
  const lines = [
    esc + "@" + center + bold + "LUCIANE OLIVEIRA DOCES" + normal,
    enlarged + "PEDIDO #" + claim.order.order_number + regular,
    ...(claim.job.kind === "reprint" ? [bold + "*** REIMPRESSAO ***" + normal] : []),
    createdAt, left + divider,
    center + bold + fulfillment + normal,
    paymentLine(claim), left + divider, "",
  ];

  for (const item of claim.items) {
    // Nas fatias, "1 fatia" e a unidade cadastrada, nao mais um produto.
    // A quantidade ja aparece no prefixo (1x, 2x...): nao repeti-la ao lado do nome.
    const isSlice = /^1 fatia$/i.test(plain(item.size_label));
    const title = item.quantity + "x " + (isSlice ? "FATIA - " : "") + item.name
      + (!isSlice && item.size_label ? " " + item.size_label : "");
    lines.push(bold + wrap(title).join("\n") + normal);
    for (const option of item.option_names ?? []) lines.push(...wrap(isSlice ? "> " + option : "+ " + option));
    lines.push("");
  }

  lines.push(divider, bold + "CLIENTE" + normal);
  // Papel 58 mm: em largura dupla cabem 16 colunas. Nome grande e
  // quebrado sem cortar, facilitando a separacao das entregas.
  lines.push(bold + enlarged + wrap(claim.order.customer_name || "Nao informado", 16).join("\n") + regular + normal);
  const phone = plain(claim.order.customer_phone);
  lines.push(...wrap(phone ? "Telefone: " + phone : "Telefone: nao informado"));

  if (claim.order.fulfillment_type === "delivery") {
    lines.push(bold + "ENDERECO DE ENTREGA" + normal);
    const street = plain(claim.order.street);
    const number = plain(claim.order.street_number);
    lines.push(...wrap(street ? street + (number ? ", " + number : ", S/N") : "Endereco nao informado"));
    if (claim.order.neighborhood) lines.push(...wrap("Bairro: " + claim.order.neighborhood));
    if (claim.order.complement) lines.push(...wrap("Complemento: " + claim.order.complement));
    if (claim.order.reference) lines.push(...wrap("Referencia: " + claim.order.reference));
  }
  if (claim.order.notes) {
    lines.push(bold + "OBSERVACOES" + normal, ...wrap(claim.order.notes));
  }

  lines.push(divider, bold + "TOTAL: R$ " + money(claim.order.total) + normal);
  if (claim.order.payment_method === "cash" && claim.order.cash_change_for) {
    lines.push(...wrap("TROCO PARA: R$ " + money(claim.order.cash_change_for)));
  }
  lines.push("", "", esc + "d\x04");
  return lines.join("\n");
}

async function printClaim(claim: PrintClaim): Promise<void> {
  const qz = await qzModule();
  if (!selectedPrinter) throw new Error("Impressora QZ não selecionada.");
  const config = qz.configs.create(selectedPrinter, {
    // O modelo premium original foi homologado com ESC/POS e ISO-8859-1 na POS-58.
    encoding: "ISO-8859-1",
    copies: 1,
    jobName: `Luciane Pedido ${claim.order.order_number}`,
  });
  // O aplicativo local pode parar de responder após suspensão. Não manter
  // processamento bloqueado indefinidamente; não reimprimir automaticamente
  // em caso de timeout, pois a saída física do papel pode ser incerta.
  await kitchenConnectionDeadline(
    qz.print(config, [{ type: "raw", format: "plain", data: receipt(claim) }]),
    45000,
    "A impressão não respondeu em 45 segundos. Confira se o papel saiu antes de pedir reimpressão.",
  );
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
