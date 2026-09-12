import type { SupabaseClient } from "@supabase/supabase-js";

import {
  claimPrintJob,
  completePrintJob,
  failPrintJob,
  type PrintClaim,
} from "@/lib/admin-orders-client";
import { getSupabasePublicConfiguration } from "@/lib/supabase-config";

let configured = false;
let selectedPrinter = "";
const workerId = `lod-kitchen-${crypto.randomUUID()}`;

function edgeUrl() {
  const { url } = getSupabasePublicConfiguration();
  if (!url) throw new Error("Supabase não configurado.");
  return `${url}/functions/v1/qz-sign`;
}

async function signedRequest(accessToken: string, body: Record<string, unknown>) {
  const { publishableKey } = getSupabasePublicConfiguration();
  const response = await fetch(edgeUrl(), {
    method: "POST",
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => null) as Record<string, unknown> | null;
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

export async function connectKitchenPrinter(accessToken: string): Promise<string> {
  const qz = await qzModule();
  if (!configured) {
    qz.security.setCertificatePromise(() => (resolve, reject) => {
      void signedRequest(accessToken, { action: "certificate" })
        .then((result) => resolve(String(result.certificate ?? ""))).catch(reject);
    });
    qz.security.setSignatureAlgorithm("SHA512");
    qz.security.setSignaturePromise((request) => (resolve, reject) => {
      void signedRequest(accessToken, { action: "sign", request })
        .then((result) => resolve(String(result.signature ?? ""))).catch(reject);
    });
    configured = true;
  }
  if (!qz.websocket.isActive()) await qz.websocket.connect({ retries: 2, delay: 1 });
  const saved = window.localStorage.getItem("lod-qz-printer")?.trim();
  const found = await qz.printers.find(saved || undefined);
  const printer = Array.isArray(found) ? found[0] : found;
  if (!printer) throw new Error("Nenhuma impressora padrão foi encontrada no QZ Tray.");
  selectedPrinter = printer;
  window.localStorage.setItem("lod-qz-printer", printer);
  return printer;
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
  if (method === "cash") return `DINHEIRO NA ${fulfillment === "pickup" ? "RETIRADA" : "ENTREGA"}`;
  return `CARTAO NA ${fulfillment === "pickup" ? "RETIRADA" : "ENTREGA"}`;
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
