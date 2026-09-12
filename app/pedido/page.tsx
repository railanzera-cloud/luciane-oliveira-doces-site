"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Clock3, LoaderCircle, MessageCircle, RefreshCw, ShoppingBag } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { loadPublicOrderStatus, sitePaymentLabel, type PublicOrderStatus } from "@/lib/site-order";

const TINTIM_SITE_LINK = "https://tintim.link/whatsapp/2c956a42-229f-4d21-ade6-4442f8c048ed/7522df92-bbe1-4bff-83ca-2629bba182eb";

const ORDER_LABELS: Record<PublicOrderStatus["order_status"], string> = {
  payment_pending: "Aguardando pagamento",
  new: "Pedido recebido",
  confirmed: "Pedido confirmado",
  preparing: "Em preparo",
  ready: "Pronto",
  ready_for_pickup: "Pronto para retirada",
  out_for_delivery: "Saiu para entrega",
  completed: "Concluído",
  cancelled: "Cancelado",
};

export default function OrderTrackingPage() {
  const [token] = useState(() => typeof window === "undefined"
    ? ""
    : new URL(window.location.href).searchParams.get("token")?.trim().toLowerCase() ?? "");
  const [order, setOrder] = useState<PublicOrderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async (trackingToken = token) => {
    if (!trackingToken) return;
    setLoading(true);
    try {
      setOrder(await loadPublicOrderStatus(trackingToken));
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível consultar o pedido.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!/^[0-9a-f]{48}$/.test(token)) {
        setError("Link de acompanhamento inválido.");
        setLoading(false);
        return;
      }
      void refresh(token);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh, token]);

  useEffect(() => {
    if (!token || !order || ["completed", "cancelled"].includes(order.order_status)) return;
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 5000);
    const focus = () => void refresh();
    window.addEventListener("focus", focus);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", focus); };
  }, [order, refresh, token]);

  const supportUrl = order
    ? `${TINTIM_SITE_LINK}?text=${encodeURIComponent(`Olá! Já fiz o pedido #${order.order_number} pelo site e preciso de ajuda.`)}`
    : TINTIM_SITE_LINK;

  return (
    <main className="tracking-page">
      <section className="tracking-card" aria-busy={loading}>
        <span className="tracking-icon" aria-hidden="true">{order?.order_status === "completed" ? <Check size={28} /> : <ShoppingBag size={27} />}</span>
        <p className="eyebrow">Acompanhe seu pedido</p>
        {loading && !order ? <><LoaderCircle className="admin-spinner" size={24} /><h1>Consultando pedido…</h1></> : error && !order ? <><h1>Não foi possível abrir</h1><p role="alert">{error}</p></> : order && <>
          <h1>Pedido #{order.order_number}</h1>
          <div className="tracking-current-status"><Clock3 size={19} aria-hidden="true" /><span><small>Situação atual</small><strong>{ORDER_LABELS[order.order_status]}</strong></span></div>
          <div className="tracking-details">
            <p><span>Pagamento</span><strong>{order.payment_status === "paid" ? "Aprovado" : order.payment_status === "pending" ? sitePaymentLabel(order.payment_method, order.fulfillment_type === "pickup" ? "retirada" : "entrega") : order.payment_status === "refunded" ? "Devolvido" : "Não aprovado"}</strong></p>
            <p><span>Recebimento</span><strong>{order.fulfillment_type === "pickup" ? "Retirada" : "Entrega"}</strong></p>
          </div>
          {error && <p className="site-result-notice" role="status">A última atualização falhou. A situação anterior foi mantida.</p>}
        </>}
        <div className="tracking-actions">
          {order && <Button type="button" onClick={() => void refresh()} disabled={loading}>{loading ? <LoaderCircle className="admin-spinner" size={17} /> : <RefreshCw size={17} />} Atualizar</Button>}
          <Button variant="outline" asChild><a href={supportUrl}><MessageCircle size={17} /> Falar com a loja</a></Button>
          <Button variant="ghost" asChild><Link href="/">Voltar ao cardápio</Link></Button>
        </div>
      </section>
    </main>
  );
}
