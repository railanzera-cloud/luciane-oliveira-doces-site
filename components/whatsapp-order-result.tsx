"use client";

import { ClipboardCheck, MessageCircle } from "lucide-react";
import type { SiteOrderResult } from "@/lib/site-order";
import { formatOrderMoney } from "@/app/order-checkout";
import { getWhatsAppFinalizationCopy } from "@/lib/whatsapp-finalization";

export type RegisteredWhatsAppOrder = {
  result: SiteOrderResult;
  customerName: string;
  trackingUrl: string;
  whatsappUrl: string;
};

export function WhatsAppOrderResultView({ order }: { order: RegisteredWhatsAppOrder }) {
  const payment = getWhatsAppFinalizationCopy(order.result.payment.method, order.result.order.card_mode);
  return (
    <main className="site-result-page">
      <section className="site-result-card whatsapp-final-card" aria-labelledby="whatsapp-final-title">
        <span className="tracking-icon" aria-hidden="true"><ClipboardCheck size={28} /></span>
        <h1 id="whatsapp-final-title">Pedido #{order.result.order.order_number} registrado!</h1>
        <p className="whatsapp-final-guide">Agora, envie a mensagem com seu pedido para a Luciane pelo WhatsApp.</p>
        <dl className="whatsapp-final-summary">
          <div><dt>Total</dt><dd>{formatOrderMoney(Number(order.result.order.total))}</dd></div>
          <div><dt>Pagamento</dt><dd>{payment.label}</dd></div>
        </dl>
        <a className="whatsapp-final-primary" href={order.whatsappUrl}>
          <MessageCircle size={21} aria-hidden="true" /> Enviar pedido pelo WhatsApp
        </a>
        <p className="whatsapp-final-instruction">{payment.instruction}</p>
        <div className="whatsapp-final-secondary">
          <a href={order.trackingUrl}>Consultar detalhes do pedido</a>
        </div>
      </section>
    </main>
  );
}
