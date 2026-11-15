import type { AdminOrder } from "@/lib/admin-orders-client";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function html(value: unknown): string {
  const replacements: Record<string, string> = {
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  };
  return String(value ?? "").replace(/[&<>"']/g, ch => replacements[ch] ?? ch);
}

function localDate(iso: string): string {
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Belem", dateStyle: "short", timeStyle: "short",
  }).format(d) : "Data não disponível";
}

function paymentDescription(order: AdminOrder): string {
  if (order.payment_status === "paid") return "PAGAMENTO REGISTRADO COMO CONFIRMADO";
  if (order.payment_method === "manual_pix") return "PIX MANUAL PENDENTE — CONFERIR RECEBIMENTO";
  if (order.payment_method === "cash") return "DINHEIRO NA ENTREGA/RETIRADA — NÃO CONFIRMADO";
  if (order.payment_method === "card_on_delivery") return "CARTÃO NA ENTREGA/RETIRADA — NÃO CONFIRMADO";
  return "PAGAMENTO PENDENTE — NÃO CONFIRMADO";
}

/** Folha de contingência; nenhuma interação com QZ, banco ou confirmação financeira. */
export function buildKitchenManualReceiptDocument(order: AdminOrder): string {
  const items = order.order_items.map(item => {
    const size = item.size_label && item.size_label !== "1 fatia" ? ` — ${item.size_label}` : "";
    const options = (item.option_names ?? [])
      .map(name => `<div class="option">+ ${html(name)}</div>`).join("");
    return `<li><strong>${html(item.quantity)}x ${html(item.name)}${html(size)}</strong>${options}</li>`;
  }).join("");
  const address = order.fulfillment_type === "delivery"
    ? `<section><strong>ENDEREÇO</strong><p>${html(order.street || "Não informado")}, ${html(order.street_number || "S/N")}</p><p>Bairro: ${html(order.neighborhood || "Não informado")}</p>
       ${order.complement ? `<p>Complemento: ${html(order.complement)}</p>` : ""}
       ${order.reference ? `<p>Referência: ${html(order.reference)}</p>` : ""}</section>`
    : "";
  const notes = order.notes ? `<section><strong>OBSERVAÇÕES</strong><p>${html(order.notes)}</p></section>` : "";
  const change = order.payment_method === "cash" && order.cash_change_for
    ? `<p>Troco para: ${html(brl.format(Number(order.cash_change_for)))}</p>` : "";
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Comanda manual #${html(order.order_number)} - Luciane Oliveira Doces</title>
<style>
*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111;background:#eee;margin:0;padding:14px}
.toolbar{max-width:440px;margin:0 auto 12px;background:white;padding:12px;border-radius:8px;font-size:13px;line-height:1.5}
button{background:#3a2417;color:#fff;border:0;border-radius:6px;padding:12px 18px;font-weight:700;cursor:pointer}
.receipt{width:54mm;max-width:100%;margin:0 auto;background:white;padding:2mm;font:12px/1.4 Arial,sans-serif;overflow-wrap:anywhere}
h1{font-size:15px;text-align:center;margin:0}h2{font-size:18px;text-align:center;margin:5px 0}
small,.muted{font-size:10px}.center{text-align:center}.warn{border:2px solid #111;padding:5px;margin:7px 0;font-weight:700;font-size:11px}
section{border-top:1px dashed #444;padding-top:7px;margin-top:7px}
section p{margin:3px 0}ul{list-style:none;margin:6px 0;padding:0}li{margin:0 0 8px}.option{padding-left:8px}
.total{font-size:14px;font-weight:700}@media print{html,body{background:white;padding:0;margin:0}.toolbar{display:none}.receipt{box-shadow:none;margin:0;padding:1mm;width:54mm}@page{margin:1mm}}
</style></head><body>
<div class="toolbar"><strong>Comanda de contingência</strong><p>Confira o pedido e selecione a POS-58 na janela do Windows. Não depende do QZ Tray e não altera pagamento ou fila. Se este pedido já saiu no papel, NÃO imprima novamente.</p>
<button type="button" id="printKitchenReceipt">Imprimir no Windows</button></div>
<main class="receipt"><h1>LUCIANE OLIVEIRA DOCES</h1><h2>PEDIDO #${html(order.order_number)}</h2>
<p class="center">${html(localDate(order.created_at))}</p><div class="warn">COMANDA MANUAL / CONTINGÊNCIA<br>Sem registro automático na fila</div>
<section><strong>${order.fulfillment_type === "pickup" ? "RETIRADA" : "ENTREGA"}</strong><p>${html(paymentDescription(order))}</p></section>
<section><strong>PRODUTOS</strong><ul>${items}</ul></section>
<section><strong>CLIENTE</strong><p>${html(order.customer_name || "Não informado")}</p>
<p>Telefone: ${html(order.customer_phone || "Não informado")}</p></section>
${address}${notes}
<section class="total">TOTAL: ${html(brl.format(Number(order.total)))}</section>${change}
<p class="center muted">Impressão manual não confirma pagamento, aceite, entrega ou saída física.</p>
</main></body></html>`;
}

/** Apenas abre uma prévia; imprimir exige novo clique humano no navegador. */
export function openKitchenManualReceipt(order: AdminOrder): void {
  const preview = window.open("", "_blank", "width=440,height=760");
  if (!preview) throw new Error("O navegador bloqueou a janela da comanda. Permita pop-ups apenas para este painel.");
  preview.opener = null;
  preview.document.open();
  preview.document.write(buildKitchenManualReceiptDocument(order));
  preview.document.close();
  preview.document.getElementById("printKitchenReceipt")?.addEventListener("click", () => {
    preview.focus();
    preview.print();
  });
}
