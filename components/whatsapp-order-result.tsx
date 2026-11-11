"use client";

import { MessageCircle } from "lucide-react";
import type { SiteOrderResult } from "@/lib/site-order";
import { formatOrderMoney } from "@/app/order-checkout";
import { getWhatsAppFinalizationCopy } from "@/lib/whatsapp-finalization";

export type RegisteredWhatsAppOrder = {
  result: SiteOrderResult;
  customerName: string;
  trackingUrl: string;
  whatsappUrl: string;
};

/** Recuperação quando a passagem direta ao WhatsApp é bloqueada ou o cliente retorna.
 * Registro interno não equivale a mensagem enviada ou pedido confirmado pela loja.
 * A abertura nunca é repetida automaticamente após a reidratação da sessão.
 */
export function WhatsAppOrderResultView({ order }: { order: RegisteredWhatsAppOrder }) {
  const payment = getWhatsAppFinalizationCopy(order.result.payment.method, order.result.order.card_mode);
  const paymentDetail = payment.instruction.replace(/^Ao abrir o WhatsApp, toque em Enviar\.\s*/, "");
  return (
    <main className="site-result-page">
      <section className="site-result-card whatsapp-final-card is-handoff-pending" aria-labelledby="whatsapp-final-title">
        <span className="tracking-icon" aria-hidden="true"><MessageCircle size={27} /></span>
        <p className="whatsapp-final-eyebrow">FALTA UMA ETAPA</p>
        <h1 id="whatsapp-final-title">Envie seu pedido pelo WhatsApp</h1>
        <p className="whatsapp-final-guide">
          Sua solicitação #{order.result.order.order_number} foi registrada no site,
          mas a Luciane ainda precisa receber sua mensagem para confirmar o atendimento.
        </p>
        <div className="whatsapp-final-next-step">
          <strong>Abra o WhatsApp e toque em Enviar.</strong>
          <span>Somente registrar a solicitação no site não conclui o atendimento.</span>
        </div>
        <a className="whatsapp-final-primary" href={order.whatsappUrl}>
          <MessageCircle size={21} aria-hidden="true" /> Abrir WhatsApp para enviar pedido
        </a>
        <p className="whatsapp-final-instruction">{paymentDetail}</p>
        <dl className="whatsapp-final-summary" aria-label="Resumo da solicitação registrada">
          <div><dt>Total</dt><dd>{formatOrderMoney(Number(order.result.order.total))}</dd></div>
          <div><dt>Pagamento</dt><dd>{payment.label}</dd></div>
        </dl>
        <details className="whatsapp-final-help">
          <summary>Precisa de ajuda?</summary>
          <p>Se a conversa não abrir, use o botão acima novamente. Se já enviou a mensagem, não é preciso repetir.</p>
          <a href={order.trackingUrl}>Consultar informações da solicitação</a>
        </details>
      </section>
    </main>
  );
}
