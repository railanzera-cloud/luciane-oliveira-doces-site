"use client";
import { Check, MessageCircle } from "lucide-react";
import type { SiteOrderResult } from "@/lib/site-order";
import { formatOrderMoney } from "@/app/order-checkout";

export type RegisteredWhatsAppOrder = {
  result: SiteOrderResult;
  customerName: string;
  trackingUrl: string;
  whatsappUrl: string;
};
export function WhatsAppOrderResultView({ order }: { order: RegisteredWhatsAppOrder }) {
  const method = order.result.payment.method;
  const label = order.result.order.card_mode ? order.result.order.card_mode === "credit_single" ? "Crédito à vista, no recebimento" : "Débito no recebimento" : method === "manual_pix" ? "Pix manual" : method === "cash" ? "Dinheiro no recebimento" : method === "card_on_delivery" ? "Cartão no recebimento" : method === "mercado_pago_pix" ? "Pix online" : "Cartão online";
  return <main className="site-result-page"><section className="site-result-card whatsapp-final-card">
    <span className="tracking-icon" aria-hidden="true"><Check size={28} /></span>
    <h1>Olá, {order.customerName.trim().split(/\s+/)[0]}! ❤️</h1>
    <p>Seu pedido <strong>#{order.result.order.order_number}</strong> foi registrado.</p>
    <dl className="whatsapp-final-summary">
      <div><dt>Total</dt><dd>{formatOrderMoney(Number(order.result.order.total))}</dd></div>
      <div><dt>Pagamento</dt><dd>{label}</dd></div>
    </dl>
    <p>Falta apenas enviar a mensagem pelo WhatsApp para a Luciane confirmar seu pedido.</p>
    <a className="whatsapp-final-primary" href={order.whatsappUrl}><MessageCircle size={21} /> Enviar pedido pelo WhatsApp</a>
    <small>Ao abrir o WhatsApp, toque em enviar.</small>
    <div className="whatsapp-final-secondary">
      <a href={order.trackingUrl}>Acompanhar meu pedido →</a>
      <small>O link também estará na mensagem do WhatsApp.</small>
    </div>
  </section></main>;
}
