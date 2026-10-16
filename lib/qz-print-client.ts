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
let activeAuthClient: SupabaseClient | null = null;
const workerId = `lod-kitchen-${crypto.randomUUID()}`;

function edgeUrl() {
  const { url } = getSupabasePublicConfiguration();
  if (!url) throw new Error("Supabase não configurado.");
  return `${url}/functions/v1/qz-sign`;
}

async function signedRequest(body: Record<string, unknown>) {
  // Nunca reutilizar o token obtido na primeira conexão: ele pode expirar.
  const session = await activeAuthClient?.auth.getSession();
  const accessToken = session?.data.session?.access_token;
  if (session?.error || !accessToken) throw new Error("Sessão expirada. Entre novamente no painel.");
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

export class KitchenPrinterSelectionError extends Error {
  constructor(readonly printers: string[]) {
    super("Mais de uma impressora térmica encontrada. Selecione a POS-58 correta abaixo e confirme a conexão.");
    this.name = "KitchenPrinterSelectionError";
  }
}

export async function connectKitchenPrinter(client: SupabaseClient, preferredPrinter?: string): Promise<string> {
  activeAuthClient = client;
  const qz = await qzModule();
  if (!configured) {
    // QZ espera um executor (resolve, reject), não uma função que devolve outro executor.
    qz.security.setCertificatePromise((resolve, reject) => {
      void signedRequest({ action: "certificate" })
        .then((result) => resolve(String(result.certificate ?? ""))).catch(reject);
    });
    qz.security.setSignatureAlgorithm("SHA512");
    qz.security.setSignaturePromise((request) => (resolve, reject) => {
      void signedRequest({ action: "sign", request })
        .then((result) => resolve(String(result.signature ?? ""))).catch(reject);
    });
    configured = true;
  }
  if (!qz.websocket.isActive()) await qz.websocket.connect({ retries: 2, delay: 1 });
  // Nunca usar a impressora padrão do Windows: pode ser Epson, PDF ou outro dispositivo.
  const found = await qz.printers.find();
  const names = [...new Set((Array.isArray(found) ? found : [found]).filter(
    (value): value is string => typeof value === "string" && Boolean(value.trim()),
  ))];
  const thermal = names.filter((name) => /(?:pos[\s_-]*58|jp[\s_-]*58|goldensky|thermal[\s_-]*58|58[\s_-]*mm)/i.test(name));
  const saved = window.localStorage.getItem("lod-qz-printer")?.trim();
  if (preferredPrinter && !thermal.includes(preferredPrinter)) {
    throw new Error("A impressora selecionada não está disponível. Confira o USB e conecte novamente.");
  }
  const remembered = preferredPrinter || saved;
  const printer = remembered && thermal.includes(remembered) ? remembered : thermal.length === 1 ? thermal[0] : null;
  if (!printer) {
    if (thermal.length > 1) throw new KitchenPrinterSelectionError(thermal);
    throw new Error("Não encontrei a impressora POS-58 no QZ Tray. Confira a conexão USB e o nome no Windows.");
  }
  selectedPrinter = printer;
  window.localStorage.setItem("lod-qz-printer", printer);
  return printer;
}

/** Teste isolado: jamais usa orders, print_jobs ou dados de cliente. */
export async function testKitchenPrinter(): Promise<void> {
  if (!selectedPrinter) throw new Error("Conecte primeiro a impressora POS-58.");
  const qz = await qzModule();
  if (!qz.websocket.isActive()) throw new Error("QZ Tray desconectado; conecte novamente.");
  const config = qz.configs.create(selectedPrinter, {
    encoding: "ISO-8859-1", copies: 1, jobName: "Teste local Luciane 58mm",
  });
  const esc = String.fromCharCode(27);
  const text = [
    esc + "@", esc + "a" + String.fromCharCode(1),
    "LUCIANE OLIVEIRA DOCES", "TESTE LOCAL - IMPRESSORA",
    esc + "a" + String.fromCharCode(0), "-------------------------------",
    "Conexao QZ Tray e papel 58 mm", "Nenhum pedido comercial.",
    "-------------------------------", "", "", esc + "d" + String.fromCharCode(3),
  ].join(String.fromCharCode(10));
  await qz.print(config, [{ type: "raw", format: "plain", data: text }]);
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
    ...(claim.job.kind === "reprint" ? ["*** REIMPRESSAO ***"] : []),
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
  if (claim.order.notes) {
    lines.push("OBSERVACOES:");
    lines.push(...wrap(claim.order.notes));
  }
  if (claim.order.fulfillment_type === "delivery") {
    lines.push(...wrap(`${claim.order.street}, ${claim.order.street_number}`));
    if (claim.order.complement) lines.push(...wrap(claim.order.complement));
    if (claim.order.neighborhood) lines.push(...wrap(claim.order.neighborhood));
    if (claim.order.reference) lines.push(...wrap(`Ref: ${claim.order.reference}`));
  }
  lines.push("--------------------------------");
  lines.push(`TOTAL: R$ ${Number(claim.order.total).toFixed(2).replace(".", ",")}`);
  if (claim.order.payment_method === "cash" && claim.order.cash_change_for) {
    lines.push(`TROCO PARA: R$ ${Number(claim.order.cash_change_for).toFixed(2).replace(".", ",")}`);
  }
  lines.push("", "", "\x1B\x64\x04");
  return lines.join("\n");
}

async function printClaim(claim: PrintClaim, onDispatch: () => void): Promise<void> {
  const qz = await qzModule();
  if (!selectedPrinter) throw new Error("Impressora QZ não selecionada.");
  if (!qz.websocket.isActive()) await qz.websocket.connect({ retries: 2, delay: 1 });
  const config = qz.configs.create(selectedPrinter, {
    encoding: "ISO-8859-1",
    copies: 1,
    jobName: `Luciane Pedido ${claim.order.order_number}`,
  });
  const data = [{ type: "raw", format: "plain", data: receipt(claim) }];
  // Depois desta fronteira, até uma rejeição pode ocorrer após envio ao spooler.
  onDispatch();
  await qz.print(config, data);
}

/** O servidor e a fila devem estar explicitamente habilitados.
 * Ausencia da RPC (versao antiga) impede qualquer claim e qualquer impressao.
 */
export async function kitchenPrintIsEnabled(client: SupabaseClient): Promise<boolean> {
  const { data, error } = await client.rpc("admin_get_kitchen_print_control");
  if (error) throw new Error("Fila protegida não instalada no servidor. Não é seguro imprimir.");
  return Boolean(data && typeof data === "object"
    && !Array.isArray(data) && (data as { enabled?: unknown }).enabled === true);
}

export async function drainPrintQueue(client: SupabaseClient, maxJobs = 10): Promise<number> {
  if (!(await kitchenPrintIsEnabled(client))) return 0;
  let printed = 0;
  for (let index = 0; index < maxJobs; index += 1) {
    const claim = await claimPrintJob(client, workerId);
    if (!claim) break;
    let dispatchStarted = false;
    try {
      // O estado pode ter mudado (cancelamento, estorno ou desligamento) após o claim.
      const { data: stillEligible, error: verifyError } = await client.rpc("admin_verify_print_claim", {
        p_job_id: claim.job.id, p_claim_token: claim.job.claim_token,
      });
      if (verifyError || stillEligible !== true) {
        await failPrintJob(client, claim, "Comanda bloqueada por mudança de estado ou falha de validação.");
        continue; // Não enviar comandos à impressora.
      }
      await printClaim(claim, () => { dispatchStarted = true; });
      // Confirma apenas a aceitação pelo QZ/spooler, não a saída física do papel.
      await completePrintJob(client, claim);
      printed += 1;
    } catch (error) {
      const cause = error instanceof Error ? error.message : "Falha de impressão.";
      const failure = dispatchStarted
        ? `Pedido #${claim.order.order_number}: envio pode ter ocorrido. Confira o papel e a fila do Windows antes de reimprimir; não haverá reenvio automático. ${cause}`
        : `Pedido #${claim.order.order_number}: impressão não enviada. ${cause}`;
      try {
        await failPrintJob(client, claim, failure);
      } catch {
        // Sem confirmação do banco, preservar o claim; nunca devolver a pending.
        throw new Error(`${failure} Não foi possível registrar o resultado no servidor; solicite conferência operacional.`);
      }
      throw new Error(failure);
    }
  }
  return printed;
}
