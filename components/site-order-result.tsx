"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Clock3, Copy, ExternalLink, LoaderCircle, MessageCircle, RefreshCw, ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  loadPublicOrderStatus,
  sitePaymentLabel,
  type PublicOrderStatus,
  type SiteOrderResult,
  type SitePaymentMethod,
} from "@/lib/site-order";

import { TintimContactLink } from "@/components/tintim-contact-link";

function paymentStatusFromResult(result: SiteOrderResult): PublicOrderStatus["payment_status"] {
  if (result.payment.status === "processed" && result.payment.status_detail === "accredited") return "paid";
  if (["failed", "cancelled", "canceled", "expired"].includes(result.payment.status ?? "")) return "failed";
  return result.order.payment_status ?? "pending";
}

export function SiteOrderResultView({
  result,
  fulfillment,
  onNewOrder,
  onRetryPayment,
}: {
  result: SiteOrderResult;
  fulfillment: "entrega" | "retirada";
  onNewOrder: () => void;
  onRetryPayment: () => void;
}) {
  const token = result.order.tracking_token;
  const method = (result.payment.method ?? "mercado_pago_pix") as SitePaymentMethod;
  const [status, setStatus] = useState<PublicOrderStatus>(() => ({
    order_number: result.order.order_number,
    payment_method: method,
    payment_status: paymentStatusFromResult(result),
    order_status: result.order.order_status,
    fulfillment_type: fulfillment === "entrega" ? "delivery" : "pickup",
    total: result.order.total,
    currency: "BRL",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    payment: result.payment,
  }));
  const challengeFrameRef = useRef<HTMLIFrameElement>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    try {
      setStatus(await loadPublicOrderStatus(token));
      setNotice("");
    } catch {
      setNotice("Não foi possível atualizar agora. Seu pedido continua registrado.");
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token || status.payment_status === "paid" || status.payment_status === "refunded") return;
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 5000);
    const focus = () => void refresh();
    window.addEventListener("focus", focus);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", focus); };
  }, [refresh, status.payment_status, token]);

  useEffect(() => {
    const message = (event: MessageEvent) => {
      if (event.origin !== "https://www.mercadopago.com.br" ||
          event.source !== challengeFrameRef.current?.contentWindow) return;
      if (event.data && typeof event.data === "object" && event.data.status === "COMPLETE") void refresh();
    };
    window.addEventListener("message", message);
    return () => window.removeEventListener("message", message);
  }, [refresh]);

  const payment = (status.payment && Object.keys(status.payment).length ? status.payment : result.payment);
  const gatewayPayment = payment.payment ?? {};
  const isOnline = method === "mercado_pago_pix" || method === "mercado_pago_card";
  const paid = status.payment_status === "paid";
  const offlineConfirmed = !isOnline && !["payment_pending", "cancelled"].includes(status.order_status);
  const terminalPayment = ["failed", "cancelled", "refunded"].includes(status.payment_status);
  const pendingTitle = method === "mercado_pago_pix" ? "Aguardando pagamento" : "Pagamento em análise";
  const title = status.order_status === "cancelled" ? "Pedido cancelado"
    : terminalPayment ? status.payment_status === "refunded" ? "Pagamento devolvido" : "Pagamento não concluído"
      : paid || offlineConfirmed ? "Pedido confirmado" : pendingTitle;
  const qrImage = gatewayPayment.qr_code_base64
    ? gatewayPayment.qr_code_base64.startsWith("data:") ? gatewayPayment.qr_code_base64 : `data:image/png;base64,${gatewayPayment.qr_code_base64}`
    : null;
  const trackingUrl = `/pedido?token=${encodeURIComponent(token)}`;
  const formattedTotal = useMemo(() => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(status.total)), [status.total]);

  async function copyPix() {
    if (!gatewayPayment.qr_code) return;
    try {
      await navigator.clipboard.writeText(gatewayPayment.qr_code);
      setNotice("Código Pix copiado.");
    } catch {
      setNotice("Selecione o código abaixo para copiar.");
    }
  }

  return (
    <main className="site-result-page">
      <section className={`site-result-card ${paid || offlineConfirmed ? "is-confirmed" : "is-pending"}`} aria-live="polite">
        <span className="site-result-icon" aria-hidden="true">{paid || offlineConfirmed ? <Check size={30} /> : <Clock3 size={28} />}</span>
        <p className="eyebrow">Luciane Oliveira Doces</p>
        <h1>{title}</h1>
        <p className="site-order-number">Pedido <strong>#{status.order_number}</strong></p>
        {paid && <p>Pagamento aprovado. Recebemos seu pedido.</p>}
        {offlineConfirmed && <p>Pagamento: {sitePaymentLabel(method, fulfillment).toLowerCase()}.</p>}
        {!paid && isOnline && <p>Valor do pedido: <strong>{formattedTotal}</strong></p>}

        {method === "mercado_pago_pix" && !paid && status.payment_status === "pending" && (
          <div className="pix-payment-box">
            {qrImage && <img src={qrImage} alt="QR Code Pix deste pedido" width={220} height={220} />}
            <strong>Pix Copia e Cola</strong>
            {gatewayPayment.qr_code && <textarea value={gatewayPayment.qr_code} readOnly aria-label="Código Pix Copia e Cola" />}
            <Button type="button" onClick={copyPix} disabled={!gatewayPayment.qr_code}><Copy size={17} /> Copiar código Pix</Button>
            {gatewayPayment.expires_at && <small>Validade informada pelo Mercado Pago: {new Date(gatewayPayment.expires_at).toLocaleString("pt-BR")}.</small>}
            <p>A confirmação acontece automaticamente. Não é necessário tocar em “já paguei”.</p>
          </div>
        )}

        {gatewayPayment.challenge_url && !paid && !terminalPayment && (
          <div className="card-challenge-box">
            <strong>Confirme a compra com seu banco</strong>
            <p>Conclua a verificação segura abaixo. A aprovação será consultada automaticamente.</p>
            <iframe ref={challengeFrameRef} src={gatewayPayment.challenge_url} title="Verificação segura do cartão" allow="payment" />
          </div>
        )}

        {status.payment_status === "failed" && <p className="site-result-error">O pagamento não foi aprovado. Fale com a loja ou volte ao pedido para tentar novamente.</p>}
        {status.payment_status === "cancelled" && <p className="site-result-error">Este pagamento foi cancelado ou expirou.</p>}
        {status.payment_status === "refunded" && <p className="site-result-error">O pagamento deste pedido foi devolvido.</p>}
        {notice && <p className="site-result-notice" role="status">{notice}</p>}

        <div className="site-result-actions">
          <Button asChild><a href={trackingUrl}><ShoppingBag size={17} /> Ver pedido</a></Button>
          <Button variant="outline" asChild><TintimContactLink message={`Olá! Já fiz o pedido #${status.order_number} pelo site e preciso de ajuda.`}><MessageCircle size={17} /> Falar com a loja</TintimContactLink></Button>
          {!paid && isOnline && <Button type="button" variant="ghost" onClick={() => void refresh()} disabled={refreshing}>{refreshing ? <LoaderCircle className="admin-spinner" size={17} /> : <RefreshCw size={17} />} Atualizar situação</Button>}
          {isOnline && ["failed", "cancelled"].includes(status.payment_status) && status.order_status !== "cancelled" && <Button type="button" variant="outline" onClick={onRetryPayment}>Tentar pagamento novamente</Button>}
          {gatewayPayment.ticket_url && method === "mercado_pago_pix" && status.payment_status === "pending" && <Button variant="ghost" asChild><a href={gatewayPayment.ticket_url} target="_blank" rel="noreferrer">Abrir pagamento <ExternalLink size={16} /></a></Button>}
          <Button type="button" variant="ghost" onClick={onNewOrder}>Fazer novo pedido</Button>
        </div>
        <p className="site-result-privacy">Seus dados são usados somente para processar este pedido.</p>
      </section>
    </main>
  );
}
