"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { SiteOrderResult } from "@/lib/site-order";
import { formatOrderMoney } from "@/app/order-checkout";

export type RegisteredWhatsAppOrder = {
  result: SiteOrderResult;
  customerName: string;
  trackingUrl: string;
  whatsappUrl: string;
};
export function WhatsAppOrderResultView({ order, pix, onNewOrder }: {
  order: RegisteredWhatsAppOrder; pix: { key: string; holder: string }; onNewOrder: () => void;
}) {
  const [notice, setNotice] = useState("");
  const method = order.result.payment.method;
  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); setNotice("Copiado."); }
    catch { setNotice("Não foi possível copiar automaticamente. Selecione o texto abaixo."); }
  }
  return <main className="site-result-page"><section className="site-result-card is-pending">
    <h1>Olá, {order.customerName}! ❤️</h1>
    <p>Seu pedido <strong>#{order.result.order.order_number}</strong> foi registrado.</p>
    <p>Total: <strong>{formatOrderMoney(Number(order.result.order.total))}</strong></p>
    <p>Aguardando confirmação da loja.</p>
    <p>{method === "manual_pix" ? "Pagamento via Pix — aguardando conferência da loja." : method === "cash" ? "Pagamento em dinheiro no recebimento — pendente." : "Cartão no recebimento — pendente. Qualquer acréscimo será informado antes da confirmação da compra."}</p>
    <p>Envie sua mensagem pelo WhatsApp para que a Luciane possa confirmar seu pedido.</p>
    <div className="site-result-actions">
      <Button asChild><a href={order.whatsappUrl} onClick={() => setNotice("Se o WhatsApp não abrir, toque novamente. Seu pedido continua registrado; o número será o mesmo.")}>Enviar pedido pelo WhatsApp</a></Button>
      <Button variant="outline" asChild><a href={order.trackingUrl}>Acompanhar pedido</a></Button>
      <Button variant="outline" onClick={() => void copy(order.trackingUrl)}>Copiar link do pedido</Button>
      {method === "manual_pix" && <><Button variant="outline" onClick={() => void copy(pix.key)}>Copiar chave Pix</Button><p>CPF: {pix.key}<br />{pix.holder}</p></>}
      <input className="tracking-copy-field" aria-label="Link individual do pedido" value={order.trackingUrl} readOnly onFocus={e => e.target.select()} />
      <Button variant="ghost" onClick={onNewOrder}>Fazer novo pedido</Button>
    </div>
    {notice && <p role="status">{notice}</p>}
  </section></main>;
}
